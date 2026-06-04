# Stitch E-Commerce Frontend

This is the frontend client for Stitch, an E-commerce platform, built with Next.js, React, and TailwindCSS.

## Deployment on Vercel

This repository is fully prepared for deployment on [Vercel](https://vercel.com).

### Setup Instructions
1. Create a new project on Vercel and import this GitHub repository.
2. Vercel will automatically detect that this is a Next.js project.
3. Add the following Environment Variables in the Vercel dashboard:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | The URL of your deployed Stitch backend on Render (e.g., `https://stitch-backend.onrender.com/api/v1`) |

## Directory Structure
```
stitch-frontend/
├── src/
│   ├── components/      # Reusable React components (UI, layout)
│   ├── lib/             # API services, utilities, hooks, contexts
│   ├── pages/           # Next.js Pages (Routing)
│   └── styles/          # Global CSS and Tailwind configurations
├── public/              # Static assets (fonts, icons, images)
├── next.config.js       # Next.js configuration
├── package.json
└── .env.local (Excluded from source control)
```

## Running Locally
1. Run `npm install`
2. Create a `.env.local` file and add `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
3. Run `npm run dev` to start the Next.js development server.
