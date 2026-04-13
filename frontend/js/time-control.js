// 时间控制功能
(function () {
    'use strict';

    // 配置关键日期
    const CONFIG = {
        // 允许访问的起始日期（2026-04-28）
        ACCESS_START: new Date('2026-04-28T00:00:00'),
        // 允许访问的结束日期（2026-04-30 23:59:59）
        ACCESS_END: new Date('2026-04-30T23:59:59'),
    };

    // 检查当前时间状态
    function checkTimeStatus() {
        const now = new Date();

        if (now < CONFIG.ACCESS_START) {
            // 在 2026-04-28 之前
            return 'before';
        } else if (now > CONFIG.ACCESS_END) {
            // 在 2026-04-30 之后
            return 'after';
        } else {
            // 在 2026-04-28 到 2026-04-30 之间（包含这两天）
            return 'during';
        }
    }

    // 计算倒计时
    function calculateCountdown() {
        const now = new Date();
        const target = CONFIG.ACCESS_START;
        const diff = target - now;

        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds };
    }

    // 创建模态框
    function createModal(status) {
        const modal = document.createElement('div');
        modal.id = 'time-modal';

        let modalHTML = '';

        if (status === 'before') {
            // 倒计时模态框
            const countdown = calculateCountdown();
            modalHTML = `
                <div class="modal-content">
                    <div class="modal-decoration"></div>
                    <div class="modal-title">🎂 生日页面即将开启</div>
                    <div class="modal-message">
                        距离入口开启还有：
                    </div>
                    <div class="countdown-container">
                        <div class="countdown-title">倒计时</div>
                        <div class="countdown-display">
                            <div class="countdown-item">
                                <div class="countdown-value" id="cd-days">${String(countdown.days).padStart(2, '0')}</div>
                                <div class="countdown-label">天</div>
                            </div>
                            <div class="countdown-item">
                                <div class="countdown-value" id="cd-hours">${String(countdown.hours).padStart(2, '0')}</div>
                                <div class="countdown-label">时</div>
                            </div>
                            <div class="countdown-item">
                                <div class="countdown-value" id="cd-minutes">${String(countdown.minutes).padStart(2, '0')}</div>
                                <div class="countdown-label">分</div>
                            </div>
                            <div class="countdown-item">
                                <div class="countdown-value" id="cd-seconds">${String(countdown.seconds).padStart(2, '0')}</div>
                                <div class="countdown-label">秒</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-message" style="font-size: 0.9rem; margin-top: 2rem;">
                        请耐心等待，美好的事物值得等待 ✨
                    </div>
                </div>
            `;
        } else if (status === 'after') {
            // 关闭提示模态框
            modalHTML = `
                <div class="modal-content">
                    <div class="modal-decoration"></div>
                    <div class="modal-title">⚠️ 入口已关闭</div>
                    <div class="modal-message">
                        <div class="closed-message">
                            生日页面已经关闭
                        </div>
                        <div style="margin-top: 1rem; font-size: 1rem;">
                            感谢你的到来，愿你的每一天都充满美好 🎂
                        </div>
                    </div>
                </div>
            `;
        }

        modal.innerHTML = modalHTML;
        document.body.insertBefore(modal, document.body.firstChild);

        // 如果是倒计时状态，启动倒计时更新
        if (status === 'before') {
            startCountdown();
        }
    }

    // 更新倒计时显示
    function startCountdown() {
        function updateCountdown() {
            const countdown = calculateCountdown();

            const daysEl = document.getElementById('cd-days');
            const hoursEl = document.getElementById('cd-hours');
            const minutesEl = document.getElementById('cd-minutes');
            const secondsEl = document.getElementById('cd-seconds');

            if (daysEl) daysEl.textContent = String(countdown.days).padStart(2, '0');
            if (hoursEl) hoursEl.textContent = String(countdown.hours).padStart(2, '0');
            if (minutesEl) minutesEl.textContent = String(countdown.minutes).padStart(2, '0');
            if (secondsEl) secondsEl.textContent = String(countdown.seconds).padStart(2, '0');

            // 如果倒计时结束，刷新页面
            if (countdown.days <= 0 && countdown.hours <= 0 && countdown.minutes <= 0 && countdown.seconds <= 0) {
                window.location.reload();
            }
        }

        // 每秒更新一次
        setInterval(updateCountdown, 1000);
    }

    // 初始化时间控制
    function initTimeControl() {
        const status = checkTimeStatus();

        if (status === 'before' || status === 'after') {
            // 在允许访问日期之外，显示模态框
            createModal(status);
        }
        // 如果 status === 'during'，则不显示任何模态框，正常显示页面
    }

    // 页面加载时执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTimeControl);
    } else {
        initTimeControl();
    }
})();
