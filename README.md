# 校园图书馆座位预约系统 / Library Seat Reservation System

[简体中文](./README.md) | [English](./README_en.md)

本项目是一个基于 Next.js 16 和 Hono 框架构建的全栈座位预约管理系统。系统旨在解决图书馆、自习室等物理空间的资源分配问题，通过可视化布局与严谨的冲突检测逻辑，实现高效的座位预约与管理流程。

This project is a full-stack seat reservation management system built on Next.js 16 and the Hono framework. It is designed to solve resource allocation issues in physical spaces such as libraries and study rooms, achieving efficient seat reservation and management through visual layout and rigorous conflict detection logic.

## 核心特性 / Core Features

- 细粒度权限控制 (RBAC / Granular Access Control):
    - 基于 JWT (JSON Web Tokens) 的身份验证体系。
    - 区分管理员 (Admin) 与学生 (Student) 角色，实现接口级与页面级的访问隔离。
    - Auth system based on JWT with role-based access control for both API and UI layers.

- 可视化空间布局 (Visual Spatial Layout):
    - 支持区域 (Zone) 与座位 (Seat) 的 2D 坐标映射。
    - 布局数据以结构化 JSON 存储，支持前端 Canvas 或 SVG 的动态渲染。
    - Supports 2D coordinate mapping for Zones and Seats, with layout data stored in JSON for dynamic rendering.

- 智能冲突检测 (Intelligent Conflict Detection):
    - 实现了严格的时间段重叠校验算法 (Time-overlap checking)。
    - 支持即时预约 (Walk-in) 与提前预约 (Advance Reservation) 两种模式。
    - Implements rigorous time-overlap validation and supports both walk-in and advance booking modes.

- 状态机驱动的流程 (State Machine Driven Workflow):
    - 预约状态流转：Pending (待生效) -> Active (进行中) -> Completed (已完成) / Cancelled (已取消)。
    - 确保业务数据的闭环，支持预约取消与自动释放逻辑。
    - Comprehensive booking lifecycle management from creation to completion or cancellation.

## 技术栈 / Technical Stack

### 前端层 / Frontend Layer
- Next.js 16: 采用 App Router 架构，利用 Server Components 优化首屏加载。 / App Router architecture with RSC optimization.
- React 19: 利用最新的并发特性与 Hook 体系。 / Utilizing the latest concurrent features and hooks.
- Tailwind CSS 4: 响应式样式构建与原子化 CSS。 / Responsive styling with atomic CSS.
- Radix UI & shadcn/ui: 基于无障碍标准的 UI 组件库。 / Accessible UI components based on Radix primitives.
- Zustand: 轻量级客户端状态管理。 / Lightweight client-side state management.

### 后端层 / Backend Layer
- Hono: 部署在 Next.js Edge 运行时的高性能极简 API 框架。 / High-performance, minimalist API framework deployed on Edge.
- Drizzle ORM: 提供完全类型安全的 SQL 查询与 Schema 迁移。 / Type-safe SQL querying and schema migrations.
- PostgreSQL: 核心关系型数据库。 / Core relational database for persistent storage.
- Jose: 实现底层的 JWT 生成与校验。 / Low-level JWT generation and verification.

### 工程化 / Engineering
- Docker Compose: 本地开发环境的快速容器化部署。 / Quick containerized deployment for local development.
- tsx & ts-node: 脚本化任务执行环境。 / Scripting environment for maintenance tasks.
- ESLint & Prettier: 代码规范与格式化。 / Linting and formatting standards.

## 项目结构 / Project Structure

```text
library/
├── drizzle/                # SQL 迁移文件与模式元数据 / SQL migration files and schema metadata
├── public/                 # 静态资源文件 / Static assets
├── scripts/                # 维护脚本 (数据库播种、修复、导出) / Maintenance scripts (seeding, repair, export)
├── src/
│   ├── app/                # Next.js 路由与 API 实现层 / Routes and API implementation
│   │   ├── api/            # Hono API 路由定义 / Hono API route definitions
│   │   └── (main)/         # 前端视图容器 / Frontend view containers
│   ├── components/         # 业务逻辑组件与 UI 组件 / Business logic and UI components
│   │   ├── ui/             # 基础原子组件 (shadcn) / Atomic UI components
│   │   └── dashboard/      # 管理后台相关组件 / Admin dashboard components
│   ├── db/                 # 数据库客户端与 Schema 定义 / DB client and schema definitions
│   │   ├── schema.ts       # 核心实体定义 (Users, Seats, Reservations) / Core entity definitions
│   │   └── index.ts        # 数据库连接配置 / Database connection config
│   └── lib/                # 共享工具类与通用 Hook / Shared utilities and common hooks
├── tests/                  # 业务逻辑集成测试 (预约算法校验) / Integration tests for business logic
├── drizzle.config.ts       # Drizzle ORM 配置文件 / Drizzle ORM configuration
├── next.config.ts          # Next.js 运行时配置 / Next.js runtime configuration
└── package.json            # 依赖与脚本定义 / Dependencies and scripts
```

## 快速开始 / Quick Start

### 1. 克隆与安装 / Clone & Install
```bash
git clone https://github.com/saudademjj/library.git
cd library
npm install
```

### 2. 环境配置 / Environment Configuration
创建 `.env.local` 文件：
```env
DATABASE_URL=postgresql://user:password@localhost:5432/library
JWT_SECRET=your_secure_secret_key
```

### 3. 数据库初始化 / DB Initialization
```bash
npm run db:generate  # 生成迁移脚本 / Generate migrations
npm run db:push      # 推送模式至数据库 / Push schema to DB
npm run db:seed      # 填充演示数据 / Seed demo data
```

### 4. 启动开发服务器 / Run Dev Server
```bash
npm run dev
```

## 路线图 / Roadmap

- [ ] 优化 3D 楼层预览 (3D Floor Preview Optimization)
- [ ] 增加基于扫码的签到/签退功能 (QR-based Check-in/out)
- [ ] 黑名单惩罚机制逻辑实现 (Blacklist & Penalty Logic)

## 许可证 / License
本项目采用 [MIT License](LICENSE) 协议。 / This project is licensed under the MIT License.
