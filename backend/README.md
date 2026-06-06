# FORMU Studio 企业级后端

基于 Spring Boot 3 + Spring Security + JPA 的企业级数据服务后端。

## 技术栈

- Java 17
- Spring Boot 3.2.x
- Spring Security + JWT
- Spring Data JPA
- PostgreSQL (生产环境) / H2 (开发环境)
- Flyway 数据库迁移
- Lombok
- Maven

## 核心特性

### 1. 用户认证与授权
- JWT Token 认证
- 用户注册/登录
- 角色权限管理 (USER/ADMIN)
- 账户状态管理 (ACTIVE/INACTIVE/SUSPENDED)

### 2. 多租户数据隔离
- 所有业务数据关联用户 ID
- Repository 层自动过滤用户数据
- Service 层验证数据所有权

### 3. 事务支持
- `@Transactional` 注解保证数据一致性
- 删除项目时级联删除关联作品

### 4. 分层架构
- Controller: REST API 入口
- Service: 业务逻辑层
- Repository: 数据访问层
- Entity: JPA 实体模型

## 项目结构

```
src/main/java/com/formu/
├── FormuStudioApplication.java    # 启动类
├── controller/                     # 控制器层
│   ├── AuthController.java
│   ├── ProjectController.java
│   ├── WorkController.java
│   └── PerlerPatternController.java
├── service/                        # 服务层
│   ├── AuthService.java
│   ├── ProjectService.java
│   ├── WorkService.java
│   └── PerlerPatternService.java
├── repository/                     # 数据访问层
│   ├── UserRepository.java
│   ├── ProjectRepository.java
│   ├── WorkRepository.java
│   └── PerlerPatternRepository.java
├── entity/                         # JPA 实体
│   ├── User.java
│   ├── UserRole.java
│   ├── UserStatus.java
│   ├── Project.java
│   ├── Work.java
│   └── PerlerPattern.java
├── dto/                            # 数据传输对象
│   ├── AuthRequest.java
│   ├── RegisterRequest.java
│   └── AuthResponse.java
└── security/                       # 安全配置
    ├── SecurityConfig.java
    ├── JwtAuthenticationFilter.java
    └── JwtUtil.java

src/main/resources/
├── application.yml                 # 配置文件
└── db/migration/                   # Flyway 迁移脚本
    └── V1__Initial_schema.sql
```

## API 接口

### 认证接口 (无需认证)
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 项目管理 (需要认证)
- `GET /api/data/projects` - 获取用户项目列表
- `GET /api/data/projects/{id}` - 获取单个项目
- `POST /api/data/projects` - 创建项目
- `PUT /api/data/projects/{id}` - 更新项目
- `DELETE /api/data/projects/{id}` - 删除项目 (含级联删除)

### 作品管理 (需要认证)
- `GET /api/data/works?projectId={id}` - 获取项目作品
- `POST /api/data/works` - 创建作品
- `DELETE /api/data/works/{id}` - 删除作品

### 拼豆图案管理 (需要认证)
- `GET /api/data/perler-patterns?projectId={id}` - 获取图案列表
- `GET /api/data/perler-patterns/{id}` - 获取单个图案
- `POST /api/data/perler-patterns` - 创建图案
- `PUT /api/data/perler-patterns/{id}` - 更新图案
- `DELETE /api/data/perler-patterns/{id}` - 删除图案

## 快速开始

### 1. 配置数据库
修改 `application.yml` 中的数据库连接信息：
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/formu_studio
    username: postgres
    password: your_password
```

### 2. 启动应用
```bash
cd backend
mvn spring-boot:run
```

服务将在 `http://localhost:8080/api` 启动。

### 3. 使用 API

注册用户：
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

登录获取 Token：
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

使用 Token 访问受保护接口：
```bash
curl http://localhost:8080/api/data/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 数据库迁移

使用 Flyway 进行数据库版本管理：
```bash
mvn flyway:migrate
```

## 前端适配

更新前端 `src/api/dataApi.ts` 中的 `DATA_URL` 为新的后端地址，并在请求时添加 JWT Token。
