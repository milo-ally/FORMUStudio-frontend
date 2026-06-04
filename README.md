# FORMU Studio (Beta)

**为记忆，塑实体** — AI 图像生成工作室，对接 chatgpt2api 后端服务。

## 技术栈

- React 19 + TypeScript
- Vite
- Bun + SQLite（数据持久化服务）
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
浏览器 (React) ──fetch──▶ localhost:3001 (Bun + SQLite)    数据持久化
       │
       └──fetch──▶ localhost:8000 (Python chatgpt2api)      AI 生图
```

用户数据（项目、作品、预设）全部存在服务端 SQLite 文件 `data/user_data.db` 中，清除浏览器缓存不会丢失数据。

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

## AI 生图服务接口

前端依赖后端实现以下 5 个接口。接口详细定义见 `openapi.yaml`。自行开发生图服务器时按此规范实现即可接入。

| 接口 | 用途 |
|------|------|
| `POST /api/image-tasks/generations` | 文生图（异步） |
| `POST /api/image-tasks/edits` | 图生图（multipart，异步） |
| `GET /api/image-tasks?ids=` | 批量轮询任务状态 |
| `POST /api/image-tasks/{id}/resume-poll` | 超时续询 |
| `GET /v1/models` | 模型列表 |

轮询流程：提交任务 → 每 2 秒查状态 → 全部 `success`/`error` 后停止。

## 功能

- 文生图 / 图生图
- 多模型选择
- 多画幅比例（1:1 → 9:16）
- 图像质量设置
- 项目管理系统（创建 / 重命名 / 删除，图片按项目隔离）
- 风格探索（默认 4 种 + 无限自定义，可编辑封面图和提示词）
- 亮色 / 暗色主题
- 玻璃质感 UI
- 大图灯箱预览

## 项目结构

```
server/
  index.ts              — Bun HTTP 数据服务 (3001)
  db.ts                 — SQLite schema 与查询
src/
  components/
    DraftArea.tsx        — 生图草稿区
    Gallery.tsx          — 风格探索 + 作品画廊
    Lightbox.tsx         — 大图灯箱
    PresetEditor.tsx     — 风格编辑器
    ProjectSidebar.tsx   — 项目侧边栏
    PromptInput.tsx      — 提示词输入
    Select.tsx           — 自定义下拉菜单
    Toast.tsx            — 通知提示
  data/
    presets.ts           — 默认风格定义
  hooks/
    useImageGeneration.ts — 图片生成 Hook
  lib/
    api.ts               — AI 生图 API 客户端
    dataApi.ts           — 数据持久化 API 客户端
    promptHistory.ts     — 提示词历史
    utils.ts             — 工具函数
  types/
    index.ts             — 类型定义
  App.tsx                 — 主应用
  App.css                 — 样式
  main.tsx                — 入口
```
