/* exam-engine.js - Màn hình Làm bài liên tục trên 1 trang, Bảng điều hướng cuộn mượt, Tự động lưu & Màn hình Kết quả */
window.AppExamEngine = (function () {
  const { escapeHtml, formatTime } = window.AppUtils;

  let activeSession = null;
  let lastResult = null;

  function hasUnsubmittedExam() {
    return Boolean(activeSession && !activeSession.submitted && activeSession.mode === 'exam' && Object.keys(activeSession.userAnswers || {}).length > 0);
  }

  function startTestSession(testId, mode = 'practice') {
    const test = window.AppDataLoader.getTest(testId);
    if (!test) return;
    // Bảo toàn tuyệt đối thứ tự câu hỏi gốc của đề
    const questions = window.AppDataLoader.sortQuestionsCanonically(
      test.questions.map(q => window.AppDataLoader.getQuestion(q.id))
    );
    const st = window.AppStorage.loadState();
    const pm = st.questionProgress || {};

    let firstUnansweredIdx = 0;
    const preAnswers = {};
    if (mode === 'practice') {
      let foundFirstUnanswered = false;
      questions.forEach((q, idx) => {
        if (pm[q.id] && pm[q.id].lastSelected) {
          preAnswers[q.id] = pm[q.id].lastSelected;
        } else if (!foundFirstUnanswered) {
          firstUnansweredIdx = idx;
          foundFirstUnanswered = true;
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
    // Luôn sắp xếp danh sách câu hỏi theo đúng thứ tự cấu trúc đề gốc: Part I -> V, gom theo Đề và đúng thứ tự câu 1, 2, 3...
    const rawQuestions = config.questions || [];
    const questions = window.AppDataLoader.sortQuestionsCanonically(rawQuestions);

    const shuffledOptionsMap = {};
    if (config.shuffleOptions) {
      questions.forEach(q => {
        if (q.type === 'mcq3' || q.type === 'mcq4') {
          shuffledOptionsMap[q.id] = window.AppUtils.shuffleArray(q.options);
        }
      });
    }

    const durSec = (typeof config.durationSeconds === 'number' && config.durationSeconds >= 0)
      ? config.durationSeconds
      : 0;

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
      durationSeconds: durSec,
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
    saved.questions = window.AppDataLoader.sortQuestionsCanonically(
      saved.questions.map(q => window.AppDataLoader.getQuestion(q.id) || q)
    );
    activeSession = saved;
    window.AppRouter.navigate('workspace', {}, true);
    return true;
  }

  function buildSeqIndexMap(questions) {
    const map = {};
    (questions || []).forEach((q, idx) => {
      if (q && q.id) map[q.id] = idx;
    });
    return map;
  }

  function renderContinuousGroupsHtml(partGroups, seqIndexMap, isExam) {
    const currentQ = activeSession.questions[activeSession.currentIndex] || null;
    const activeQuestionId = currentQ ? currentQ.id : null;

    return partGroups.map(pGroup => {
      const partQuestionsCount = pGroup.testGroups.reduce((acc, tg) => acc + tg.items.length, 0);
      return `
        <section class="workspace-part-section" id="ws-part-${escapeHtml(pGroup.partId)}" data-part-id="${escapeHtml(pGroup.partId)}">
          <div class="workspace-part-banner">
            <div>
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <span class="badge badge-primary" style="font-size:0.82rem;padding:0.25rem 0.75rem;">${escapeHtml(pGroup.partCode)}</span>
                <h3 style="font-size:1.08rem;font-weight:800;color:var(--text-primary);">${escapeHtml(pGroup.partTitle)}</h3>
              </div>
              ${pGroup.partDescription ? `<div style="font-size:0.83rem;color:var(--text-secondary);margin-top:0.25rem;">${escapeHtml(pGroup.partDescription)}</div>` : ''}
            </div>
            <span class="badge badge-neutral" style="font-size:0.8rem;">${partQuestionsCount} câu hỏi</span>
          </div>

          ${pGroup.testGroups.map(tGroup => {
            const hasSharedPassage = tGroup.partId !== 'PART_I' && (Boolean(tGroup.passageText) || Array.isArray(tGroup.passageItems));
            const firstSeq = tGroup.items.length > 0 ? tGroup.items[0].seqNumber : 1;
            const lastSeq = tGroup.items.length > 0 ? tGroup.items[tGroup.items.length - 1].seqNumber : 1;
            const rangeLabel = firstSeq === lastSeq ? `Câu ${firstSeq}` : `Câu ${firstSeq}–${lastSeq}`;

            return `
              <div class="workspace-test-group" id="ws-test-group-${escapeHtml(tGroup.testId)}" data-test-group-id="${escapeHtml(tGroup.testId)}">
                <div class="workspace-test-group-header">
                  <div>
                    <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                      <span class="badge badge-primary">${escapeHtml(rangeLabel)}</span>
                      <h4 style="font-size:1rem;font-weight:800;color:var(--text-primary);">${escapeHtml(tGroup.testTitle)}</h4>
                    </div>
                    ${tGroup.instructions ? `<p style="font-size:0.86rem;color:var(--text-secondary);margin-top:0.3rem;font-style:italic;">${escapeHtml(tGroup.instructions)}</p>` : ''}
                  </div>
                </div>

                ${hasSharedPassage ? `
                  <div id="shared-passage-slot-${escapeHtml(tGroup.testId)}" data-shared-passage="${escapeHtml(tGroup.testId)}">
                    ${window.AppQuestionRenderer.renderPassageOrContext(tGroup, {
                      sessionAnswers: activeSession.userAnswers,
                      revealedQuestions: activeSession.revealedQuestions,
                      showAnswer: !isExam,
                      isExamMode: isExam,
                      activeQuestionId: activeQuestionId,
                      seqIndexMap: seqIndexMap
                    })}
                  </div>
                ` : ''}

                <div class="workspace-questions-stack">
                  ${tGroup.items.map(item => {
                    const q = item.q;
                    const qShowAnswer = !isExam && Boolean(activeSession.revealedQuestions[q.id] || activeSession.userAnswers[q.id]);
                    return window.AppQuestionRenderer.renderQuestionCard(q, {
                      seqIndex: item.seqIndex,
                      seqNumber: item.seqNumber,
                      isCurrent: item.seqIndex === activeSession.currentIndex,
                      omitSharedPassage: hasSharedPassage,
                      selectedKey: activeSession.userAnswers[q.id] || null,
                      sessionAnswers: activeSession.userAnswers,
                      revealedQuestions: activeSession.revealedQuestions,
                      showAnswer: qShowAnswer,
                      isExamMode: isExam,
                      shuffledOptions: activeSession.shuffledOptionsMap ? activeSession.shuffledOptionsMap[q.id] : null
                    });
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </section>
      `;
    }).join('');
  }

  function renderWorkspaceView(container) {
    if (!activeSession || !activeSession.questions || activeSession.questions.length === 0) {
      const saved = window.AppStorage.getActiveSession();
      if (saved && saved.questions && saved.questions.length > 0) {
        saved.questions = window.AppDataLoader.sortQuestionsCanonically(
          saved.questions.map(q => window.AppDataLoader.getQuestion(q.id) || q)
        );
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

    // Đảm bảo thứ tự câu hỏi trong phiên làm bài luôn chuẩn cấu trúc đề gốc
    activeSession.questions = window.AppDataLoader.sortQuestionsCanonically(activeSession.questions);

    const total = activeSession.questions.length;
    const idx = Math.min(Math.max(0, activeSession.currentIndex || 0), total - 1);
    activeSession.currentIndex = idx;
    const answeredCount = Object.keys(activeSession.userAnswers).length;
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    const isExam = activeSession.mode === 'exam';

    const grouped = window.AppDataLoader.groupQuestionsByPartAndTest(activeSession.questions);
    const seqIndexMap = buildSeqIndexMap(activeSession.questions);

    container.innerHTML = `
      <div class="view-enter">
        <div class="workspace-top-bar">
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
              <span class="badge ${isExam ? 'badge-danger' : 'badge-success'}">${isExam ? '🏆 Chế độ Thi' : '💡 Chế độ Luyện tập'}</span>
              <h2 style="font-size:1.12rem;font-weight:800;">${escapeHtml(activeSession.title)}</h2>
            </div>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-top:0.2rem;">
              Hiển thị toàn bộ <strong>${total} câu hỏi</strong> liên tục trên 1 trang · Đã trả lời: <strong id="ws-answered-count">${answeredCount}/${total}</strong> (${pct}%)
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
              ${renderContinuousGroupsHtml(grouped.partGroups, seqIndexMap, isExam)}
            </div>

            <!-- Thanh tác vụ cuối trang đề thi liên tục -->
            <div class="card" style="margin-top:1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
              <button type="button" class="btn btn-secondary" id="ws-scroll-top-btn">
                ↑ Lên đầu đề thi
              </button>
              <div style="font-size:0.86rem;color:var(--text-secondary);">
                Tiến độ hoàn thành: <strong id="ws-bottom-answered-count">${answeredCount}/${total}</strong> câu
              </div>
              <button type="button" class="btn btn-primary" id="ws-bottom-submit-btn">
                ✓ Nộp bài & Chấm điểm (${answeredCount}/${total})
              </button>
            </div>
          </div>

          <!-- Bảng điều hướng số câu cố định bên phải (Question Palette) -->
          <div class="card nav-palette-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
              <strong style="font-size:0.92rem;">Bảng điều hướng câu hỏi</strong>
              <span style="font-size:0.76rem;color:var(--text-muted);" id="ws-palette-count">${answeredCount}/${total} đã làm</span>
            </div>
            <div class="palette-grid" id="ws-palette-grid">
              ${renderPaletteCells()}
            </div>
            <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
              <button type="button" class="btn btn-secondary btn-sm" id="ws-prev-btn" style="flex:1;" title="Cuộn lên câu trước">↑ Câu trước</button>
              ${!isExam ? `<button type="button" class="btn btn-secondary btn-sm" id="ws-show-ans-btn" title="Hiện/Ẩn giải thích câu đang chọn">👁️ Giải thích</button>` : ''}
              <button type="button" class="btn btn-secondary btn-sm" id="ws-next-btn" style="flex:1;" title="Cuộn xuống câu tiếp">↓ Câu tiếp</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.65rem;font-size:0.75rem;color:var(--text-muted);margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border-color);">
              <span><b style="color:var(--primary-500);">■</b> Đã chọn</span>
              <span><b>□</b> Chưa làm</span>
              <span><b style="color:var(--warning-500);">●</b> Đánh dấu 🚩</span>
            </div>
            <div style="margin-top:0.85rem;font-size:0.76rem;color:var(--text-muted);">
              🖱️ <strong>Bấm vào số câu</strong> để cuộn mượt đến đúng vị trí câu hỏi / chỗ trống tương ứng.<br/>
              ⌨️ <strong>Phím tắt:</strong> Phím <code>←</code> / <code>→</code> chuyển câu, phím <code>A/B/C/D/E</code> chọn đáp án, phím <code>M</code> đánh dấu câu.
            </div>
          </div>
        </div>
      </div>
    `;

    bindWorkspaceEvents(container);
    startWorkspaceTimer();
  }

  function renderPaletteCells() {
    if (!activeSession) return '';
    const isExam = activeSession.mode === 'exam';
    const st = window.AppStorage.loadState();
    const strictMode = st.settings && st.settings.gradingMode === 'strict_official_only';

    return activeSession.questions.map((item, i) => {
      const qSt = window.AppStorage.getQuestionState(item.id);
      const isCurrent = i === activeSession.currentIndex;
      const userKey = activeSession.userAnswers[item.id];
      const hasAns = Boolean(userKey);
      let cls = '';
      if (isCurrent) cls += ' current';
      if (hasAns) {
        if (!isExam) {
          const ansObj = window.AppDataLoader.getAnswerObj(item.id);
          const isUnverified = !ansObj || (strictMode && !ansObj.officialInDocx);
          if (!isUnverified && ansObj && ansObj.answer) {
            cls += (userKey === ansObj.answer) ? ' correct' : ' wrong';
          } else {
            cls += ' answered';
          }
        } else {
          cls += ' answered';
        }
      }
      if (qSt.flagged) cls += ' flagged';
      return `<button type="button" class="palette-cell ${cls}" data-jump-idx="${i}" data-jump-qid="${escapeHtml(item.id)}" title="Cuộn đến Câu ${i + 1}">${i + 1}</button>`;
    }).join('');
  }

  let activeScrollRaf = null;
  // Cuộn mượt đến phần tử mục tiêu có trừ khoảng cách thanh tiêu đề cố định (sticky header) và làm nổi bật nhẹ
  function smoothScrollToElement(targetEl) {
    if (!targetEl) return;
    if (activeScrollRaf) {
      cancelAnimationFrame(activeScrollRaf);
      activeScrollRaf = null;
    }

    const getDesiredScrollTop = () => {
      const headerEl = document.querySelector('.top-header');
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 64;
      const offset = headerH + 24;
      targetEl.style.scrollMarginTop = offset + 'px';
      const curScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const rawTarget = curScroll + targetEl.getBoundingClientRect().top - offset;
      return Math.min(maxScroll, Math.max(0, rawTarget));
    };

    const startScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
    const duration = 220;
    const startTime = performance.now();

    const step = (now) => {
      if (!targetEl || !document.body.contains(targetEl)) return;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Easing out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const desiredTop = getDesiredScrollTop();
      const nextScroll = startScroll + (desiredTop - startScroll) * ease;
      window.scrollTo(0, Math.round(nextScroll));

      if (progress < 1) {
        activeScrollRaf = requestAnimationFrame(step);
      } else {
        window.scrollTo(0, Math.round(getDesiredScrollTop()));
        activeScrollRaf = null;
      }
    };

    activeScrollRaf = requestAnimationFrame(step);

    targetEl.classList.remove('question-highlight-flash');
    void targetEl.offsetWidth;
    targetEl.classList.add('question-highlight-flash');
  }

  function jumpToQuestionIndex(container, targetIdx, options = {}) {
    if (!activeSession || !activeSession.questions) return;
    const total = activeSession.questions.length;
    if (targetIdx < 0 || targetIdx >= total) return;

    activeSession.currentIndex = targetIdx;
    window.AppStorage.saveActiveSession(activeSession);

    const targetQ = activeSession.questions[targetIdx];
    if (!targetQ) return;

    // Cập nhật trạng thái active trên các thẻ câu hỏi
    container.querySelectorAll('.question-card-item').forEach(card => {
      const sIdx = parseInt(card.getAttribute('data-seq-idx'), 10);
      card.classList.toggle('is-active-question', sIdx === targetIdx);
    });

    // Cập nhật trạng thái is-current trên các ô trống Cloze Part V
    container.querySelectorAll('.cloze-blank').forEach(blank => {
      const bQid = blank.getAttribute('data-qid');
      blank.classList.toggle('is-current', bQid === targetQ.id);
    });

    // Cập nhật bảng điều hướng
    const pal = container.querySelector('#ws-palette-grid');
    if (pal) pal.innerHTML = renderPaletteCells();

    // Xác định phần tử cần cuộn đến:
    // - Nếu người dùng bấm nút "↑ Xem chỗ trống (n)" trên thẻ câu hỏi -> cuộn đến đúng vị trí chỗ trống trong đoạn văn
    // - Nếu người dùng bấm số câu trong Bảng điều hướng hoặc bấm vào chỗ trống trong đoạn văn -> cuộn đến đúng thẻ câu hỏi & khu vực chọn đáp án (nơi có cả trích đoạn chỗ trống lẫn 4 đáp án A/B/C/D)
    const cardEl = container.querySelector(`.question-card-item[data-seq-idx="${targetIdx}"]`) ||
                   container.querySelector(`#question-card-${targetQ.id}`);
    const blankEl = container.querySelector(`#cloze-blank-${targetQ.id}`);

    if (options.scrollToBlankOnly && blankEl) {
      smoothScrollToElement(blankEl);
    } else if (cardEl) {
      smoothScrollToElement(cardEl);
      if (blankEl) {
        blankEl.classList.remove('question-highlight-flash');
        void blankEl.offsetWidth;
        blankEl.classList.add('question-highlight-flash');
      }
    } else if (blankEl) {
      smoothScrollToElement(blankEl);
    }
  }

  function bindWorkspaceEvents(container) {
    const qSlot = container.querySelector('#ws-question-slot');
    if (qSlot) {
      qSlot.addEventListener('click', (e) => {
        // 1. Bấm vào chỗ trống (1)–(10) trong bài đọc Part V -> cuộn mượt tới đúng câu hỏi chọn đáp án tương ứng
        const blankEl = e.target.closest('[data-action="jump-blank-question"]');
        if (blankEl) {
          const targetQid = blankEl.getAttribute('data-qid');
          if (targetQid) {
            const targetIdx = activeSession.questions.findIndex(item => item.id === targetQid);
            if (targetIdx !== -1) {
              jumpToQuestionIndex(container, targetIdx, { scrollToBlankOnly: false });
            }
          }
          return;
        }

        // 2. Bấm vào nút "↑ Xem chỗ trống (n)" trên thẻ câu hỏi Part V -> cuộn mượt tới đúng vị trí chỗ trống trong đoạn văn
        const scrollBlankBtn = e.target.closest('[data-action="scroll-to-blank"]');
        if (scrollBlankBtn) {
          const targetQid = scrollBlankBtn.getAttribute('data-qid');
          const targetIdx = activeSession.questions.findIndex(item => item.id === targetQid);
          if (targetIdx !== -1) {
            jumpToQuestionIndex(container, targetIdx, { scrollToBlankOnly: true });
          }
          return;
        }

        // 3. Chọn đáp án A/B/C/D/E hoặc T/F trên bất kỳ câu hỏi nào
        const optBtn = e.target.closest('[data-action="select-option"]');
        if (optBtn) {
          const qId = optBtn.getAttribute('data-qid');
          const key = optBtn.getAttribute('data-key');
          const targetIdx = activeSession.questions.findIndex(item => item.id === qId);
          if (targetIdx !== -1) {
            activeSession.currentIndex = targetIdx;
            const q = activeSession.questions[targetIdx];
            handleSelectOption(container, q, key, targetIdx);
          }
          return;
        }

        // 4. Nút Đánh dấu câu (Flag)
        const flagBtn = e.target.closest('[data-action="toggle-flag"]');
        if (flagBtn) {
          const qId = flagBtn.getAttribute('data-qid');
          const flagged = window.AppStorage.toggleFlag(qId);
          flagBtn.className = `btn btn-sm ${flagged ? 'btn-primary' : 'btn-secondary'}`;
          flagBtn.innerHTML = `🚩 ${flagged ? 'Đã đánh dấu' : 'Đánh dấu'}`;
          const pal = container.querySelector('#ws-palette-grid');
          if (pal) pal.innerHTML = renderPaletteCells();
          window.AppController.refreshHeaderProgress();
          return;
        }

        // 5. Nút Yêu thích (Favorite)
        const favBtn = e.target.closest('[data-action="toggle-fav"]');
        if (favBtn) {
          const qId = favBtn.getAttribute('data-qid');
          const fav = window.AppStorage.toggleFavorite(qId);
          favBtn.className = `btn btn-sm ${fav ? 'btn-primary' : 'btn-secondary'}`;
          favBtn.innerHTML = `${fav ? '★ Yêu thích' : '☆ Yêu thích'}`;
          window.AppController.refreshHeaderProgress();
          return;
        }

        // 6. Nút Hiện / Ẩn giải thích trên từng câu hỏi (trong chế độ Luyện tập)
        const expBtn = e.target.closest('[data-action="toggle-explain"]');
        if (expBtn) {
          const qId = expBtn.getAttribute('data-qid');
          const targetIdx = activeSession.questions.findIndex(item => item.id === qId);
          if (targetIdx !== -1) {
            activeSession.currentIndex = targetIdx;
            activeSession.revealedQuestions[qId] = !activeSession.revealedQuestions[qId];
            window.AppStorage.saveActiveSession(activeSession);
            updateSingleQuestionCardDOM(container, targetIdx);
          }
          return;
        }

        // 7. Bấm vào vùng thẻ câu hỏi -> đặt làm câu đang chọn hiện tại
        const cardEl = e.target.closest('.question-card-item[data-seq-idx]');
        if (cardEl) {
          const sIdx = parseInt(cardEl.getAttribute('data-seq-idx'), 10);
          if (!isNaN(sIdx) && sIdx !== activeSession.currentIndex) {
            activeSession.currentIndex = sIdx;
            container.querySelectorAll('.question-card-item').forEach(c => {
              c.classList.toggle('is-active-question', parseInt(c.getAttribute('data-seq-idx'), 10) === sIdx);
            });
            const currentQ = activeSession.questions[sIdx];
            if (currentQ) {
              container.querySelectorAll('.cloze-blank').forEach(b => {
                b.classList.toggle('is-current', b.getAttribute('data-qid') === currentQ.id);
              });
            }
            const pal = container.querySelector('#ws-palette-grid');
            if (pal) pal.innerHTML = renderPaletteCells();
          }
        }
      });
    }

    // Bảng điều hướng câu hỏi: bấm số câu cuộn mượt tới đúng câu / chỗ trống đó
    const paletteGrid = container.querySelector('#ws-palette-grid');
    if (paletteGrid) {
      paletteGrid.addEventListener('click', (e) => {
        const cell = e.target.closest('[data-jump-idx]');
        if (cell) {
          const targetIdx = parseInt(cell.getAttribute('data-jump-idx'), 10);
          if (!isNaN(targetIdx)) {
            jumpToQuestionIndex(container, targetIdx, { scrollToBlankOnly: false });
          }
        }
      });
    }

    const prevBtn = container.querySelector('#ws-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (activeSession.currentIndex > 0) {
          jumpToQuestionIndex(container, activeSession.currentIndex - 1);
        }
      });
    }

    const nextBtn = container.querySelector('#ws-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (activeSession.currentIndex < activeSession.questions.length - 1) {
          jumpToQuestionIndex(container, activeSession.currentIndex + 1);
        }
      });
    }

    const showAnsBtn = container.querySelector('#ws-show-ans-btn');
    if (showAnsBtn) {
      showAnsBtn.addEventListener('click', () => {
        const curQ = activeSession.questions[activeSession.currentIndex];
        if (curQ) {
          activeSession.revealedQuestions[curQ.id] = !activeSession.revealedQuestions[curQ.id];
          window.AppStorage.saveActiveSession(activeSession);
          updateSingleQuestionCardDOM(container, activeSession.currentIndex);
        }
      });
    }

    const scrollTopBtn = container.querySelector('#ws-scroll-top-btn');
    if (scrollTopBtn) {
      scrollTopBtn.addEventListener('click', () => {
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
          window.scrollTo(0, 0);
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

    const bottomSubmitBtn = container.querySelector('#ws-bottom-submit-btn');
    if (bottomSubmitBtn) {
      bottomSubmitBtn.addEventListener('click', () => confirmSubmitExam());
    }
  }

  function updateSingleQuestionCardDOM(container, seqIdx) {
    if (!activeSession) return;
    const q = activeSession.questions[seqIdx];
    if (!q) return;
    const isExam = activeSession.mode === 'exam';
    const hasSharedPassage = q.partId !== 'PART_I' && (Boolean(q.passageText) || Array.isArray(q.passageItems));
    const qShowAnswer = !isExam && Boolean(activeSession.revealedQuestions[q.id] || activeSession.userAnswers[q.id]);

    const oldCard = container.querySelector(`.question-card-item[data-seq-idx="${seqIdx}"]`) || container.querySelector(`#question-card-${q.id}`);
    if (oldCard) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = window.AppQuestionRenderer.renderQuestionCard(q, {
        seqIndex: seqIdx,
        seqNumber: seqIdx + 1,
        isCurrent: seqIdx === activeSession.currentIndex,
        omitSharedPassage: hasSharedPassage,
        selectedKey: activeSession.userAnswers[q.id] || null,
        sessionAnswers: activeSession.userAnswers,
        revealedQuestions: activeSession.revealedQuestions,
        showAnswer: qShowAnswer,
        isExamMode: isExam,
        shuffledOptions: activeSession.shuffledOptionsMap ? activeSession.shuffledOptionsMap[q.id] : null
      }).trim();
      const newCard = tempDiv.firstElementChild;
      if (newCard) {
        oldCard.replaceWith(newCard);
      }
    }

    // Nếu là câu hỏi thuộc Part V (Cloze test), cập nhật lại các chỗ trống trong đoạn văn chung của đề đó
    if (q.partId === 'PART_V' && q.testId) {
      const passageSlot = container.querySelector(`#shared-passage-slot-${q.testId}`);
      if (passageSlot) {
        const seqIndexMap = buildSeqIndexMap(activeSession.questions);
        passageSlot.innerHTML = window.AppQuestionRenderer.renderPassageOrContext(q, {
          sessionAnswers: activeSession.userAnswers,
          revealedQuestions: activeSession.revealedQuestions,
          showAnswer: !isExam,
          isExamMode: isExam,
          activeQuestionId: q.id,
          seqIndexMap: seqIndexMap
        });
      }
    }
  }

  function handleSelectOption(container, q, key, seqIdx) {
    if (!activeSession || !q) return;
    const idx = typeof seqIdx === 'number' ? seqIdx : activeSession.questions.findIndex(item => item.id === q.id);
    if (idx !== -1) activeSession.currentIndex = idx;

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

    // Cập nhật tại chỗ thẻ câu hỏi vừa chọn (không làm mất vị trí cuộn của trang)
    if (idx !== -1) {
      updateSingleQuestionCardDOM(container, idx);
    }

    const total = activeSession.questions.length;
    const answeredCount = Object.keys(activeSession.userAnswers).length;
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    const countEl = container.querySelector('#ws-answered-count');
    if (countEl) countEl.textContent = `${answeredCount}/${total}`;
    const bottomCountEl = container.querySelector('#ws-bottom-answered-count');
    if (bottomCountEl) bottomCountEl.textContent = `${answeredCount}/${total}`;
    const palCountEl = container.querySelector('#ws-palette-count');
    if (palCountEl) palCountEl.textContent = `${answeredCount}/${total} đã làm`;
    const fillEl = container.querySelector('#ws-progress-fill');
    if (fillEl) fillEl.style.width = `${pct}%`;
    const subBtn = container.querySelector('#ws-submit-btn');
    if (subBtn) subBtn.textContent = `✓ Nộp bài (${answeredCount}/${total})`;
    const botSubBtn = container.querySelector('#ws-bottom-submit-btn');
    if (botSubBtn) botSubBtn.textContent = `✓ Nộp bài & Chấm điểm (${answeredCount}/${total})`;
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
      const chosen = window.AppDataLoader.selectStructuredQuestions(pool, res.totalQuestions, { random: true });
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
    return filtered.map((d) => {
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

  // Xử lý phím tắt trên màn hình làm bài liên tục
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
        jumpToQuestionIndex(container, activeSession.currentIndex + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (activeSession.currentIndex > 0) {
        jumpToQuestionIndex(container, activeSession.currentIndex - 1);
      }
    } else if (e.key.toUpperCase() === 'M') {
      e.preventDefault();
      const flagged = window.AppStorage.toggleFlag(q.id);
      const cardEl = container.querySelector(`.question-card-item[data-seq-idx="${activeSession.currentIndex}"]`);
      if (cardEl) {
        const flagBtn = cardEl.querySelector('[data-action="toggle-flag"]');
        if (flagBtn) {
          flagBtn.className = `btn btn-sm ${flagged ? 'btn-primary' : 'btn-secondary'}`;
          flagBtn.innerHTML = `🚩 ${flagged ? 'Đã đánh dấu' : 'Đánh dấu'}`;
        }
      }
      const pal = container.querySelector('#ws-palette-grid');
      if (pal) pal.innerHTML = renderPaletteCells();
    } else {
      const upper = e.key.toUpperCase();
      const validKeys = q.options.map(o => o.key.toUpperCase());
      if (validKeys.includes(upper)) {
        e.preventDefault();
        handleSelectOption(container, q, upper, activeSession.currentIndex);
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
    handleKeyDown,
    jumpToQuestionIndex
  };
})();
