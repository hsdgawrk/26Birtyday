const OpenAI = require('openai');
const config = require('../backend/config/questions.json');

const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
});

const sessions = new Map();

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      phase: 'greeting',
      userName: '',
      storyIndex: 0,    // 当前故事要点索引
      questionIndex: 0, // 当前问题索引
      wrongCount: 0,    // 当前问题错误次数
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

// ===== 用 LLM 润色（只改语气，不改内容）=====
async function polishWithLLM(systemContent, messages) {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemContent },
        ...messages,
      ],
      max_tokens: 120,
      temperature: 0.7,
    });
    return completion.choices[0].message.content;
  } catch {
    return null; // LLM 失败时返回 null，使用原始文本
  }
}

// ===== Greeting 阶段 =====
async function handleGreeting(session, userMessage) {
  // 第一次调用（用户发"开始对话"），返回预设 intro
  if (!session.userName) {
    return {
      reply: config.greeting.intro,
      state: { phase: 'greeting' },
    };
  }

  // 用户已回复名字，LLM 评价名字
  const nameComment = await polishWithLLM(
    fill(config.personalityPrompts.nameComment, session.userName),
    [
      { role: 'assistant', content: config.greeting.intro },
      { role: 'user', content: session.userName },
    ]
  );

  // 无论 LLM 是否成功，都进入 Story 阶段
  const greetingReply = nameComment || `${session.userName}，好名字，我喜欢。`;

  // 直接给出第一个故事要点
  const firstKeyPoint = config.story.keyPoints[0];
  session.phase = 'story';
  session.storyIndex = 0;

  return {
    reply: `${greetingReply}\n\n${firstKeyPoint}`,
    state: {
      phase: 'story',
      userName: session.userName,
      storyProgress: `1/${config.story.keyPoints.length}`,
    },
  };
}

// ===== Story 阶段 =====
async function handleStory(session, userMessage) {
  const keyPoints = config.story.keyPoints;

  // 先让 LLM 简短回应用户的回复（增加人情味）
  const acknowledgment = await polishWithLLM(
    `你正在跟一个名叫${session.userName}的人聊天。你正在讲述她的丈夫为她制作生日页面的故事。用户回复了：'${userMessage}'。请用1-2句话简短自然地回应，像在跟朋友聊天。不要提出问题，不要推进剧情。`,
    [
      { role: 'assistant', content: keyPoints[session.storyIndex] },
      { role: 'user', content: userMessage },
    ]
  );

  // 推进到下一个故事要点
  session.storyIndex++;

  if (session.storyIndex >= keyPoints.length) {
    // 故事讲完了，进入 Questions 阶段
    session.phase = 'questions';
    session.questionIndex = 0;
    session.wrongCount = 0;
    const firstQ = config.questions[0];
    return {
      reply: acknowledgment
        ? `${acknowledgment}\n\n${fill(firstQ.question, session.userName)}`
        : fill(firstQ.question, session.userName),
      state: {
        phase: 'questions',
        userName: session.userName,
        currentQuestion: 0,
        progress: `0/${config.questions.length}`,
      },
    };
  }

  // 还有下一个要点，继续讲
  const nextPoint = keyPoints[session.storyIndex];
  const reply = acknowledgment
    ? `${acknowledgment}\n\n${nextPoint}`
    : nextPoint;

  return {
    reply,
    state: {
      phase: 'story',
      userName: session.userName,
      storyProgress: `${session.storyIndex + 1}/${keyPoints.length}`,
    },
  };
}

