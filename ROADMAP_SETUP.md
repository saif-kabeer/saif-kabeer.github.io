# The Roadmap

A public ambition journal and a private editing studio for saifkabeer.com. The existing HTML homepage and consultation page remain in place.

## Open it

- Public collection: `/roadmap/`
- Private studio: `/admin/roadmap/`
- Clearly labelled illustrative preview: `/roadmap/?preview=1`

Eight suggested ambitions are seeded as **drafts**. They do not appear in public results, counts, timelines, or sitemaps. Review the text and status before publishing. Preview examples are separate, intentionally public demonstration data, not a copy of private records.

## Manage the roadmap

Sign in with the authorized email using the studio's email sign-in flow. Copy the sign-in link from the email into the verification field, or enter the code if the email includes one. The database verifies the account email and confirmation status; frontend checks do not grant permissions. The active account is kept in session storage for the current tab, with token refresh and explicit sign-out.

Create or open an ambition, fill its purpose and success criteria, and save privately. Each update and photo has its own publish checkbox; the parent ambition must also be public before either is readable. Preview shows the public content, excluding private notes. Higher priority sorts earlier within a status. Archive retains the story. Delete moves an item to Recently deleted, where it can be restored. There is no automatic hard deletion.

Changed URL slugs do not create redirects. Keep published slugs stable. If an entry changed in another tab, the save is rejected to prevent silent overwrites.

## Connected services

- GitHub repository: `saif-kabeer/saif-kabeer.github.io`
- Vercel project: `saifkabeer`
- Supabase project: `saifkabeer-roadmap` (`fyhmlcnnuvimjoapydhu`, Mumbai)
- Database migration: `supabase/migrations/202611050001_roadmap.sql`
- Draft seeds: `supabase/seed.sql`

The project uses plain HTML, CSS and browser ES modules, Postgres RLS, Supabase Auth and a private Storage bucket. Two Vercel functions provide server-rendered entry pages and a live public sitemap. No frontend framework or runtime npm packages are required.

`assets/roadmap-config.js` contains only public configuration. The Supabase publishable key is intended to be public. Never put a service-role or secret key there. Vercel build environment variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` generate the deployed configuration with clean entry URLs enabled.

GitHub Pages can run the same frontend with `/roadmap/entry/?slug=...` URLs, but Vercel is the full release target for `/roadmap/<slug>` URLs and social/search metadata. The database and authorization work on either host.

## Auth setup and optional improvements

The authorized email is configured in the non-exposed `roadmap_private.allowed_emails` table. Only a verified Supabase user with that email (or a UUID explicitly in `roadmap_private.admins`) is authorized. Both tables are inaccessible to API clients. To grant or revoke access, use the Supabase SQL editor as the project owner.

For a numeric code instead of copying an email link, set both **Confirm signup** and **Magic link** templates under Authentication → Email Templates to include `{{ .Token }}`. Example:

```html
<h2>Your Roadmap sign-in code</h2>
<p>{{ .Token }}</p>
<p>Enter this code in your Roadmap studio. Ignore this email if you did not request it.</p>
```

Supabase's default mail service sends only to authorized team addresses and is rate limited. It is suitable for this single-owner studio when the owner email matches the Supabase organization account. For other addresses or higher-volume mail, configure a custom SMTP provider before inviting anyone. No public visitor needs an account.

## Verification

```sh
npm ci
npm test
npm run build
```

Tests use a real embedded Postgres engine (PGlite) to exercise the migration, row policies, anonymous reads, unauthorized writes, admin saves, atomic rollback, optimistic concurrency, private notes, media access and soft deletion. `supabase/tests/privacy.sql` runs a second set of checks on live Supabase using a transaction that rolls every test fixture back. Production's security advisor was also checked.

The build copies only public pages and assets into `dist/`. SQL, tests, private notes, and environment files are not deployed as static assets. The GitHub repository is public, so never commit real private content or credentials there.

## Media and caching

All uploads live in a private bucket. Published images are fetched through authenticated Storage requests using anonymous credentials, with RLS tied to the parent entry and media publication flag. Public bucket URLs and long-lived signed links are not used. Unpublishing prevents new downloads; it cannot retract copies someone already downloaded. Removed attachments remain private in storage so accidental editor removal does not permanently destroy files. Clean up unreferenced objects manually if storage use grows.

Server HTML and sitemap responses use no-store so a previously public entry does not remain in the host's cache after becoming private. Public browser queries deliberately do not use the administrator's session.
