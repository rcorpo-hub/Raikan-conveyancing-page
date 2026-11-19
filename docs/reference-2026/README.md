# Reference UI recreation

Subsequent client fee/copy changes supersede the original reference pricing and some homepage content. See `docs/client-communications.md` and the latest entry in `design-qa.md` for the $660 + GST cost guide, attachments and email/SMS templates. Earlier reference-only notes below describe the initial recreation.

The active React frontend recreates https://raikan-instant-quote-2026.tccompany.chatgpt.site/ from its public assets and page source captured on 19 November 2026.

`src/reference/markup.html`, `style.css`, `config.js`, `preview.js` and `app.js` contain the reference interface. `src/App.tsx` mounts the trusted static markup and initializes its behavior. Event listeners use an AbortController so React development remounts clean them up. Dynamic form values retain the source's HTML escaping.

The logo, photographs and Inter font are copied into `public/assets`. No dependency on the reference host is required at runtime. Property guide links still lead to the reference's SA.GOV.AU destinations.

Run `npm run dev` for development or `npm run build` to generate `dist`. The preview has no backend: no email, SMS or Supabase writes, and no persistent form storage. Approved fee amounts have not been supplied; quote breakdowns show pending confirmation as in the reference.

The previously active UI entry files are preserved in `docs/pre-reference-ui`. Existing old components remain in the repository but are not mounted.

See the root `design-qa.md` for verification and limits.
