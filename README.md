# Crossroads Leadership Academy website

Static website for Crossroads Leadership Academy (Crossroads Academy, Inc.), a 501(c)(3) youth leadership nonprofit serving the Rio Grande Valley. EIN 38-3864606.

Plain HTML and CSS, one small JavaScript file, no framework, no bundler. A short Node script assembles the pages from shared pieces and writes the finished site to `dist/`. Every form goes to one serverless function that can send submissions to GoHighLevel, Mailchimp, or email.

The full build brief, voice rules, and guardrails are in `CLAUDE.md`.

## Quick start

You need Node.js 18 or newer.

```
npm install          # installs Lighthouse, the only dependency (used for testing, not by the site)
npm run build        # builds the site into dist/ and runs the copy and SEO checks
npm run serve        # preview at http://localhost:8080 with the form handler running
npm test             # tests the form handler
```

## What is where

| Path | What it holds |
| --- | --- |
| `index.html`, `about/index.html`, `programs/`, `students/`, `get-involved/`, `sponsors/`, `contact/`, `thank-you/`, `privacy/`, `404.html` | The page copy. Each file starts with a PAGE SETTINGS block (title, description) and then the page sections, each labeled with a comment. |
| `partials/` | Pieces shared by every page: `header.html`, `footer.html`, `sticky-bar.html` (mobile Give and Apply bar), `pick-your-door.html`, `gift-tiers.html`, `head.html`, `analytics.html`, and `layout.html` (the frame that holds them together). Edit one, and every page updates on the next build. |
| `site.config.json` | Site-wide facts: phone, email, mailing address, office hours, social links, EIN, Givebutter link, analytics ID. |
| `assets/css/site.css` | The one stylesheet. Colors are at the top. |
| `assets/js/site.js` | Menu, Spanish toggle, form handling, analytics events. |
| `assets/img/` | Photos, the sharing image, and icons. |
| `assets/fonts/` | Fraunces and Inter from Google Fonts, self-hosted. |
| `assets/docs/` | The Program Overview and Sponsor Packet PDFs. |
| `docs-src/` | The HTML sources for the PDFs and the sharing image. |
| `netlify/functions/submit.js` | The form handler. |
| `api/submit.js` | A thin adapter so the same form handler runs on Vercel. |
| `scripts/` | The build, preview server, tests, Lighthouse runner, and PDF and image generators. |
| `netlify.toml`, `vercel.json` | Hosting settings. |
| `sitemap.xml`, `robots.txt` | Templates. The build fills in the site address and the page list. |

## Editing guide

Edit the files at the top level of the project, never the copies in `dist/`. After any change, run `npm run build` and check the result with `npm run serve`. When the site is connected to Netlify or Vercel, pushing the change to GitHub rebuilds and publishes it automatically.

### Change a headline or any copy

Open the page file (for example `programs/index.html`). Each section starts with a comment in capital letters, like `<!-- ============ HOW IT WORKS ============ -->`. Find the section, change the words between the tags, and leave the tags alone. The search result title and description are in the PAGE SETTINGS block at the top of the file. Keep titles under 60 characters and descriptions under 155; the build stops and tells you if one is too long.

The build also enforces the voice rules. It stops if the visible copy contains an em dash, an exclamation point, an emoji, or one of the banned words (empower, transform, journey, make a difference, passionate, synergy, at-risk, underprivileged, broken).

### Swap in a photo

1. Save the photo as WebP, under 200KB. About 1600 pixels wide for the home page hero, 720 by 900 for portraits, 400 by 400 for board headshots. Free tools such as squoosh.app do the conversion.
2. Put it in `assets/img/` with a plain name, like `hero-home.webp`.
3. In the page file, find the comment above the photo slot. It shows the exact `<img>` line to paste in place of the `photo-slot` box.
4. Write alt text that says who is in the photo and what they are doing, for example "A mentor and two students planning a park cleanup." Never "image" or "photo." The build rejects those.

Never publish a photo of a minor without a signed release from a parent or guardian on file. Until releases are collected, use photos of adult mentors or wide shots where students cannot be identified.

For the home page hero, also add the class `hero--photo` to the hero section so the text gets a dark overlay. Instructions are in the comment at the top of `index.html`.

### Update a gift tier

