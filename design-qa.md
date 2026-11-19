# Reference recreation QA

## Latest update: contact header and email/SMS-only breakdowns

19 November 2026: replaced the logo/navigation header with the requested phone, email, Adelaide/Brisbane and office-hours contact strip; retained a two-column mobile layout. Removed detailed website cost cards, PDF download links and both on-page result breakdowns. The hero still states `$660 + GST` and links directly to the official SA property transfer fee calculator. Detailed charges remain in email and SMS template payloads, not website screens.

The form now uses a nearly opaque navy backing, stronger option borders, light input fields, larger labels and visible focus rings. All three form steps show “Get your quote now”. Checked desktop and mobile visuals, transfer selection/contact submission and a confirmation without a fee table. Browser console showed no errors. Evidence: `docs/contact-form-update/`. Backend delivery remains disconnected and the preview does not claim messages were sent. Prior cost-card findings below are historical.

## Latest update: fee guide and communication templates

Updated 19 November 2026 after the reference recreation. The client's latest written instructions intentionally replace the reference's pending pricing with `$660 + GST` for buying/selling. No separate GST amount or inclusive service total is displayed. Buying and selling charge cards, PDF downloads and official government calculators near the footer are implemented. Other service types require a personal quote.

Validation passed: production build; four Node tests covering fee wording, HTML escaping, buyer attachment existence, seller-specific costs and incomplete payload rejection; browser buyer and seller submissions; invalid Australian mobile validation; desktop cost cards and mobile cost/result layouts; email HTML rendering in a browser; no browser console errors observed. This does not validate rendering in every email client or actual provider delivery.

Templates produce plain text and HTML client emails, SMS and an internal report. The browser creates an in-memory template snapshot and retains `preview_only` status. Supabase, email, SMS and callback delivery remain unconnected. Buyer PDFs are copied unchanged; no vendor PDF was provided. See `docs/client-communications.md` for payloads, fee assumptions and future delivery ordering. Screenshots are in `docs/reference-2026/fees-update/`. Earlier reference-only findings below are historical and superseded where relevant.

Status: passed for frontend recreation. Reviewed 19 November 2026.

Reference: https://raikan-instant-quote-2026.tccompany.chatgpt.site/

## Scope and fidelity

- Replaced the active homepage and enquiry experience with the reference's public markup, styles, images, font and interactive flows.
- Preserved the photo hero, navigation, process steps, services, property guides, FAQs, contact area and footer.
- Preserved Buy/Sell/Transfer and additional-service quote options, validation, quote result, callback, onboarding, privacy and legal dialogs.
- Assets are served locally. The reference hosting platform's injected script is excluded.
- Original active UI files are backed up in `docs/pre-reference-ui`.

## Validation

- `npm run build`: passed (TypeScript and Vite).
- Desktop and mobile homepage and quote dialog visually inspected. Screenshots are in `docs/reference-2026`.
- Empty form exposes inline errors; sample valid details reach the quote result.
- Sell and Transfer selections update their property questions.
- Onboarding reuses contact details and reaches completion.
- Callback form reaches its preview confirmation.
- Mobile menu expands and closes; FAQ expands; privacy and legal dialogs open and close.
- Browser console: no errors observed during these flows.

## Intentional reference behavior

This is a frontend preview. Details live only in page memory. No email, SMS, database write or formal engagement occurs. Detailed fees remain pending confirmation, matching the reference. The $660 hero amount is indicative. These limitations remain explicitly visible in the interface. Production integration and deployment are outside this UI recreation.

## Evidence

- `docs/reference-2026/local-home-desktop.png`
- `docs/reference-2026/local-home-mobile.png`
- `docs/reference-2026/local-quote-mobile.png`
- `docs/reference-2026/local-quote-result.png`
- Original reference screenshots and source captures are retained alongside these files.

Browser full-page capture was unavailable for the local page; local evidence uses viewport captures. Visual review covered desktop and mobile states rather than a pixel-difference measurement.
