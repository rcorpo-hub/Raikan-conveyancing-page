-- Independent Vapi tools. Requires the quote-delivery tables, not the old Vapi migration.
-- Does not start calls, change leads, send messages or backfill customer data.
begin;
create table public.vapi_tool_call_logs (
 call_id uuid primary key,
 verification_status text not null default 'UNVERIFIED'
   check (verification_status in ('VERIFIED_MATCH','UNVERIFIED')),
 lookup_attempts integer not null default 0,
 reported_service text check (reported_service in ('buy','sell','transfer','other','unknown')),
 reported_outcome text check (reported_outcome in ('questions_answered','human_requested','callback_requested','not_interested','unknown')),
 human_requested boolean,
 finalized_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.vapi_tool_call_logs enable row level security;
revoke all on public.vapi_tool_call_logs from public,anon,authenticated;
grant select,insert,update on public.vapi_tool_call_logs to service_role;

create function public.verify_quote_customer(p_call_id uuid,p_phone text,p_name text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare match_status text := 'UNVERIFIED'; name_count integer; matching_count integer; attempts integer; normalized_name text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_call_id::text,0));
 normalized_name := regexp_replace(lower(p_name),'[^a-z0-9]','','g');
 insert into public.vapi_tool_call_logs(call_id) values(p_call_id) on conflict do nothing;
 select lookup_attempts into attempts from public.vapi_tool_call_logs where call_id=p_call_id;
 if attempts>=3 or length(normalized_name)<2 then return jsonb_build_object('status','UNVERIFIED'); end if;
 select count(distinct regexp_replace(lower(contact->>'name'),'[^a-z0-9]','','g')),
 count(*) filter(where regexp_replace(lower(contact->>'name'),'[^a-z0-9]','','g')=normalized_name)
 into name_count,matching_count from public.quote_leads where contact->>'phone'=p_phone;
 if name_count=1 and matching_count>0 then match_status := 'VERIFIED_MATCH'; end if;
 update public.vapi_tool_call_logs set verification_status=match_status,lookup_attempts=lookup_attempts+1
 where call_id=p_call_id and finalized_at is null;
 return jsonb_build_object('status',match_status);
end $$;

create function public.log_quote_call_outcome(p_call_id uuid,p_service text,p_outcome text,p_human_requested boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.vapi_tool_call_logs(call_id,reported_service,reported_outcome,human_requested,finalized_at)
 values(p_call_id,p_service,p_outcome,p_human_requested,now())
 on conflict(call_id) do update set reported_service=excluded.reported_service,
 reported_outcome=excluded.reported_outcome,human_requested=excluded.human_requested,finalized_at=excluded.finalized_at
 where public.vapi_tool_call_logs.finalized_at is null;
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.verify_quote_customer(uuid,text,text),public.log_quote_call_outcome(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.verify_quote_customer(uuid,text,text),public.log_quote_call_outcome(uuid,text,text,boolean) to service_role;
commit;
