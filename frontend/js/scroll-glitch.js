// === 滚动渐进 Glitch 系统 ===
class ScrollGlitchSystem {
  constructor() {
    this.isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    // 触发阈值（滚动百分比）
    this.thresholds = {
      light: 0.25,    // 25% - 轻微干扰
      medium: 0.45,   // 45% - 中等干扰
      heavy: 0.65,    // 65% - 严重干扰
      critical: 0.80, // 80% - 极严重
      crash: 0.93,    // 93% - 触发崩溃
    };

    this.currentLevel = 0; // 0-4
    this.isCrashing = false;
    this.glitchChunks = [];
    this.scanline = null;

    this.init();
  }

  init() {
    // 创建扫描线覆盖层
    this.scanline = document.createElement('div');
    this.scanline.className = 'glitch-scanline';
    document.body.appendChild(this.scanline);

    // 创建 glitch 色块
    this.createGlitchChunks();

    // 监听滚动
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });

    // 初始检查
    this.onScroll();
  }

  createGlitchChunks() {
    for (let i = 0; i < 8; i++) {
      const chunk = document.createElement('div');
      chunk.className = 'glitch-chunk';
      chunk.style.width = `${10 + Math.random() * 30}%`;
      chunk.style.height = `${20 + Math.random() * 80}px`;
      chunk.style.left = `${Math.random() * 100}%`;
      chunk.style.top = `${Math.random() * 100}%`;
      document.body.appendChild(chunk);
      this.glitchChunks.push(chunk);
    }
  }

  onScroll() {
    if (this.isCrashing) return;

    const scrollTop = window.scrollY || window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;

    // 确定当前级别
    let newLevel = 0;
    if (scrollPercent >= this.thresholds.crash) newLevel = 4;
    else if (scrollPercent >= this.thresholds.critical) newLevel = 3;
    else if (scrollPercent >= this.thresholds.heavy) newLevel = 2;
    else if (scrollPercent >= this.thresholds.medium) newLevel = 1;
    else if (scrollPercent >= this.thresholds.light) newLevel = 0.5;

    if (newLevel !== this.currentLevel) {
      this.currentLevel = newLevel;
      this.applyEffects(this.currentLevel);
    }

    // 检查是否触发崩溃
    if (scrollPercent >= this.thresholds.crash && !this.isCrashing) {
      this.triggerCrash();
    }
  }

  applyEffects(level) {
    // 级别 0.5: 扫描线开始出现
    if (level >= 0.5) {
      this.scanline.classList.add('active');
      this.scanline.style.opacity = String((level - 0.5) * 0.4);
    } else {
      this.scanline.classList.remove('active');
      this.scanline.style.opacity = '0';
    }

    // 级别 1: 色块 glitch 出现
    if (level >= 1) {
      this.glitchChunks.forEach((chunk, i) => {
        chunk.style.opacity = String(Math.min(0.15, (level - 1) * 0.1));
      });
      this.startChunkAnimation(level);
    } else {
      this.glitchChunks.forEach(chunk => { chunk.style.opacity = '0'; });
    }

    // 级别 2: corrupted 元素更频繁
    if (level >= 2) {
      document.querySelectorAll('.corrupted').forEach(el => {
        el.classList.add('active');
      });
    } else {
      document.querySelectorAll('.corrupted').forEach(el => {
        el.classList.remove('active');
      });
    }

    // 级别 3: 屏幕抖动 + 色调偏移
    if (level >= 3) {
      const content = document.getElementById('content-section');
      if (content) {
        content.style.animation = 'none';
        content.style.filter = `hue-rotate(${(level - 3) * 30}deg) saturate(${1 + (level - 3) * 0.5})`;
      }
      this.startScreenShake(level);
    } else {
      const content = document.getElementById('content-section');
      if (content) content.style.filter = '';
      this.stopScreenShake();
    }
  }

  startChunkAnimation(level) {
    if (this.chunkInterval) clearInterval(this.chunkInterval);

    const interval = level >= 3 ? 100 : level >= 2 ? 200 : 400;

    this.chunkInterval = setInterval(() => {
      if (this.isCrashing) return;

      this.glitchChunks.forEach(chunk => {
        chunk.style.left = `${Math.random() * 100}%`;
        chunk.style.top = `${Math.random() * 100}%`;
        chunk.style.opacity = String(Math.min(0.3, (this.currentLevel - 1) * 0.15));
      });
    }, interval);
  }

  shakeElements() {
    if (this.isCrashing) return;
    const offsetX = (Math.random() - 0.5) * (this.currentLevel * 4);
    const offsetY = (Math.random() - 0.5) * (this.currentLevel * 3);

    const content = document.getElementById('content-section');
    if (content) {
      content.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }
  }

  startScreenShake(level) {
    if (this.shakeInterval) clearInterval(this.shakeInterval);
    this.shakeInterval = setInterval(() => this.shakeElements(), 50);
  }

  stopScreenShake() {
    if (this.shakeInterval) {
      clearInterval(this.shakeInterval);
      this.shakeInterval = null;
    }
    const content = document.getElementById('content-section');
    if (content) content.style.transform = '';
  }

  triggerCrash() {
    this.isCrashing = true;

    // 停止所有动画
    if (this.chunkInterval) clearInterval(this.chunkInterval);
    this.stopScreenShake();

    // 强化 glitch 效果
    this.scanline.style.opacity = '0.8';
    this.glitchChunks.forEach(chunk => {
      chunk.style.opacity = '0.4';
      chunk.style.background = `rgba(255, 0, 64, ${0.1 + Math.random() * 0.2})`;
    });

    // 短暂延迟后显示崩溃覆盖层
    setTimeout(() => {
      this.showCrashOverlay();
    }, 800);
  }

  showCrashOverlay() {
    const overlay = document.getElementById('crash-overlay');
    if (!overlay) return;

    overlay.classList.add('visible');

    // 崩溃序列：逐行显示
    const crashLines = overlay.querySelectorAll('.crash-lines div');
    crashLines.forEach((line, i) => {
      line.style.opacity = '0';
      setTimeout(() => {
        line.style.opacity = '1';
        line.style.transition = 'opacity 0.3s';
      }, 400 + i * 400); // 每条间隔 400ms，更慢更压迫
    });

    // 进度条动画 - 从 40% 到 100%，速度放慢
    const loader = overlay.querySelector('.crash-loader');
    if (loader) {
      const bars = ['░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░', '░'];
      let progress = 40; // 从 40% 开始
      const loaderInterval = setInterval(() => {
        progress += 3; // 每次只加 3%，更慢
        const filled = Math.floor(progress / 5); // 20 格
        for (let i = 0; i < filled && i < bars.length; i++) bars[i] = '█';
        for (let i = filled; i < bars.length; i++) bars[i] = '░';
        loader.textContent = `[${bars.join('')}] ${Math.min(progress, 100)}%`;

        if (progress >= 100) {
          clearInterval(loaderInterval);
          // 完成后停留 2.5 秒再进入终端
          setTimeout(() => {
            // 关键修复：先触发终端切换（此时 crash-overlay 仍然遮挡生日页面）
            // 终端页面会先显示在 crash-overlay 后面，然后一起淡出
            document.dispatchEvent(new CustomEvent('activateTerminal', {
              detail: { fromCrash: true }
            }));
          }, 2500);
        }
      }, 200); // 每 200ms 更新一次，比之前慢一倍
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ScrollGlitchSystem();
});
