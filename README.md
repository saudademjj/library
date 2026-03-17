# 图书馆座位预约系统

<p align="right">中文 | <a href="https://github.com/saudademjj/library/tree/en/readme">English</a></p>

这是一个面向校园或图书馆场景的全栈座位预约系统，覆盖用户注册登录、区域与座位管理、预约创建与冲突检测等核心流程。仓库把前端界面、API、数据库迁移和基础测试整合在同一套工程中，适合作为完整业务系统原型。

## 核心能力

- 用户注册、登录与角色权限控制
- 区域管理与楼层划分
- 座位创建、编辑、上下架
- 预约创建、取消、状态更新
- 时间冲突检测
- 管理员与普通用户的权限隔离

## 技术栈

- 前端：`Next.js 16`、`React 19`、`TypeScript`
- UI：`shadcn/ui`、`Tailwind CSS 4`、`Lucide React`
- API：`Hono`
- 认证：`JWT (jose)`
- 数据库：`PostgreSQL`
- ORM：`Drizzle ORM` + `Drizzle Kit`

## 快速开始

```bash
cp .env.example .env.local
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

默认访问地址：`http://localhost:3000`

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run test
npm run db:migrate
npm run db:seed
npm run db:studio
```

## 环境变量

至少需要配置：

```env
DATABASE_URL=postgresql://saudade@localhost:5432/tech_stack_overview
JWT_SECRET=your-secret-key-change-in-production
```

如果使用仓库内 `docker compose` 启动数据库，通常需要改用容器映射端口。

## 主要业务模块

- 认证：`/api/auth/*`
- 区域：`/api/zones`
- 座位：`/api/seats`
- 预约：`/api/reservations`

## 数据模型

- `users`：用户与角色
- `zones`：区域与楼层
- `seats`：座位资源
- `reservations`：预约记录与状态

## 适合继续扩展的方向

- 开放时间与闭馆规则
- 扫码签到/签退
- 黑名单与爽约处罚
- 管理后台统计报表
- CI/CD 与部署模板

## 许可证

本仓库采用 MIT License，详见 [LICENSE](./LICENSE)。
