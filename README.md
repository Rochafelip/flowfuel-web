# FlowFuel Web

Web frontend for **FlowFuel**, an app for tracking vehicle fuel consumption, refuels, and maintenance events. Built with Vite, React, and TypeScript.

Live: [flowfuel-web.onrender.com](https://flowfuel-web.onrender.com/)

## Features

- Email/password authentication (login, registration, password recovery, magic-link activation)
- Multi-vehicle management (add, edit, switch between vehicles)
- Refuel logging with fuel efficiency and cost metrics
- Vehicle event tracking (maintenance, inspections, etc.)
- Dashboard with consumption history and quick actions
- Data export
- User profile management

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for tooling and bundling
- [React Router](https://reactrouter.com/) for client-side routing
- [Tailwind CSS](https://tailwindcss.com/) for styling

## Getting started

### Prerequisites

- Node.js 18+
- The FlowFuel API running locally or accessible remotely

### Installation

```bash
npm install
```

### Environment variables

Copy the example file and adjust as needed:

```bash
cp .env.example .env
```

| Variable       | Description                  | Default                        |
| -------------- | ---------------------------- | ------------------------------ |
| `VITE_API_URL` | Base URL of the FlowFuel API | `https://flowfuel-api.fly.dev` |

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
npm run preview   # preview the production build locally
```

## Deployment

The app is deployed to [Render](https://render.com/) as a static site, configured via [render.yaml](render.yaml):

- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Rewrite rule:** all routes fall back to `index.html` to support client-side routing
- **Environment:** `VITE_API_URL` points to the production API

Pushing to the connected branch triggers an automatic deploy on Render. To deploy elsewhere, run `npm run build` and serve the `dist` folder with any static file host, applying the same SPA fallback rule.

## Project structure

```text
src/
├── components/   # Shared UI and layout components
├── context/      # React context providers (e.g. selected vehicle)
├── hooks/        # Custom hooks
├── lib/          # Formatting and utility helpers
├── routes/       # Page-level route components
├── services/     # API client and data-fetching logic
└── types/        # Shared TypeScript types
```
