<div align="center">
  <a href="./README_en.md">English</a> | 简体中文
</div>

# Library -- 图书馆座位预约系统

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwind-css)
![Hono](https://img.shields.io/badge/Hono-4.10-E36002?style=flat-square&logo=hono)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square)

一个全栈图书馆座位预约系统，基于 Next.js 16 + Hono + Drizzle ORM + PostgreSQL 构建。支持用户注册登录、区域与座位管理、无冲突预约、QR 码签到、排行榜统计等功能，采用角色权限控制区分管理员与学生操作。

---

## 核心功能

### 用户系统

- 注册与登录 -- bcryptjs 密码哈希，JWT 无状态会话（jose 库签发与验证）
- 角色权限 -- 管理员 / 学生两级权限控制
- 个人中心 -- 用户信息维护与密码修改
- 密码重置 -- 忘记密码流程支持

### 区域管理（管理员）

- 图书馆区域的完整 CRUD 操作（楼层、静音区、自习室等）
- 区域容量配置与状态管理
- 可视化座位布局设计器 -- 拖拽式座位编排，支持座位旋转角度设置

### 座位管理（管理员）

- 在指定区域内动态创建、编辑座位
- 座位可用状态的实时切换
- 座位编号与位置标识管理
- 批量座位编排脚本

### 预约系统

- 无冲突预约 -- 时段冲突检测，防止重复预订
- 状态流转 -- 待确认 -> 使用中 -> 已完成 / 已取消
- 所有权规则 -- 用户只能管理自己的预约
- 历史记录 -- 预约记录查询与回顾
- QR 码签到 -- 生成预约二维码用于现场签到

### 数据统计

- 排行榜 -- 用户学习时长排名
- 时间线 -- 可视化预约时段展示

---

## 技术栈

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | 16.0.10 | React 全栈框架，App Router |
| React | 19.2.0 | UI 库，并发特性 |
| TypeScript | 5 | 全链路类型安全 |
| Tailwind CSS | 4 | 原子化 CSS 框架 |
| shadcn/ui | - | 基于 Radix UI 的组件库 |
| Zustand | 5.0.9 | 轻量状态管理 |
| Lucide React | 0.562.0 | 图标库 |
| dayjs | 1.11.19 | 日期处理 |
| sonner | 2.0.7 | Toast 通知 |
| qrcode | 1.5.4 | QR 码生成 |

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Hono | 4.10.7 | 轻量 Web 框架，挂载于 Next.js API Routes |
| Drizzle ORM | 0.44.7 | 类型安全的 ORM |
| PostgreSQL | 16+ | 关系型数据库 |
| jose | 6.1.3 | JWT 签发与验证 |
| bcryptjs | 3.0.3 | 密码哈希 |
| Zod | - | 运行时请求参数校验 |

### 开发工具

| 工具 | 说明 |
|------|------|
| ESLint 9 | 代码规范检查 |
| Drizzle Kit 0.31.8 | 数据库迁移管理 |
| tsx | TypeScript 脚本执行 |
| Docker Compose | 数据库容器编排 |

---

## 项目结构

```text
library/
├── src/
│   ├── app/
│   │   ├── (main)/                 # 用户端页面（带布局）
│   │   │   ├── dashboard/          # 用户仪表盘
│   │   │   ├── reservations/       # 预约管理
│   │   │   ├── seats/              # 座位浏览
│   │   │   └── profile/            # 个人中心
│   │   ├── admin/                  # 管理员页面
│   │   │   ├── zones/              # 区域管理
│   │   │   ├── seats/              # 座位管理
│   │   │   ├── reservations/       # 预约管理
│   │   │   └── users/              # 用户管理
│   │   ├── api/[[...route]]/       # Hono API 路由挂载点
│   │   ├── login/                  # 登录页
│   │   ├── register/               # 注册页
│   │   ├── forgot-password/        # 忘记密码
│   │   ├── reset-password/         # 重置密码
│   │   ├── checkin/                # QR 码签到
│   │   └── zones/                  # 区域浏览
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 基础组件
│   │   ├── AppHeader.tsx           # 应用头部
│   │   ├── Leaderboard.tsx         # 排行榜
│   │   ├── TimeTimeline.tsx        # 时间线
│   │   ├── SeatDetailPanel.tsx     # 座位详情面板
│   │   ├── ConfirmDialog.tsx       # 确认对话框
│   │   └── MainAuthGuard.tsx       # 认证守卫
│   ├── db/
│   │   ├── index.ts                # 数据库连接
│   │   └── schema.ts              # 表定义（users, zones, seats, reservations）
│   └── lib/
│       ├── auth.ts                 # 服务端认证逻辑
│       ├── client-auth.ts          # 客户端认证工具
│       ├── middleware.ts           # Hono 中间件
│       ├── reservation-policy.ts   # 预约策略规则
│       ├── store.ts                # Zustand Store
│       ├── datetime.ts             # 日期工具
│       ├── types.ts                # 类型定义
│       └── utils.ts                # 通用工具
├── scripts/
│   ├── seed.ts                     # 种子数据
│   ├── seed_real_layout.ts         # 真实布局种子数据
│   ├── arrange_seats.ts            # 座位编排脚本
│   ├── repair_db_full.ts           # 数据库修复
│   └── verify_repair.ts           # 修复验证
├── drizzle/                        # 迁移文件（7 个版本）
├── tests/
│   ├── auth-security.test.ts       # 认证安全测试
│   ├── middleware-auth.test.ts     # 中间件测试
│   └── reservation-policy.test.ts  # 预约策略测试
├── docker-compose.yml              # PostgreSQL 容器编排
└── package.json
```

---

## 快速开始

### 环境要求

- Node.js >= 20
- PostgreSQL >= 16（或使用 Docker）

### 1. 克隆与配置

```bash
git clone https://github.com/saudademjj/library.git
cd library
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 本地 PostgreSQL
DATABASE_URL=postgresql://用户名@localhost:5432/数据库名

# Docker PostgreSQL（见 docker-compose.yml，端口 5433）
# DATABASE_URL=postgresql://postgres:postgres@localhost:5433/数据库名

# JWT 密钥（生产环境务必修改）
JWT_SECRET=your-secret-key-change-in-production
```

### 2. 启动数据库

```bash
# 使用 Docker（推荐）
docker compose up -d

# 或使用本地 PostgreSQL
```

### 3. 安装依赖与初始化

```bash
npm install
npm run db:migrate
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## 可用脚本

```bash
npm run dev             # 启动开发服务器（Webpack）
npm run dev:turbo       # 启动开发服务器（Turbopack）
npm run build           # 生产构建
npm run start           # 启动生产服务器
npm run test            # 运行测试
npm run lint            # 代码检查
```

### 数据库管理

```bash
npm run db:generate     # 根据 Schema 变更生成迁移
npm run db:migrate      # 应用迁移到数据库
npm run db:studio       # 启动 Drizzle Studio 可视化管理
npm run db:seed         # 填充种子数据
npm run db:repair       # 数据库修复（数据不一致时使用）
```

---

## 数据模型

系统包含 4 张核心表：

| 表 | 说明 | 关键字段 |
|------|------|----------|
| users | 用户 | id, username, email, password, role(admin/student) |
| zones | 区域 | id, name, capacity, status |
| seats | 座位 | id, zone_id, seat_number, rotation, available |
| reservations | 预约 | id, user_id, seat_id, start_time, end_time, status |

预约状态流转：`pending` -> `in_use` -> `completed` / `cancelled`

---

## License

[MIT](LICENSE)