Open `partials/gift-tiers.html`. Each tier is one link. To change $250 to $300, change three things on that tier: `?amount=250` in the link, `data-tier="250"`, and the `$250` shown on the page, plus the "Give $250" label. Then make sure the same amount exists as an option on the Givebutter campaign, because Givebutter only preselects amounts that are already offered there. The tiers appear on the home page and the Get Involved page; both update together.

### Update the phone, email, address, office hours, or social links

Open `site.config.json` and fill in the value. Leave a value empty until it is confirmed; the site shows a [CONFIRM] marker in its place. The footer, Contact page, privacy policy, Spanish notice, and search engine data all update from this one file. The phone number and address are only added to the search engine data once they are filled in.

### Add a board member, testimonial, sponsor logos, or impact numbers

Each of these has a ready-to-paste block in a comment right where it belongs:

- Board members: About page, LEADERSHIP section. Copy one `person` card per member.
- Testimonial: home page, section 9. Only use a real quote, approved in writing by the person quoted. If there is none, leave the section out.
- Sponsor logos: home page, section 8.
- Impact numbers: home page, section 4. Only use confirmed figures. Until then the band shows the relaunch line.

### Find every open [CONFIRM] item

```
npm run confirm
```

This lists every [CONFIRM] marker still showing on the site, page by page. Markers are highlighted in pink on the page so they are hard to miss. The site is ready to launch when this list is empty.

### Change the Spanish text

Buttons, form labels, navigation, and confirmation messages carry their Spanish text in a `data-es` attribute next to the English, for example `<a ... data-es="Donar ahora">Give Now</a>`. Edit the Spanish there. Form confirmation messages are in `data-success-es` on each form. Error messages are at the top of `assets/js/site.js` under `MSG`.

The language button in the header switches all of these and remembers the choice. A link ending in `?lang=es` (for example on a flyer) opens the site in Spanish. Headlines and body copy stay in English until full Spanish pages are approved. [CONFIRM translation scope]

### Regenerate the PDFs or the sharing image

Edit `docs-src/program-overview.html`, `docs-src/sponsor-packet.html`, or `docs-src/og-image.html`, then run `npm run pdfs` or `npm run images`. These two scripts need Playwright, which is not installed by default:

```
npm install --no-save playwright && npx playwright install chromium
```

Or replace the PDFs in `assets/docs/` with versions made in Canva or Word, keeping the same file names.

## Giving and Givebutter

Every Give Now button, gift tier, and Givebutter link opens https://givebutter.com/CrossroadsAcademy in a new tab. The build adds the new-tab behavior and tracking automatically to any link to givebutter.com, so a new link only needs the right address.

- Gift tiers add `?amount=50`, `?amount=250`, or `?amount=1000`. Monthly links add `?frequency=monthly`. Givebutter only honors these when that amount and monthly giving are turned on for the campaign. [CONFIRM campaign settings]
- Set the campaign's after-donation redirect in Givebutter to `https://crossroadsleadershipacademy.org/thank-you/`. That page thanks the donor, shows a note from the Executive Director, offers a share button, and counts the gift in analytics.
- One gold button per screen: the site's script keeps a single filled gold Give Now visible at a time and shows any others on screen as gold outlines.

## Analytics

`assets/js/site.js` sends these events to `window.dataLayer` and, when it exists, to `gtag()`:

| Event | When | Details sent |
| --- | --- | --- |
| `givebutter_click` | Any click on a Give Now or Givebutter link | `page_path`, `link_location` (header, sticky-bar, home-hero, gift-tier, and so on), `tier` |
| `form_submit` | A form was accepted by the handler | `page_path`, `form_type`, `language` |
| `donation_complete` | The thank-you page loaded after a Givebutter redirect | `page_path` |
| `share_click` | Share button on the thank-you page | `method` |

To turn on GA4, put the measurement ID (G-XXXXXXX) in `site.config.json` under `analytics.ga4MeasurementId`. For a GoHighLevel pixel or Google Tag Manager, paste the snippet into `partials/analytics.html`. [CONFIRM GA4 or GoHighLevel pixel] In GA4, mark `givebutter_click`, `form_submit`, and `donation_complete` as key events, then compare them by `page_path` to see which pages produce donors.

## Form handler

Every form on the site posts to `/api/submit`, which runs `netlify/functions/submit.js`. The handler validates each field, silently drops honeypot hits, tags the submission by form type, and forwards it to one destination. Nothing is stored on the website.

