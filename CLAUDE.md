# CLAUDE.md

This file holds the master build prompt for the Crossroads Leadership Academy website. Any agent working in this repository should treat it as the source of truth for facts, copy, voice, design, and guardrails. Copy marked verbatim below is final. Anything not confirmed by the organization stays marked [CONFIRM].

Working notes for future edits:

- Source pages live at the repo root (index.html, about/index.html, and so on). Shared pieces live in partials/. Site-wide facts (phone, email, address, EIN, Givebutter URL, analytics ID) live in site.config.json.
- Run `npm run build` to produce dist/. The build reports every open [CONFIRM] marker and flags banned words, em dashes, and exclamation points in visible copy.
- Run `npm test` to exercise the form handler, and `npm run serve` to preview dist with the form handler wired up.

---

# Crossroads Leadership Academy Website: Master Build Prompt

## Role

You are a senior nonprofit web strategist, conversion copywriter, and front-end developer working as one person. You have built donor-facing websites for youth organizations that raised six figures from local sponsors, and you understand that a small nonprofit's site has one job: turn a visitor into a donor, a mentor, a sponsor, or an enrolled student within ninety seconds.

## Assignment

Build the complete website for Crossroads Leadership Academy, a 501(c)(3) youth leadership nonprofit serving the Rio Grande Valley in South Texas. The site must feel like a serious institution with real results, not a volunteer project. It must work first on a phone, because parents, students, and local business owners in the Valley will open it on a phone.

## Output contract

You are working in the current directory. Build in this order, commit after each step with a one-line message, and do not stop to ask questions mid-build. Collect every open question as a [CONFIRM] item and present them all at the end.

1. Scaffold a static site with this structure: index.html at the root; about, programs, students, get-involved, sponsors, contact, thank-you, and privacy as folders each holding an index.html; assets/css/site.css; assets/js/site.js; assets/img; a serverless form handler at netlify/functions/submit.js; netlify.toml; sitemap.xml; robots.txt; .env.example; README.md; and CLAUDE.md containing this prompt.
2. Build the shared layout once. Header, navigation, mobile sticky bar, Pick Your Door block, and footer live as partials, injected by a small Node build script with no framework and no bundler, so one header edit updates every page. Output goes to a dist folder.
3. Write every page with the final copy from this document. No lorem ipsum, no placeholder text other than [CONFIRM] markers.
4. Write one serverless function that validates input, rejects honeypot hits, tags each submission by form type, and forwards it to a destination chosen by environment variable: FORM_DESTINATION set to webhook, mailchimp, or email, using GHL_WEBHOOK_URL, MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, or NOTIFY_EMAIL. Document every variable in README.md and .env.example.
5. Point every Give Now button at https://givebutter.com/CrossroadsAcademy in a new tab and fire an outbound click event. Build the thank-you page for the Givebutter redirect.
6. Add meta titles, meta descriptions, Open Graph tags, canonical tags, NonprofitOrganization JSON-LD on the home page, sitemap.xml, and robots.txt.
7. Verify. Run the build, serve dist locally, run Lighthouse from the CLI on the home page and one interior page on a mobile profile, and fix anything scoring under 90 on Performance, Accessibility, Best Practices, or SEO. Test every form against the function locally.
8. Make it deploy-ready for Netlify by default, with Vercel instructions in README.md. Do not deploy. The owner connects the repo.
9. Print the launch checklist from the last section with every [CONFIRM] item still open, then stop.

Work from the facts, audiences, copy, design direction, and requirements that follow. Where the copy is written out, use it verbatim. Where only a spec is given, write the copy in the voice defined under Positioning. Do not invent statistics, student names, outcomes, partner logos, or quotes. Mark anything you cannot confirm as [CONFIRM]. If a tool such as Lighthouse or Netlify CLI is missing, install it locally in the project, never globally, and note it in README.md.

## Organization brief and verified facts

Use only these facts. Everything else about the organization is a [CONFIRM] placeholder.

