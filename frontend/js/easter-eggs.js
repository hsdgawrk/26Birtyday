// === 彩蛋机制 ===
class EasterEggManager {
  constructor() {
    this.triggerCount = 0;
    this.backtickCount = 0;
    this.lastBacktickTime = 0;
    this.systemLineCount = 0;
    this.isActivated = false;
    this.isMobile = this.detectMobile();

    this.init();
  }

  detectMobile() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
      || window.innerWidth < 768;
  }

  init() {
    this.setupConsoleEgg();
    this.setupKeyboardEgg();
    this.setupGlitchBlockEgg();
    this.setupSystemLineEgg();
    this.setupTerminalHintEgg();
    this.startRandomGlitch();
    this.startSystemStatusChange();
  }

  // 彩蛋 1: 控制台消息
  setupConsoleEgg() {
    console.log('%c╔══════════════════════════════════════╗', 'color: #ff0040; font-size: 12px;');
    console.log('%c║  [SYSTEM] 你不该在这里。             ║', 'color: #ff0040; font-size: 12px;');
    console.log('%c║  [SYSTEM] 但既然你来了...            ║', 'color: #7b2cbf; font-size: 12px;');
    console.log('%c║  [HINT]  试试连续按 3 次 ` 键       ║', 'color: #00d4ff; font-size: 12px;');
    console.log('%c╚══════════════════════════════════════╝', 'color: #ff0040; font-size: 12px;');
  }

  // 彩蛋 2: 键盘快捷键
  setupKeyboardEgg() {
    document.addEventListener('keydown', (e) => {
      if (this.isActivated) return;

      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        const now = Date.now();

        if (now - this.lastBacktickTime < 2000) {
          this.backtickCount++;
        } else {
          this.backtickCount = 1;
        }

        this.lastBacktickTime = now;

        if (this.backtickCount === 2) {
          document.body.style.filter = 'hue-rotate(90deg)';
          setTimeout(() => { document.body.style.filter = ''; }, 100);
        }

        if (this.backtickCount >= 3) {
          this.activate();
        }
      }
    });
  }

  // 彩蛋 3: 点击异常文字块（移动端优化）
  setupGlitchBlockEgg() {
    const glitchBlock = document.getElementById('glitch-trigger');
    if (!glitchBlock) return;

    // 移动端：点击次数更少，反馈更强
    const maxClicks = this.isMobile ? 2 : 3;

    // 触摸反馈（移动端）
    let touchStartTime = 0;

    glitchBlock.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
    }, { passive: true });

    glitchBlock.addEventListener('touchend', (e) => {
      if (this.isActivated) return;

      const holdDuration = Date.now() - touchStartTime;

      // 长按也可以触发（500ms 以上）
      if (holdDuration > 500) {
        e.preventDefault();
        this.triggerCount += 2; // 长按算 2 次
      }

      this.processClick(glitchBlock, maxClicks);
    });

    glitchBlock.addEventListener('click', () => {
      if (this.isActivated) return;
      this.processClick(glitchBlock, maxClicks);
    });
  }

  processClick(element, maxClicks) {
    this.triggerCount++;

    // 强视觉反馈：屏幕闪红 + 块抖动
    element.classList.add('flash');
    document.body.style.transition = 'background 0.1s';
    document.body.style.background = 'rgba(255, 0, 64, 0.08)';

    setTimeout(() => {
      element.classList.remove('flash');
      document.body.style.background = '';
    }, 200);

    // 显示进度提示
    const normalText = element.querySelector('.normal-text');
    if (normalText && this.triggerCount < maxClicks) {
      const remaining = maxClicks - this.triggerCount;
      const originalText = normalText.textContent;
      normalText.textContent = `⚠ 异常已检测到 (${this.triggerCount}/${maxClicks}) — 继续点击`;
      normalText.style.color = '#ff0040';

      setTimeout(() => {
        normalText.textContent = originalText;
        normalText.style.color = '';
      }, 1500);
    }

    if (this.triggerCount >= maxClicks) {
      this.activate();
    }
  }

  // 彩蛋 4: 点击系统状态线
  setupSystemLineEgg() {
    const systemLine = document.getElementById('system-line-trigger');
    if (!systemLine) return;

    const maxClicks = this.isMobile ? 3 : 5;

    systemLine.addEventListener('click', () => {
      if (this.isActivated) return;

      this.systemLineCount++;

      const status = document.getElementById('system-status');
      if (status) {
        const messages = ['SYS:OK', 'SYS:WARN', 'SYS:ERR', 'BREACH', '>>>'];
        const idx = Math.min(this.systemLineCount, messages.length - 1);
        status.textContent = messages[idx];
        status.style.color = this.systemLineCount > 2 ? '#ff0040' : '#00ff41';
      }

      if (this.systemLineCount >= maxClicks) {
        this.activate();
      }
    });
  }

  // 彩蛋 5: 点击底部提示文字也可以进入终端
  setupTerminalHintEgg() {
    const hint = document.querySelector('.terminal-hint');
    if (!hint) return;

    hint.style.cursor = 'pointer';

    let hintClicks = 0;
    const maxClicks = this.isMobile ? 2 : 3;

    hint.addEventListener('click', () => {
      if (this.isActivated) return;

      hintClicks++;

      // 视觉反馈
      hint.style.transition = 'opacity 0.2s';
      hint.style.opacity = '0.3';
      setTimeout(() => { hint.style.opacity = ''; }, 200);

      const p = hint.querySelector('p');
      if (p && hintClicks < maxClicks) {
        p.textContent = `[ ACCESSING... ${hintClicks}/${maxClicks} ]`;
        setTimeout(() => {
          p.textContent = '[ IF YOU CAN READ THIS — PRESS ` THREE TIMES ]';
        }, 1000);
      }

      if (hintClicks >= maxClicks) {
        this.activate();
      }
    });
  }

  // 随机文字腐蚀效果
  startRandomGlitch() {
    const corruptedElements = document.querySelectorAll('.corrupted');
    if (corruptedElements.length === 0) return;

    const randomGlitch = () => {
      if (this.isActivated) {
        setTimeout(randomGlitch, 5000);
        return;
      }

      const el = corruptedElements[Math.floor(Math.random() * corruptedElements.length)];
      el.classList.add('active');
      setTimeout(() => el.classList.remove('active'), 200 + Math.random() * 300);

      setTimeout(randomGlitch, 2000 + Math.random() * 4000);
    };

    setTimeout(randomGlitch, 3000);
  }

  // 系统状态文字动态变化
  startSystemStatusChange() {
    const status = document.getElementById('system-status');
    if (!status) return;

    const states = [
      { text: 'SYS:OK', color: 'rgba(0,255,65,0.2)' },
      { text: 'SYS:OK', color: 'rgba(0,255,65,0.2)' },
      { text: 'SYS:OK', color: 'rgba(0,255,65,0.2)' },
      { text: 'SYS:WARN', color: 'rgba(255,200,0,0.3)' },
      { text: 'SYS:OK', color: 'rgba(0,255,65,0.2)' },
      { text: 'SYS:OK', color: 'rgba(0,255,65,0.2)' },
      { text: 'SYS:ERR', color: 'rgba(255,0,64,0.4)' },
      { text: 'SYS:OK', color: 'rgba(0,255,65,0.2)' },
    ];

    let index = 0;
    setInterval(() => {
      if (this.isActivated) return;
      const state = states[index % states.length];
      status.textContent = state.text;
      status.style.color = state.color;
      index++;
    }, 5000);
  }

  // 激活终端
  activate() {
    if (this.isActivated) return;
    this.isActivated = true;

    const birthdayPage = document.getElementById('birthday-page');
    birthdayPage.classList.add('page-glitch');

    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('activateTerminal'));
    }, 600);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EasterEggManager();
});
