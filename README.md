<div align="center">
  <a href="./README.md">简体中文</a> | <a href="./README_en.md">English</a>
</div>

# 校园图书馆座位预约系统 / Library Seat Reservation System

![Next.js](https://img.shields.io/badge/Next.js-16.0-000000?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Hono](https://img.shields.io/badge/Hono-4.10-E36002?style=flat-square&logo=hono)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square&logo=drizzle)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwind-css)

本项目是一个专为高并发校园环境设计的全栈座位预约管理系统。系统基于 Next.js 16 App Router 与高性能 API 框架 Hono 构建，通过严谨的物理空间建模与状态机逻辑，解决了图书馆及自习室场景下的资源冲突、分配不均与管理冗余问题。

This project is a full-stack seat reservation management system specifically designed for high-concurrency campus environments. Built with the Next.js 16 App Router and the high-performance Hono API framework, it addresses resource conflicts, uneven distribution, and management redundancy in libraries and study rooms through rigorous physical space modeling and state machine logic.

## 核心架构设计 / Core Architectural Design

### 1. 物理空间模型化 (Physical Space Modeling)
系统通过区域 (Zone) 与座位 (Seat) 的层级化定义，实现了对物理空间的数字孪生。
- **空间元数据**: 采用结构化 JSON 存储布局坐标 (x, y) 与旋转角度，为前端可视化渲染提供原始数据。
- **动态分级**: 支持楼层与区域的动态扩展，具备良好的横向兼容性。
- **Spatial Metadata**: Structured JSON is used to store layout coordinates and rotation, providing raw data for frontend visual rendering.
- **Dynamic Hierarchy**: Supports dynamic expansion of floors and zones, ensuring horizontal compatibility.

### 2. 高可靠预约逻辑 (High-Reliability Reservation Logic)
针对预约系统最核心的“时间冲突”问题，本项目在服务层实现了双重检测机制。
- **冲突判定算法**: 采用区间重叠校验 (Interval Overlap Detection)，在数据库事务层级确保同一物理座位的同一时段不被二次分配。
- **状态机流转**: 预约记录严格遵循 Pending -> Active -> Completed/Cancelled 的单向状态流转，由后端定时任务或触发器维护一致性。
- **Conflict Detection**: Interval overlap detection ensures that the same physical seat is not double-booked at the database transaction level.
- **State Machine**: Reservation records strictly follow a one-way state transition (Pending -> Active -> Completed/Cancelled) maintained by backend tasks or triggers.

### 3. 全栈技术演进 (Full-stack Technology Evolution)
- **后端边缘化**: Hono 框架的引入使得 API 能够部署在 Edge Runtime，极大地降低了端到端的请求时延。
- **强类型 ORM**: Drizzle ORM 实现了从数据库 Schema 到前端 TypeScript 类型的全链路同步，消除了运行时的数据类型风险。
- **Edge Runtime**: Integration of Hono allows APIs to be deployed on Edge, significantly reducing end-to-end latency.
- **Type-safe ORM**: Drizzle ORM synchronizes database schemas with frontend TypeScript types, eliminating runtime data type risks.

## 业务模块拆解 / Business Modules Analysis

| 模块 / Module | 实现技术 / Tech | 核心功能 / Core Function |
| :--- | :--- | :--- |
| 认证 / Auth | Jose (JWT) | 基于角色的访问控制 (RBAC)，区分管理员与普通学生。 / Role-based access control. |
| 预约 / Booking | Hono / Drizzle | 复杂的冲突检测算法与原子化数据库事务。 / Complex conflict detection and atomic transactions. |
| 布局 / Layout | React 19 / JSON | 响应式的 2D 布局呈现与动态坐标映射。 / Responsive 2D layout and dynamic coordinate mapping. |
| 后台 / Admin | shadcn/ui | 区域配置、座位维护与预约记录全局审计。 / Zone configuration and global audit logs. |

## 项目目录结构 / Project Structure

```text
.
├── drizzle/                # 数据库模式迁移历史与元数据 / DB migration history and metadata
├── scripts/                # 系统维护工具 (播种数据、数据库修复、报表生成) / Maintenance tools
├── src/
│   ├── app/                # 核心路由与路由处理程序 / Core routes and handlers
│   │   ├── api/            # Hono 驱动的 RESTful 端点实现 / Hono-driven RESTful endpoints
│   │   └── (dashboard)/    # 仪表盘管理界面 / Dashboard management UI
│   ├── components/         # 业务逻辑组件库 / Business logic components
│   │   ├── spatial/        # 座位可视化核心组件 / Spatial visualization components
│   │   └── ui/             # 基础原子 UI 组件 (shadcn) / Atomic UI components
│   ├── db/                 # 数据持久层配置与 Schema 定义 / DAL config and schema definitions
│   │   └── schema.ts       # 核心实体关系模型 / Core ER models
│   └── lib/                # 跨模块共享逻辑与校验工具 / Cross-module logic and validation
├── tests/                  # 包含边界值分析的集成测试用例 / Integration tests with BVA
└── package.json            # 依赖管理与构建脚本 / Dependency and build scripts
```

## 部署与运行 / Deployment & Usage

### 前置要求 / Prerequisites
- Node.js 20+ / Bun 1.1+
- PostgreSQL 15+

### 安装步骤 / Steps
```bash
# 安装全量依赖 / Install dependencies
npm install

# 配置环境变量 / Setup environment
cp .env.example .env.local

# 执行数据库迁移 / Execute migrations
npm run db:push

# 启动开发服务器 / Run development server
npm run dev
```

## 许可证 / License
本项目遵循 MIT License 协议。 / Licensed under the MIT License.
