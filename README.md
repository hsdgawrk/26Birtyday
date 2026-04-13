# Birthday Meta-Game

一个 Sci-Fi 风格的 Meta 游戏生日网页。表面是生日庆祝页面，暗藏系统后台入口，通过 AI 对话引导用户解谜，最终揭示礼物线索：**DJI OSMO POCKET**。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run dev
```

### 3. 部署到 Vercel

```bash
npm run deploy
```

或在 Vercel 控制台导入此项目。

## 环境变量配置

在 Vercel 项目的 Settings → Environment Variables 中配置：

| 变量 | 说明 | 示例 |
|------|------|------|
| `LLM_API_KEY` | 大模型 API Key | `sk-xxx` |
| `LLM_BASE_URL` | API 基础 URL | `https://api.openai.com/v1` |
| `LLM_MODEL` | 模型名称 | `gpt-3.5-turbo` |

> 本地开发时，在项目根目录创建 `.env` 文件配置以上变量。

## 玩法

1. 访问页面，看到的是一个生日庆祝页面
2. 发现"异常"之处：
   - 按 `F12` 查看控制台
   - 连续按 3 次反引号键 `` ` ``
   - 点击闪烁的异常文字
3. 进入命令行终端，与 AI 对话
4. 回答三个问题，拼出礼物线索

## 项目结构

```
├── frontend/           # 前端静态文件
│   ├── index.html
│   ├── css/
│   │   ├── birthday.css
│   │   └── terminal.css
│   └── js/
│       ├── main.js
│       ├── easter-eggs.js
│       ├── terminal.js
│       └── particles.js
├── api/                # Vercel Serverless Functions
│   └── chat.js
├── backend/config/     # 配置文件
│   └── questions.json
├── vercel.json         # Vercel 路由配置
└── package.json
```

## 技术栈

- **前端**: Vanilla HTML/CSS/JS
- **后端**: Vercel Serverless Functions (Node.js)
- **AI**: OpenAI 兼容 API
- **部署**: Vercel
