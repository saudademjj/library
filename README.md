# 图书馆座位预约系统 Library Seat Reservation System

一个基于现代技术栈的全栈图书馆座位预约系统：Next.js（App Router）+ Hono（API）+ PostgreSQL + Drizzle ORM + shadcn/ui + Tailwind CSS 4。

## 快速开始（最短路径）

```bash
cp .env.example .env.local
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

默认访问：`http://localhost:3000`

## 常用命令速查

```bash
npm run dev          # 开发模式
npm run build        # 生产构建
npm run start        # 启动生产服务
npm run test         # 运行测试
npm run db:migrate   # 执行迁移
npm run db:seed      # 初始化数据
npm run db:studio    # 打开 Drizzle Studio
```

## 文档导航

- 想先跑起来：看「快速开始（最短路径）」与「本地开发」
- 想看接口：看「API 文档」
- 想看部署：看「部署」
- 想看安全与性能：看「注意事项」

## 技术栈

### 前端
- **框架**: Next.js 16.0.10 / React 19.2.0
- **语言**: TypeScript 5
- **UI 库**: shadcn/ui (new-york) + Tailwind CSS 4
- **图标**: Lucide React

### 后端
- **API 框架**: Hono 4.10.7（运行在 Next.js API Routes）
- **认证**: JWT (jose)
- **密码加密**: Web Crypto API

### 数据库
- **数据库**: PostgreSQL
- **ORM**: Drizzle ORM 0.44.7
- **迁移工具**: Drizzle Kit 0.31.8

## 功能特性

### 用户管理
- ✅ 用户注册（学号、邮箱验证）
- ✅ 用户登录（JWT 认证）
- ✅ 角色权限（管理员/学生）
- ✅ 账号状态管理

### 区域管理（管理员）
- ✅ 创建/编辑/删除区域
- ✅ 楼层划分
- ✅ 区域描述

### 座位管理（管理员）
- ✅ 创建/编辑/删除座位
- ✅ 座位号管理
- ✅ 座位状态（可用/不可用）

### 预约管理
- ✅ 创建预约（时间冲突检测）
- ✅ 查看预约记录
- ✅ 更新预约状态
- ✅ 取消预约
- ✅ 权限控制（用户只能管理自己的预约）

## 数据库设计

### 表结构

#### users（用户表）
- `id`: 主键
- `name`: 姓名
- `email`: 邮箱（唯一）
- `password`: 密码哈希
- `studentId`: 学号（唯一）
- `phone`: 联系电话
- `role`: 角色（admin/student）
- `isActive`: 账号状态
- `createdAt`: 创建时间

#### zones（区域表）
- `id`: 主键
- `name`: 区域名称
- `floor`: 楼层
- `description`: 描述
- `isActive`: 是否启用

#### seats（座位表）
- `id`: 主键
- `seatNumber`: 座位号
- `zoneId`: 所属区域（外键）
- `isAvailable`: 是否可用

#### reservations（预约表）
- `id`: 主键
- `seatId`: 座位（外键）
- `userId`: 用户（外键）
- `startTime`: 开始时间
- `endTime`: 结束时间
- `status`: 状态（pending/active/completed/cancelled）
- `createdAt`: 创建时间

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 PostgreSQL

选择以下任一方式：

**方式 A：使用本机 PostgreSQL**
```bash
# 确保 PostgreSQL 运行在 localhost:5432
```

**方式 B：使用 Docker**
```bash
docker compose up -d
# 容器会映射到 localhost:5433
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，根据你的 PostgreSQL 配置选择正确的 `DATABASE_URL`：

```env
# 本机 PostgreSQL（默认 5432）
DATABASE_URL=postgresql://saudade@localhost:5432/tech_stack_overview

# 或使用 Docker（端口 5433）
# DATABASE_URL=postgresql://postgres:postgres@localhost:5433/tech_stack_overview

# JWT 密钥（生产环境务必修改）
JWT_SECRET=your-secret-key-change-in-production
```

### 4. 执行数据库迁移

```bash
npm run db:migrate
```

### 5. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问：`http://localhost:3000`

## API 文档

### 认证接口

#### 注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "password123",
  "studentId": "2024001",
  "phone": "13800138000"
}
```

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "zhangsan@example.com",
  "password": "password123"
}

Response:
{
  "ok": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}
```

#### 获取当前用户信息
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 区域接口

