# FORMU Studio (Beta)

**为记忆，塑实体** — AI 图像生成工作室，对接 chatgpt2api 后端服务。

## 技术栈

- React 19 + TypeScript
- Vite
- 支持 npm / bun

## 快速开始

```bash
# 安装依赖
npm install
# 或
bun install

# 开发模式
npm run dev
# 或
bun run dev

# 生产构建
npm run build
# 或
bun run build
```

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

## 功能

- 文生图 / 图生图
- 多模型选择
- 多画幅比例（1:1 → 9:16）
- 图像质量设置
- 项目管理系统（创建 / 重命名 / 删除，图片按项目隔离）
- 亮色 / 暗色主题
- 玻璃质感 UI
- 大图灯箱预览
- 移动端适配

## 项目结构

```
src/
├── components/
│   ├── ImageCard.tsx        # 图片卡片
│   ├── ImageGallery.tsx     # 图片画廊
│   ├── Lightbox.tsx         # 大图灯箱
│   ├── ProjectSidebar.tsx   # 项目侧边栏
│   ├── PromptInput.tsx      # 提示词输入
│   ├── Select.tsx           # 自定义下拉菜单
│   └── SettingsPanel.tsx    # 设置面板（保留）
├── hooks/
│   └── useImageGeneration.ts # 图片生成 Hook
├── lib/
│   └── api.ts              # API 客户端
├── types/
│   └── index.ts            # 类型定义
├── App.tsx                  # 主应用
├── App.css                  # 样式
└── main.tsx                 # 入口
```
