# FORMU Studio (Beta)

**为记忆，塑实体** — AI 图像 & 3D 模型生成工作室，对接 chatgpt2api 后端服务。

## 技术栈

- React 19 + TypeScript
- Vite
- Bun + SQLite（数据持久化服务）
- Python (FastAPI) chatgpt2api 后端
- Three.js (@react-three/fiber + @react-three/drei) 3D 模型预览

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

用户数据（项目、作品、预设、提示词历史、拼豆图纸）全部存在服务端 SQLite 文件 `data/user_data.db` 中，清除浏览器缓存不会丢失数据。进行中的生成任务通过 localStorage 持久化，刷新页面后自动恢复。

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

全部接口的请求/响应 Schema 见 `openapi.yaml`。后端 chatgpt2api 运行在 `:8000`，数据服务运行在 `:3001`。

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

> 全部接口在 `src/server/index.ts` 中，数据库操作在 `src/server/db.ts`。

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
| `GET` | `/api/data/perler-patterns?project_id=` | 按项目列出拼豆图纸 |
| `POST` | `/api/data/perler-patterns` | 保存新拼豆图纸 |
| `PUT` | `/api/data/perler-patterns/{id}` | 更新拼豆图纸 |
| `DELETE` | `/api/data/perler-patterns/{id}` | 删除拼豆图纸 |

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

### 拼豆图纸
- 上传图片 / 从已有作品选取 → 生成拼豆图纸
- 5 种色号系统（MARD / COCO / 漫漫 / 盼盼 / 咪小窝），292 种珠子颜色
- 两种像素化模式：卡通模式（主色） / 真实模式（平均色）
- 画笔绘制 / 橡皮擦 / 油漆桶 / 颜色替换
- 拖拽连续绘制 + 笔划撤销（Ctrl+Z）
- 无限缩放 + 平移预览
- 导出高清 PNG 图纸（含网格线 / 坐标轴 / 色号标注）
- 导出颜色统计 CSV
- 图纸保存到服务端（刷新 / 清除缓存不丢失）

### 通用
- 项目管理系统（创建 / 重命名 / 删除，内容按项目隔离）
- 风格探索（默认 4 种 + 无限自定义，可编辑封面图和提示词）
- 亮色 / 暗色主题
- 玻璃质感 UI + 柔和气泡背景动画
- 大图灯箱预览
- 提示词历史与建议

## 项目结构

```
src/
  App.tsx                       — 应用 Shell（主题、标签路由、项目管理）
  App.css                       — 全局样式（主题变量、布局、气泡动画）
  main.tsx                      — Vite 入口
  api/
    api.ts                      — AI 生成 API 客户端（图像 + 3D）
    dataApi.ts                  — 数据持久化 API 客户端（CRUD）
  server/
    index.ts                    — Bun HTTP 数据服务 (:3001)
    db.ts                       — SQLite Schema 与查询
  scripts/
    kill-port.ts                — 端口清理工具
  utils/
    fileUtils.ts                — 工具函数（base64 → File）
    migrateData.ts              — 本地数据迁移（localStorage → SQLite）
    presetStorage.ts            — 遗留预设存储（OPFS + localStorage）
    workFilesystem.ts           — 遗留作品文件存储（OPFS）
  components/
    image/                      ← 图像生成模块
      ImageModule.tsx/css       — 模块编排器
      useImageGeneration.ts     — 图片生成 Hook
      presets.ts                — 默认风格定义
      DraftArea.tsx/css         — 生图草稿区
      Gallery.tsx/css           — 风格探索 + 作品画廊
      Lightbox.tsx/css          — 大图灯箱
      PresetEditor.tsx/css      — 风格编辑器
      index.ts
    3d/                         ← 3D 模型生成模块
      ThreeDModule.tsx/css      — 模块编排器
      use3DGeneration.ts        — 3D 生成 Hook
      ThreeDHero.tsx/css        — 3D 生成输入区
      ThreeDJobArea.tsx/css     — 3D 任务状态展示
      ModelViewer.tsx           — Three.js 3D 模型查看器
      index.ts
    perler/                     ← 拼豆图纸模块
      PerlerModule.tsx/css      — 模块编排器
      usePerlerPattern.ts       — 拼豆图案状态管理 Hook
      PerlerHero.tsx/css        — 拼豆输入区
      PerlerPreview.tsx/css     — 拼豆图纸预览画布
      PerlerColorPanel.tsx/css  — 颜色面板（色板 + 统计表）
      PerlerExportModal.tsx/css — 导出选项对话框
      colorSystem.ts            — 色号系统工具
      editing.ts                — 像素编辑算法
      pixelation.ts             — 像素化算法（Oklab 色彩空间）
      download.ts               — PNG / CSV 导出
      colorSystemMapping.json   — 292 种颜色 × 5 品牌映射
      index.ts
    shared/                     ← 共享 UI 组件
      PromptInput.tsx/css       — 提示词输入
      ProjectSidebar.tsx/css    — 项目侧边栏
      Select.tsx/css            — 自定义下拉菜单
      Toast.tsx/css             — 通知提示
      WorkPicker.tsx/css        — 作品选取器
      index.ts
  hooks/
    useTheme.ts                 — 主题切换 Hook
    useToast.ts                 — 通知 Hook
  types/
    index.ts                    — 类型定义
  assets/
    hero.png, 3d.png, anime.png, cyberpunk.png, robot.png
  three-loaders.d.ts            — Three.js 加载器类型声明
docs/                           — 后端 API 参考文档
  Convert.md, OpenAICompat.md, Query.md, Submit.md
openapi.yaml                    — API Schema 定义
```
