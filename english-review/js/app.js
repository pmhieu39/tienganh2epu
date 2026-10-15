/* app.js - Bộ điều khiển chính (Main Controller) & Trang chủ Dashboard */
window.AppController = (function () {
  const { escapeHtml } = window.AppUtils;

  async function init() {
    try {
      await window.AppDataLoader.initData();
      applyThemeAndSettings();
      renderSidebarNav();
      refreshHeaderProgress();
      bindGlobalEvents();

      window.AppRouter.onRouteChange(route => {
        if (route.page !== 'workspace') {
          window.AppTimer.stopTimer();
        }
        renderCurrentRoute(route);
      });

      renderCurrentRoute(window.AppRouter.getCurrentRoute());
    } catch (err) {
      const main = document.getElementById('app-main-content');
      if (main) {
        main.innerHTML = `
          <div class="card empty-state">
            <h3>Không thể tải dữ liệu đề cương</h3>
            <p>${escapeHtml(err.message || String(err))}</p>
          </div>
        `;
      }
    }
  }

  function applyThemeAndSettings() {
    const settings = window.AppStorage.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    document.body.classList.toggle('no-animations', settings.animations === false);
    const themeBtn = document.getElementById('header-theme-btn');
    if (themeBtn) {
      themeBtn.innerHTML = settings.theme === 'dark' ? '☀️' : '🌙';
      themeBtn.title = settings.theme === 'dark' ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode';
    }
  }

  function toggleTheme() {
    const settings = window.AppStorage.getSettings();
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    window.AppStorage.updateSettings({ theme: next });
    applyThemeAndSettings();
  }

  function renderSidebarNav() {
    const parts = window.AppDataLoader.getParts();
    const stats = window.AppStatistics.getOverallStats();
    const navContainer = document.getElementById('sidebar-parts-list');
    if (!navContainer) return;

    navContainer.innerHTML = parts.map(p => {
      const ps = stats.partStats.find(x => x.partId === p.partId) || { done: 0 };
      return `
        <button type="button" class="nav-item" data-page="part-detail" data-part="${escapeHtml(p.partId)}">
          <span class="nav-item-left">
            <span>📘</span>
            <span>${escapeHtml(p.shortTitle)}</span>
          </span>
          <span class="nav-badge">${ps.done}/${p.totalQuestions}</span>
        </button>
      `;
    }).join('');

    const wrongBadge = document.getElementById('nav-wrong-badge');
    if (wrongBadge) {
      wrongBadge.textContent = stats.unreviewedWrongCount;
    }
  }

  function refreshHeaderProgress() {
    const stats = window.AppStatistics.getOverallStats();
    const pill = document.getElementById('header-progress-text');
    if (pill) {
      pill.textContent = `Tiến độ: ${stats.doneCount}/${stats.totalQuestions} câu (${stats.overallAccuracy}% đúng)`;
    }
    const streakEl = document.getElementById('header-streak-text');
    if (streakEl) {
      streakEl.textContent = `🔥 ${stats.streakDays} ngày`;
    }
    renderSidebarNav();
  }

  function bindGlobalEvents() {
    // Click trên Sidebar
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
      sidebar.addEventListener('click', (e) => {
        const navBtn = e.target.closest('.nav-item[data-page]');
        if (!navBtn) return;
        const page = navBtn.getAttribute('data-page');
        const partId = navBtn.getAttribute('data-part');
        window.AppRouter.navigate(page, partId ? { partId } : {});
      });
    }

    // Mobile menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (menuBtn && sidebar && backdrop) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('open');
      });
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('open');
      });
    }

    // Tìm kiếm nhanh trên Header
    const headerSearch = document.getElementById('header-search-input');
    if (headerSearch) {
      headerSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          window.AppSearch.setQueryAndOpen(headerSearch.value);
        }
      });
    }

    // Nút đổi giao diện Sáng/Tối
    const themeBtn = document.getElementById('header-theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => toggleTheme());
    }

    // Nút Cài đặt trên Header
    const setBtn = document.getElementById('header-settings-btn');
    if (setBtn) {
      setBtn.addEventListener('click', () => window.AppRouter.navigate('settings'));
    }

    // Phím tắt bàn phím khi làm bài
    document.addEventListener('keydown', (e) => {
      window.AppExamEngine.handleKeyDown(e);
    });
  }

  function renderCurrentRoute(route) {
    const container = document.getElementById('app-main-content');
    if (!container) return;

    switch (route.page) {
      case 'dashboard':
        renderDashboardView(container);
        break;
      case 'part-detail':
        window.AppPractice.renderPartDetailView(container, route.params.partId);
        break;
      case 'practice-modes':
        window.AppPractice.renderPracticeModesView(container);
        break;
      case 'study-card':
        window.AppPractice.renderStudyCardView(container, route.params);
        break;
      case 'exam-builder':
        window.AppExamConfig.renderExamBuilderView(container);
        break;
      case 'workspace':
        window.AppExamEngine.renderWorkspaceView(container);
        break;
      case 'results':
        window.AppExamEngine.renderResultsView(container, route.params);
        break;
      case 'wrong-book':
        window.AppReview.renderWrongBookView(container);
        break;
      case 'search':
        window.AppSearch.renderSearchView(container, route.params);
        break;
      case 'history':
        window.AppSearch.renderHistoryView(container);
        break;
      case 'guide':
        window.AppSettings.renderGuideAndAuditView(container);
        break;
      case 'settings':
        window.AppSettings.renderSettingsView(container);
        break;
      default:
        renderDashboardView(container);
    }
  }

  // Section 3: Trang chủ Dashboard với số liệu thật 100%
  function renderDashboardView(container) {
    const stats = window.AppStatistics.getOverallStats();
    const savedSession = window.AppStorage.getActiveSession();
    const goalPct = Math.min(100, Math.round((stats.todayAnswered / Math.max(1, stats.dailyGoal)) * 100));

    container.innerHTML = `
      <div class="view-enter">
        <!-- Hero Banner -->
        <div class="hero-banner">
          <div>
            <div style="display:inline-flex;align-items:center;gap:0.45rem;background:rgba(255,255,255,0.18);padding:0.25rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600;margin-bottom:0.65rem;">
              🎓 Đề cương ôn tập Anh 2 – Kỹ năng Đọc B1 (${stats.totalParts} Part · ${stats.totalTests} Đề · ${stats.totalQuestions} Câu hỏi)
            </div>
            <h2>Chào bạn! Sẵn sàng chinh phục kỳ thi Đọc B1 hôm nay?</h2>
            <p>
              Toàn bộ <strong>${stats.totalQuestions} câu hỏi</strong> và <strong>30 hình ảnh biển báo/thông báo</strong> từ file Word đề cương gốc đã được nạp đầy đủ. Mọi chỉ số dưới đây đều được tính trực tiếp từ tiến độ làm bài thật của bạn.
            </p>
            <div class="hero-actions">
              <button type="button" class="btn hero-btn-light" id="dash-btn-continue">
                ▶ Tiếp tục học ${savedSession ? `(${escapeHtml(savedSession.title)})` : ''}
              </button>
              <button type="button" class="btn hero-btn-glass" id="dash-btn-wrong">
                🔥 Luyện câu sai (${stats.unreviewedWrongCount} câu)
              </button>
              <button type="button" class="btn hero-btn-glass" id="dash-btn-quick-exam">
                ⚡ Kiểm tra nhanh (Đề chuẩn B1 35 câu)
              </button>
            </div>
          </div>

          <!-- Mục tiêu học tập hằng ngày -->
          <div style="background:rgba(255,255,255,0.14);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.25);padding:1.1rem 1.35rem;border-radius:16px;min-width:240px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
              <span style="font-size:0.82rem;font-weight:600;">🎯 Mục tiêu hôm nay</span>
              <span style="font-weight:800;">${stats.todayAnswered}/${stats.dailyGoal} câu</span>
            </div>
            <div style="height:8px;background:rgba(255,255,255,0.25);border-radius:999px;overflow:hidden;margin-bottom:0.65rem;">
              <div style="height:100%;width:${goalPct}%;background:#ffffff;border-radius:999px;"></div>
            </div>
            <div style="font-size:0.78rem;opacity:0.92;display:flex;justify-content:space-between;">
              <span>Chuỗi học liên tiếp: <strong>🔥 ${stats.streakDays} ngày</strong></span>
              <span>Đề hoàn thành: <strong>${stats.completedTestsCount}/${stats.totalTests}</strong></span>
            </div>
          </div>
        </div>

        ${savedSession ? `
          <div class="card" style="margin-bottom:1.25rem;border-left:4px solid var(--warning-500);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <span class="badge badge-warning">⏳ Bài đang làm dở</span>
              <strong style="margin-left:0.5rem;">${escapeHtml(savedSession.title)}</strong>
              <span style="font-size:0.84rem;color:var(--text-muted);margin-left:0.5rem;">
                (Đã trả lời ${Object.keys(savedSession.userAnswers || {}).length}/${(savedSession.questions || []).length} câu)
              </span>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button type="button" class="btn btn-primary btn-sm" id="dash-resume-saved">Khôi phục bài đang làm</button>
              <button type="button" class="btn btn-secondary btn-sm" id="dash-discard-saved">Hủy bài dở</button>
            </div>
          </div>
        ` : ''}

        <!-- 4 Thẻ chỉ số thực tế -->
        <div class="stats-grid">
          <div class="card stat-card">
            <div>
              <div class="stat-label">Tổng câu đã làm / Toàn đề cương</div>
              <div class="stat-value">${stats.doneCount} <span style="font-size:1rem;color:var(--text-muted);font-weight:600;">/ ${stats.totalQuestions}</span></div>
              <div style="font-size:0.78rem;color:var(--text-muted);">Còn ${stats.unansweredCount} câu chưa làm (${stats.totalParts} Part · ${stats.totalTests} Đề)</div>
            </div>
            <div class="stat-icon" style="background:var(--primary-50);color:var(--primary-600);">📚</div>
          </div>

          <div class="card stat-card">
            <div>
              <div class="stat-label">Số câu trả lời ĐÚNG</div>
              <div class="stat-value" style="color:var(--success-600);">${stats.correctCount}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">Trên tổng số ${stats.doneCount} câu đã làm</div>
            </div>
            <div class="stat-icon" style="background:var(--success-50);color:var(--success-600);">✅</div>
          </div>

          <div class="card stat-card">
            <div>
              <div class="stat-label">Số câu trả lời SAI</div>
              <div class="stat-value" style="color:var(--danger-600);">${stats.wrongCount}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">Đang lưu ${stats.unreviewedWrongCount} câu cần ôn trong Sổ câu sai</div>
            </div>
            <div class="stat-icon" style="background:var(--danger-50);color:var(--danger-600);">❌</div>
          </div>

          <div class="card stat-card">
            <div>
              <div class="stat-label">Tỷ lệ chính xác tổng thể</div>
              <div class="stat-value" style="color:var(--primary-600);">${stats.overallAccuracy}%</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">Yêu thích: ${stats.favoriteCount} · Đánh dấu: ${stats.flaggedCount}</div>
            </div>
            <div class="stat-icon" style="background:var(--warning-50);color:var(--warning-600);">🎯</div>
          </div>
        </div>

        <!-- 2 Biểu đồ chính trên Dashboard -->
        <div class="dashboard-two-col">
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <h3 style="font-size:1rem;font-weight:800;">📈 Tiến Độ Học Tập Theo Ngày (7 Ngày Qua)</h3>
              <span class="badge badge-primary">Hôm nay: ${stats.todayAnswered} câu</span>
            </div>
            <div class="chart-box">
              ${window.AppCharts.renderDailyProgressChart(stats.last7Days, stats.dailyGoal)}
            </div>
          </div>

          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <h3 style="font-size:1rem;font-weight:800;">📊 Tỷ Lệ Đúng / Sai Theo Từng Part</h3>
              <span class="badge badge-neutral">5 Parts</span>
            </div>
            <div class="chart-box">
              ${window.AppCharts.renderPartAccuracyChart(stats.partStats)}
            </div>
          </div>
        </div>

        <!-- Danh sách 5 Part trong đề cương -->
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
            <h3 style="font-size:1.05rem;font-weight:800;">🗂️ Hệ Thống Học Theo 5 Part (Đề Cương Anh 2)</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.AppRouter.navigate('guide')">
              📘 Xem cấu trúc đề thi & báo cáo đối chiếu file Word
            </button>
          </div>
          <div class="part-overview-grid">
            ${stats.partStats.map(ps => `
              <div class="card card-hover" style="padding:1.1rem;display:flex;flex-direction:column;justify-content:space-between;gap:0.85rem;">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;">
                    <span class="badge badge-primary">${escapeHtml(ps.code)}</span>
                    <span style="font-size:0.78rem;color:var(--text-muted);font-weight:600;">${ps.totalTests} Đề · ${ps.totalQuestions} Câu</span>
                  </div>
                  <div style="font-weight:700;font-size:0.96rem;margin-bottom:0.35rem;">${escapeHtml(ps.title)}</div>
                  <div style="font-size:0.8rem;color:var(--text-muted);">
                    Đã làm: <strong>${ps.done}/${ps.totalQuestions}</strong> (${ps.progressPercent}%) · Chính xác: <strong>${ps.accuracy}%</strong>
                  </div>
                  <div class="progress-bar-track" style="margin-top:0.5rem;height:6px;">
                    <div class="progress-bar-fill" style="width:${ps.progressPercent}%;"></div>
                  </div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" data-goto-part="${escapeHtml(ps.partId)}" style="width:100%;">
                  Vào học ${escapeHtml(ps.code)} →
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Danh sách bài học đang học dở -->
        <div class="card">
          <h3 style="font-size:1.05rem;font-weight:800;margin-bottom:0.85rem;">⏳ Danh Sách Đề Đang Học Dở (${stats.inProgressTests.length})</h3>
          ${stats.inProgressTests.length === 0 ? `
            <div style="padding:1rem;background:var(--bg-elevated);border-radius:10px;font-size:0.88rem;color:var(--text-secondary);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
              <span>Bạn hiện chưa có đề nào làm dở. Hãy chọn Đề 01 của Part I để bắt đầu hành trình ôn tập!</span>
              <button type="button" class="btn btn-primary btn-sm" id="dash-start-first-test">▶ Bắt đầu Đề 01 – Part 1</button>
            </div>
          ` : `
            <div class="tests-grid">
              ${stats.inProgressTests.map(t => `
                <div class="card" style="padding:1rem;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:0.35rem;">
                    <span class="badge badge-warning">${escapeHtml(t.partCode)}</span>
                    <span style="font-size:0.8rem;font-weight:700;">${t.done}/${t.total} câu (${t.percent}%)</span>
                  </div>
                  <div style="font-weight:700;margin-bottom:0.65rem;">${escapeHtml(t.title)}</div>
                  <button type="button" class="btn btn-primary btn-sm" data-resume-test="${escapeHtml(t.testId)}">▶ Tiếp tục học đề này</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    // Gắn sự kiện trên Dashboard
    container.querySelector('#dash-btn-continue').addEventListener('click', () => {
      if (savedSession) {
        window.AppExamEngine.resumeSavedSession();
      } else if (stats.inProgressTests.length > 0) {
        window.AppExamEngine.startTestSession(stats.inProgressTests[0].testId, 'practice');
      } else {
        window.AppExamEngine.startTestSession('p1_t1', 'practice');
      }
    });

    container.querySelector('#dash-btn-wrong').addEventListener('click', () => {
      if (stats.wrongBookTotal > 0) {
        window.AppRouter.navigate('wrong-book');
      } else {
        window.AppUtils.showToast('Sổ câu sai hiện đang trống! Hãy luyện đề để hệ thống ghi nhận các câu cần ôn lại.', 'info');
        window.AppRouter.navigate('wrong-book');
      }
    });

    container.querySelector('#dash-btn-quick-exam').addEventListener('click', () => {
      window.AppPractice.startStandardB1SimulatedExam();
    });

    const resumeBtn = container.querySelector('#dash-resume-saved');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => window.AppExamEngine.resumeSavedSession());
    }

    const discardBtn = container.querySelector('#dash-discard-saved');
    if (discardBtn) {
      discardBtn.addEventListener('click', () => {
        window.AppStorage.clearActiveSession();
        renderDashboardView(container);
      });
    }

    const firstTestBtn = container.querySelector('#dash-start-first-test');
    if (firstTestBtn) {
      firstTestBtn.addEventListener('click', () => window.AppExamEngine.startTestSession('p1_t1', 'practice'));
    }

    container.querySelectorAll('[data-goto-part]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AppRouter.navigate('part-detail', { partId: btn.getAttribute('data-goto-part') });
      });
    });

    container.querySelectorAll('[data-resume-test]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AppExamEngine.startTestSession(btn.getAttribute('data-resume-test'), 'practice');
      });
    });
  }

  return {
    init,
    applyThemeAndSettings,
    toggleTheme,
    refreshHeaderProgress
  };
})();

window.addEventListener('DOMContentLoaded', () => {
  window.AppController.init();
});
