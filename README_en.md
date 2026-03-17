<div align="center">
  English | <a href="./README.md">简体中文</a>
</div>

# Library Seat Reservation System

![Next.js](https://img.shields.io/badge/Next.js-16.0-000000?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Hono](https://img.shields.io/badge/Hono-4.10-E36002?style=flat-square&logo=hono)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square&logo=drizzle)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwind-css)

This project is a comprehensive full-stack seat reservation management system designed for high-concurrency campus environments. Built on the Next.js 16 architecture, it integrates the high-performance Hono API framework and the strongly-typed Drizzle ORM to achieve a complete business loop from spatial layout modeling to reservation conflict detection.

## Core Architectural Design

### 1. Digital Twin Modeling of Physical Resources
The system implements a digital twin of library physical spaces through hierarchical abstractions of Zones and Seats. Each seat possesses independent coordinate systems (x, y) and rotation attributes. Layout metadata is stored in structured JSON format, providing precise data support for frontend visual rendering via Canvas or SVG.

### 2. Rigorous Reservation Conflict Detection
Addressing the core "time overlap" challenge in reservation systems, this project implements an interval overlap validation algorithm on the server side. At the database transaction level, it performs concurrent audits of existing records for specific physical resources within given time slots, ensuring the uniqueness and exclusivity of resource allocation.

### 3. State Machine Driven Workflow
Reservation records strictly follow a state machine transition mechanism:
- **Pending**: Reservation created, awaiting system activation.
- **Active**: User checked in, seat currently occupied.
- **Completed**: Normal checkout or reservation expiry.
- **Cancelled**: Voluntary relinquishment or administrative release.

## Technical Stack Selection

- **Framework**: Next.js 16 (App Router). Utilizes Server Components to minimize client-side payload and enhance first-paint performance.
- **API Layer**: Hono. A minimalist framework deployed on Edge Runtime, significantly reducing interface latency.
- **Persistence**: Drizzle ORM + PostgreSQL. Provides end-to-end type inference from schema to frontend, ensuring database operation safety.
- **Styling**: Tailwind CSS 4 + shadcn/ui. Build interactive interfaces with high accessibility standards based on atomic CSS.

## Project Structure

```text
library/
├── drizzle/                # Database schema migrations and metadata
├── scripts/                # Maintenance scripts (seeding, repairs)
├── src/
│   ├── app/                # Routes and core API implementation
│   │   ├── api/            # Hono-driven RESTful routes
│   │   └── (main)/         # Frontend view containers and logic
│   ├── components/         # Business components and UI library
│   │   ├── spatial/        # Core spatial visualization components
│   │   └── ui/             # Radix UI based primitives
│   ├── db/                 # Persistence config and entity definitions
│   │   └── schema.ts       # Core relational models (Users, Seats, Reservations)
│   └── lib/                # Shared utilities and common hooks
├── tests/                  # Integration and stress testing scripts
└── drizzle.config.ts       # Drizzle configuration
```

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration
Create a `.env.local` file with the following variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/library
JWT_SECRET=your_secret_key
```

### 3. Database Initialization
```bash
npm run db:push      # Push schema to database
npm run db:seed      # Populate demo data
```

### 4. Launch
```bash
npm run dev
```

## License
This project is licensed under the MIT License.
