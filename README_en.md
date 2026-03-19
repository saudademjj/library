<div align="center">
  English | <a href="./README.md">简体中文</a>
</div>

# Library -- Library Seat Reservation System

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwind-css)
![Hono](https://img.shields.io/badge/Hono-4.10-E36002?style=flat-square&logo=hono)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square)

A full-stack library seat reservation system built with Next.js 16 + Hono + Drizzle ORM + PostgreSQL. Features user registration/login, zone and seat management, conflict-free reservations, QR code check-in, leaderboard statistics, and role-based access control separating admin and student operations.

---

## Core Features

### User System

- Registration & Login -- bcryptjs password hashing, stateless JWT sessions (jose library for signing and verification)
- Role-Based Access -- Admin / Student two-tier permission control
- Profile -- User information management and password changes
- Password Reset -- Forgot password flow support

### Zone Management (Admin)

- Full CRUD operations for library zones (floors, quiet areas, study rooms, etc.)
- Zone capacity configuration and status management
- Visual seat layout designer -- drag-and-drop seat arrangement with rotation angle support

### Seat Management (Admin)

- Dynamically create and edit seats within specific zones
- Real-time seat availability toggling
- Seat numbering and location identifier management
- Batch seat arrangement scripts

### Reservation System

- Conflict-Free Booking -- Time-slot conflict detection, preventing double reservations
- Status Flow -- Pending -> In Use -> Completed / Cancelled
- Ownership Rules -- Users can only manage their own reservations
- History -- Reservation record queries and review
- QR Code Check-in -- Generate reservation QR codes for on-site check-in

### Statistics

- Leaderboard -- User study time rankings
- Timeline -- Visual reservation time-slot display

---

## Tech Stack

### Frontend

| Technology | Version | Description |
|------------|---------|-------------|
| Next.js | 16.0.10 | React full-stack framework, App Router |
| React | 19.2.0 | UI library with concurrent features |
| TypeScript | 5 | End-to-end type safety |
| Tailwind CSS | 4 | Atomic CSS framework |
| shadcn/ui | - | Component library built on Radix UI |
| Zustand | 5.0.9 | Lightweight state management |
| Lucide React | 0.562.0 | Icon library |
| dayjs | 1.11.19 | Date handling |
| sonner | 2.0.7 | Toast notifications |
| qrcode | 1.5.4 | QR code generation |

### Backend

| Technology | Version | Description |
|------------|---------|-------------|
| Hono | 4.10.7 | Lightweight web framework, mounted on Next.js API Routes |
| Drizzle ORM | 0.44.7 | Type-safe ORM |
| PostgreSQL | 16+ | Relational database |
| jose | 6.1.3 | JWT signing and verification |
| bcryptjs | 3.0.3 | Password hashing |
| Zod | - | Runtime request parameter validation |

### Development Tools

| Tool | Description |
|------|-------------|
| ESLint 9 | Code linting |
| Drizzle Kit 0.31.8 | Database migration management |
| tsx | TypeScript script execution |
| Docker Compose | Database container orchestration |

---

## Project Structure

```text
library/
├── src/
│   ├── app/
│   │   ├── (main)/                 # User pages (with layout)
│   │   │   ├── dashboard/          # User dashboard
│   │   │   ├── reservations/       # Reservation management
│   │   │   ├── seats/              # Seat browsing
│   │   │   └── profile/            # Profile
│   │   ├── admin/                  # Admin pages
│   │   │   ├── zones/              # Zone management
│   │   │   ├── seats/              # Seat management
│   │   │   ├── reservations/       # Reservation management
│   │   │   └── users/              # User management
│   │   ├── api/[[...route]]/       # Hono API route mount point
│   │   ├── login/                  # Login
│   │   ├── register/               # Registration
│   │   ├── forgot-password/        # Forgot password
│   │   ├── reset-password/         # Reset password
│   │   ├── checkin/                # QR code check-in
│   │   └── zones/                  # Zone browsing
│   ├── components/
│   │   ├── ui/                     # shadcn/ui base components
│   │   ├── AppHeader.tsx           # App header
│   │   ├── Leaderboard.tsx         # Leaderboard
│   │   ├── TimeTimeline.tsx        # Timeline
│   │   ├── SeatDetailPanel.tsx     # Seat detail panel
│   │   ├── ConfirmDialog.tsx       # Confirmation dialog
│   │   └── MainAuthGuard.tsx       # Auth guard
│   ├── db/
│   │   ├── index.ts                # Database connection
│   │   └── schema.ts              # Table definitions (users, zones, seats, reservations)
│   └── lib/
│       ├── auth.ts                 # Server-side auth logic
│       ├── client-auth.ts          # Client-side auth utilities
│       ├── middleware.ts           # Hono middleware
│       ├── reservation-policy.ts   # Reservation policy rules
│       ├── store.ts                # Zustand store
│       ├── datetime.ts             # Date utilities
│       ├── types.ts                # Type definitions
│       └── utils.ts                # General utilities
├── scripts/
│   ├── seed.ts                     # Seed data
│   ├── seed_real_layout.ts         # Real layout seed data
│   ├── arrange_seats.ts            # Seat arrangement script
│   ├── repair_db_full.ts           # Database repair
│   └── verify_repair.ts           # Repair verification
├── drizzle/                        # Migration files (7 versions)
├── tests/
│   ├── auth-security.test.ts       # Auth security tests
│   ├── middleware-auth.test.ts     # Middleware tests
│   └── reservation-policy.test.ts  # Reservation policy tests
├── docker-compose.yml              # PostgreSQL container orchestration
└── package.json
```

---

## Quick Start

### Prerequisites

- Node.js >= 20
- PostgreSQL >= 16 (or use Docker)

### 1. Clone & Configure

```bash
git clone https://github.com/saudademjj/library.git
cd library
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Local PostgreSQL
DATABASE_URL=postgresql://user@localhost:5432/dbname

# Docker PostgreSQL (see docker-compose.yml, port 5433)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5433/dbname

# JWT secret (must change in production)
JWT_SECRET=your-secret-key-change-in-production
```

### 2. Start Database

```bash
# Using Docker (recommended)
docker compose up -d

# Or use local PostgreSQL
```

### 3. Install Dependencies & Initialize

```bash
npm install
npm run db:migrate
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the application.

---

## Available Scripts

```bash
npm run dev             # Start dev server (Webpack)
npm run dev:turbo       # Start dev server (Turbopack)
npm run build           # Production build
npm run start           # Start production server
npm run test            # Run tests
npm run lint            # Linting
```

### Database Management

```bash
npm run db:generate     # Generate migrations from schema changes
npm run db:migrate      # Apply migrations to database
npm run db:studio       # Launch Drizzle Studio visual manager
npm run db:seed         # Populate seed data
npm run db:repair       # Database repair (for inconsistent state)
```

---

## Data Model

The system contains 4 core tables:

| Table | Description | Key Fields |
|-------|-------------|------------|
| users | Users | id, username, email, password, role(admin/student) |
| zones | Zones | id, name, capacity, status |
| seats | Seats | id, zone_id, seat_number, rotation, available |
| reservations | Reservations | id, user_id, seat_id, start_time, end_time, status |

Reservation status flow: `pending` -> `in_use` -> `completed` / `cancelled`

---

## License

[MIT](LICENSE)
