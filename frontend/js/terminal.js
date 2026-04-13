// === 终端 UI 和聊天逻辑 ===
class Terminal {
  constructor() {
    this.output = document.getElementById('terminal-output');
    this.input = document.getElementById('terminal-input');
    this.container = document.querySelector('.terminal-container');
    this.isTyping = false;
    this.sessionId = this.generateSessionId();
    this.isActivated = false;
    this.isCompleted = false; // 谜底已揭示，禁止输入

    // 检测运行环境，自动切换 API 地址
    this.apiBase = this.detectApiBase();

    document.addEventListener('activateTerminal', (e) => this.activate(e));

    if (this.input) {
      this.input.addEventListener('keydown', (e) => this.handleInput(e));
    }
  }

  detectApiBase() {
    // Vercel 生产/preview 部署：同源
    // 本地 vercel dev：同源
    // 如果直接打开 HTML 文件（file://）：需要手动指定
    if (window.location.protocol === 'file:') {
      return 'http://localhost:3000';
    }
    return '';
  }

  generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9);
  }

  // 激活终端
  activate(e) {
    if (this.isActivated) return;
    this.isActivated = true;

    const birthdayPage = document.getElementById('birthday-page');
    const terminalPage = document.getElementById('terminal-page');
    const crashOverlay = document.getElementById('crash-overlay');
    const fromCrash = e && e.detail && e.detail.fromCrash;

    if (fromCrash) {
      // 从崩溃页面进入：terminal 先显示（在 crash-overlay 后面）
      // 然后同时淡出 crash-overlay 和 birthday-page
      terminalPage.classList.remove('hidden');
      terminalPage.classList.add('active');

      setTimeout(() => {
        birthdayPage.classList.add('hidden');
        if (crashOverlay) {
          crashOverlay.style.transition = 'opacity 0.6s ease';
          crashOverlay.style.opacity = '0';
        }
        this.input.focus();
        this.runBootSequence();
      }, 100);
    } else {
      // 从彩蛋进入：正常过渡
      birthdayPage.classList.add('page-glitch');
      setTimeout(() => {
        birthdayPage.classList.add('hidden');
        terminalPage.classList.remove('hidden');
        terminalPage.classList.add('active');
        this.input.focus();
        this.runBootSequence();
      }, 600);
    }
  }

  // 启动序列
  async runBootSequence() {
    const bootLines = [
      { text: '> BOOT SEQUENCE INITIATED...', delay: 200 },
      { text: '> LOADING CORE MODULES... [OK]', delay: 300 },
      { text: '> SECURE CONNECTION ESTABLISHED', delay: 400 },
      { text: '> AI ASSISTANT ONLINE', delay: 500 },
      { text: '', delay: 0 },
    ];

    for (const line of bootLines) {
      await this.typeLine(line.text, line.delay, line.type || 'system');
    }

    setTimeout(() => this.startConversation(), 800);
  }

  // 开始 AI 对话
  async startConversation() {
    await this.sendToAI('开始对话');
  }

  // 处理用户输入
  async handleInput(e) {
    if (e.key === 'Enter' && !this.isTyping && !this.isCompleted) {
      const message = this.input.value.trim();
      if (!message) return;

      this.appendLine(`> ${message}`, 'user');
      this.input.value = '';

      await this.sendToAI(message);
    }
  }

  // 发送消息到 AI
  async sendToAI(message) {
    this.isTyping = true;
    this.input.disabled = true;

    const thinkingLine = this.appendLine('Processing...', 'system');

    try {
      const response = await fetch(`${this.apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          sessionId: this.sessionId,
        }),
      });

      thinkingLine.remove();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // 关键修复：先播解码动画，再输出 AI 回复（包含下一题）
      if (data.state && data.state.segment) {
        await this.showDecodeAnimation(data.state.segment);
      }

      await this.typeLine(data.reply, 30, 'ai');

      if (data.state && data.state.completed) {
        this.isCompleted = true;
        await this.showFinalReveal();
      }

    } catch (error) {
      thinkingLine.remove();
      this.appendLine(`[ERROR] Connection failed: ${error.message}`, 'error');
      this.appendLine('[SYSTEM] 请重试...', 'system');
    }

    if (!this.isCompleted) {
      this.isTyping = false;
      this.input.disabled = false;
      this.input.focus();
    } else {
      this.isTyping = false;
      this.input.disabled = true;
      this.input.placeholder = '';
    }
  }

  appendLine(text, type = 'system') {
    const line = document.createElement('div');
    line.className = `line ${type}`;
    line.textContent = text;
    this.output.appendChild(line);
    this.scrollToBottom();
    return line;
  }

  async typeLine(text, delay = 30, type = 'system') {
    return new Promise((resolve) => {
      setTimeout(() => {
        const line = document.createElement('div');
        line.className = `line ${type}`;
        this.output.appendChild(line);

        let i = 0;
        const typeChar = () => {
          if (i < text.length) {
            line.textContent += text.charAt(i);
            i++;
            this.scrollToBottom();
            setTimeout(typeChar, 15);
          } else {
            resolve();
          }
        };

        typeChar();
      }, delay);
    });
  }

  async showDecodeAnimation(segment) {
    const progressLine = document.createElement('div');
    progressLine.className = 'line decoded';
    this.output.appendChild(progressLine);

    for (let i = 0; i <= 100; i += 10) {
      const bar = '█'.repeat(i / 10) + '░'.repeat(10 - i / 10);
      progressLine.textContent = `解码中... [${bar}] ${i}%`;
      this.scrollToBottom();
      await this.delay(150);
    }

    progressLine.textContent = `>>> ${segment} - 已确认`;
    await this.delay(500);
  }

  async showFinalReveal() {
    await this.delay(1000);
    this.appendLine('', 'system');
    this.appendLine('[SYSTEM] 所有线索已完整揭示', 'success');
  }

  scrollToBottom() {
    // 滚动的是 #terminal-output（有 overflow-y: auto），不是 .container
    const scrollEl = this.output || this.container;
    if (!scrollEl) return;

    // 双重保障：rAF + setTimeout，确保 DOM 完全渲染后滚动
    requestAnimationFrame(() => {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    });
    setTimeout(() => {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }, 50);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Terminal();
});
