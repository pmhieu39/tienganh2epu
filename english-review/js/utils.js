/* utils.js - Các hàm tiện ích, âm thanh Web Audio, Modal và Toast */
window.AppUtils = (function () {
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return 'Chưa có';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  }

  function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function shuffleArray(arr) {
    const copy = Array.isArray(arr) ? arr.slice() : [];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  // Hiệu ứng âm thanh nhẹ bằng Web Audio API (không cần file âm thanh ngoài)
  let audioCtx = null;
  function playSound(type) {
    try {
      const settings = window.AppStorage ? window.AppStorage.getSettings() : { sound: true };
      if (!settings.sound) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === 'wrong') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.setValueAtTime(220, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'finish') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.08);
        osc.frequency.setValueAtTime(659.25, now + 0.16);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (e) {
      // Bỏ qua nếu trình duyệt chặn tự phát âm thanh
    }
  }

  function showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} view-enter`;
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
      <button type="button" class="btn-sm" aria-label="Đóng" style="opacity:0.7;font-weight:700;">✕</button>
    `;
    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, duration);
  }

  function showModal(options) {
    const overlay = document.getElementById('app-modal-overlay');
    const titleEl = document.getElementById('app-modal-title');
    const bodyEl = document.getElementById('app-modal-body');
    const footerEl = document.getElementById('app-modal-footer');
    if (!overlay || !titleEl || !bodyEl || !footerEl) return;

    titleEl.textContent = options.title || 'Thông báo';
    bodyEl.innerHTML = options.html || `<p>${escapeHtml(options.message || '')}</p>`;
    footerEl.innerHTML = '';

    if (options.showCancel !== false) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = options.cancelText || 'Hủy';
      cancelBtn.addEventListener('click', () => {
        closeModal();
        if (typeof options.onCancel === 'function') options.onCancel();
      });
      footerEl.appendChild(cancelBtn);
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn ' + (options.confirmClass || 'btn-primary');
    confirmBtn.textContent = options.confirmText || 'Xác nhận';
    confirmBtn.addEventListener('click', () => {
      closeModal();
      if (typeof options.onConfirm === 'function') options.onConfirm();
    });
    footerEl.appendChild(confirmBtn);

    overlay.classList.remove('hidden');
  }

  function closeModal() {
    const overlay = document.getElementById('app-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function downloadFile(filename, content, mimeType = 'application/json;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    escapeHtml,
    formatTime,
    formatDateTime,
    getTodayKey,
    shuffleArray,
    playSound,
    showToast,
    showModal,
    closeModal,
    downloadFile
  };
})();