// ===== Questions 阶段 =====
async function handleQuestions(session, userMessage) {
  const questions = config.questions;
  const q = questions[session.questionIndex];

  if (!q) {
    return {
      reply: fill(config.finalMessage, session.userName),
      state: { completed: true, userName: session.userName },
    };
  }

  const isCorrect = checkAnswer(userMessage, q);

  if (isCorrect) {
    session.wrongCount = 0;
    session.questionIndex++;

    // 全部答完
    if (session.questionIndex >= questions.length) {
      return {
        reply: `[✓] ${q.answer} - 已确认\n\n${fill(config.finalMessage, session.userName)}`,
        state: {
          completed: true,
          userName: session.userName,
          segment: q.answer,
          progress: `${session.questionIndex}/${questions.length}`,
        },
      };
    }

    const nextQ = questions[session.questionIndex];
    return {
      reply: `[✓] ${q.answer} - 已确认\n\n${fill(nextQ.question, session.userName)}`,
      state: {
        phase: 'questions',
        userName: session.userName,
        currentQuestion: session.questionIndex,
        segment: q.answer,
        progress: `${session.questionIndex}/${questions.length}`,
        completed: false,
      },
    };
  }

  // 答错了
  session.wrongCount++;

  // 超过 3 次，直接给答案
  if (session.wrongCount >= 3) {
    session.wrongCount = 0;
    session.questionIndex++;

    if (session.questionIndex >= questions.length) {
      return {
        reply: `算了 ${session.userName}，答案是 **${q.answer}**。没关系！\n\n${fill(config.finalMessage, session.userName)}`,
        state: {
          completed: true,
          userName: session.userName,
          segment: q.answer,
          progress: `${session.questionIndex}/${questions.length}`,
        },
      };
    }

    const nextQ = questions[session.questionIndex];
    return {
      reply: `答案其实是 **${q.answer}**。没关系，我们继续。\n\n${fill(nextQ.question, session.userName)}`,
      state: {
        phase: 'questions',
        userName: session.userName,
        currentQuestion: session.questionIndex,
        segment: q.answer,
        progress: `${session.questionIndex}/${questions.length}`,
        completed: false,
      },
    };
  }

  // 1-2 次错误：LLM 润色错误提示
  const presetWrong = fill(
    q.wrongResponses[session.wrongCount - 1] || q.wrongResponses[0],
    session.userName
  );

  const polishedWrong = await polishWithLLM(
    `你是一个温和的AI朋友，在帮${session.userName}解谜。用户答错了，正确答案是 ${q.answer}。hint 是：${q.hint}。请用轻松自然的语气提示，1-2句话。以下是预设的提示内容，可以参考：${presetWrong}`,
    [
      { role: 'assistant', content: fill(q.question, session.userName) },
      { role: 'user', content: userMessage },
      { role: 'assistant', content: presetWrong },
    ]
  );

  const replyText = polishedWrong || presetWrong;

  return {
    reply: replyText,
    state: {
      phase: 'questions',
      userName: session.userName,
      currentQuestion: session.questionIndex,
      hint: q.hint,
      wrongCount: session.wrongCount,
      progress: `${session.questionIndex}/${questions.length}`,
      completed: false,
    },
  };
}

// ===== 提示词注入检测 =====
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

// ===== 主入口 =====
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const session = getOrCreateSession(sessionId);

    // 提示词注入检测
    if (detectInjection(message)) {
      if (session.phase === 'questions' && session.questionIndex < config.questions.length) {
        const q = config.questions[session.questionIndex];
        return res.json({
          reply: `${session.userName || '用户'}，这招可不管用哦。我们还是继续解谜吧。\n\n${session.userName ? fill(q.question, session.userName) : q.question}`,
          state: {
            phase: session.phase,
            userName: session.userName,
            currentQuestion: session.questionIndex,
            progress: `${session.questionIndex}/${config.questions.length}`,
            completed: false,
          },
        });
      }
    }

    // 根据阶段分发
    let result;
    switch (session.phase) {
      case 'greeting':
        if (!session.userName && message !== '开始对话') {
          // 用户在 greeting 阶段回复了名字
          session.userName = message.trim();
        }
        result = await handleGreeting(session, message);
        break;
      case 'story':
        result = await handleStory(session, message);
        break;
      case 'questions':
        result = await handleQuestions(session, message);
        break;
      default:
        result = {
          reply: fill(config.finalMessage, session.userName),
          state: { completed: true },
        };
    }

    return res.json(result);
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
