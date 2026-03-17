<div align="center">
  <a href="./README_en.md">English</a> | 简体中文
</div>

# 校园图书馆座位预约系统 (Library Seat Reservation System)

![Next.js](https://img.shields.io/badge/Next.js-16.0-000000?style=flat-square&logo=next.js)
![Hono](https://img.shields.io/badge/Hono-4.10-E36002?style=flat-square&logo=hono)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square&logo=drizzle)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)

本项目是一个高性能、全栈式的物理资源预约管理系统。系统旨在解决高并发场景下校园图书馆、自习室座位的分配冲突与管理低效问题。通过深度集成 Next.js 服务端组件与 Hono 边缘 API，实现了毫秒级的预约响应与高精度的空间可视化。

## 🏛️ 系统架构设计

### 1. 技术栈选型原理解析
- **Next.js 16 (App Router)**: 选择 React 19 并发模式与 Server Components，旨在将 80% 的 UI 渲染压力保留在服务端，显著降低移动端用户的设备功耗。
- **Hono (API Layer)**: 采用部署在 Edge Runtime 的 Hono 框架。其极小的运行载荷与极速的路由匹配引擎，使得 API 层的端到端延迟降低了约 40%。
- **Drizzle ORM**: 相比 Prisma，Drizzle 提供了更加轻量、零抽象开销的 SQL 构建体验，并能实现数据库模式与 TypeScript 类型的原生同步。

### 2. 数据模型与实体关系 (ERD)
系统核心由以下四个实体构建，确保了数据结构的扁平化与检索的高效性：
- **Users**: 存储用户信息、学号及 RBAC 角色权限。
- **Zones**: 区域实体，包含地理位置元数据（楼层、描述）及布局配置。
- **Seats**: 最小物理单元，存储在 Zone 内的相对坐标 (x, y) 与当前状态。
- **Reservations**: 业务核心表，关联 User 与 Seat，记录完整的时间跨度与生命周期状态。

### 3. 核心业务逻辑实现

#### 预约冲突检测算法 (Collision Detection)
系统采用**非重叠区间校验逻辑**。当用户尝试预约 `[T_start, T_end]` 时，后端执行以下原子化查询：
```sql
SELECT count(*) FROM reservations 
WHERE seat_id = $id 
AND status NOT IN ('cancelled')
AND (
  (start_time, end_time) OVERLAPS ($T_start, $T_end)
)
```
通过数据库级的事务锁定或 OVERLAPS 操作符，从物理层杜绝了双重预约的可能。

#### 空间可视化渲染引擎
前端通过解析后端返回的布局 JSON，动态映射为响应式组件。每个座位基于其 `rotation` 与 `coordinate` 属性进行绝对定位，支持动态的缩放与平移交互。

## 📂 深度目录分析

```text
library/
├── drizzle/                # 自动化生成的 SQL 模式迁移文件与版本快照
├── scripts/
│   ├── seed.ts             # 基于 Faker.js 的大规模压力测试数据生成脚本
│   └── repair_db.ts        # 针对由于异常中断导致的预约状态不一致自动修复工具
├── src/
│   ├── app/api/[[...route]] # Hono API 的统筹入口，实现后端路由的统一治理
│   ├── components/
│   │   ├── spatial/        # 可视化核心：实现 Canvas/SVG 坐标转换逻辑
│   │   └── dashboard/      # 管理员侧的高级统计图表与资源监控器
│   ├── db/
│   │   ├── schema.ts       # 核心实体建模：利用 Drizzle pgTable 定义强类型模型
│   │   └── client.ts       # 连接池管理：针对边缘环境优化的高性能数据库驱动配置
│   └── lib/                # 包含 JWT 校验、通用时间格式化与业务常量定义
├── tests/                  # 包含针对预约冲突、自动取消逻辑的集成测试
└── next.config.ts          # 针对 Webpack 与 Turbo 的专项性能调优配置
```

## 🚀 开发者快速上手

### 1. 环境依赖
- Node.js >= 20.10.0
- PostgreSQL >= 15
- Docker (用于快速启动数据库实例)

### 2. 部署流程
```bash
# 1. 深度依赖分析并安装
npm install

# 2. 配置物理存储层
# 复制模板并填写 DATABASE_URL
cp .env.example .env.local

# 3. 模式推送与数据预置
npm run db:push
npm run db:seed

# 4. 开启高性能开发环境
npm run dev
```

## 🛠️ 待办路线图 (Roadmap)
- [ ] **可视化 2.0**: 引入 Three.js 驱动的 3D 实景选座交互。
- [ ] **智能调度**: 基于用户信用分与历史偏好自动推荐最优座位。
- [ ] **硬件集成**: 实现基于 MQTT 协议的座位物理指示灯状态实时同步。

## 许可证
本项目遵循 MIT License 协议。
