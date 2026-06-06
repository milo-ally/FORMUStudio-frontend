# FORMU Studio - Go Backend

基于 Go + PostgreSQL 的企业级后端服务，支持用户认证、多租户数据隔离和事务操作。

## 技术栈

- Go 1.21+
- PostgreSQL
- JWT 认证
- 标准库 net/http (无框架依赖)

## 项目结构

```
backend/
├── go.mod
├── go.sum
├── main.go
├── db/
│   ├── migrate.go      # 数据库迁移
│   ├── models.go       # 数据模型
│   └── repos.go        # Repository 层
├── services/
│   ├── user.go         # 用户服务
│   ├── project.go      # 项目服务
│   ├── work.go         # 作品服务
│   └── perler.go       # 拼豆图案服务
├── handlers/
│   ├── auth.go         # 认证 Handler
│   ├── project.go      # 项目 Handler
│   ├── work.go         # 作品 Handler
│   └── perler.go       # 拼豆图案 Handler
└── middleware/
    └── auth.go         # JWT 认证中间件
```

## 快速开始

### 1. 准备 PostgreSQL 数据库

创建数据库：
```sql
CREATE DATABASE formu_studio;
```

### 2. 配置环境变量

创建 `.env` 文件或直接在环境中设置：
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_NAME=formu_studio
export DB_SSLMODE=disable
```

### 3. 安装依赖

```bash
cd backend
go mod tidy
```

### 4. 运行服务

```bash
go run main.go
```

服务默认运行在 `http://localhost:8080`

## API 接口

### 认证接口 (无需 JWT)

#### 注册
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### 项目管理 (需要 JWT)

```
GET    /api/data/projects          # 获取用户项目列表
GET    /api/data/projects/{id}     # 获取单个项目
POST   /api/data/projects          # 创建项目
PUT    /api/data/projects/{id}     # 更新项目
DELETE /api/data/projects/{id}     # 删除项目 (级联删除作品)
```

### 作品管理 (需要 JWT)

```
GET    /api/data/works?projectId={id}  # 获取项目作品
POST   /api/data/works                 # 创建作品
DELETE /api/data/works/{id}            # 删除作品
```

### 拼豆图案管理 (需要 JWT)

```
GET    /api/data/perler-patterns?projectId={id}  # 获取图案列表
GET    /api/data/perler-patterns/{id}            # 获取单个图案
POST   /api/data/perler-patterns                 # 创建图案
PUT    /api/data/perler-patterns/{id}            # 更新图案
DELETE /api/data/perler-patterns/{id}            # 删除图案
```

## 核心特性

### 1. 用户认证与授权

- JWT Token 认证
- 密码 bcrypt 加密
- 用户状态管理

### 2. 多租户数据隔离

- 所有业务数据关联 user_id
- Repository 层自动过滤用户数据
- Service 层验证数据所有权

### 3. 数据一致性

- 级联删除项目时同时删除相关作品
- 作品计数自动维护
- 数据库级别的外键约束

## 前端适配指南

### 更新 dataApi.ts

```typescript
const DATA_URL = "http://localhost:8080/api/data";
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

export async function fetchProjects(): Promise<ApiProject[]> {
  const res = await fetch(`${DATA_URL}/projects`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  return res.json();
}
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 8080 | 服务端口 |
| DB_HOST | localhost | 数据库主机 |
| DB_PORT | 5432 | 数据库端口 |
| DB_USER | postgres | 数据库用户 |
| DB_PASSWORD | postgres | 数据库密码 |
| DB_NAME | formu_studio | 数据库名称 |
| DB_SSLMODE | disable | SSL 模式 |

## 生产部署建议

1. 使用环境变量管理 JWT Secret
2. 添加请求限流
3. 添加日志和监控
4. 使用 HTTPS
5. 定期数据库备份
