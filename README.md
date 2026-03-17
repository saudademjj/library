# 校园图书馆座位预约系统 (Library Seat Reservation System)

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-4.10-orange?logo=hono)](https://hono.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)](https://orm.drizzle.team/)

这是一个面向高并发校园场景的全栈式座位预约管理系统。系统通过 2D/3D 坐标映射实现座位的可视化管理，并针对预约冲突检测与数据一致性进行了深度优化，确保在复杂业务环境下系统的稳健性。

## 核心特性

- 多级权限控制 (RBAC): 系统区分管理员与普通学生角色，基于 JWT 实现安全的无状态身份验证与访问控制。
- 可视化布局逻辑: 支持区域 (Zones) 与座位 (Seats) 的坐标化管理，布局信息以结构化 JSON 格式存储，可直接适配前端渲染引擎进行空间呈现。
- 智能冲突检测算法: 内置严谨的时间段重叠检测逻辑，支持即时预约 (Walk-in) 与提前预约 (Advance) 模式，从底层防止物理资源的分配冲突。
- 高性能全栈架构: 
    - 后端: 采用轻量化、高性能的 Hono 框架构建 RESTful API。
    - 数据库: 基于 PostgreSQL，利用 Drizzle ORM 实现强类型的数据库操作与模式迁移。
    - 前端: 采用 Next.js 16 App Router 架构，结合 React 19 的并发渲染特性优化交互响应。
- 状态机管理: 严格定义的预约状态流转体系 (Pending -> Active -> Completed/Cancelled)，确保业务链路的闭环与可追溯性。

## 技术栈

### 前端层 (Frontend)
- 框架: Next.js 16 (App Router)
- 核心引擎: React 19
- UI 组件体系: shadcn/ui + Radix UI
- 样式标准: Tailwind CSS 4
- 状态管理: Zustand

### 后端层 (Backend)
- API 框架: Hono
- 数据库: PostgreSQL
- 对象关系映射 (ORM): Drizzle ORM
- 安全认证: jose (JWT)

### 基础设施 (Infra)
- 容器化: Docker Compose
- 运行环境: Bun / Node.js
- 开发辅助: tsx

## 项目结构

```text
.
├── drizzle             # 数据库迁移脚本 (SQL)
├── scripts             # 数据初始化与维护脚本
├── src
│   ├── app             # 路由定义与 API 端点实现
│   ├── components      # 原子化 React 组件
│   ├── db              # 数据模型 Schema 与客户端配置
│   └── lib             # 共享工具类与核心逻辑
├── tests               # 业务逻辑集成测试用例
└── drizzle.config.ts   # 数据库配置文件
```

## 快速开始

### 1. 依赖安装
```bash
npm install
```

### 2. 环境配置
创建 `.env.local` 文件并配置数据库连接与密钥：
```env
DATABASE_URL=postgresql://user:password@localhost:5432/library
JWT_SECRET=your_jwt_secret_key
```

### 3. 数据库初始化
```bash
npm run db:generate  # 生成迁移脚本
npm run db:migrate   # 执行数据库变更
```

### 4. 启动开发服务器
```bash
npm run dev
```

## 未来路线
- 引入 Three.js 实现图书馆实景 3D 选座交互。
- 增加信用分系统与自动化的爽约惩罚机制。
- 扩展多馆管理逻辑，支持集团化或多校区运营。

## 许可证
本项目采用 MIT License 协议。

---
Developed by [saudademjj](https://github.com/saudademjj)
