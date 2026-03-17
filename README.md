<div align="center">
  <a href="./README_en.md">English</a> | 简体中文
</div>

# 校园图书馆座位预约系统 (Library Seat Reservation System)

![Next.js](https://img.shields.io/badge/Next.js-16.0-000000?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Hono](https://img.shields.io/badge/Hono-4.10-E36002?style=flat-square&logo=hono)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square&logo=drizzle)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwind-css)

本项目是一个针对高并发校园场景设计的全栈式座位预约管理系统。系统基于 Next.js 16 架构，通过集成高性能 API 框架 Hono 与 强类型 ORM Drizzle，实现了从空间布局建模到预约冲突检测的完整业务闭环。

## 核心设计架构

### 1. 物理资源数字化建模
系统通过区域 (Zone) 与 座位 (Seat) 的层级化抽象，实现了对图书馆物理空间的数字孪生。每个座位具备独立的坐标系统 (x, y) 与 旋转角度属性，通过结构化的 JSON 格式存储布局元数据，为前端的可视化渲染提供了精准的数据支撑。

### 2. 严谨的预约冲突检测逻辑
针对预约系统最核心的“时间重叠”问题，本项目在服务端实现了区间重叠校验算法。在数据库事务层面，通过对特定物理资源在给定时间段内的已有记录进行并发审计，确保了资源分配的唯一性与排他性。

### 3. 状态机驱动的业务流转
预约记录遵循严格的状态机流转机制：
- **Pending (待生效)**: 预约已创建，等待系统激活。
- **Active (进行中)**: 用户已签到，座位处于占用状态。
- **Completed (已完成)**: 正常签退或预约时间到期。
- **Cancelled (已取消)**: 用户主动放弃或违规释放。

## 技术栈选型参考

- **应用框架**: Next.js 16 (App Router)。利用 Server Components 减少客户端载荷，提升首屏响应速度。
- **API 层**: Hono。部署在 Edge Runtime 的极简框架，显著降低接口延迟。
- **持久层**: Drizzle ORM + PostgreSQL。实现 Schema-to-Type 的全链路类型推导，确保数据库操作的安全。
- **样式方案**: Tailwind CSS 4 + shadcn/ui。基于原子化 CSS 构建具备高度无障碍标准的交互界面。

## 项目工程结构

```text
library/
├── drizzle/                # 数据库模式迁移脚本与元数据
├── scripts/                # 系统维护脚本 (数据播种、数据库修复)
├── src/
│   ├── app/                # 路由定义与核心 API 实现层
│   │   ├── api/            # Hono 驱动的 RESTful 路由
│   │   └── (main)/         # 前端视图容器与交互逻辑
│   ├── components/         # 业务组件与 UI 库封装
│   │   ├── spatial/        # 座位布局可视化核心组件
│   │   └── ui/             # 基于 Radix UI 的基础组件
│   ├── db/                 # 数据持久层配置与实体定义
│   │   └── schema.ts       # 核心关系模型定义 (Users, Seats, Reservations)
│   └── lib/                # 共享工具函数与通用 Hook
├── tests/                  # 包含集成测试与压力测试脚本
└── drizzle.config.ts       # Drizzle 配置文件
```

## 快速部署指南

### 1. 依赖安装
```bash
npm install
```

### 2. 环境配置
创建 `.env.local` 文件并配置以下核心变量：
```env
DATABASE_URL=postgresql://user:password@localhost:5432/library
JWT_SECRET=your_secret_key
```

### 3. 数据库初始化
```bash
npm run db:push      # 推送模式至数据库
npm run db:seed      # 填充基础演示数据
```

### 4. 启动服务
```bash
npm run dev
```

## 许可证
本项目遵循 MIT License 协议。
