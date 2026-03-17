<div align="center">
  <p>Modern Full-stack Library Seat Reservation System / 现代全栈图书馆座位预约系统</p>
  <p>
    <a href="#english">English</a> •
    <a href="#简体中文">简体中文</a>
  </p>
</div>

---

<h2 id="english">🇬🇧 English</h2>

# Library Seat Reservation System

This is a modern, full-stack library seat reservation system built with a robust and cutting-edge technology stack. It features a seamless user experience, secure authentication, and efficient database operations, perfectly suited for managing library zones, seats, and user reservations.

### 🛠 Technology Stack

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui
- **Backend API**: Hono (mounted on Next.js API Routes)
- **Database**: PostgreSQL, Drizzle ORM
- **Authentication**: JWT-based session management, Web Crypto API for secure hashing

### ✨ Core Features

- **User Management**: Secure registration and login, JWT authentication, role-based access control (Admin / Student).
- **Zone Management (Admin)**: Full CRUD operations for library zones (e.g., floors, quiet areas).
- **Seat Management (Admin)**: Dynamically create, edit, and toggle seat availability within specific zones.
- **Reservation System**: 
  - Conflict-free seat booking logic.
  - Real-time status updates (Pending/Active/Completed/Cancelled).
  - Strict ownership rules (Users can only manage their own bookings).

### 🚀 Quick Start

1. **Environment Setup**:
   ```bash
   cp .env.example .env.local
   # Update DATABASE_URL and JWT_SECRET inside .env.local
   ```
2. **Launch Database** (via Docker):
   ```bash
   docker compose up -d
   ```
3. **Install & Initialize**:
   ```bash
   npm install
   npm run db:migrate
   npm run dev
   ```
   Visit `http://localhost:3000` to interact with the system.

### 📂 Directory Structure

```text
library/
├── src/
│   ├── app/                  # Next.js App Router (Pages & Layouts)
│   │   └── api/[[...route]]/ # Hono API Entry point
│   ├── components/           # React & shadcn/ui components
│   ├── db/                   # Drizzle schema definitions and DB connection
│   └── lib/                  # Utilities, auth helpers, and TypeScript types
├── drizzle/                  # Auto-generated database migrations
└── ...config files           # Tailwind, Next, TypeScript, Drizzle configs
```

### 📄 License
MIT License.

---

<h2 id="简体中文">🇨🇳 简体中文</h2>

# 图书馆座位预约系统

这是一个基于现代技术栈打造的全栈图书馆座位预约系统。项目结合了当今主流的前后端技术，致力于提供流畅的用户体验、安全的身份认证体系以及高效的数据持久化操作，非常适合用于图书馆区域、座位与用户预约管理的落地。

### 🛠 技术栈概览

- **前端架构**: Next.js 15+ (App Router), React 19, TypeScript 5
- **UI 呈现**: Tailwind CSS 4 配合 shadcn/ui (new-york 风格)，图标采用 Lucide React
- **后端 API**: Hono 框架（直接挂载于 Next.js 的 API 路由下运行）
- **持久层**: PostgreSQL 数据库，采用 Drizzle ORM 与 Drizzle Kit
- **安全认证**: 基于 `jose` 的 JWT 认证与 Web Crypto API 密码哈希

### ✨ 核心功能矩阵

- **用户管理中心**：支持学号与邮箱双重验证注册、JWT 状态保持、严格的 RBAC 角色权限隔离（管理员/学生）。
- **区域空间管理（管理员）**：支持图书馆不同楼层、不同功能区（如自习区、讨论区）的动态创建与维护。
- **物理座位分配（管理员）**：可视化管理座位编号，支持一键切换座位的可用状态（故障维修/正常开放）。
- **智能预约引擎**：
  - 内置时间轴冲突检测，杜绝重复预约。
  - 动态状态流转（预约中/进行中/已完成/已取消）。
  - 严格的数据隔离界限：普通学生仅可操作自身的预约记录。

### 🚀 最短启动路径

1. **环境准备**：
   ```bash
   cp .env.example .env.local
   # 请在 .env.local 中配置你的 DATABASE_URL 与 JWT_SECRET
   ```
2. **启动数据库容器**：
   ```bash
   docker compose up -d
   ```
3. **安装依赖与数据同步**：
   ```bash
   npm install
   npm run db:migrate  # 同步表结构
   npm run dev         # 启动开发服务器
   ```
   随后在浏览器访问 `http://localhost:3000` 即可。

### 💡 生产环境部署建议

- **安全加固**：上线前务必更换超高强度的 `JWT_SECRET`，并考虑引入 `bcrypt` 替换当前的 SHA-256。同时务必强制全站 HTTPS 并在 Hono 层配置严格的 CORS 与 Rate Limiting。
- **性能优化**：对于高并发抢座场景，建议在后端引入 Redis 缓存预热座位信息，并在数据库层面根据时间戳与状态字段建立联合索引。

### 📄 许可证
本项目采用 MIT 协议开源。