# XRM migration tool — frontend

Internal task-tracker for the XRM migration effort. Single-page React app that
visualizes the report/role registry, parity matrix, phase plan, resource Gantt,
metrics and Excel import.

## Stack

- [Vite](https://vite.dev/) + React 18 + TypeScript
- Routing: `react-router-dom` v6
- Server state: `@tanstack/react-query` v5 (+ devtools)
- Tables: `@tanstack/react-table` v8
- Virtualization: `@tanstack/react-virtual` v3
- Dates: `date-fns` v3
- HTTP: `axios`
- Tooling: ESLint (flat config) + Prettier + typescript-eslint
- Tests: Vitest + Testing Library + jsdom

## Getting started

```bash
npm install
cp .env.example .env   # then adjust VITE_API_URL if needed
npm run dev            # http://localhost:5173
```

The app talks to the backend at `VITE_API_URL` (default `http://localhost:8080`).
It runs fine without a backend — data screens render their error/empty states.

## Scripts

| Script              | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start the Vite dev server on port 5173          |
| `npm run build`     | Type-check (`tsc -b`) and build for production  |
| `npm run preview`   | Preview the production build locally            |
| `npm run lint`      | Lint the project with ESLint                    |
| `npm run typecheck` | Type-check without emitting (`tsc -b --noEmit`) |
| `npm run test`      | Run the test suite once with Vitest             |
| `npm run format`    | Format the codebase with Prettier               |

## Folder structure

```
Tasks-front/
├── src/
│   ├── api/            # axios client + react-query hooks (e.g. useRoles)
│   ├── app/            # app-level setup (queryClient)
│   ├── components/     # Layout + NavBar (shared shell)
│   ├── pages/          # one component per screen / route
│   ├── types/          # domain types mirroring the backend
│   ├── test/           # test setup (jest-dom matchers)
│   ├── App.tsx         # routes inside the shared Layout
│   └── main.tsx        # providers (QueryClient, Router) + mount
├── Dockerfile          # multi-stage build → nginx serve
├── nginx.conf          # SPA history fallback
└── vite.config.ts      # vite + vitest config
```

## Routes / screens

| Path       | Screen             |
| ---------- | ------------------ |
| `/`        | Реестр по ролям    |
| `/parity`  | Паритет-матрица    |
| `/roles`   | Переключение ролей |
| `/metrics` | Метрики            |
| `/plan`    | План по фазам      |
| `/gantt`   | Ресурсный гант     |
| `/import`  | Импорт Excel       |

## Docker

```bash
docker build -t xrm-migration-front .
docker run -p 8080:80 xrm-migration-front
```

The image builds the app and serves the static `dist/` with nginx, using a
history fallback so client-side routes resolve on reload.
