<div align="center">
  <a href="./README_en.md">English</a> | 简体中文
</div>

# Library -- 现代全栈图书馆座位预约系统

![Next.js](https://img.shields.io/badge/Next.js-15+-000000?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwind-css)
![Hono](https://img.shields.io/badge/Hono-API-E36002?style=flat-square&logo=hono)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?style=flat-square)

一个现代化的全栈图书馆座位预约系统，采用前沿技术栈构建。系统提供流畅的用户体验、安全的身份认证和高效的数据库操作，适用于管理图书馆区域、座位和用户预约。

## 核心功能

### 用户管理
- 安全的注册与登录流程
- 基于 JWT 的会话管理，使用 Web Crypto API 进行安全哈希
- 角色权限控制（管理员 / 学生）
- 用户信息维护与密码修改

### 区域管理（管理员）
- 图书馆区域的完整 CRUD 操作（楼层、静音区、自习室等）
- 区域容量配置与状态管理
- 区域内座位的批量操作

### 座位管理（管理员）
- 在指定区域内动态创建、编辑座位
- 座位可用状态的实时切换
- 座位编号与位置标识管理

### 预约系统
- 无冲突的座位预约逻辑，防止重复预订
- 预约状态实时流转：待确认 -> 使用中 -> 已完成 / 已取消
- 严格的所有权规则：用户只能管理自己的预约
- 预约时段冲突检测与提示
- 历史预约记录查询

## 技术架构

### 前端层

- Next.js 15+ App Router：基于 React Server Components 的页面渲染
- React 19：最新的并发特性与 Hooks 生态
- TypeScript 5：全链路类型安全
- Tailwind CSS 4：原子化 CSS 响应式布局
- shadcn/ui：基于 Radix UI 的高质量组件库
- Lucide React：一致的图标体系

### API 层

- Hono：轻量高性能的 Web 框架，挂载于 Next.js API Routes
- Zod：运行时请求参数校验
- JWT：无状态的身份认证令牌

### 数据层

- PostgreSQL 16：关系型数据持久化
- Drizzle ORM：类型安全的 ORM，支持迁移管理
- Docker Compose：一键启动数据库环境

## 目录结构

```text
library/
├── src/
│   ├── app/                # Next.js App Router 页面与布局
│   │   ├── api/            # Hono API 路由挂载点
│   │   ├── dashboard/      # 管理员仪表盘
│   │   ├── reservations/   # 预约管理页面
│   │   └── zones/          # 区域与座位浏览
│   ├── components/         # UI 组件（基于 shadcn/ui）
│   │   ├── ui/             # 基础 UI 原语
│   │   └── ...             # 业务组件
│   └── lib/                # 工具函数、认证辅助
├── drizzle/                # 数据库迁移文件
├── drizzle.config.ts       # Drizzle ORM 配置
├── scripts/
│   ├── seed.ts             # 数据库种子数据
│   └── repair_db_full.ts   # 数据库修复脚本
├── tests/                  # 测试套件
├── docker-compose.yml      # PostgreSQL 容器编排
└── package.json            # 依赖与脚本
```

## 快速开始

### 环境要求

- Node.js >= 20
- PostgreSQL >= 16（或使用 Docker）

### 1. 环境配置

```bash
git clone https://github.com/saudademjj/library.git
cd library
cp .env.example .env.local
# 编辑 .env.local，配置 DATABASE_URL 和 JWT_SECRET
```

### 2. 启动数据库

```bash
docker compose up -d
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

访问 `http://localhost:3000` 即可使用。

### 可用命令

```bash
npm run dev          # 启动开发服务器（Webpack 模式）
npm run dev:turbo    # 启动开发服务器（Turbopack 模式）
npm run build        # 生产构建
npm run test         # 运行测试
npm run db:generate  # 生成迁移文件
npm run db:migrate   # 执行数据库迁移
npm run db:studio    # 启动 Drizzle Studio 可视化管理
npm run db:seed      # 填充种子数据
npm run db:repair    # 执行数据库修复
npm run lint         # 代码检查
```

## 数据库管理

### 迁移工作流

```bash
# 修改 schema 后生成迁移
npm run db:generate

# 应用迁移到数据库
npm run db:migrate

# 可视化查看数据库
npm run db:studio
```

### 数据修复

当数据库出现不一致状态时，可使用修复脚本：

```bash
npm run db:repair
```

## 许可证

MIT License