#### 获取所有区域
```http
GET /api/zones
```

#### 获取单个区域
```http
GET /api/zones/:id
```

#### 创建区域（需要管理员权限）
```http
POST /api/zones
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "A区",
  "floor": 3,
  "description": "安静学习区"
}
```

#### 更新区域（需要管理员权限）
```http
PUT /api/zones/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "A区",
  "floor": 3,
  "isActive": true
}
```

#### 删除区域（需要管理员权限）
```http
DELETE /api/zones/:id
Authorization: Bearer <admin-token>
```

### 座位接口

#### 获取所有座位
```http
GET /api/seats
GET /api/seats?zoneId=1
```

#### 获取单个座位
```http
GET /api/seats/:id
```

#### 创建座位（需要管理员权限）
```http
POST /api/seats
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "seatNumber": "A-001",
  "zoneId": 1
}
```

#### 更新座位（需要管理员权限）
```http
PUT /api/seats/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "seatNumber": "A-001",
  "zoneId": 1,
  "isAvailable": true
}
```

#### 删除座位（需要管理员权限）
```http
DELETE /api/seats/:id
Authorization: Bearer <admin-token>
```

### 预约接口

#### 获取预约列表（需要登录）
```http
GET /api/reservations
Authorization: Bearer <token>

# 管理员可以看到所有预约
# 普通用户只能看到自己的预约
```

#### 获取单个预约（需要登录）
```http
GET /api/reservations/:id
Authorization: Bearer <token>
```

#### 创建预约（需要登录）
```http
POST /api/reservations
Authorization: Bearer <token>
Content-Type: application/json

{
  "seatId": 1,
  "startTime": "2024-01-06T09:00:00.000Z",
  "endTime": "2024-01-06T12:00:00.000Z"
}
```

#### 更新预约状态（需要登录）
```http
PUT /api/reservations/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active"
}
```

#### 取消预约（需要登录）
```http
DELETE /api/reservations/:id
Authorization: Bearer <token>
```

## 数据库管理

### 生成迁移文件
```bash
npm run db:generate
```

### 执行迁移
```bash
npm run db:migrate
```

### 打开 Drizzle Studio
```bash
npm run db:studio
# 在浏览器中打开 https://local.drizzle.studio
```

## 项目结构

```
tech-stack-overview/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API 路由
│   │   │   └── [[...route]]/ # Hono API
│   │   ├── layout.tsx       # 根布局
│   │   └── page.tsx         # 首页
│   ├── components/          # React 组件
│   │   └── ui/             # shadcn/ui 组件
│   ├── db/                  # 数据库
│   │   ├── schema.ts       # Drizzle 模式定义
│   │   └── index.ts        # 数据库连接
│   └── lib/                 # 工具函数
│       ├── auth.ts         # 认证工具
│       ├── middleware.ts   # Hono 中间件
│       ├── types.ts        # TypeScript 类型
│       └── utils.ts        # 通用工具
├── drizzle/                 # 数据库迁移文件
├── .env.example            # 环境变量示例
├── drizzle.config.ts       # Drizzle 配置
├── next.config.ts          # Next.js 配置
├── tailwind.config.ts      # Tailwind CSS 配置
└── tsconfig.json           # TypeScript 配置
```

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 数据库相关
npm run db:generate    # 生成迁移文件
npm run db:migrate     # 执行迁移
npm run db:studio      # 打开数据库管理界面
```

## 部署

### 环境变量配置

在生产环境中，确保设置以下环境变量：

```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-key-in-production
NODE_ENV=production
```

### Vercel 部署

1. 推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

### 数据库迁移

```bash
# 在生产环境中执行迁移
npm run db:migrate
```

## 注意事项

### 安全
- ⚠️ 生产环境必须修改 `JWT_SECRET`
- ⚠️ 建议使用 bcrypt 替代当前的 SHA-256 密码哈希
- ⚠️ 实施 HTTPS
- ⚠️ 添加 CORS 配置
- ⚠️ 实施速率限制

### 性能
- 考虑添加 Redis 缓存
- 实施数据库索引优化
- 添加 API 响应缓存

### 功能增强
- 添加预约通知（邮件/短信）
- 实施座位自动释放机制
- 添加预约时长限制
- 实施黑名单机制
- 添加预约统计分析

## License

MIT

## Python 环境

如需运行本机的 Python 工具，请使用：`/Users/saudade/Downloads/22/.venv`
