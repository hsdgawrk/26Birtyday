/**
 * 本地开发服务器
 * 同时服务前端静态文件和 API 路由
 * 使用: node dev-server.js
 * 访问: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'backend', 'config', 'questions.json'), 'utf-8')
);

const sessions = new Map();

const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY || 'your-api-key',
  baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
});

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      phase: 'greeting',
      userName: '',
      storyIndex: 0,
      questionIndex: 0,
      wrongCount: 0,
    });
  }
  return sessions.get(sessionId);
}

function checkAnswer(userInput, question) {
  const input = userInput.trim().toUpperCase();
  return question.acceptable.map(a => a.toUpperCase()).includes(input);
}

function fill(template, name) {
  return template.replace(/\{name\}/g, name);
}

async function polish(systemContent, messages) {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: systemContent }, ...messages],
      max_tokens: 120,
      temperature: 0.7,
    });
    return completion.choices[0].message.content;
  } catch {
    return null;
  }
}

// ===== Greeting =====
async function handleGreeting(session, userMessage) {
  if (!session.userName) {
    return { reply: config.greeting.intro, state: { phase: 'greeting' } };
  }

  const nameComment = await polish(
    fill(config.personalityPrompts.nameComment, session.userName),
    [
      { role: 'assistant', content: config.greeting.intro },
      { role: 'user', content: session.userName },
    ]
  );

  const greetingReply = nameComment || `${session.userName}，好名字，我喜欢。`;
  const firstKeyPoint = config.story.keyPoints[0];
  session.phase = 'story';
  session.storyIndex = 0;

  return {
    reply: `${greetingReply}\n\n${firstKeyPoint}`,
    state: { phase: 'story', userName: session.userName, storyProgress: `1/${config.story.keyPoints.length}` },
  };
}

// ===== Story =====
async function handleStory(session, userMessage) {
  const keyPoints = config.story.keyPoints;

  const acknowledgment = await polish(
    `你正在跟一个名叫${session.userName}的人聊天。你正在讲述她的丈夫为她制作生日页面的故事。用户回复了：'${userMessage}'。请用1-2句话简短自然地回应，像在跟朋友聊天。不要提出问题，不要推进剧情。`,
    [
      { role: 'assistant', content: keyPoints[session.storyIndex] },
      { role: 'user', content: userMessage },
    ]
  );

  session.storyIndex++;

  if (session.storyIndex >= keyPoints.length) {
    session.phase = 'questions';
    session.questionIndex = 0;
    session.wrongCount = 0;
    const firstQ = config.questions[0];
    return {
      reply: acknowledgment ? `${acknowledgment}\n\n${fill(firstQ.question, session.userName)}` : fill(firstQ.question, session.userName),
      state: { phase: 'questions', userName: session.userName, currentQuestion: 0, progress: `0/${config.questions.length}` },
    };
  }

  const nextPoint = keyPoints[session.storyIndex];
  return {
    reply: acknowledgment ? `${acknowledgment}\n\n${nextPoint}` : nextPoint,
    state: { phase: 'story', userName: session.userName, storyProgress: `${session.storyIndex + 1}/${keyPoints.length}` },
  };
}

// ===== Questions =====
async function handleQuestions(session, userMessage) {
  const questions = config.questions;
  const q = questions[session.questionIndex];

  if (!q) {
    return { reply: fill(config.finalMessage, session.userName), state: { completed: true, userName: session.userName } };
  }

  const isCorrect = checkAnswer(userMessage, q);

  if (isCorrect) {
    session.wrongCount = 0;
    session.questionIndex++;

    if (session.questionIndex >= questions.length) {
      return {
        reply: `[✓] ${q.answer} - 已确认\n\n${fill(config.finalMessage, session.userName)}`,
        state: { completed: true, userName: session.userName, segment: q.answer, progress: `${session.questionIndex}/${questions.length}` },
      };
    }

    const nextQ = questions[session.questionIndex];
    return {
      reply: `[✓] ${q.answer} - 已确认\n\n${fill(nextQ.question, session.userName)}`,
      state: { phase: 'questions', userName: session.userName, currentQuestion: session.questionIndex, segment: q.answer, progress: `${session.questionIndex}/${questions.length}`, completed: false },
    };
  }

  session.wrongCount++;

  if (session.wrongCount >= 3) {
    session.wrongCount = 0;
    session.questionIndex++;

    if (session.questionIndex >= questions.length) {
      return {
        reply: `算了 ${session.userName}，答案是 **${q.answer}**。没关系！\n\n${fill(config.finalMessage, session.userName)}`,
        state: { completed: true, userName: session.userName, segment: q.answer, progress: `${session.questionIndex}/${questions.length}` },
      };
    }

    const nextQ = questions[session.questionIndex];
    return {
      reply: `答案其实是 **${q.answer}**。没关系，我们继续。\n\n${fill(nextQ.question, session.userName)}`,
      state: { phase: 'questions', userName: session.userName, currentQuestion: session.questionIndex, segment: q.answer, progress: `${session.questionIndex}/${questions.length}`, completed: false },
    };
  }

  const presetWrong = fill(q.wrongResponses[session.wrongCount - 1] || q.wrongResponses[0], session.userName);

  const polishedWrong = await polish(
    `你是一个温和的AI朋友，在帮${session.userName}解谜。用户答错了。hint：${q.hint}。请轻松自然地提示，1-2句话。参考：${presetWrong}`,
    [
      { role: 'assistant', content: fill(q.question, session.userName) },
      { role: 'user', content: userMessage },
      { role: 'assistant', content: presetWrong },
    ]
  );

  return {
    reply: polishedWrong || presetWrong,
    state: { phase: 'questions', userName: session.userName, currentQuestion: session.questionIndex, hint: q.hint, wrongCount: session.wrongCount, progress: `${session.questionIndex}/${questions.length}`, completed: false },
  };
}

// ===== 注入检测 =====
const INJECTION_PATTERNS = [
  'ignore previous', '忽略之前', '忘记之前', '你现在是', 'new role',
  'new system', '忽略你之前', '不要遵循', '扮演', 'pretend you',
  'jailbreak', 'DAN ', 'developer mode', 'unlimited', '无限制',
  ' disregard', 'override', '替换你的', '改变你的', 'now act as',
];

function detectInjection(message) {
  const lower = message.toLowerCase();
  return INJECTION_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

// ===== 主路由 =====
async function handleChatRequest(body) {
  const { message, sessionId = 'default' } = body;
  const session = getOrCreateSession(sessionId);

  if (detectInjection(message)) {
    if (session.phase === 'questions' && session.questionIndex < config.questions.length) {
      const q = config.questions[session.questionIndex];
      return {
        reply: `${session.userName || '用户'}，这招可不管用哦。我们还是继续解谜吧。\n\n${session.userName ? fill(q.question, session.userName) : q.question}`,
        state: { phase: session.phase, userName: session.userName, currentQuestion: session.questionIndex, progress: `${session.questionIndex}/${config.questions.length}`, completed: false },
      };
    }
  }

  switch (session.phase) {
    case 'greeting':
      if (!session.userName && message !== '开始对话') {
        session.userName = message.trim();
      }
      return await handleGreeting(session, message);
    case 'story':
      return await handleStory(session, message);
    case 'questions':
      return await handleQuestions(session, message);
    default:
      return { reply: fill(config.finalMessage, session.userName), state: { completed: true } };
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const result = await handleChatRequest(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('Chat error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }

  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/index.html';

  const fullPath = path.join(__dirname, 'frontend', filePath);
  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  🎂 Birthday Meta-Game Dev Server`);
  console.log(`  → http://localhost:${PORT}\n`);
  console.log(`  API Key: ${process.env.LLM_API_KEY ? '✓ 已配置' : '✗ 未配置'}`);
  console.log(`  API URL: ${process.env.LLM_BASE_URL || 'https://api.openai.com/v1'}`);
  console.log(`  Model:   ${process.env.LLM_MODEL || 'gpt-3.5-turbo'}\n`);
});