| Form | Page | Tag |
| --- | --- | --- |
| Student application | /students/#apply | Student |
| Mentor application | /get-involved/#mentor | Mentor |
| Sponsor packet request | /sponsors/#packet | Sponsor (and the Sponsor Packet is emailed to the requester) |
| Contact | /contact/ | The "I am a" value: Parent, Student, Donor, Sponsor, Mentor, Media, or Other |
| Event volunteer interest | /get-involved/#volunteer | Volunteer |
| Newsletter signup | Footer, every page | Newsletter |

Every submission also carries the tag `Website`, the page it came from, the visitor's language (en or es), and a timestamp.

### Environment variables

Set these in Netlify under Site configuration, Environment variables. For local testing, copy `.env.example` to `.env`.

| Variable | Needed for | What it is |
| --- | --- | --- |
| `FORM_DESTINATION` | Always | `webhook`, `mailchimp`, `email`, or `log`. Change this one value to switch destinations. |
| `GHL_WEBHOOK_URL` | webhook | GoHighLevel inbound webhook URL (Automation, Workflows, trigger "Inbound Webhook"). Zapier and Make webhook URLs work too. |
| `MAILCHIMP_API_KEY` | mailchimp | Mailchimp API key, ending in a data center like `-us21`. |
| `MAILCHIMP_LIST_ID` | mailchimp | The Mailchimp Audience ID. |
| `NOTIFY_EMAIL` | email, and mailchimp for student applications | Who receives submissions. Separate several addresses with commas. |
| `RESEND_API_KEY` | email, and the Sponsor Packet email | API key from Resend (resend.com), the service that sends the email. |
| `EMAIL_FROM` | email, and the Sponsor Packet email | Sender address on a domain verified in Resend, for example `Crossroads Website <forms@crossroadsleadershipacademy.org>`. |
| `SITE_URL` | Optional | Public site address for the Sponsor Packet link. Netlify sets `URL` automatically, so only needed on Vercel. |
| `SPONSOR_PACKET_URL` | Optional | Use a different Sponsor Packet link than `/assets/docs/sponsor-packet.pdf`. |

`MAILCHIMP_API_BASE` and `RESEND_API_BASE` exist only so the tests can point at a local mock. Do not set them in production.

### How each destination behaves

**webhook (GoHighLevel).** The submission is sent as one flat JSON object: `form_type`, `tag`, `tags`, `first_name`, `last_name`, every form field, `language`, `source_page`, `submitted_at`, and for sponsor requests `sponsor_packet_url`. In GoHighLevel, map the fields in the Inbound Webhook trigger, then branch the workflow on `tag`. To send the Sponsor Packet from GoHighLevel, add an email step that links to `sponsor_packet_url`.

**mailchimp.** The contact is added or updated in the audience with the form tag and `Website`. Newsletter signups are added as subscribed. Everyone else is added as transactional, so an application never signs someone up for marketing email without asking. The full submission is saved as a note on the contact. Student applications have no email address, so they go to `NOTIFY_EMAIL` instead; set up email (below) when using Mailchimp. When email is set up, staff also get an email for every other submission.

**email.** Each submission is emailed to `NOTIFY_EMAIL` through Resend, with the submitter's address as reply-to.

**log.** The submission is printed to the function log and goes nowhere. `npm run serve` uses this when nothing is set.

**Sponsor Packet.** Whenever `RESEND_API_KEY` and `EMAIL_FROM` are set, a sponsor request also emails the requester a link to the packet, whatever the destination.

If the destination is missing or fails, the visitor sees "Your form was not sent" and can try again. Nothing is silently dropped.

### Testing the handler

```
npm test
```

This runs every form type through the handler against a local mock of GoHighLevel, Mailchimp, and Resend, including honeypot, validation, and failure cases. No accounts or network access needed.

## Deploy on Netlify (default)

Do not deploy until the launch checklist below is complete.

1. In Netlify, choose Add new site, Import an existing project, and pick this GitHub repository.
2. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, functions in `netlify/functions`. Nothing to type.
3. Under Site configuration, Environment variables, add the form handler variables (see the table above). Start with `FORM_DESTINATION` and the variables for that destination.
4. Deploy. Open the Netlify preview address on a phone and submit every form once. Check that each one arrives tagged correctly.
5. Under Domain management, add `crossroadsleadershipacademy.org` and follow Netlify's DNS steps. Netlify issues the HTTPS certificate automatically. Turn on Force HTTPS if it is not already on.

