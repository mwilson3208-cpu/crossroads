# Crossroads Leadership Academy website

Static website for Crossroads Leadership Academy (Crossroads Academy, Inc.), a 501(c)(3) youth leadership nonprofit serving the Rio Grande Valley. EIN 38-3864606.

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
