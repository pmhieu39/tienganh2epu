/* exam-engine.js - Màn hình Làm bài, Tự động lưu, Phím tắt & Màn hình Kết quả (Sections 7 & 8) */
window.AppExamEngine = (function () {
  const { escapeHtml, formatTime } = window.AppUtils;

  let activeSession = null;
  let lastResult = null;

  function hasUnsubmittedExam() {
    return Boolean(activeSession && !activeSession.submitted && activeSession.mode === 'exam');
  }

  function startTestSession(testId, mode = 'practice') {
    const test = window.AppDataLoader.getTest(testId);
    if (!test) return;
    const questions = test.questions.map(q => window.AppDataLoader.getQuestion(q.id));
    const st = window.AppStorage.loadState();
    const pm = st.questionProgress || {};

    // Tìm câu đầu tiên chưa làm để tiếp tục nếu đang học dở
    let firstUnansweredIdx = 0;
    const preAnswers = {};
    if (mode === 'practice') {
      questions.forEach((q, idx) => {
        if (pm[q.id] && pm[q.id].lastSelected) {
          preAnswers[q.id] = pm[q.id].lastSelected;
        } else if (Object.keys(preAnswers).length === idx) {
          firstUnansweredIdx = idx;
        }
      });
    }

    activeSession = {
      sessionId: 'ses_' + Date.now(),
      testId: testId,
      title: test.title,
      mode: mode, // 'practice' | 'exam'
      questions: questions,
      currentIndex: firstUnansweredIdx,
      userAnswers: preAnswers,
      revealedQuestions: {},
      shuffledOptionsMap: {},
      durationSeconds: mode === 'exam' ? 20 * 60 : 0,
      elapsedSeconds: 0,
      submitted: false,
      startedAt: new Date().toISOString()
    };

    window.AppStorage.saveActiveSession(activeSession);
    window.AppRouter.navigate('workspace', {}, true);
  }

  function startCustomSession(config) {
    const questions = config.questions || [];
    const shuffledOptionsMap = {};
    if (config.shuffleOptions) {
      questions.forEach(q => {
        // Chỉ trộn nội dung lựa chọn nếu là trắc nghiệm 3-4 đáp án độc lập
        if (q.type === 'mcq3' || q.type === 'mcq4') {
          shuffledOptionsMap[q.id] = window.AppUtils.shuffleArray(q.options);
        }
      });
    }

    activeSession = {
      sessionId: 'ses_' + Date.now(),
      testId: null,
      title: config.title || 'Bài kiểm tra tùy chỉnh',
      mode: config.mode || 'exam',
      questions: questions,
      currentIndex: 0,
      userAnswers: {},
      revealedQuestions: {},
      shuffledOptionsMap: shuffledOptionsMap,
      durationSeconds: config.durationSeconds || 0,
      elapsedSeconds: 0,
      submitted: false,
      config: config.config || null,
      startedAt: new Date().toISOString()
    };

    window.AppStorage.saveActiveSession(activeSession);
    window.AppRouter.navigate('workspace', {}, true);
  }

  function resumeSavedSession() {
    const saved = window.AppStorage.getActiveSession();
    if (!saved || !saved.questions || saved.questions.length === 0) return false;
    // Khôi phục đầy đủ dữ liệu câu hỏi từ id
    saved.questions = saved.questions.map(q => window.AppDataLoader.getQuestion(q.id) || q);
    activeSession = saved;
    window.AppRouter.navigate('workspace', {}, true);
    return true;
  }

  function renderWorkspaceView(container) {
    if (!activeSession || !activeSession.questions || activeSession.questions.length === 0) {
      const saved = window.AppStorage.getActiveSession();
      if (saved && saved.questions && saved.questions.length > 0) {
        saved.questions = saved.questions.map(q => window.AppDataLoader.getQuestion(q.id) || q);
        activeSession = saved;
      } else {
        container.innerHTML = `
          <div class="card empty-state">
            <h3>Chưa có bài làm nào đang mở</h3>
            <p>Hãy chọn một đề trong các Part hoặc tạo bài kiểm tra tùy biến để bắt đầu.</p>
            <div style="margin-top:1rem;">
              <button type="button" class="btn btn-primary" onclick="window.AppRouter.navigate('exam-builder')">Tạo bài kiểm tra</button>
            </div>
          </div>
        `;
        return;
      }
    }

    const total = activeSession.questions.length;
    const idx = Math.min(Math.max(0, activeSession.currentIndex || 0), total - 1);
    activeSession.currentIndex = idx;
    const q = activeSession.questions[idx];
    const answeredCount = Object.keys(activeSession.userAnswers).length;
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    const isExam = activeSession.mode === 'exam';

    container.innerHTML = `
      <div class="view-enter">
        <div class="workspace-top-bar">
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
              <span class="badge ${isExam ? 'badge-danger' : 'badge-success'}">${isExam ? '🏆 Chế độ Thi' : '💡 Chế độ Luyện tập'}</span>
              <h2 style="font-size:1.12rem;font-weight:800;">${escapeHtml(activeSession.title)}</h2>
            </div>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-top:0.2rem;">
              Câu hiện tại: <strong>${idx + 1} / ${total}</strong> · Đã trả lời: <strong id="ws-answered-count">${answeredCount}/${total}</strong> (${pct}%)
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:0.65rem;flex-wrap:wrap;">
            <div class="timer-box" id="ws-timer-display" title="Thời gian làm bài">
              ⏱ <span>00:00</span>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="ws-fullscreen-btn" title="Toàn màn hình">
              ⛶ Toàn màn hình
            </button>
            <button type="button" class="btn btn-primary" id="ws-submit-btn">
              ✓ Nộp bài (${answeredCount}/${total})
            </button>
          </div>
        </div>

        <div class="progress-bar-track" style="margin-bottom:1.1rem;">
          <div class="progress-bar-fill" id="ws-progress-fill" style="width:${pct}%;"></div>
        </div>

        <div class="workspace-layout">
          <div>
            <div id="ws-question-slot">
              ${window.AppQuestionRenderer.renderQuestionCard(q, {
                selectedKey: activeSession.userAnswers[q.id] || null,
                sessionAnswers: activeSession.userAnswers,
                showAnswer: !isExam && Boolean(activeSession.revealedQuestions[q.id] || activeSession.userAnswers[q.id]),
                isExamMode: isExam,
                shuffledOptions: activeSession.shuffledOptionsMap ? activeSession.shuffledOptionsMap[q.id] : null
              })}
            </div>

            <!-- Thanh điều hướng câu hỏi dưới -->
            <div class="card" style="margin-top:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
              <button type="button" class="btn btn-secondary" id="ws-prev-btn" ${idx === 0 ? 'disabled' : ''}>
                ← Câu trước (Phím ←)
              </button>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                ${!isExam ? `
                  <button type="button" class="btn btn-secondary btn-sm" id="ws-show-ans-btn">
                    👁️ ${activeSession.revealedQuestions[q.id] ? 'Ẩn giải thích' : 'Hiện đáp án & giải thích'}
                  </button>
                ` : ''}
              </div>
              <button type="button" class="btn btn-primary" id="ws-next-btn" ${idx >= total - 1 ? 'disabled' : ''}>
                Câu tiếp theo (Phím →) →
              </button>
            </div>
          </div>

          <!-- Bảng điều hướng số câu (Question Palette) -->
          <div class="card nav-palette-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
              <strong style="font-size:0.92rem;">Bảng điều hướng câu hỏi</strong>
              <span style="font-size:0.76rem;color:var(--text-muted);">${answeredCount}/${total} đã làm</span>
            </div>
            <div class="palette-grid" id="ws-palette-grid">
              ${renderPaletteCells()}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.65rem;font-size:0.75rem;color:var(--text-muted);margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border-color);">
              <span><b style="color:var(--primary-500);">■</b> Đã chọn</span>
              <span><b>□</b> Chưa làm</span>
              <span><b style="color:var(--warning-500);">●</b> Đánh dấu 🚩</span>
            </div>
            <div style="margin-top:0.85rem;font-size:0.76rem;color:var(--text-muted);">
              ⌨️ <strong>Phím tắt:</strong> Phím <code>←</code> / <code>→</code> chuyển câu, phím <code>A/B/C/D/E</code> hoặc <code>T/F</code> chọn đáp án, phím <code>M</code> đánh dấu câu.
            </div>
          </div>
        </div>
      </div>
    `;

    bindWorkspaceEvents(container);
    window.AppQuestionRenderer.syncPassageExpandUI(container);
    startWorkspaceTimer();
  }

  function renderPaletteCells() {
    if (!activeSession) return '';
    return activeSession.questions.map((item, i) => {
      const qSt = window.AppStorage.getQuestionState(item.id);
      const isCurrent = i === activeSession.currentIndex;
      const hasAns = Boolean(activeSession.userAnswers[item.id]);
      let cls = '';
      if (isCurrent) cls += ' current';
      if (hasAns) cls += ' answered';
      if (qSt.flagged) cls += ' flagged';
      return `<button type="button" class="palette-cell ${cls}" data-jump-idx="${i}">${i + 1}</button>`;
    }).join('');
  }

  function bindWorkspaceEvents(container) {
    const total = activeSession.questions.length;
    const idx = activeSession.currentIndex;
    const q = activeSession.questions[idx];
    const isExam = activeSession.mode === 'exam';

    // Chọn đáp án & tương tác trên thẻ câu hỏi
    const qSlot = container.querySelector('#ws-question-slot');
    if (qSlot) {
      qSlot.addEventListener('click', (e) => {
        // Nhấn vào ô trống (1)–(10) trong bài đọc Part V để chuyển nhanh tới câu đó
        const blankEl = e.target.closest('[data-action="jump-blank-question"]');
        if (blankEl) {
          const targetQid = blankEl.getAttribute('data-qid');
          if (targetQid) {
            const targetIdx = activeSession.questions.findIndex(item => item.id === targetQid);
            if (targetIdx !== -1 && targetIdx !== activeSession.currentIndex) {
              activeSession.currentIndex = targetIdx;
              window.AppStorage.saveActiveSession(activeSession);
              renderWorkspaceView(container);
            }
          }
          return;
        }

        const optBtn = e.target.closest('[data-action="select-option"]');
        if (optBtn) {
          const key = optBtn.getAttribute('data-key');
          handleSelectOption(container, q, key);
          return;
        }
        const flagBtn = e.target.closest('[data-action="toggle-flag"]');
        if (flagBtn) {
          const flagged = window.AppStorage.toggleFlag(q.id);
          flagBtn.className = `btn btn-sm ${flagged ? 'btn-primary' : 'btn-secondary'}`;
          flagBtn.innerHTML = `🚩 ${flagged ? 'Đã đánh dấu' : 'Đánh dấu'}`;
          const pal = container.querySelector('#ws-palette-grid');
          if (pal) pal.innerHTML = renderPaletteCells();
          return;
        }
        const favBtn = e.target.closest('[data-action="toggle-fav"]');
        if (favBtn) {
          const fav = window.AppStorage.toggleFavorite(q.id);
          favBtn.className = `btn btn-sm ${fav ? 'btn-primary' : 'btn-secondary'}`;
          favBtn.innerHTML = `${fav ? '★ Yêu thích' : '☆ Yêu thích'}`;
          return;
        }
      });
    }

    const prevBtn = container.querySelector('#ws-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (activeSession.currentIndex > 0) {
          activeSession.currentIndex -= 1;
          window.AppStorage.saveActiveSession(activeSession);
          renderWorkspaceView(container);
        }
      });
    }

    const nextBtn = container.querySelector('#ws-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (activeSession.currentIndex < total - 1) {
          activeSession.currentIndex += 1;
          window.AppStorage.saveActiveSession(activeSession);
          renderWorkspaceView(container);
        }
      });
    }

    const showAnsBtn = container.querySelector('#ws-show-ans-btn');
    if (showAnsBtn) {
      showAnsBtn.addEventListener('click', () => {
        activeSession.revealedQuestions[q.id] = !activeSession.revealedQuestions[q.id];
        window.AppStorage.saveActiveSession(activeSession);
        renderWorkspaceView(container);
      });
    }

    const paletteGrid = container.querySelector('#ws-palette-grid');
    if (paletteGrid) {
      paletteGrid.addEventListener('click', (e) => {
        const cell = e.target.closest('[data-jump-idx]');
        if (cell) {
          activeSession.currentIndex = parseInt(cell.getAttribute('data-jump-idx'), 10);
          window.AppStorage.saveActiveSession(activeSession);
          renderWorkspaceView(container);
        }
      });
    }

    const fsBtn = container.querySelector('#ws-fullscreen-btn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    const submitBtn = container.querySelector('#ws-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => confirmSubmitExam());
    }
  }

  function handleSelectOption(container, q, key) {
    if (!activeSession) return;
    activeSession.userAnswers[q.id] = key;
    const isExam = activeSession.mode === 'exam';
    const ansObj = window.AppDataLoader.getAnswerObj(q.id);

    if (!isExam) {
      const updated = window.AppStorage.recordQuestionAttempt(q.id, key, ansObj, false);
      window.AppUtils.playSound(updated.isCorrect ? 'correct' : 'wrong');
      activeSession.revealedQuestions[q.id] = true;
    } else {
      window.AppUtils.playSound('click');
    }

    window.AppStorage.saveActiveSession(activeSession);

    // Chỉ cập nhật thẻ câu hỏi và bảng số câu (không render lại toàn trang, giữ nguyên trạng thái mở rộng đoạn văn)
    const qSlot = container.querySelector('#ws-question-slot');
    if (qSlot) {
      qSlot.innerHTML = window.AppQuestionRenderer.renderQuestionCard(q, {
        selectedKey: key,
        sessionAnswers: activeSession.userAnswers,
        showAnswer: !isExam,
        isExamMode: isExam,
        shuffledOptions: activeSession.shuffledOptionsMap ? activeSession.shuffledOptionsMap[q.id] : null
      });
      window.AppQuestionRenderer.syncPassageExpandUI(qSlot);
    }

    const total = activeSession.questions.length;
    const answeredCount = Object.keys(activeSession.userAnswers).length;
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    const countEl = container.querySelector('#ws-answered-count');
    if (countEl) countEl.textContent = `${answeredCount}/${total}`;
    const fillEl = container.querySelector('#ws-progress-fill');
    if (fillEl) fillEl.style.width = `${pct}%`;
    const subBtn = container.querySelector('#ws-submit-btn');
    if (subBtn) subBtn.textContent = `✓ Nộp bài (${answeredCount}/${total})`;
    const pal = container.querySelector('#ws-palette-grid');
    if (pal) pal.innerHTML = renderPaletteCells();

    window.AppController.refreshHeaderProgress();
  }

  function startWorkspaceTimer() {
    if (!activeSession) return;
    window.AppTimer.startTimer({
      durationSeconds: activeSession.durationSeconds || 0,
      initialElapsed: activeSession.elapsedSeconds || 0,
      onTick: ({ remainingSeconds, elapsedSeconds, isCountdown }) => {
        if (!activeSession) return;
        activeSession.elapsedSeconds = elapsedSeconds;
        const timerEl = document.getElementById('ws-timer-display');
        if (timerEl) {
          if (isCountdown) {
            timerEl.innerHTML = `⏳ <span>${formatTime(remainingSeconds)}</span>`;
            timerEl.classList.toggle('warning', remainingSeconds <= 60);
          } else {
            timerEl.innerHTML = `⏱ <span>${formatTime(elapsedSeconds)}</span>`;
            timerEl.classList.remove('warning');
          }
        }
      },
      onExpire: () => {
        window.AppUtils.showToast('Đã hết thời gian làm bài! Hệ thống tự động nộp bài và chấm điểm.', 'warning', 4500);
        finalizeSubmission();
      }
    });
  }

  function confirmSubmitExam() {
    if (!activeSession) return;
    const total = activeSession.questions.length;
    const answered = Object.keys(activeSession.userAnswers).length;
    const unanswered = total - answered;

    window.AppUtils.showModal({
      title: 'Xác nhận Nộp bài',
      message: unanswered > 0
        ? `Bạn còn ${unanswered}/${total} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài và chấm điểm ngay bây giờ?`
        : `Bạn đã hoàn thành toàn bộ ${total}/${total} câu hỏi. Xác nhận nộp bài ngay?`,
      confirmText: 'Nộp bài & Chấm điểm',
      cancelText: 'Quay lại kiểm tra',
      onConfirm: () => finalizeSubmission()
    });
  }

  function finalizeSubmission() {
    if (!activeSession) return;
    window.AppTimer.stopTimer();
    activeSession.submitted = true;
    lastResult = window.AppScoring.gradeSession(activeSession);
    window.AppStorage.clearActiveSession();
    activeSession = null;
    window.AppUtils.playSound('finish');
    window.AppController.refreshHeaderProgress();
    window.AppRouter.navigate('results', { result: lastResult }, true);
  }

  // Section 8: Màn hình Kết quả & Phân tích sau khi nộp bài
  function renderResultsView(container, params = {}) {
    const res = params.result || lastResult || (window.AppStorage.getExamHistory()[0] || null);
    if (!res) {
      container.innerHTML = `
        <div class="card empty-state">
          <h3>Chưa có kết quả bài kiểm tra nào</h3>
          <p>Hãy hoàn thành một đề luyện tập hoặc bài thi thử để xem phân tích chi tiết.</p>
        </div>
      `;
      return;
    }
    lastResult = res;
    const historyList = window.AppStorage.getExamHistory();

    container.innerHTML = `
      <div class="view-enter">
        <div class="results-hero">
          <div class="score-circle">
            <span class="big-score">${res.score30}</span>
            <span style="font-size:0.78rem;opacity:0.9;">/ 30 điểm B1</span>
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.35rem;">
              <span class="badge badge-primary">${res.score10} / 10 điểm</span>
              <span class="badge badge-success">Độ chính xác: ${res.accuracy}%</span>
              <span class="badge badge-neutral">⏱ Thời gian: ${formatTime(res.elapsedSeconds)}</span>
            </div>
            <h2 style="font-size:1.35rem;font-weight:800;">🎉 Kết Quả: ${escapeHtml(res.title)}</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-top:0.25rem;">
              Tổng số câu: <strong>${res.totalQuestions}</strong> ·
              Đúng: <strong style="color:var(--success-600);">${res.correctCount}</strong> ·
              Sai: <strong style="color:var(--danger-600);">${res.wrongCount}</strong> ·
              Chưa trả lời: <strong>${res.unansweredCount}</strong>
            </p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:flex-end;">
            <button type="button" class="btn btn-primary" id="res-retry-btn">🔄 Làm lại bài</button>
            ${res.wrongCount > 0 ? `<button type="button" class="btn btn-danger" id="res-review-wrong-btn">🔥 Ôn ${res.wrongCount} câu sai</button>` : ''}
            <button type="button" class="btn btn-secondary" id="res-similar-btn">🎲 Làm bài tương tự</button>
            <button type="button" class="btn btn-secondary" id="res-export-csv-btn">⬇ Xuất CSV</button>
            <button type="button" class="btn btn-secondary" id="res-export-json-btn">⬇ Xuất JSON</button>
          </div>
        </div>

        <!-- 3 Biểu đồ phân tích -->
        <div class="charts-row">
          <div class="card">
            <h3 style="font-size:0.95rem;font-weight:700;margin-bottom:0.85rem;">1. Tỷ lệ Đúng / Sai / Chưa trả lời</h3>
            ${window.AppCharts.renderDonutChart(res.correctCount, res.wrongCount, res.unansweredCount)}
          </div>
          <div class="card">
            <h3 style="font-size:0.95rem;font-weight:700;margin-bottom:0.85rem;">2. Kết quả theo từng Part</h3>
            ${res.partBreakdown.map(pb => {
              const pct = pb.total > 0 ? Math.round((pb.correct / pb.total) * 100) : 0;
              return `
                <div style="margin-bottom:0.75rem;">
                  <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:0.25rem;">
                    <strong>${escapeHtml(pb.partCode)}</strong>
                    <span>Đúng ${pb.correct}/${pb.total} (${pct}%)</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width:${pct}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="card">
            <h3 style="font-size:0.95rem;font-weight:700;margin-bottom:0.85rem;">3. Tiến độ qua các lần kiểm tra</h3>
            ${window.AppCharts.renderHistoryLineChart(historyList)}
          </div>
        </div>

        <!-- Danh sách xem lại toàn bộ bài -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
            <h3 style="font-size:1.05rem;font-weight:800;">📋 Chi Tiết Từng Câu Hỏi & Giải Thích (${res.details.length} câu)</h3>
            <div class="filter-pills">
              <button type="button" class="filter-pill active" data-res-filter="all">Tất cả (${res.details.length})</button>
              <button type="button" class="filter-pill" data-res-filter="wrong">Câu sai (${res.wrongCount})</button>
              <button type="button" class="filter-pill" data-res-filter="correct">Câu đúng (${res.correctCount})</button>
              <button type="button" class="filter-pill" data-res-filter="unanswered">Chưa làm (${res.unansweredCount})</button>
            </div>
          </div>
          <div id="res-details-list">
            ${renderResultDetailsList(res.details, 'all')}
          </div>
        </div>
      </div>
    `;

    // Gắn sự kiện nút bấm trên màn hình Kết quả
    container.querySelector('#res-retry-btn').addEventListener('click', () => {
      const qs = res.details.map(d => window.AppDataLoader.getQuestion(d.questionId)).filter(Boolean);
      startCustomSession({
        title: res.title + ' (Làm lại)',
        mode: res.mode || 'practice',
        questions: qs,
        durationSeconds: 0
      });
    });

    const revWrongBtn = container.querySelector('#res-review-wrong-btn');
    if (revWrongBtn) {
      revWrongBtn.addEventListener('click', () => {
        const wrongQs = res.details
          .filter(d => d.status === 'wrong')
          .map(d => window.AppDataLoader.getQuestion(d.questionId))
          .filter(Boolean);
        startCustomSession({
          title: `Ôn câu sai: ${res.title}`,
          mode: 'practice',
          questions: wrongQs,
          durationSeconds: 0
        });
      });
    }

    container.querySelector('#res-similar-btn').addEventListener('click', () => {
      const partIds = [...new Set(res.details.map(d => d.partId))];
      const pool = window.AppDataLoader.getAllQuestions().filter(q => partIds.includes(q.partId));
      const chosen = window.AppUtils.shuffleArray(pool).slice(0, res.totalQuestions);
      startCustomSession({
        title: `Đề tương tự (${chosen.length} câu)`,
        mode: res.mode || 'exam',
        questions: chosen,
        durationSeconds: res.elapsedSeconds > 0 ? Math.max(300, res.totalQuestions * 60) : 0
      });
    });

    container.querySelector('#res-export-json-btn').addEventListener('click', () => {
      window.AppUtils.downloadFile(`ket-qua-anh2-${res.id}.json`, JSON.stringify(res, null, 2));
      window.AppUtils.showToast('Đã xuất kết quả ra file JSON!', 'success');
    });

    container.querySelector('#res-export-csv-btn').addEventListener('click', () => {
      const headers = ['STT', 'QuestionID', 'Part', 'De', 'CauHoi', 'BanChon', 'DapAnDung', 'KetQua', 'GiaiThich'];
      const rows = res.details.map((d, idx) => [
        idx + 1,
        d.questionId,
        d.partCode,
        `"${(d.testTitle || '').replace(/"/g, '""')}"`,
        `"${(d.prompt || '').replace(/"/g, '""')}"`,
        d.selected || 'Chưa chọn',
        d.correctAnswer || 'Chưa xác minh',
        d.status,
        `"${(d.explanation || '').replace(/"/g, '""')}"`
      ].join(','));
      const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      window.AppUtils.downloadFile(`ket-qua-anh2-${res.id}.csv`, csvContent, 'text/csv;charset=utf-8');
      window.AppUtils.showToast('Đã xuất kết quả ra file CSV!', 'success');
    });

    container.querySelectorAll('[data-res-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-res-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.getAttribute('data-res-filter');
        container.querySelector('#res-details-list').innerHTML = renderResultDetailsList(res.details, f);
      });
    });
  }

  function renderResultDetailsList(details, filter) {
    const filtered = details.filter(d => filter === 'all' ? true : d.status === filter);
    if (filtered.length === 0) {
      return `<div class="empty-state" style="padding:1.5rem;">Không có câu hỏi nào trong mục này.</div>`;
    }
    return filtered.map((d, idx) => {
      const badge = d.status === 'correct'
        ? '<span class="badge badge-success">✓ Đúng</span>'
        : d.status === 'wrong'
        ? '<span class="badge badge-danger">✕ Sai</span>'
        : d.status === 'unverified'
        ? '<span class="badge badge-warning">? Chưa xác minh</span>'
        : '<span class="badge badge-neutral">Chưa trả lời</span>';

      return `
        <div style="padding:1rem;border:1px solid var(--border-color);border-radius:12px;margin-bottom:0.75rem;background:var(--bg-surface);">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.4rem;">
            <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">${escapeHtml(d.partCode)} · ${escapeHtml(d.testTitle)}</span>
            ${badge}
          </div>
          <div style="font-weight:700;margin-bottom:0.5rem;">${escapeHtml(d.prompt)}</div>
          <div style="display:flex;gap:1.25rem;flex-wrap:wrap;font-size:0.86rem;">
            <span>Đáp án bạn chọn: <strong style="color:${d.status === 'correct' ? 'var(--success-600)' : 'var(--danger-600)'};">${escapeHtml(d.selected || 'Chưa chọn')}</strong></span>
            <span>Đáp án xác minh: <strong style="color:var(--success-600);">${escapeHtml(d.correctAnswer || 'Chưa có')}</strong></span>
          </div>
          ${d.explanation ? `<div style="margin-top:0.45rem;font-size:0.84rem;color:var(--text-secondary);background:var(--bg-elevated);padding:0.55rem 0.8rem;border-radius:8px;">💡 <strong>Giải thích:</strong> ${escapeHtml(d.explanation)} ${d.evidence ? `<em>("${escapeHtml(d.evidence)}")</em>` : ''}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Xử lý phím tắt trên màn hình làm bài
  function handleKeyDown(e) {
    const route = window.AppRouter.getCurrentRoute();
    if (route.page !== 'workspace' || !activeSession) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    const container = document.getElementById('app-main-content');
    if (!container) return;
    const q = activeSession.questions[activeSession.currentIndex];
    if (!q) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (activeSession.currentIndex < activeSession.questions.length - 1) {
        activeSession.currentIndex += 1;
        window.AppStorage.saveActiveSession(activeSession);
        renderWorkspaceView(container);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (activeSession.currentIndex > 0) {
        activeSession.currentIndex -= 1;
        window.AppStorage.saveActiveSession(activeSession);
        renderWorkspaceView(container);
      }
    } else if (e.key.toUpperCase() === 'M') {
      e.preventDefault();
      window.AppStorage.toggleFlag(q.id);
      renderWorkspaceView(container);
    } else {
      const upper = e.key.toUpperCase();
      const validKeys = q.options.map(o => o.key.toUpperCase());
      if (validKeys.includes(upper)) {
        e.preventDefault();
        handleSelectOption(container, q, upper);
      }
    }
  }

  return {
    hasUnsubmittedExam,
    startTestSession,
    startCustomSession,
    resumeSavedSession,
    renderWorkspaceView,
    renderResultsView,
    handleKeyDown
  };
})();