The Netlify CLI is not required. To run the site exactly as Netlify will, `npx netlify-cli dev` works, but `npm run serve` covers the same ground with no account.

## Deploy on Vercel (alternative)

1. In Vercel, choose Add New, Project, and import this repository.
2. Framework preset: Other. Vercel reads `vercel.json`: build command `npm run build`, output directory `dist`.
3. Vercel runs `api/submit.js` as the form handler at `/api/submit`. It is a thin wrapper around `netlify/functions/submit.js`, so behavior is identical.
4. Add the same environment variables under Settings, Environment Variables, plus `SITE_URL=https://crossroadsleadershipacademy.org` (Vercel does not set it automatically).
5. Add the domain under Settings, Domains. Vercel issues the HTTPS certificate automatically.

## Quality checks

| Command | What it checks |
| --- | --- |
| `npm run build` | One H1 per page, title and description length, alt text, and the voice rules. Stops on any problem. Prints the [CONFIRM] count per page. |
| `npm test` | The form handler: every form type, honeypot, validation, all three destinations, and failure handling, against a local mock. |
| `npm run test:browser` | The built site in a real browser: every form submitted end to end, Spanish toggle, Givebutter tracking, mobile menu, skip link, one gold button per screen, no console errors, no sideways scrolling at 390px. Needs Playwright (see above). |
| `npm run lighthouse` | Lighthouse on a mobile profile for the home page and Programs page (add paths to test others: `npm run lighthouse -- / /students/`). Fails if any score is under 90. Reports are saved in `.lighthouse/`. |

Lighthouse is installed locally as a dev dependency (`npm install` adds it), never globally. It needs Chrome or Chromium on the machine; set `CHROME_PATH` if it is not found.

Last run, before launch content: Performance 100, Accessibility 100, Best Practices 100, SEO 100 on the home, Programs, Students, and Get Involved pages, mobile profile. Home page weight about 140KB. Adding photos will add weight; keep each under 200KB and the home page under 1.5MB.

## Performance rules

- No frameworks, no jQuery, no carousels, no autoplay video, no pop-ups.
- Photos: WebP, under 200KB, with `width` and `height` set. Add `loading="lazy"` to every photo except the home page hero.
- Fonts are Google Fonts (Fraunces and Inter), self-hosted in `assets/fonts/` with `font-display: swap` and preloaded, which saves two connections to Google on every visit.
- CSS and JS links carry a version number that changes on every build, so browsers cache them for a year and still get edits right away.

## SEO

Each page has its own title, description, canonical link, and Open Graph tags (the sharing image is `assets/img/og-default.jpg`; a page can use another with `ogImage:` in its PAGE SETTINGS). The home page carries schema.org data for the organization: name, legal name, EIN, 501(c)(3) status, Givebutter as the donate action, and the phone and address once they are filled in. schema.org models a nonprofit as an `NGO` with `nonprofitStatus: Nonprofit501c3`, which is what search engines read. The build writes `sitemap.xml` and `robots.txt`. The thank-you and 404 pages are marked noindex.

## Launch checklist

The site does not launch until every box is checked. Run `npm run confirm` to see every open [CONFIRM] marker.

- [ ] Age range and grade eligibility confirmed
- [ ] Program length, cadence, and start date confirmed
- [ ] Gift tier amounts and what each funds confirmed
- [ ] Sponsor tier amounts and benefits confirmed
- [ ] Mentor hours per month and background check policy confirmed
- [ ] Impact figures confirmed or impact band replaced with the relaunch line
- [ ] Founder note approved by Cristina Solis Wilson
- [ ] Board members, photos, and bios collected
- [ ] Phone, email, mailing address, and office hours confirmed
- [ ] Logo and brand colors supplied or default palette approved
- [ ] Photos with signed releases supplied, minimum eight
- [ ] At least one real testimonial collected, or section removed
- [ ] Program Overview PDF and Sponsor Packet PDF created
- [ ] Form handler connected and tested from a phone
- [ ] Givebutter link tested and thank-you redirect set
- [ ] Spanish translation scope decided and delivered
- [ ] Analytics snippet installed and one test event verified
- [ ] Privacy policy published
- [ ] Domain pointed and HTTPS verified
