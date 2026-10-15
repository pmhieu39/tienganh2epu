/* review.js - Hệ thống Sổ câu sai & Ôn tập ngắt quãng Spaced Repetition (Section 9) */
window.AppReview = (function () {
  const { escapeHtml, formatDateTime } = window.AppUtils;

  let filterState = {
    partId: 'all',
    testId: 'all',
    status: 'all', // 'all' | 'unreviewed' | 'multi_wrong' | 'hard' | 'due_now'
  };

  function renderWrongBookView(container) {
    const st = window.AppStorage.loadState();
    const wrongMap = st.wrongBook || {};
    const allWrongItems = Object.values(wrongMap).sort((a, b) => (b.lastWrongAt || '').localeCompare(a.lastWrongAt || ''));
    const parts = window.AppDataLoader.getParts();
    const nowIso = new Date().toISOString();

    const filtered = allWrongItems.filter(w => {
      if (filterState.partId !== 'all' && w.partId !== filterState.partId) return false;
      if (filterState.testId !== 'all' && w.testId !== filterState.testId) return false;
      if (filterState.status === 'unreviewed' && w.reviewedStatus === 'mastered') return false;
      if (filterState.status === 'multi_wrong' && (w.wrongCount || 1) < 2) return false;
      if (filterState.status === 'hard' && !w.hardFlag) return false;
      if (filterState.status === 'due_now' && w.nextReviewDueAt && w.nextReviewDueAt > nowIso && w.reviewedStatus === 'mastered') return false;
      return true;
    });

    container.innerHTML = `
      <div class="view-enter">
        <div class="part-header-banner">
          <div>
            <h2 style="font-size:1.35rem;font-weight:800;">📕 Sổ Câu Sai & Ôn Tập Ngắt Quãng (1d – 3d – 7d)</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">
              Một câu hỏi chỉ được đánh dấu <strong>"Đã thuộc (Mastered)"</strong> sau khi bạn trả lời đúng liên tiếp ít nhất <strong>3 lần</strong> qua các mốc lặp lại (1 ngày → 3 ngày → 7 ngày).
            </p>
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary" id="btn-practice-filtered-wrong" ${filtered.length === 0 ? 'disabled' : ''}>
              🔥 Luyện ngay danh sách đang lọc (${filtered.length} câu)
            </button>
          </div>
        </div>

        <!-- Bộ lọc Sổ câu sai -->
        <div class="filter-toolbar">
          <div class="filter-pills">
            <button type="button" class="filter-pill ${filterState.status === 'all' ? 'active' : ''}" data-wstatus="all">Tất cả (${allWrongItems.length})</button>
            <button type="button" class="filter-pill ${filterState.status === 'unreviewed' ? 'active' : ''}" data-wstatus="unreviewed">Chưa thuộc (Cần ôn)</button>
            <button type="button" class="filter-pill ${filterState.status === 'multi_wrong' ? 'active' : ''}" data-wstatus="multi_wrong">Sai nhiều lần (≥2)</button>
            <button type="button" class="filter-pill ${filterState.status === 'hard' ? 'active' : ''}" data-wstatus="hard">Câu khó nhớ ⭐</button>
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <select id="wrong-part-select" style="padding:0.42rem 0.75rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.83rem;">
              <option value="all">Tất cả Part</option>
              ${parts.map(p => `<option value="${escapeHtml(p.partId)}" ${filterState.partId === p.partId ? 'selected' : ''}>${escapeHtml(p.code)}</option>`).join('')}
            </select>
            <select id="wrong-test-select" style="padding:0.42rem 0.75rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.83rem;">
              <option value="all">Tất cả Đề</option>
              ${parts.filter(p => filterState.partId === 'all' || p.partId === filterState.partId).map(p =>
                p.tests.map(t => `<option value="${escapeHtml(t.testId)}" ${filterState.testId === t.testId ? 'selected' : ''}>${escapeHtml(t.title)}</option>`).join('')
              ).join('')}
            </select>
          </div>
        </div>

        ${filtered.length === 0 ? `
          <div class="card empty-state">
            <div style="font-size:2.4rem;">🎉</div>
            <h3>Không có câu sai nào trong danh sách lọc</h3>
            <p>Khi bạn trả lời sai câu hỏi có đáp án xác minh, hệ thống sẽ tự động lưu vào Sổ câu sai tại đây để bạn ôn tập theo chu kỳ 1 - 3 - 7 ngày.</p>
          </div>
        ` : `
          <div>
            ${filtered.map(w => {
              const q = window.AppDataLoader.getQuestion(w.questionId);
              if (!q) return '';
              const ansObj = window.AppDataLoader.getAnswerObj(q.id);
              const consec = w.consecutiveCorrect || 0;
              const isMastered = w.reviewedStatus === 'mastered';

              return `
                <div class="card wrong-item-card ${isMastered ? 'mastered' : ''}">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.55rem;">
                    <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                      <span class="badge badge-primary">${escapeHtml(q.partCode)}</span>
                      <span class="badge badge-neutral">${escapeHtml(q.testTitle)}</span>
                      <span class="badge badge-danger">Sai ${w.wrongCount || 1} lần</span>
                      <span class="badge ${isMastered ? 'badge-success' : 'badge-warning'}">
                        ${isMastered ? '✓ Đã thuộc (3/3 lần đúng)' : `Đang ôn (${consec}/3 lần đúng liên tiếp · Chu kỳ ${w.intervalDays || 1} ngày)`}
                      </span>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.4rem;">
                      <button type="button" class="btn btn-sm ${w.hardFlag ? 'btn-primary' : 'btn-secondary'}" data-toggle-hard="${escapeHtml(q.id)}">
                        ${w.hardFlag ? '⭐ Khó nhớ' : '☆ Đánh dấu khó'}
                      </button>
                      <button type="button" class="btn btn-sm btn-secondary" data-practice-single="${escapeHtml(q.id)}">
                        ✏ Làm lại câu này
                      </button>
                      <button type="button" class="btn btn-sm btn-danger" data-remove-wrong="${escapeHtml(q.id)}">
                        🗑 Xóa khỏi sổ
                      </button>
                    </div>
                  </div>

                  <div style="font-weight:700;margin-bottom:0.45rem;">${escapeHtml(q.prompt)}</div>

                  <div style="display:flex;gap:1.25rem;flex-wrap:wrap;font-size:0.86rem;color:var(--text-secondary);">
                    <span>Đáp án bạn đã chọn: <strong style="color:var(--danger-600);">${escapeHtml(w.selectedAnswer || '?')}</strong></span>
                    <span>Đáp án xác minh: <strong style="color:var(--success-600);">${escapeHtml(w.verifiedAnswer || '?')}</strong></span>
                    <span>Gần nhất: ${escapeHtml(formatDateTime(w.lastWrongAt))}</span>
                  </div>

                  ${ansObj && ansObj.explanation ? `
                    <div style="margin-top:0.5rem;padding:0.55rem 0.8rem;background:var(--bg-elevated);border-radius:8px;font-size:0.84rem;">
                      💡 <strong>Giải thích:</strong> ${escapeHtml(ansObj.explanation)}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    // Gắn sự kiện
    container.querySelectorAll('[data-wstatus]').forEach(btn => {
      btn.addEventListener('click', () => {
        filterState.status = btn.getAttribute('data-wstatus');
        renderWrongBookView(container);
      });
    });

    const pSel = container.querySelector('#wrong-part-select');
    if (pSel) {
      pSel.addEventListener('change', (e) => {
        filterState.partId = e.target.value;
        filterState.testId = 'all';
        renderWrongBookView(container);
      });
    }

    const tSel = container.querySelector('#wrong-test-select');
    if (tSel) {
      tSel.addEventListener('change', (e) => {
        filterState.testId = e.target.value;
        renderWrongBookView(container);
      });
    }

    const pracBtn = container.querySelector('#btn-practice-filtered-wrong');
    if (pracBtn) {
      pracBtn.addEventListener('click', () => {
        const qs = filtered.map(w => window.AppDataLoader.getQuestion(w.questionId)).filter(Boolean);
        window.AppExamEngine.startCustomSession({
          title: `Ôn tập Sổ câu sai (${qs.length} câu)`,
          mode: 'practice',
          questions: qs,
          durationSeconds: 0
        });
      });
    }

    container.querySelectorAll('[data-toggle-hard]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-toggle-hard');
        window.AppStorage.toggleHardWrong(qId);
        renderWrongBookView(container);
      });
    });

    container.querySelectorAll('[data-practice-single]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-practice-single');
        const q = window.AppDataLoader.getQuestion(qId);
        if (q) {
          window.AppRouter.navigate('study-card', { questions: [q], title: `Ôn lại câu sai: ${q.testTitle}` });
        }
      });
    });

    container.querySelectorAll('[data-remove-wrong]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-remove-wrong');
        window.AppUtils.showModal({
          title: 'Xác nhận xóa khỏi Sổ câu sai',
          message: 'Bạn có chắc chắn muốn xóa câu hỏi này khỏi Sổ câu sai không?',
          confirmText: 'Xóa câu này',
          confirmClass: 'btn-danger',
          onConfirm: () => {
            window.AppStorage.removeWrongItem(qId);
            window.AppUtils.showToast('Đã xóa câu hỏi khỏi Sổ câu sai.', 'info');
            renderWrongBookView(container);
            window.AppController.refreshHeaderProgress();
          }
        });
      });
    });
  }

  return {
    renderWrongBookView
  };
})();
