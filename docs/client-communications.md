# Quote email and SMS templates

Latest change: detailed cost cards and quote breakdowns are removed from website screens. Both email and SMS templates include the relevant itemised charges; the website shows the main `$660 + GST` fee and official government calculator links. SMS includes the full charge list, so it can span multiple billed segments. RCS rich-card delivery is not enabled by this template work.

The templates in `src/reference/messages.js` are ready for a future Node.js delivery worker. They produce HTML email, plain-text email, SMS and an internal enquiry report from one lead. They do not send messages or connect to Supabase.

## SMS

The SMS starts with RAIKAN CONVEYANCING, the quote reference and service, followed by `$660 + GST` for buyers and sellers. It lists the service-specific other charges on separate lines, explains that this is not the full settlement total, and finishes with email and telephone follow-up instructions. Transfers require a personal quote until their fee is confirmed.

Current buyer and vendor examples are `docs/communication-previews/buy-sms.txt` and `docs/communication-previews/sell-sms.txt`.

The reference comes from the saved quote. It is a reference number, not a discount code. Do not include personal details in the reference. SMS can use more than one billable segment depending on the final reference length and the provider's encoding.

## Email

Subject: `Your Raikan conveyancing quote | {{reference}}`

Greeting uses the client's name. The body shows `$660 + GST` for buying/selling, the individual additional charges, a short next-steps list, government calculator links and the office contact details. The HTML and plain-text versions use the same fee model. No separate GST amount or inclusive service total is displayed.

Buyer attachments:

- `public/documents/quote-purchaser-660.pdf` — the supplied, unchanged quote PDF.
- `public/documents/conveyancing-process-buyer.pdf` — the supplied, unchanged process guide.

Vendor email: the supplied screenshot is reflected in the text breakdown. No vendor PDF or process guide was supplied, so purchaser documents are not attached to seller enquiries. Add a vendor attachment when supplied. The guides are source materials; their older legal/process details have not been revised in this task.

Rendered examples are in `docs/communication-previews/`.

## Future Supabase and SMS/email integration

1. Submit the form to your Node.js API. Validate the mobile number and email on the server, protect against automated abuse and generate a unique reference there. The current `DEMO-` reference is explicitly a browser preview reference.
2. Save the enquiry, service/choice, contact details, callback request, quote-request consent, ad attribution (`utm_*`, `gclid`, `fbclid`), fee version and fee snapshot in Supabase. Obtain the fee model on the server, rather than trusting a browser-supplied amount.
3. In the same database transaction, create an outbox record for the client email and internal report. Generate payloads using `createClientMessages(lead)`. Resolve attachment paths relative to the deployed Node project. For serverless deployment, include the PDFs in its deployed assets or obtain them from private Supabase Storage.
4. Send the email with its attachments using the configured Gmail service. Only after the provider accepts the client email should the SMS job run: its wording refers to that email. Email acceptance is not proof of inbox delivery. Record provider IDs, delivery events and failures separately.
5. Retry failed jobs using a unique `(quote_id, channel, template_version)` key to prevent duplicate messages. Keep UI states honest: received, queued, accepted, delivered or failed. Never show “sent” simply because the form was submitted.
6. Queue the callback request for the team if selected. Do not promise a response deadline until your team defines one. The internal report includes the reference, service, contact details, questions and callback preference; configure its recipient server-side.

Keep Supabase server credentials, Gmail credentials and SMS credentials on the Node server. The frontend currently keeps a template snapshot in memory only and marks all delivery as `preview_only`. No provider credentials or live delivery are added.

## Fee assumptions

- Latest written instruction wins: display `$660 + GST` only. The older buyer screenshot's $640 figure is superseded by that instruction and the supplied quote PDF.
- Extra fees use the supplied schedule: file $88; PEXA $146.30; identity $50/person; AML/CTF $25/person; applicable mortgage registration/discharge $204; seller special water meter reading $25; buyer optional priority notice/new-title copy $38 each.
- Special orders have no supplied amount and remain “quoted separately”. Government stamp duty/lodgement costs and settlement adjustments are not invented or included in a total. Tax treatment of additional charges remains unconfirmed; templates say it will be confirmed for the transaction.
- Official calculator links were checked on 19 November 2026: [SA.GOV.AU property transfer calculator](https://www.sa.gov.au/topics/housing/planning-and-property/property-transfer-fee-calculator), [RevenueSA stamp duty calculator](https://www.revenuesa.sa.gov.au/stamp-duty-land/calculate-stamp-duty).
