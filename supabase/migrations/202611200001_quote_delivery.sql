-- Run once in the Supabase SQL editor, or with `supabase db push`.
-- All customer data is server-only. No anonymous/authenticated table policies.
begin;
create table public.quote_leads (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique,
 idempotency_key uuid not null unique,
 request_hash text not null,
 access_token_hash text not null,
 unsubscribe_hash text not null unique,
 phone_hash text not null,
 kind text not null check (kind in ('quote','callback')),
 service text not null,
 choice text not null,
 contact jsonb not null,
 callback boolean not null default false,
 callback_time text not null default '',
 attribution jsonb not null default '{}',
 consent jsonb not null,
 fee_snapshot jsonb not null,
 onboarding jsonb not null default '{}',
 intent_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.quote_outbox (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references public.quote_leads(id) on delete cascade,
 channel text not null check(channel in ('client_email','team_email','client_sms','callback_report')),
 payload jsonb not null,
 status text not null check(status in ('pending','processing','accepted','delivered','failed','unknown','disabled','suppressed')),
 depends_on text,
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 locked_at timestamptz,
 provider_id text,
 last_error text,
 checked_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(lead_id,channel)
);
create index quote_outbox_pending on public.quote_outbox(available_at) where status='pending';
create index quote_outbox_provider on public.quote_outbox(provider_id) where provider_id is not null;
create table public.quote_rate_limits (key text primary key, count integer not null, expires_at timestamptz not null);
create table public.quote_sms_suppressions (phone_hash text primary key, created_at timestamptz not null default now());
alter table public.quote_leads enable row level security;
alter table public.quote_outbox enable row level security;
alter table public.quote_rate_limits enable row level security;
alter table public.quote_sms_suppressions enable row level security;
revoke all on public.quote_leads,public.quote_outbox,public.quote_rate_limits,public.quote_sms_suppressions from anon,authenticated;
grant all on public.quote_leads,public.quote_outbox,public.quote_rate_limits,public.quote_sms_suppressions to service_role;

create function public.quote_take_limit(p_key text,p_limit integer,p_seconds integer) returns void
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 insert into public.quote_rate_limits(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set
 count=case when public.quote_rate_limits.expires_at<=now() then 1 else public.quote_rate_limits.count+1 end,
 expires_at=case when public.quote_rate_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else public.quote_rate_limits.expires_at end
 returning count into n;
 if n>p_limit then raise exception 'QUOTE_RATE_LIMIT'; end if;
end $$;

create function public.create_quote_enquiry(p_lead jsonb,p_jobs jsonb,p_actor text,p_hour_limit integer,p_phone_limit integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare existing public.quote_leads; saved public.quote_leads; j jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_lead->>'idempotency_key',0));
 select * into existing from public.quote_leads where idempotency_key=(p_lead->>'idempotency_key')::uuid;
 if found then
   if existing.request_hash<>p_lead->>'request_hash' then raise exception 'QUOTE_IDEMPOTENCY_CONFLICT'; end if;
   return jsonb_build_object('id',existing.id,'reference',existing.reference,'created',false);
 end if;
 perform public.quote_take_limit('ip:'||p_actor,p_hour_limit,3600);
 perform public.quote_take_limit('phone:'||(p_lead->>'phone_hash'),p_phone_limit,86400);
 insert into public.quote_leads(reference,idempotency_key,request_hash,access_token_hash,unsubscribe_hash,phone_hash,kind,service,choice,contact,callback,callback_time,attribution,consent,fee_snapshot)
 values(p_lead->>'reference',(p_lead->>'idempotency_key')::uuid,p_lead->>'request_hash',p_lead->>'access_token_hash',p_lead->>'unsubscribe_hash',p_lead->>'phone_hash',p_lead->>'kind',p_lead->>'service',p_lead->>'choice',p_lead->'contact',(p_lead->>'callback')::boolean,coalesce(p_lead->>'time',''),p_lead->'attribution',p_lead->'consent',p_lead->'fee_snapshot') returning * into saved;
 for j in select value from jsonb_array_elements(p_jobs) loop
   insert into public.quote_outbox(lead_id,channel,payload,status,depends_on)
   values(saved.id,j->>'channel',j->'payload',
    case when j->>'channel'='client_sms' and exists(select 1 from public.quote_sms_suppressions where phone_hash=saved.phone_hash) then 'suppressed' else j->>'status' end,
    j->>'depends_on');
 end loop;
 return jsonb_build_object('id',saved.id,'reference',saved.reference,'created',true);
end $$;

create function public.claim_quote_job() returns setof public.quote_outbox
language plpgsql security invoker set search_path='' as $$
declare target uuid;
begin
 -- Expired sending leases are uncertain, not blindly retried: the provider may have accepted the message.
 update public.quote_outbox set status='unknown',last_error='sending_lease_expired',updated_at=now()
 where status='processing' and locked_at<now()-interval '5 minutes';
 update public.quote_outbox o set status='failed',last_error='dependency_failed',updated_at=now()
 where o.status='pending' and o.depends_on is not null and exists(
 select 1 from public.quote_outbox d where d.lead_id=o.lead_id and d.channel=o.depends_on and d.status in ('failed','disabled','suppressed'));
 update public.quote_outbox o set status='suppressed',updated_at=now() where o.status='pending' and o.channel='client_sms' and exists(
 select 1 from public.quote_leads l join public.quote_sms_suppressions s on s.phone_hash=l.phone_hash where l.id=o.lead_id);
 select o.id into target from public.quote_outbox o where o.status='pending' and o.available_at<=now()
 and (o.depends_on is null or exists(select 1 from public.quote_outbox d where d.lead_id=o.lead_id and d.channel=o.depends_on and d.status in ('accepted','delivered')))
 order by o.available_at,o.id for update of o skip locked limit 1;
 if target is not null then
 return query update public.quote_outbox set status='processing',attempts=attempts+1,locked_at=now(),updated_at=now() where id=target returning *;
 end if;
end $$;

create function public.suppress_quote_sms(p_token_hash text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare recipient text;
begin
 select phone_hash into recipient from public.quote_leads where unsubscribe_hash=p_token_hash;
 if recipient is null then return false; end if;
 insert into public.quote_sms_suppressions(phone_hash) values(recipient) on conflict do nothing;
 update public.quote_outbox o set status='suppressed',updated_at=now() from public.quote_leads l
 where o.lead_id=l.id and l.phone_hash=recipient and o.channel='client_sms' and o.status in ('pending','disabled');
 return true;
end $$;

revoke all on function public.quote_take_limit(text,integer,integer),public.create_quote_enquiry(jsonb,jsonb,text,integer,integer),public.claim_quote_job(),public.suppress_quote_sms(text) from public,anon,authenticated;
grant execute on function public.quote_take_limit(text,integer,integer),public.create_quote_enquiry(jsonb,jsonb,text,integer,integer),public.claim_quote_job(),public.suppress_quote_sms(text) to service_role;
commit;
