-- Apply after 202611200001_quote_delivery.sql, including on existing projects.
-- Remove the old email dependency from active SMS jobs only.
-- Do not re-enable disabled, failed, unknown or opted-out messages.
begin;
update public.quote_outbox
set depends_on=null,updated_at=now()
where channel='client_sms' and status='pending' and depends_on='client_email';
commit;
