# Library Seat Reservation System

English | [简体中文](README.md)

This is a full-stack seat reservation system for library or campus scenarios. It covers user registration and login, zone and seat management, reservation creation, conflict detection, and role-based access control. The repository combines the frontend, API layer, database migrations, and test scripts in one project.

## Core Features

- User registration, login, and role management
- Zone management with floor grouping
- Seat creation, editing, and availability control
- Reservation creation, cancellation, and status updates
- Time conflict detection
- Access separation between admins and regular users

## Tech Stack

- Frontend: `Next.js 16`, `React 19`, `TypeScript`
- UI: `shadcn/ui`, `Tailwind CSS 4`, `Lucide React`
- API: `Hono`
- Auth: `JWT (jose)`
- Database: `PostgreSQL`
- ORM: `Drizzle ORM` and `Drizzle Kit`

## Quick Start

```bash
cp .env.example .env.local
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Default URL: `http://localhost:3000`

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run test
npm run db:migrate
npm run db:seed
npm run db:studio
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
