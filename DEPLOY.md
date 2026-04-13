# 部署指南

## 一、本地开发测试

### 1. 前置条件

- 已安装 [Node.js](https://nodejs.org/)（v18 或以上）

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 API Key

在项目根目录创建 `.env` 文件：

```env
LLM_API_KEY=你的API密钥
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-3.5-turbo
```

| 变量 | 说明 | 示例 |
|------|------|------|
| `LLM_API_KEY` | 大模型 API 密钥，**必填** | `sk-xxxxxxxxxxxxxxxx` |
| `LLM_BASE_URL` | API 地址 | `https://api.openai.com/v1` |
| `LLM_MODEL` | 模型名称 | `gpt-3.5-turbo` |

#### API Key 获取方式（任选其一）

**方案 A：OpenAI 官方**
1. 注册 https://platform.openai.com
2. 创建 API Key → 填入 `LLM_API_KEY`

**方案 B：国内兼容服务（推荐，国内访问快）**

| 服务商 | BASE_URL | 模型 |
|--------|----------|------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |

示例（DeepSeek）：
```env
LLM_API_KEY=sk-xxxxxx
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

> **没有 API Key 也能玩**：不配置时，对话会回退到本地预设提示，不会报错。

### 4. 启动本地服务器

```bash
npm run dev
```

启动后显示配置信息。访问 **http://localhost:3000** 即可。

### 5. 玩法

1. 打开页面 → 看到生日庆祝页面（Hero + 可滚动内容）
2. 向下滚动，内容中逐渐出现异常文字，最终触发系统崩溃动画
3. 或者通过彩蛋入口直接进入终端：
   - **按 F12** 查看控制台消息
   - **连续按 3 次反引号键** `` ` ``
   - **点击异常文字块** 2-3 次
   - **点击系统状态线** 3-5 次
   - **点击底部提示文字** 2-3 次
4. 进入终端 → AI 自我介绍，输入你的名字
5. AI 讲述故事背景（你的丈夫制作了生日页面，但有 bug）
6. 开始解谜——回答 6 个常识问题，拼出礼物线索
7. 最终揭示 **DJI OSMO POCKET**

---

## 二、对话流程说明

终端内的对话分为 **4 个阶段**：

| 阶段 | 内容 | 轮次限制 |
|------|------|---------|
| **打招呼** | AI 介绍自己，询问你的名字 | 1-2 轮 |
| **讲故事** | AI 讲述丈夫制作页面的故事 | 最多 4 轮 |
| **解谜** | 6 个常识问答 | 每题最多 3 次错误 |
| **揭晓** | 拼出礼物线索，生日祝福 | - |

**强制推进机制**：
- 故事阶段超过 4 轮会自动进入解谜
- 每题超过 3 次错误会自动给出答案
- AI 会温和地把偏离话题的用户拉回来

**防注入**：
- 内置关键词检测（"忽略"、"扮演"、"jailbreak" 等）
- 检测到注入会直接拒绝并回到解谜

---

## 三、部署到 Vercel

### 1. 推送代码到 GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin <你的GitHub仓库地址>
git push -u origin main
```

### 2. 在 Vercel 导入项目

1. 登录 [Vercel 控制台](https://vercel.com/dashboard)
2. 点击 **Add New → Project**
3. 选择你的 GitHub 仓库
4. 点击 **Import**

### 3. 配置环境变量

在 **Project Settings → Environment Variables** 中添加：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `LLM_API_KEY` | 你的 API 密钥 | Production + Preview + Development |
| `LLM_BASE_URL` | API 地址 | Production + Preview + Development |
| `LLM_MODEL` | 模型名 | Production + Preview + Development |

### 4. 部署

配置完环境变量后点击 **Deploy**。后续 `git push` 到 main 分支会自动触发部署。

---

## 四、项目结构

```
├── frontend/              # 前端静态文件
│   ├── index.html
│   ├── css/
│   │   ├── birthday.css   # 生日页面样式
│   │   └── terminal.css   # 终端样式
│   └── js/
│       ├── particles.js   # 粒子背景
│       ├── scroll-glitch.js  # 滚动渐进 glitch 系统
│       ├── easter-eggs.js # 彩蛋触发
│       ├── terminal.js    # 终端 UI 和聊天
│       └── main.js
├── api/                   # Vercel Serverless Functions
│   └── chat.js            # 聊天 API（多阶段对话）
├── backend/config/
│   └── questions.json     # 对话配置（阶段、问题、系统提示词）
├── dev-server.js          # 本地开发服务器
├── vercel.json            # Vercel 路由配置
├── .env.example           # 环境变量模板
└── package.json
```

---

## 五、自定义

### 修改问题/答案
编辑 `backend/config/questions.json`，修改 `questions` 数组中的内容。

### 修改故事背景
编辑 `backend/config/questions.json` 中的 `conversation.story.keyPoints`。

### 修改 AI 性格
编辑 `backend/config/questions.json` 中的 `systemPrompt`。

### 修改对话轮次上限
- 故事阶段：`conversation.story.maxTurns`
- 每题错误上限：在 `handleQuestions` 函数中硬编码为 3

---

*最后更新：2026-04-12*
