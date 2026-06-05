# Clariva — Frontend

Next.js 15 school management SPA with CBT exam engine, fees, grades, timetables, attendance, and parent portal.

## Stack

- **Next.js 15** (App Router, client components)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- No external UI libraries — all custom components.

## Project structure

```
src/
├── app/
│   ├── (auth)/          # Login, onboard (school signup)
│   ├── dashboard/       # Admin/staff portal
│   │   ├── cbt/
│   │   │   ├── page.tsx           # Exam list
│   │   │   ├── [id]/page.tsx      # Question management
│   │   │   ├── take/[id]/page.tsx # Exam-taking interface
│   │   │   └── results/[id]/page.tsx
│   │   ├── fees/        # Fee items, invoices
│   │   ├── grades/      # Grade entry, report cards, grading config
│   │   ├── students/    # Student list and detail
│   │   ├── attendance/  # Attendance tracking
│   │   ├── timetables/  # Timetable management
│   │   └── teachers/    # Staff management
│   ├── student/         # Student portal
│   │   └── exams/       # Available exams + take page
│   ├── parent/          # Parent/guardian portal
│   ├── portal/          # Public student record lookup (by code)
│   └── api/             # Next.js API routes (proxy/auth helpers)
├── components/          # Shared UI components
└── lib/
    └── api.ts           # API client with JWT refresh
```

## Getting started

```bash
cp .env.local.example .env.local
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
- **Grades & reports** — continuous assessment entry, automated report card generation.
- **Parent portal** — lookup by student code or phone/PIN login.
- **JWT auth** — automatic token refresh, localStorage + cookie sync.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
