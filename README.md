# Clariva — Frontend

Next.js 15 school management SPA with CBT exam engine, fees, grades, timetables, attendance, and parent portal.

## Stack

- **Next.js 15** (App Router, client components)
- **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS 4**
- **Vitest** + Testing Library for unit tests
- No external UI libraries — all custom components.

## Project structure

```
src/
├── app/
│   ├── (auth)/          # Login, onboard (school signup)
│   ├── dashboard/       # Admin/staff portal
│   │   ├── cbt/         # Exam list, management, take, results
│   │   ├── fees/        # Fee items, invoices
│   │   ├── grades/      # Grade entry, report cards, grading config
│   │   ├── students/    # Student list and detail
│   │   ├── attendance/  # Attendance tracking
│   │   ├── timetables/  # Timetable management
│   │   ├── teachers/    # Staff management
│   │   └── backup/      # School backup/restore (school_admin)
│   ├── super_admin/     # Super admin panel
│   │   └── system/      # System health, backup (with school picker)
│   ├── principal/       # Principal portal (report cards)
│   ├── teacher/         # Teacher portal
│   ├── bursary/         # Bursary portal
│   ├── student/         # Student portal (exams, grades)
│   ├── guardian/        # Parent/guardian portal
│   ├── portal/          # Public student record lookup (by code)
│   └── api/             # Next.js API routes (proxy/auth helpers)
├── components/          # Shared UI components
├── lib/
│   └── api.ts           # API client with JWT refresh, typed endpoints
├── middleware.ts         # Route guards (role-based redirect, UX only)
└── test/
    ├── setup.ts         # Vitest setup (jest-dom matchers)
    └── middleware.test.ts
```

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Backend API base URL |

## Key features

- **CBT exam engine** — start/session management, per-student shuffling, server-side grading, tab-switch enforcement, late-submission detection.
- **DOCX question upload** — drag-and-drop .docx parsing with MCQ letter-to-text resolution.
- **Role-based portals** — distinct layouts for admin, student, and parent with middleware route guards.
- **Fees & invoices** — itemised billing with ARM-level pricing tiers.
- **Grades & reports** — continuous assessment entry, automated report card generation, release/unrelease.
- **Timetable management** — publish/unpublish timetable, slot-level editing.
- **Parent portal** — lookup by student code or phone/PIN login.
- **JWT auth** — automatic token refresh via `src/lib/api.ts`, localStorage + cookie sync.
- **Super admin backup** — school picker, JSON backup download, restore with confirmation.

## API client (`src/lib/api.ts`)

All API calls go through `src/lib/api.ts` which handles:
- JWT access token (cookie) + refresh token (sessionStorage)
- Automatic 401 refresh with single-flight dedup
- Typed `createApi<T>()` wrappers for each resource

Correct endpoint prefixes:
- Timetables: `/timetable/timetables/`
- Report cards: `/results/report-cards/`
- Exams: `/exams/exams/`
- Grades: `/grades/`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run Vitest in watch mode |

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to main:
- Node.js 20
- Lint + TypeScript check + production build
- Vitest test suite
