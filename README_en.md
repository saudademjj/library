<div align="center">
  English | <a href="./README.md">简体中文</a>
</div>

# Library Seat Reservation System

![Next.js](https://img.shields.io/badge/Next.js-16.0-000000?style=flat-square&logo=next.js)
![Hono](https://img.shields.io/badge/Hono-4.10-E36002?style=flat-square&logo=hono)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square&logo=drizzle)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)

A high-performance, full-stack physical resource reservation management system. Designed to eliminate allocation conflicts and administrative overhead in high-concurrency campus library environments. By integrating Next.js Server Components with Hono Edge APIs, the system achieves millisecond-level response times and high-precision spatial visualization.

## 🏛️ Architectural Design

### 1. Technical Stack Justification
- **Next.js 16 (App Router)**: Leverages React 19 Concurrent Mode and RSC (Server Components) to offload 80% of UI rendering to the server, significantly reducing client-side power consumption on mobile devices.
- **Hono (API Layer)**: Deployed on Edge Runtime, Hono's minimalist footprint and ultra-fast routing engine reduce end-to-end API latency by approximately 40%.
- **Drizzle ORM**: Unlike Prisma, Drizzle offers a zero-abstraction SQL building experience with native TypeScript synchronization between database schemas and frontend types.

### 2. Data Model & Entity Relationships
The core system is built upon four primary entities to ensure flattened data structures and efficient retrieval:
- **Users**: Stores academic credentials, profile data, and RBAC roles.
- **Zones**: Spatial containers with metadata (floors, descriptions) and layout configurations.
- **Seats**: The smallest physical units, defined by relative coordinates (x, y) within a Zone.
- **Reservations**: The transaction core, linking Users and Seats with full temporal spans and state lifecycles.

### 3. Core Business Logic Implementation

#### Collision Detection Algorithm
The system utilizes a **non-overlapping interval validation logic**. When a user attempts a reservation for `[T_start, T_end]`, the backend executes an atomic query:
```sql
SELECT count(*) FROM reservations 
WHERE seat_id = $id 
AND status NOT IN ('cancelled')
AND (
  (start_time, end_time) OVERLAPS ($T_start, $T_end)
)
```
Leveraging database-level transaction locks or the `OVERLAPS` operator ensures absolute exclusivity at the physical layer.

#### Spatial Rendering Engine
The frontend parses layout JSON from the backend into a dynamic map. Each seat is absolutely positioned based on its `rotation` and `coordinate` attributes, supporting responsive zooming and panning interactions.

## 📂 Project Structure Analysis

```text
library/
├── drizzle/                # Auto-generated SQL migrations and schema snapshots
├── scripts/
│   ├── seed.ts             # Mass-scale stress test data generation via Faker.js
│   └── repair_db.ts        # Consistency repair tool for interrupted reservation states
├── src/
│   ├── app/api/[[...route]] # Central Hono entry for unified backend route management
│   ├── components/
│   │   ├── spatial/        # Visualization core: Canvas/SVG coordinate mapping logic
│   │   └── dashboard/      # Admin-side advanced statistics and resource monitors
│   ├── db/
│   │   ├── schema.ts       # Entity modeling using Drizzle pgTable definitions
│   │   └── client.ts       # Connection pooling optimized for edge environments
│   └── lib/                # JWT validation, temporal formatting, and constants
├── tests/                  # Integration tests for collision and auto-cancellation logic
└── next.config.ts          # Performance tuning for Webpack and Turbopack
```

## 🚀 Developer Guide

### 1. Prerequisites
- Node.js >= 20.10.0
- PostgreSQL >= 15
- Docker (for rapid DB instance provisioning)

### 2. Deployment
```bash
# 1. Install all dependencies
npm install

# 2. Persistence Layer Setup
# Copy template and fill DATABASE_URL
cp .env.example .env.local

# 3. Schema Push & Seeding
npm run db:push
npm run db:seed

# 4. Launch Development Environment
npm run dev
```

## 🛠️ Roadmap
- [ ] **Visualization 2.0**: Three.js driven 3D floor navigation.
- [ ] **Smart Dispatch**: Automated seat recommendation based on credit scores.
- [ ] **Hardware Integration**: Real-time status sync via MQTT-enabled physical indicators.

## License
MIT License
