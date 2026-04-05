<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2e2eecfb-263c-46af-a679-79603a775b4e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy To Vercel (Production)

This project now uses:
- Vite frontend
- Vercel Serverless API under `api/*`
- Vercel Postgres for persistent data

Steps:
1. Push this repo to GitHub.
2. In Vercel, import the repo.
3. In Vercel project settings, add Postgres (Storage -> Create Database -> Postgres).
4. In Vercel Environment Variables, set `JWT_SECRET` to a long random string.
5. Redeploy.

After deployment:
- `POSTGRES_URL` is provided automatically by Vercel Postgres.
- Auth and task data are persisted in Postgres.
