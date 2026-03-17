# 校园图书馆座位预约系统 (Library Seat Reservation System)

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-4.10-orange?logo=hono)](https://hono.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)](https://orm.drizzle.team/)

本项目是一个基于 Next.js 和 Hono 开发的校园图书馆座位预约管理系统。系统实现了座位的可视化布局管理，并针对基础的预约冲突检测与数据一致性进行了逻辑实现，适用于自习室、图书馆等物理资源预约场景。

## 核心功能

- 权限管理 (RBAC): 区分管理员与普通用户，基于 JWT 实现身份验证。
- 布局管理: 支持区域与座位的坐标化配置，布局信息以 JSON 格式存储，可适配前端 Canvas 或 SVG 渲染。
- 预约逻辑: 实现时间段冲突检测，支持即时预约与提前预约模式。
- 架构设计: 
    - 后端: 采用 Hono 框架构建 RESTful API，部署于 Next.js API Routes。
    - 数据库: 使用 PostgreSQL，通过 Drizzle ORM 进行数据建模与操作。
    - 前端: 基于 Next.js 16 App Router 与 React 19 构建。

## 技术栈

- 前端: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- 后端: Hono, Drizzle ORM, PostgreSQL
- 其他: Zustand (状态管理), Docker Compose (环境部署)

## 项目结构

```text
.
├── drizzle             # 数据库迁移文件
├── scripts             # 数据播种与维护脚本
├── src
│   ├── app             # 路由与 API 实现
│   ├── components      # React UI 组件
│   ├── db              # Schema 定义与数据库客户端
│   └── lib             # 工具函数
├── tests               # 业务逻辑测试
└── drizzle.config.ts   # Drizzle 配置
```

## 快速开始

### 1. 依赖安装
```bash
npm install
```

### 2. 环境配置
创建 `.env.local`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/library
JWT_SECRET=your_secret_key
```

### 3. 数据库初始化
```bash
npm run db:push  # 或使用 migrate
```

### 4. 启动项目
```bash
npm run dev
```

## 待办项 (TODO)
- 优化前端 3D 可视化预览效果。
- 增加简单的信用分扣除逻辑。
- 完善管理员后台统计报表。

## 许可证
MIT License
