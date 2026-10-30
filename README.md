# Elite Smile — demo

A patient app, a clinic panel in 3D and a new website for **Elite Smile Dental Clinic**, the dental clinic at
Alard du Hamelstraat 33 in Eindhoven with its dental hygiene practice at Engweg 17 in Hoogland (Amersfoort). This is a
demo with test data only: fictional patients, a fictional agenda, and no real bookings, records or payments.

- Start page: `/` (the app in a phone next to the clinic panel and the website, thirty features to click through)
- Patient app: `/app/`
- Clinic panel: `/admin/` (`?at=2026-10-31T11:00` sets the clinic clock)
- Website: `/website/`, with a page per dentist at `/website/tandarts/<id>/`
- Explainer video: `/hulp/` (2:46, Dutch narration, subtitles in seven languages, chapters)

## The patient app: thirty features

**Appointments**

1. **Booking in six questions** (after Lama Lama's one-question-per-step form): who, what, where, with whom, when, and a
   last look. The free check-up first, as on elitesmile.nl. Real opening days: Eindhoven Sun, Wed, Fri, Sat 09:30–17:00;
   Hoogland Sat and Sun 10:00–17:00. The confirmation scrambles into the time and the room.
2. **Nearest clinic** by postcode (PDOK, the Dutch government's address service), like the site's own finder.
3. **Earlier place**: a waiting list; the clinic offers a freed-up slot from its panel, the patient takes it with a tap.
4. **Family planner**: mother and son back to back, every appointment into the phone's calendar (.ics).
5. **Check-up rhythm**: every six months, as the clinic advises, with what the insurance still pays this year.

**Before the treatment**

6. **Health questionnaire** (anamnesis): blood thinners, bone medication, heart valves, allergies, pregnancy, smoking,
   anxiety; each yes says why it matters; "nothing changed" confirms it before the next visit.
7. **Preparation per appointment**: a checklist in the order it is due, a countdown, route and calendar.
8. **The treatment in 3D**: six step-by-step explainers (implant as an exploded watch movement after GQ & AP's
   Extraordinary Lab; root canal, crown, veneer, filling, braces); dragging turns the model into a CAD drawing (Floema).
9. **Informed consent** the way the WGBO asks: what, why, alternatives, risks, recovery; signed with a finger.
10. **Estimate and insurance**: what it costs, what the supplementary insurance pays, what is left (demo amounts).
11. **Calm mode**: how anxious you are (the dentist sees it), a hold-to-breathe ring with a rising tone (Why Zero), a
    stop signal, and what you will hear and feel.

**In the clinic**

12. **Check in with a slide** (Son Daven's "drag to slide"): the front desk and the panel see you have arrived.
13. **Live in the waiting room**: who waits for you sees which step the dentist is at.
14. **Pause button**: the room lights up on the panel; the dentist answers with one tap.
15. **Interpreter in the chair**: ready sentences in seven languages, with the Dutch turned upside down for the dentist.

**After the treatment**

16. **Aftercare to listen to**: hour by hour, or as a conversation between the dentist and the assistant with captions;
    moving through it pauses the voice instead of speeding it up (GQ & AP).
17. **Numbness timer**: nothing hot, don't bite your lip (children especially).
18. **Pain diary**: pain and swelling per day; pain that rises again after day 3, a fever or bleeding means "call", on
    the panel too.
19. **Medication alarm**: the prescription as a schedule, with a stop at the daily maximum.
20. **Wound photo**: the dentist reviews it on the panel and answers.
21. **What can I eat?** per phase after implant, filling, whitening or braces.
22. **Pain or emergency**: the questions that can't wait first (breathing, swallowing, heavy bleeding → 112), then
    first aid (a knocked-out tooth in milk, within the hour) and whom to call.

**My teeth**

23. **My teeth in 3D**, and the mouth as a site plan with every tooth a plot (ERA Residence).
24. **X-ray with notes** (a demo picture drawn from the 3D model).
25. **Implant passport** for every future dentist.
26. **Smile studio**: whitening and veneer impressions on your own photo, with the VITA shade guide.
27. **Oral health score**, and zooming down to the enamel until bacteria appear (Oryzo AI).

**Family and every day**

28. **Brushing coach** in 3D with achievements that unlock toothbrushes (Bruno Simon).
29. **Braces buddy**: a hall of fame of braces visits with the elastics of that day, to spin in 3D (Lando Norris).
30. **Kids' corner**: the first visit as a story, stickers, the tooth fairy, and a golden key that unlocks drawing on a
    3D tooth (The Renaissance Edition).

And: chat with the clinic, the dentists' profiles, sharing the free check-up, light and night looks, seven languages.

## The clinic panel

The Eindhoven clinic in 3D: six treatment rooms, waiting room, front desk, X-ray and sterilisation. The six dentists
stand in it as Sims-like figures with their own faces from elitesmile.nl and a diamond over their heads that shows how
busy they are; click one for the agenda, the occupancy, the details, the social accounts and a page of their own to
share. Plus the agenda, everything that comes in from the app live (bookings, check-ins, pause requests, pain, wound
photos, messages, consent), the aftercare monitor, sterilisation and the numbers.

## The website

A visual concept for elitesmile.nl in seven languages, with one idea from each of the ten most-awarded websites of 2026
(the Awwwards Sites of the Month January–September 2026 and the Site of the Year 2025) and a page per dentist.

## Real and demo

Real (from elitesmile.nl and arab.elitesmile.nl, October 2026): the two practices with address and opening days, phone
and WhatsApp 06 38208557, info@elitesmile.nl, Instagram @mj.elite.smile, the seven specialties and their treatments,
whitening and the six questions and answers, the free check-up, the logo, the photos, and the six dentists (Dr. Omar,
Dr. Buthaina, Dr. Ayman, Dr. Najla, Dr. Mahmoud, Dr. Ahmad) with their title and portrait. Demo: Layla Benali and her
children Sofia and Adam, all other patients, the agenda and which dentist works in which room, the assistants and the
front desk (Sara, Lotte, Imane, Nadia, Ruben, Fleur), the amounts, the prescription, the teeth, the X-ray, the implant
data, the clinic building in 3D. Nothing invented is said about the real dentists. The care texts (before, after,
normal, when to call) are general dental guidance written for this demo; before a launch the clinic's dentists check and
own every line. There are no made-up reviews.

## The explainer video

`site/hulp/` holds a 2:46 Dutch explainer (`elite-smile-uitleg.mp4`, 1920 × 1080) in ten chapters: the app (today,
booking, before, in the clinic, after, teeth and family), the clinic panel, the website, and real versus demo. The app,
the panel and the website were recorded live in headless Chrome (GPU, real time) from the built site, composed with
ffmpeg under designed overlays, and narrated by macOS's Dutch voice Claire. Subtitles: `elite-smile-uitleg.<lang>.vtt`.

## Languages

Dutch is the default. The app, the panel and the start page also come in English, Türkçe, العربية (right to left),
Français, Deutsch and Italiano: Ik → Taal in the app, the header select in the panel and on the start page, or
`?lang=en|tr|ar|fr|de|it`. The choice is remembered on the device (`smile-lang`). The code writes Dutch; the
dictionaries in `packages/shared/src/i18n/` map that Dutch to each language. After changing text, run
`node scripts/i18n-extract.mjs` to list every Dutch text in `_i18n/source.json`. The website keeps its own dictionaries in
`site/website/`.

## Structure

```
apps/app/          the patient app (Expo SDK 58, Expo Router), exported for the web; 3D in src/three (three.js)
apps/admin/        the clinic panel (Vite, React, three.js)
packages/shared/   the clinic's facts, the team, the treatments and their care, the demo day and patient, the clock,
                   the look and the app-to-panel link
site/              the start page and the website (site/website)
scripts/           build and serve the site as GitHub Pages does; the i18n extraction
```

The clinic clock is Eindhoven time while the clinic is open; otherwise both screens replay the last open day from
09:30 to 17:00 at real speed. The app and the panel talk through the browser's storage, so they work together when they
are open side by side on the same site.

## Run

```bash
npm install
npm run web
```

The app opens on http://localhost:8097. The panel has its own install:

```bash
npm --prefix apps/admin install
npm run admin
```

It opens on http://localhost:5189. `npm run typecheck` checks both. `npm run site` builds everything into `_site/` and
`npm run site:serve` serves it on http://localhost:8107/elite-smile-demo/, where the app, the panel and the website share
one origin.