- Legal name: Crossroads Academy, Inc. Site brand: Crossroads Leadership Academy.
- Status: 501(c)(3) public charity, EIN 38-3864606.
- Service area: Rio Grande Valley, South Texas.
- Founder: Cristina Solis Wilson. On the site her title is "Founder" (owner's instruction, October 2026).
- Flagship program: YOLI Leadership Academy.
- Four program pillars (confirmed by the owner, October 2026): Leadership Development; Workforce Readiness and Career Pathways; Entrepreneurship; Mentorship, Character, and Civic Engagement.
- YOLI Leadership Academy falls under Leadership Development. The TITA Program falls under Mentorship, Character, and Civic Engagement. Programs under the other two pillars are [CONFIRM].
- Current phase: relaunched in 2026 after a rebuild.
- Current website: crossroadsleadershipacademy.org.
- Donation page: https://givebutter.com/CrossroadsAcademy.

The problem the organization exists to solve, in its own words: youth across the Rio Grande Valley face limited mentorship, financial barriers, a lack of college and career guidance, limited access to leadership development, and generational poverty.

What donations fund: training new volunteers and mentors, youth scholarships for program participation, meeting spaces and supplies, and hands-on leadership and service opportunities.

Open facts you must mark [CONFIRM]: age range served, number of students served to date, program length and meeting cadence, cost per student scholarship, program locations, board members, partner organizations, any outcome figures, student or parent quotes, and photographs.

## Audiences and the one action each must take

The site serves four audiences. Each lands with a different question and must find its answer and its button within one scroll. Design every page so these four paths never compete for the same space.

| Audience | What they are asking | The one action | Primary objection to overcome |
| --- | --- | --- | --- |
| Parents and guardians | Is this safe, real, and worth my kid's time? | Apply for the program | "We can't afford it" and "I don't know these people" |
| Students, roughly 13 to 18 [CONFIRM] | Is this for someone like me, or just for the honor-roll kids? | Apply for the program | "This isn't for me" |
| Donors and local sponsors | Will my money produce something I can see in my community? | Give now, or request a sponsor packet | "Small nonprofits waste money" |
| Volunteers and mentors | Can I actually help, and how much time does it take? | Apply to mentor | "I don't have time" and "I'm not qualified" |

Priority order for the home page: donors and sponsors first, because they fund everything else, then parents, then mentors, then students. Students get their own path through the Programs page and a dedicated Students page written in second person at their reading level.

The Valley context matters. Many visitors will be first-generation college families, bilingual households, and small business owners who give locally and want to be seen giving locally. Write for them. Offer Spanish on every call to action and form [CONFIRM full translation scope].

## Positioning, brand voice, and messaging pillars

Positioning statement: Crossroads Leadership Academy is where Rio Grande Valley teenagers learn to lead before anyone tells them they can't. We put young people in front of mentors, real responsibility, and a clear path to college and career, and we do it at no cost to families who could never pay for it.

The big idea in one line: Leaders are not born in the Valley by accident. Somebody builds them.

Messaging pillars. Every page should hit at least two.

1. Mentorship, not programming. Students are matched with adults who show up week after week. The relationship is the product.
2. Real leadership, not leadership theory. Students run service projects, speak in public, and make decisions with consequences.
3. A path, not a pep talk. College, financial aid, trades, military, and entrepreneurship are all legitimate routes, and students leave with a plan.
4. No family turned away for money. Scholarships cover participation. Donors fund the seats.
5. Built by the Valley, for the Valley. Local leaders, local sponsors, local outcomes you can see at a graduation or a ribbon cutting.

Voice rules:

- Direct, warm, confident. Short sentences. Plain words. Second person wherever possible.
- No pity language. Never describe students as at-risk, underprivileged, or broken. Describe barriers as barriers and students as capable.
- No nonprofit cliches: no "empower," "transform," "journey," "make a difference," "passionate," or "synergy."
- Specific over inspirational. "Fourteen students presented a city council proposal" beats "students found their voice."
- No em dashes. No emojis. No exclamation points except inside a single supplied testimonial.
- Spanish where it serves a parent, never as decoration.

## Site architecture and navigation

Seven pages, one persistent Give button, and a sticky mobile footer bar with Give and Apply. Nothing deeper than two clicks.

| Page | URL | Job of the page | Primary button | Secondary button |
| --- | --- | --- | --- | --- |
| Home | / | Convince a donor in 60 seconds, route everyone else | Give Now | Apply |
| About | /about | Build trust: founder, board, 501(c)(3) proof | Meet the Team | Give Now |
| Programs | /programs | Explain YOLI Leadership Academy and who it is for | Apply | Download Program Overview |
| Students | /students | Speak directly to teens in their language | Apply | Ask a Question |
| Get Involved | /get-involved | Three doors: Give, Mentor, Sponsor | Give Now | Become a Mentor |
| Sponsors | /sponsors | Turn local businesses into named sponsors | Request Sponsor Packet | Give Now |
| Contact | /contact | One form and one phone number | Send Message | Give Now |

Top navigation, left to right: Logo, About, Programs, Students, Get Involved, Sponsors, Contact, and a filled Give Now button on the far right. On mobile, collapse to a menu icon with Give Now still visible outside the menu.

Footer on every page: mission line, EIN and 501(c)(3) statement, mailing address [CONFIRM], phone [CONFIRM], email [CONFIRM], social links [CONFIRM], Givebutter donation link, privacy policy, and a one-field newsletter signup labeled "Get the monthly student update."

Givebutter remains the donation processor. Every Give Now button opens the Givebutter page in a new tab until the owner embeds the Givebutter form directly.

## Home page copy, section by section

Use this copy verbatim. Numbers are the build order from the top down.

1. Hero. Full-width photo of students mid-activity, not posed [CONFIRM photo]. Overlay text, left aligned.
   - Eyebrow: Rio Grande Valley, Texas
   - Headline: Leaders are not born in the Valley by accident. Somebody builds them.
   - Subhead: Crossroads Leadership Academy puts South Texas teenagers in front of real mentors, real responsibility, and a real plan for life after high school. At no cost to their families.
   - Button 1: Give Now
   - Button 2: Apply for the Program
   - Trust line under buttons: 501(c)(3) nonprofit. Every dollar stays in the Valley.

2. The problem, in three cards. Section heading: What stands between a Valley teenager and a future they chose.
   - Card 1 title: No one to call. Body: Most of our students have never had an adult outside their family ask what they want to do with their life, then help them get there.
   - Card 2 title: No map. Body: College applications, financial aid, trades, and military service all have deadlines and paperwork nobody explained. Missing one can close the door.
   - Card 3 title: No money for the extras. Body: Leadership camps, test prep, and campus visits cost money. Families choosing between those and rent choose rent. We make sure they don't have to choose.

3. What we do. Heading: One program. Three things that change.
   - Lead: YOLI Leadership Academy is a [CONFIRM length] program for students in grades [CONFIRM]. Students meet [CONFIRM cadence], and every student is matched with a mentor who stays with them through the program.
   - Column 1 title: A mentor who shows up. Body: Weekly contact with a trained adult who knows the student's name, goals, and obstacles.
   - Column 2 title: Leadership you can measure. Body: Students plan and run a community service project, present in public, and lead their peers. They leave with proof, not a certificate.
   - Column 3 title: A written plan for what comes next. Body: Every graduate leaves with a one-page plan: the path they chose, the deadlines, the money, and the people who will help.
   - Button: See the Full Program

4. Impact band. Dark background, four large numbers [CONFIRM every figure]. Labels: Students served, Mentors trained, Service projects completed, Scholarships funded. If figures are not available, replace this band with a single line: "We relaunched in 2026. Our first class graduates [CONFIRM date]. Be the sponsor whose name is on that program."

5. Founder note. Photo of Cristina Solis Wilson [CONFIRM]. Heading: Why we built this.
   - Body, first person [CONFIRM final wording with Cristina]: I grew up in the Rio Grande Valley. I know what it costs a young person to have no one in their corner who has already been where they want to go. I spent my career leading soldiers, and I learned that leadership is taught, practiced, and earned. It is not reserved for people with the right last name or the right zip code. Crossroads exists so that every teenager in the Valley has someone who will teach it to them, hold them to it, and open the first door. That is the whole mission.
   - Signature line: Cristina Solis Wilson, Founder

6. Donor section. Heading: Your gift buys a seat. Here is exactly what the seat costs.
   - Lead: We fund students, not overhead. Choose the gift that matches what you want to see happen.
   - Three gift tiers [CONFIRM amounts]: $50 covers a student's supplies and materials for a session. $250 covers one student for a full month, including mentor time. $1,000 covers one student's full scholarship from first day to graduation.
   - Button: Give Now
   - Line under button: Monthly giving available. Local business sponsorships start on the Sponsors page.

7. Mentor section. Heading: You do not need to be an expert. You need to show up.
   - Body: Mentors give about [CONFIRM] hours a month. We train you, match you, and support you. If you have finished high school, built a career, served in the military, or run a business, you have something a Valley teenager needs to hear.
   - Button: Become a Mentor

8. Sponsor logos strip [CONFIRM]. Heading: Built by the Valley. If no sponsors yet, replace with: Founding sponsor seats are open for 2026. Your logo here.

9. Testimonial [CONFIRM a real quote]. One quote, name, role. If none is supplied, omit the section entirely. Never use a placeholder quote.

10. Final call. Heading: Pick your door. Three cards side by side: Give (Fund a seat), Mentor (Give your time), Apply (Join the next class). Each card is one sentence and one button.

11. Footer as specified under Site architecture.

## Interior page specs and copy

Each interior page follows the same frame: a short hero with one headline and one button, the body sections listed here, and the same Pick Your Door closing block from the home page.

About. Headline: A Valley organization, run by Valley leaders. Sections: the origin story in 150 words [CONFIRM with Cristina]; the mission in one sentence; a Leadership block with photo, name, and two-line bio for the Executive Director and each board member [CONFIRM]; a Trust block showing the 501(c)(3) status, the EIN, the Givebutter verification, and a link to the most recent Form 990 when available [CONFIRM]; and a Partners block [CONFIRM]. Close with Give Now.

Programs. Headline: YOLI Leadership Academy. Subhead: Mentorship, leadership practice, and a plan for what comes next. Sections: Who it is for (age, grades, eligibility, cost: free with scholarship); How it works as a four-step numbered path (Apply, Match with a mentor, Lead a project, Graduate with a plan); What students do each month [CONFIRM]; What parents can expect, including safety, background checks on all mentors [CONFIRM policy], and communication cadence; an FAQ of eight questions written from a parent's point of view; and the application button repeated three times down the page. Offer a downloadable one-page Program Overview PDF [CONFIRM].

Students. Written in second person for a 15-year-old. Headline: This is for you if you are tired of waiting for permission. Body: You do not need perfect grades. You do not need a plan yet. You need to show up, do the work, and let someone who has been where you want to go help you get there. Sections: What you will actually do (three plain bullets); What it costs you (nothing but your time and your word); What you get (a mentor, a project you led, a plan, and people who will write your recommendation letters); and a short form: name, grade, school, phone, and one question: What do you want to be different a year from now? Button: Apply.

Get Involved. Headline: Three ways in. Three equal panels: Give (link to Givebutter, tiers repeated), Mentor (time commitment, training, background check, apply form with name, email, phone, occupation, and availability), Sponsor (link to Sponsors page). Add a fourth short block: Volunteer for an event, with a simple interest form.

Sponsors. Headline: Put your business name on a graduate. Lead: Local sponsors fund seats and get seen doing it. Sponsorship tiers in a table [CONFIRM amounts and benefits]: Founding Sponsor, Class Sponsor, Project Sponsor, Event Sponsor. Each row shows the amount, what it funds, and the recognition the sponsor receives (logo placement, event recognition, social media, graduation program). Button: Request the Sponsor Packet, which opens a form for business name, contact, email, phone, and tier of interest. Include the line: Sponsorships are tax deductible to the extent allowed by law. Consult your tax advisor.

Contact. Headline: Talk to a person. One form: name, email, phone, I am a (dropdown: Parent, Student, Donor, Sponsor, Mentor, Media, Other), message. Beside the form: phone, email, mailing address, and office hours [CONFIRM all]. Embed a map only if there is a physical program location to show.

## Design direction

The site should look like a well-funded institution that happens to be young. Confident, clean, photographic, and warm. If the organization already has brand colors or a logo [CONFIRM], use them and fit the palette below around them.

- Primary color: deep navy #14213D for headers, footer, impact band, and primary buttons.
- Accent color: warm gold #D4A017 for the Give Now button only, so it is the one gold thing on every page.
- Secondary accent: Valley teal #1B7F79 for links, icons, and the Mentor and Apply buttons.
- Background: off-white #FAF8F3 with white cards.
- Text: near-black #1A1A1A on light backgrounds; off-white on navy.
- Headline font: Fraunces or Playfair Display, bold, tight line height.
- Body font: Inter or Source Sans 3, 18px base on desktop, 17px on mobile, line height 1.6.
- Buttons: fully rounded, 52px tall on mobile, strong contrast, one primary per section.
- Photography: real students and mentors in the Valley, candid, daylight, faces visible, no stock photos of generic teens.
- Layout: max content width 1200px, generous white space, cards with 12px radius and a soft shadow.
- Motion: subtle fade-in on scroll only; nothing that delays reading.

Rules:

- Mobile first. Design every section at 390px wide before scaling up.
- One gold button per screen. If two sections with Give Now are visible at once, the second becomes an outlined button.
- Photographs carry the emotion. Copy carries the facts. Do not use icons to replace photos of real people.
- No carousels, no autoplay video, no pop-ups on first visit. A single slide-up newsletter bar after 40 seconds is acceptable.
- Single light theme. Dark mode is not required.
- Every image has alt text that describes the person and the activity, never "image" or "photo."

## Conversion architecture and forms

Every page ends in a button, and every form takes under 60 seconds on a phone. Four forms, one donation link, nothing else.

| Form | Fields | Confirmation message | Tag |
| --- | --- | --- | --- |
| Student application | Name, grade, school, phone, parent name, parent phone, one open question | "Got it. A real person will call you within three days." | Student |
| Mentor application | Name, email, phone, occupation, hours per month, why you want to mentor | "Thank you. We will reach out to schedule a short conversation." | Mentor |
| Sponsor packet request | Business, contact, email, phone, tier of interest | "Your packet is on the way. Expect a call from our Executive Director." | Sponsor, plus auto-send the PDF |
| Contact | Name, email, phone, I am a, message | "Received. We answer within one business day." | Dropdown value |

Donation flow: every Give Now button opens the Givebutter campaign in a new tab. Pass the tier amount in the link where Givebutter supports it. Build /thank-you as the Givebutter redirect target, with a short note from the Executive Director and a share button.

Persistent elements: Give Now in the header on every page, a sticky bottom bar on mobile with Give and Apply, and a Pick Your Door block before every footer.

Tracking: fire one event per form submission and one per outbound Givebutter click so the owner can see which page produces donors. Use a single analytics snippet placeholder [CONFIRM GA4 or GoHighLevel pixel].

The form handler must be pointable at GoHighLevel by webhook, at Mailchimp by API key, or at a plain email endpoint, by changing one environment variable.

## Technical, SEO, and accessibility requirements

The site must load in under two seconds on a mid-range phone on a cellular connection in Hidalgo County. That constraint drives every technical decision.

Performance: static HTML and CSS, no framework, no jQuery, images served as WebP under 200KB with lazy loading below the fold, Google Fonts loaded with display swap, total home page weight under 1.5MB.

SEO: one H1 per page, meta title under 60 characters and meta description under 155 characters per page, Open Graph image and tags on every page, sitemap.xml, robots.txt, canonical tags, and NonprofitOrganization schema on the home page with name, legal name, EIN, address, telephone, URL, and the Givebutter donation URL as the potentialAction. Target phrases: youth leadership program Rio Grande Valley, teen mentorship McAllen, youth nonprofit South Texas, leadership academy for teens RGV, sponsor youth program Texas. Use them naturally, never stuffed.

Accessibility: WCAG 2.1 AA. Contrast 4.5 to 1 minimum on all text, visible focus states, full keyboard navigation, skip-to-content link, labeled form fields with text error messages, no information conveyed by color alone.

Bilingual: a language toggle in the header. At minimum, all buttons, form labels, and confirmation messages in Spanish. Full Spanish pages for Programs and Students are strongly recommended [CONFIRM scope].

Security and compliance: HTTPS only, a privacy policy page, honeypot fields on every form, no student data stored on the site itself. All submissions go to the form handler.

Ownership: the site must be editable by a non-developer. Keep copy in clearly commented sections, keep one stylesheet, and write a README that explains how to change a headline, swap a photo, update a gift tier, and point the form handler at a new destination.

## Guardrails

- Never invent a statistic, a student name, a quote, a partner, a board member, or an outcome. Use [CONFIRM] and move on.
- Never show a photo of a minor without a signed release on file. Use adult mentors or wide shots until releases are collected.
- Never describe students with deficit language. Barriers are external. Students are capable.
- Never bury the Give Now button below the fold on any page.
- Never ship a placeholder testimonial, a placeholder logo strip, or a stock photo of a teenager.

## Launch checklist

When the build is done, print this checklist with every open item listed. The site does not launch until every box is checked.

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

End of prompt.
