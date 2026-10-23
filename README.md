# LTL – Live To Learn (Phase 2)

A responsive React + TypeScript + Vite frontend for a competitive-exam learning website.

## Phase 2 flow

1. Home page → **Find your exam**
2. Separate exam-selection page → **TNPSC / RRB / SSC**
3. Separate learning-mode page → **Teaching / Notes / Quiz / Test**
4. Separate subject-selection page → subjects tailored to the selected exam
5. Profile page → editable guest display name and learning goal (authentication is intentionally deferred to the final phase)

### Subject categories currently included

- **TNPSC:** General Tamil, General English, General Studies, Aptitude & Mental Ability, Current Affairs
- **RRB:** Mathematics, General Intelligence & Reasoning, General Science, General Awareness & Current Affairs
- **SSC:** General Intelligence & Reasoning, General Awareness, Quantitative Aptitude, English Comprehension, Computer Knowledge

These are broad subject categories and can be adjusted to match a specific TNPSC/RRB/SSC exam notification and level.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Vercel settings: Framework Preset **Vite**, Build Command `npm run build`, Output Directory `dist`.

## Important scope note

This phase includes the page navigation, exam-specific subject lists, subject search/selection, and a guest profile UI. Teaching lessons, notes, quiz questions, tests, backend persistence, and login/authentication are not connected yet; those can be added in later phases.
