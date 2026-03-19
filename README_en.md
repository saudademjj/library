<div align="center">
  English | <a href="./README.md">简体中文</a>
</div>

# Library -- Modern Full-Stack Library Seat Reservation System

![Next.js](https://img.shields.io/badge/Next.js-15+-000000?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwind-css)
![Hono](https://img.shields.io/badge/Hono-API-E36002?style=flat-square&logo=hono)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square)

A modern, full-stack library seat reservation system built with a cutting-edge technology stack. It features a seamless user experience, secure authentication, and efficient database operations, perfectly suited for managing library zones, seats, and user reservations.

## Core Features

### User Management
- Secure registration and login flow
- JWT-based session management with Web Crypto API for secure hashing
- Role-based access control (Admin / Student)
- User profile maintenance and password changes

### Zone Management (Admin)
- Full CRUD operations for library zones (floors, quiet areas, study rooms, etc.)
- Zone capacity configuration and status management
- Batch seat operations within zones

### Seat Management (Admin)
- Dynamically create and edit seats within specific zones
- Real-time seat availability toggling
- Seat numbering and location identifier management

### Reservation System
- Conflict-free seat booking logic preventing double reservations
- Real-time status transitions: Pending -> Active -> Completed / Cancelled
- Strict ownership rules: users can only manage their own bookings
- Time-slot conflict detection and alerts
- Historical reservation record queries

## Technical Architecture

### Frontend Layer

- Next.js 15+ App Router: Page rendering based on React Server Components
- React 19: Latest concurrent features and Hooks ecosystem
- TypeScript 5: End-to-end type safety
- Tailwind CSS 4: Atomic CSS responsive layout
- shadcn/ui: High-quality component library built on Radix UI
- Lucide React: Consistent icon system

### API Layer

- Hono: Lightweight, high-performance web framework mounted on Next.js API Routes
- Zod: Runtime request parameter validation
- JWT: Stateless authentication tokens

### Data Layer

- PostgreSQL 16: Relational data persistence
- Drizzle ORM: Type-safe ORM with migration management
- Docker Compose: One-click database environment setup

## Directory Structure

```text
library/
├── src/
│   ├── app/                # Next.js App Router pages and layouts
│   │   ├── api/            # Hono API route mount point
│   │   ├── dashboard/      # Admin dashboard
│   │   ├── reservations/   # Reservation management pages
│   │   └── zones/          # Zone and seat browsing
│   ├── components/         # UI components (shadcn/ui based)
│   │   ├── ui/             # Base UI primitives
│   │   └── ...             # Business components
│   └── lib/                # Utilities, auth helpers
├── drizzle/                # Database migration files
├── drizzle.config.ts       # Drizzle ORM configuration
├── scripts/
│   ├── seed.ts             # Database seed data
│   └── repair_db_full.ts   # Database repair script
├── tests/                  # Test suites
├── docker-compose.yml      # PostgreSQL container orchestration
└── package.json            # Dependencies and scripts
```

## Quick Start

### Prerequisites

- Node.js >= 20
- PostgreSQL >= 16 (or use Docker)

### 1. Environment Setup

```bash
git clone https://github.com/saudademjj/library.git
cd library
cp .env.example .env.local
# Edit .env.local to configure DATABASE_URL and JWT_SECRET
```

### 2. Start Database

```bash
docker compose up -d
```

### 3. Install Dependencies and Initialize

```bash
npm install
npm run db:migrate
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to use the application.

### Available Commands

```bash
npm run dev          # Start dev server (Webpack mode)
npm run dev:turbo    # Start dev server (Turbopack mode)
npm run build        # Production build
npm run test         # Run tests
npm run db:generate  # Generate migration files
npm run db:migrate   # Execute database migrations
npm run db:studio    # Launch Drizzle Studio visual manager
npm run db:seed      # Populate seed data
npm run db:repair    # Execute database repair
npm run lint         # Linting
```

## Database Management

### Migration Workflow

```bash
# Generate migration after schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Visually inspect database
npm run db:studio
```

### Data Repair

When the database enters an inconsistent state, use the repair script:

```bash
npm run db:repair
```

## License

MIT License
