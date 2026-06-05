# FORMU Studio (Beta)

**为记忆，塑实体** — AI 图像 & 3D 模型生成工作室，对接 chatgpt2api 后端服务。

## 技术栈

- React 19 + TypeScript
- Vite
- Bun + SQLite（数据持久化服务）
- Python (FastAPI) chatgpt2api 后端
- Three.js (@react-three/fiber + @react-three/drei) 3D 模型预览
- 支持 npm / bun

## 快速开始

```bash
# 安装依赖
bun install

# 启动数据服务 + 前端开发
bun run dev:all

# 或分别启动
bun run dev          # Vite :5173
bun run dev:server   # 数据服务 :3001
```

## 架构

```
浏览器 (React)
  ├── fetch → localhost:3001 (Bun + SQLite)     数据持久化
  └── fetch → localhost:8000 (Python chatgpt2api)  AI 图像 & 3D 生成
```

用户数据（项目、作品、预设、提示词历史）全部存在服务端 SQLite 文件 `data/user_data.db` 中，清除浏览器缓存不会丢失数据。进行中的生成任务通过 localStorage 持久化，刷新页面后自动恢复。

## 环境变量

创建 `.env` 文件（可参考 `.env.example`）：

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_AUTH_KEY=dummy
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | chatgpt2api 后端地址 | `http://localhost:8000` |
| `VITE_AUTH_KEY` | API 鉴权密钥 | `dummy` |

## API 接口

全部接口定义见 `openapi.yaml`。后端 chatgpt2api 运行在 `:8000`，数据服务运行在 `:3001`。

### AI 生成服务（:8000）

#### 图像生成

| 方法 | 接口 | 用途 |
|------|------|------|
| `POST` | `/api/image-tasks/generations` | 文生图（异步） |
| `POST` | `/api/image-tasks/edits` | 图生图（multipart，异步） |
| `GET` | `/api/image-tasks?ids=` | 批量轮询任务状态 |
| `POST` | `/api/image-tasks/{id}/resume-poll` | 超时续询 |
| `GET` | `/v1/models` | 图像模型列表 |

轮询流程：提交任务 → 每 2 秒查状态 → 全部 `success`/`error` 后停止。

#### 3D 模型生成

| 方法 | 接口 | 用途 |
|------|------|------|
| `GET` | `/api/3d/models` | 3D 模型列表 |
| `POST` | `/api/3d/submit` | 提交 3D 生成任务（文生3D / 图生3D） |
| `POST` | `/api/3d/query` | 查询任务状态与结果 |
| `POST` | `/api/3d/convert` | 格式转换（STL / USDZ / MP4 / GIF） |

3D 轮询流程：提交任务 → 获取 `job_id` → 每 3 秒查询状态 → `DONE` 或 `FAIL` 后停止。支持并发生成多个任务。

### 数据服务（:3001）

| 方法 | 接口 | 用途 |
|------|------|------|
| `GET` | `/api/data/projects` | 列出项目 |
| `POST` | `/api/data/projects` | 创建 / 更新项目 |
| `DELETE` | `/api/data/projects/{id}` | 删除项目 |
| `GET` | `/api/data/works?project_id=` | 按项目列出作品 |
| `POST` | `/api/data/works` | 保存作品 |
| `DELETE` | `/api/data/works/{id}` | 删除作品 |
| `GET` | `/api/data/presets` | 列出预设 |
| `PUT` | `/api/data/presets/{id}` | 创建 / 更新预设 |
| `DELETE` | `/api/data/presets/{id}` | 删除预设 |
| `GET` | `/api/data/prompt-history?category=` | 按类别列出提示词历史 |
| `POST` | `/api/data/prompt-history` | 记录提示词 |
| `GET` | `/api/data/settings/{key}` | 读取设置 |
| `PUT` | `/api/data/settings/{key}` | 写入设置 |

提示词历史按 `category` 区分：图像生成使用 `image`，3D 生成使用 `3d`，互不干扰。

## 功能

### 图像生成
- 文生图 / 图生图
- 多模型选择
- 多画幅比例（1:1 → 9:16）
- 图像质量设置
- 参考图上传与拖拽
- 草稿区（提升为作品 / 丢弃 / 作为参考图 / 文件导入）

### 3D 模型生成
- 文生3D / 图生3D / 本地上传图片生3D
- 多模型版本选择
- 从已有作品选取参考图
- Three.js OBJ 模型实时预览（旋转 / 缩放）
- 多格式文件下载与格式转换
- 并发生成多个任务

### 通用
- 项目管理系统（创建 / 重命名 / 删除，内容按项目隔离）
- 风格探索（默认 4 种 + 无限自定义，可编辑封面图和提示词）
- 亮色 / 暗色主题
- 玻璃质感 UI + 柔和气泡背景动画
- 大图灯箱预览
- 提示词历史与建议

## 项目结构

```
server/
  index.ts                 — Bun HTTP 数据服务 (3001)
  db.ts                    — SQLite schema 与查询
src/
  components/
    DraftArea.tsx           — 生图草稿区
    Gallery.tsx             — 风格探索 + 作品画廊
    Lightbox.tsx            — 大图灯箱
    ModelViewer.tsx         — Three.js 3D 模型查看器
    PresetEditor.tsx        — 风格编辑器
    ProjectSidebar.tsx      — 项目侧边栏
    PromptInput.tsx         — 提示词输入（支持类别隔离）
    Select.tsx              — 自定义下拉菜单
    ThreeDHero.tsx          — 3D 生成输入区
    ThreeDJobArea.tsx       — 3D 任务状态展示（多卡片）
    ThreeDModule.tsx        — 3D 模块编排器
    Toast.tsx               — 通知提示
    WorkPicker.tsx          — 作品选取器（图生3D 参考图）
  data/
    presets.ts              — 默认风格定义
  hooks/
    useImageGeneration.ts   — 图片生成 Hook
    use3DGeneration.ts      — 3D 生成 Hook（并发生成 / 乐观更新 / 刷新恢复）
    useTheme.ts             — 主题切换 Hook
    useToast.ts             — 通知 Hook
  lib/
    api.ts                  — AI 图像 & 3D API 客户端
    dataApi.ts              — 数据持久化 API 客户端
    utils.ts                — 工具函数
  types/
    index.ts                — 类型定义
  three-loaders.d.ts        — Three.js 加载器类型声明
  App.tsx                   — 主应用
  App.css                   — 样式
  main.tsx                  — 入口
```
