-- Apply after the existing quote-delivery migrations. No calls are backfilled.
begin;
create table public.quote_calls (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null unique references public.quote_leads(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','processing','accepted','ringing','in-progress','ended','failed','unknown','suppressed','disabled','expired')),
 provider_id text unique,
 available_at timestamptz not null,
 scheduled_for timestamptz not null,
 expires_at timestamptz not null,
 attempts integer not null default 0,
 locked_at timestamptz,
 checked_at timestamptz,
 last_error text,
 ended_reason text,
 summary text,
 callback_request text,
 structured_output jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index quote_calls_due on public.quote_calls(available_at) where status='pending';
create table public.quote_call_suppressions (
 phone_hash text primary key, created_at timestamptz not null default now()
);
alter table public.quote_calls enable row level security;
alter table public.quote_call_suppressions enable row level security;
revoke all on public.quote_calls,public.quote_call_suppressions from anon,authenticated;
grant all on public.quote_calls,public.quote_call_suppressions to service_role;
create or replace function public.create_quote_enquiry(p_lead jsonb,p_jobs jsonb,p_actor text,p_hour_limit integer,p_phone_limit integer) returns jsonb
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
 -- The backend, not the browser, supplies ai_call after checking its configuration.
 if p_lead ? 'ai_call' and p_lead#>>'{consent,ai_call,granted}'='true' then
   perform pg_advisory_xact_lock(hashtextextended('ai-call:'||saved.phone_hash,0));
   if not exists(select 1 from public.quote_call_suppressions where phone_hash=saved.phone_hash)
   and not exists(select 1 from public.quote_calls c join public.quote_leads l on l.id=c.lead_id
      where l.phone_hash=saved.phone_hash and (c.created_at>now()-interval '24 hours' or c.status in ('pending','processing','accepted','ringing','in-progress'))) then
     insert into public.quote_calls(lead_id,available_at,scheduled_for,expires_at)
     values(saved.id,greatest((p_lead#>>'{ai_call,available_at}')::timestamptz,now()+interval '30 seconds'),
       greatest((p_lead#>>'{ai_call,available_at}')::timestamptz,now()+interval '30 seconds'),
       greatest((p_lead#>>'{ai_call,available_at}')::timestamptz,now()+interval '30 seconds')+interval '24 hours');
   end if;
 end if;
 return jsonb_build_object('id',saved.id,'reference',saved.reference,'created',true);
end $$;

create function public.claim_quote_call() returns setof public.quote_calls
language plpgsql security invoker set search_path='' as $$
declare target uuid;
begin
 update public.quote_calls set status='unknown',last_error='call_lease_expired',updated_at=now()
 where status='processing' and locked_at<now()-interval '5 minutes';
 update public.quote_calls set status='expired',updated_at=now() where status='pending' and expires_at<=now();
 update public.quote_calls c set status='suppressed',updated_at=now() from public.quote_leads l
 where c.lead_id=l.id and c.status='pending' and exists(select 1 from public.quote_call_suppressions s where s.phone_hash=l.phone_hash);
 select id into target from public.quote_calls where status='pending' and available_at<=now()
 order by available_at,id for update skip locked limit 1;
 if target is not null then
 return query update public.quote_calls set status='processing',attempts=attempts+1,locked_at=now(),updated_at=now() where id=target returning *;
 end if;
end $$;

-- Serialise polling and webhooks. Later ringing events cannot reopen an ended call.
create function public.update_quote_call(p_provider text,p_status text,p_details jsonb default '{}') returns boolean
language plpgsql security invoker set search_path='' as $$
declare c public.quote_calls; old_rank integer; new_rank integer;
begin
 select * into c from public.quote_calls where provider_id=p_provider for update;
 if not found then return false; end if;
 if p_status not in ('accepted','ringing','in-progress','ended') then raise exception 'Invalid call event'; end if;
 old_rank=case c.status when 'ended' then 4 when 'in-progress' then 3 when 'ringing' then 2 else 1 end;
 new_rank=case p_status when 'ended' then 4 when 'in-progress' then 3 when 'ringing' then 2 else 1 end;
 update public.quote_calls set status=case when new_rank>=old_rank then p_status else c.status end,
 ended_reason=coalesce(p_details->>'ended_reason',ended_reason),summary=coalesce(p_details->>'summary',summary),
 structured_output=coalesce(p_details->'structured_output',structured_output),checked_at=now(),updated_at=now()
 where id=c.id;
 return true;
end $$;

create function public.suppress_quote_calls(p_call uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare recipient text;
begin
 select l.phone_hash into recipient from public.quote_calls c join public.quote_leads l on l.id=c.lead_id where c.id=p_call;
 if recipient is null then raise exception 'Call not found'; end if;
 insert into public.quote_call_suppressions(phone_hash) values(recipient) on conflict do nothing;
 update public.quote_calls c set status='suppressed',updated_at=now() from public.quote_leads l
 where c.lead_id=l.id and l.phone_hash=recipient and c.status='pending';
end $$;

create function public.record_quote_call_callback(p_call uuid,p_preference text,p_report jsonb,p_email_ready boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare c public.quote_calls;
begin
 select * into c from public.quote_calls where id=p_call for update;
 if not found then raise exception 'Call not found'; end if;
 if c.callback_request is not null then return; end if;
 update public.quote_calls set callback_request=p_preference,updated_at=now() where id=c.id;
 update public.quote_leads set callback=true,callback_time=p_preference where id=c.lead_id;
 if p_report is not null then
 insert into public.quote_outbox(lead_id,channel,payload,status)
 values(c.lead_id,'callback_report',p_report,case when p_email_ready then 'pending' else 'disabled' end)
 on conflict(lead_id,channel) do nothing;
 end if;
end $$;
revoke all on function public.claim_quote_call(),public.update_quote_call(text,text,jsonb),public.suppress_quote_calls(uuid),public.record_quote_call_callback(uuid,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.claim_quote_call(),public.update_quote_call(text,text,jsonb),public.suppress_quote_calls(uuid),public.record_quote_call_callback(uuid,text,jsonb,boolean) to service_role;
commit;
