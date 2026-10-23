# LTL — Live To Learn

A responsive React + TypeScript homepage for a competitive exam learning platform.

## Included in this first version
- Clean homepage with LTL branding
- Three exam choices: TNPSC, RRB, SSC
- Selecting an exam reveals four options: Teaching, Notes, Quiz, Test
- Responsive mobile navigation
- Simple interactions and accessible focus states
- Placeholder selection feedback for sections that will be implemented in later steps

## Run locally
Requires Node.js 18+.

```bash
npm install
npm run dev
```

## Build for production
```bash
npm run build
npm run preview
```

## Deploy to Vercel
1. Push the contents of this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Vercel should detect Vite automatically.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy.

No environment variables or database are required for this homepage.

## Notes
- Teaching, Notes, Quiz, and Test are UI selections only at this stage. They do not yet contain real lesson/question data.
- Fonts load from Google Fonts; the site uses fallback fonts if unavailable.
