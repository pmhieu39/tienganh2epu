/* exam-config.js - Trang Tạo bài kiểm tra tùy biến (Section 6) */
window.AppExamConfig = (function () {
  const { escapeHtml } = window.AppUtils;

  let builderState = {
    selectedParts: ['PART_I', 'PART_II', 'PART_III', 'PART_IV', 'PART_V'],
    selectedTests: 'all', // 'all' hoặc mảng testId
    customTestIds: [],
    questionCountPreset: '20', // '5'|'10'|'15'|'20'|'30'|'35'|'custom'
    customQuestionCount: 25,
    durationPreset: '30', // '0'|'5'|'10'|'15'|'30'|'45'|'60'|'custom'
    customDurationMinutes: 40,
    selectionMode: 'random', // 'sequential'|'random'|'unanswered'|'wrong'
    shuffleQuestions: true,
    shuffleOptions: false,
    allowRepeat: false,
    examMode: 'exam' // 'exam' | 'practice'
  };

  function getAvailablePool() {
    const parts = window.AppDataLoader.getParts();
    const st = window.AppStorage.loadState();
    const pm = st.questionProgress || {};
    let pool = [];

    parts.forEach(p => {
      if (!builderState.selectedParts.includes(p.partId)) return;
      p.tests.forEach(t => {
        if (builderState.selectedTests === 'custom' && !builderState.customTestIds.includes(t.testId)) return;
        t.questions.forEach(q => {
          const fullQ = window.AppDataLoader.getQuestion(q.id);
          const qp = pm[q.id];
          if (builderState.selectionMode === 'unanswered' && qp && qp.lastSelected) return;
          if (builderState.selectionMode === 'wrong' && (!qp || qp.isCorrect !== false)) return;
          pool.push(fullQ);
        });
      });
    });

    return pool;
  }

  function renderExamBuilderView(container) {
    const parts = window.AppDataLoader.getParts();
    const availablePool = getAvailablePool();
    const requestedCount = builderState.questionCountPreset === 'custom'
      ? Math.max(1, parseInt(builderState.customQuestionCount, 10) || 10)
      : parseInt(builderState.questionCountPreset, 10);
    const effectiveCount = builderState.allowRepeat
      ? requestedCount
      : Math.min(requestedCount, availablePool.length);

    const requestedMinutes = builderState.durationPreset === 'custom'
      ? Math.max(1, parseInt(builderState.customDurationMinutes, 10) || 30)
      : parseInt(builderState.durationPreset, 10);

    container.innerHTML = `
      <div class="view-enter">
        <div class="part-header-banner">
          <div>
            <h2 style="font-size:1.35rem;font-weight:800;">⚙️ Tạo Bài Kiểm Tra Tùy Biến</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">Thiết lập bài thi hoặc bài luyện tập theo đúng phạm vi Part, Đề, số câu và thời gian mong muốn.</p>
          </div>
          <button type="button" class="btn btn-secondary" id="btn-preset-b1-exam">
            🏆 Nạp cấu hình Đề thi B1 chuẩn (35 câu / 45 phút)
          </button>
        </div>

        <div class="config-grid">
          <div class="card">
            <!-- 1. Chọn Part -->
            <div class="config-section">
              <label class="config-label">1. Chọn một hoặc nhiều Part (${builderState.selectedParts.length}/5 Part đã chọn):</label>
              <div class="checkbox-chips">
                ${parts.map(p => {
                  const isSel = builderState.selectedParts.includes(p.partId);
                  return `
                    <button type="button" class="chip-option ${isSel ? 'selected' : ''}" data-toggle-part="${escapeHtml(p.partId)}">
                      ${isSel ? '✓' : '+'} ${escapeHtml(p.code)} (${p.totalQuestions} câu)
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- 2. Chọn Đề cụ thể hoặc Toàn bộ đề -->
            <div class="config-section">
              <label class="config-label">2. Phạm vi Đề / Test trong các Part đã chọn:</label>
              <div class="checkbox-chips" style="margin-bottom:0.65rem;">
                <button type="button" class="chip-option ${builderState.selectedTests === 'all' ? 'selected' : ''}" data-test-scope="all">Toàn bộ đề thuộc Part đã chọn</button>
                <button type="button" class="chip-option ${builderState.selectedTests === 'custom' ? 'selected' : ''}" data-test-scope="custom">Chọn đề cụ thể...</button>
              </div>
              ${builderState.selectedTests === 'custom' ? `
                <div style="max-height:170px;overflow-y:auto;padding:0.65rem;background:var(--bg-elevated);border-radius:8px;border:1px solid var(--border-color);display:flex;flex-wrap:wrap;gap:0.4rem;">
                  ${parts.filter(p => builderState.selectedParts.includes(p.partId)).map(p =>
                    p.tests.map(t => {
                      const sel = builderState.customTestIds.includes(t.testId);
                      return `<button type="button" class="chip-option ${sel ? 'selected' : ''}" style="font-size:0.76rem;padding:0.32rem 0.6rem;" data-toggle-testid="${escapeHtml(t.testId)}">${sel ? '✓' : ''} ${escapeHtml(t.title)}</button>`;
                    }).join('')
                  ).join('')}
                </div>
              ` : ''}
            </div>

            <!-- 3. Chế độ lấy câu -->
            <div class="config-section">
              <label class="config-label">3. Chế độ lọc nguồn câu hỏi:</label>
              <div class="checkbox-chips">
                <button type="button" class="chip-option ${builderState.selectionMode === 'random' ? 'selected' : ''}" data-sel-mode="random">🎲 Ngẫu nhiên từ kho</button>
                <button type="button" class="chip-option ${builderState.selectionMode === 'sequential' ? 'selected' : ''}" data-sel-mode="sequential">📋 Tuần tự theo đề gốc</button>
                <button type="button" class="chip-option ${builderState.selectionMode === 'unanswered' ? 'selected' : ''}" data-sel-mode="unanswered">🆕 Chỉ lấy câu chưa làm</button>
                <button type="button" class="chip-option ${builderState.selectionMode === 'wrong' ? 'selected' : ''}" data-sel-mode="wrong">🔥 Chỉ lấy câu từng làm sai</button>
              </div>
            </div>

            <!-- 4. Số lượng câu -->
            <div class="config-section">
              <label class="config-label">4. Số lượng câu hỏi (Kho khả dụng hiện tại: <strong>${availablePool.length} câu</strong>):</label>
              <div class="checkbox-chips">
                ${['5', '10', '15', '20', '30', '35', 'custom'].map(val => `
                  <button type="button" class="chip-option ${builderState.questionCountPreset === val ? 'selected' : ''}" data-qcount="${val}">
                    ${val === 'custom' ? 'Tự nhập...' : `${val} câu`}
                  </button>
                `).join('')}
              </div>
              ${builderState.questionCountPreset === 'custom' ? `
                <div style="margin-top:0.55rem;">
                  <input type="number" id="custom-qcount-inp" min="1" max="${availablePool.length || 305}" value="${builderState.customQuestionCount}" style="width:140px;padding:0.45rem 0.75rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);" />
                  <span style="font-size:0.8rem;color:var(--text-muted);margin-left:0.5rem;">(Tối đa ${availablePool.length} câu không lặp)</span>
                </div>
              ` : ''}
            </div>

            <!-- 5. Thời gian làm bài -->
            <div class="config-section">
              <label class="config-label">5. Thời gian làm bài:</label>
              <div class="checkbox-chips">
                ${[
                  { k: '0', label: 'Không giới hạn' },
                  { k: '5', label: '5 phút' },
                  { k: '10', label: '10 phút' },
                  { k: '15', label: '15 phút' },
                  { k: '30', label: '30 phút' },
                  { k: '45', label: '45 phút' },
                  { k: '60', label: '60 phút' },
                  { k: 'custom', label: 'Tự nhập...' }
                ].map(item => `
                  <button type="button" class="chip-option ${builderState.durationPreset === item.k ? 'selected' : ''}" data-duration="${item.k}">
                    ${item.label}
                  </button>
                `).join('')}
              </div>
              ${builderState.durationPreset === 'custom' ? `
                <div style="margin-top:0.55rem;">
                  <input type="number" id="custom-duration-inp" min="1" max="180" value="${builderState.customDurationMinutes}" style="width:140px;padding:0.45rem 0.75rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);" />
                  <span style="font-size:0.8rem;color:var(--text-muted);margin-left:0.5rem;">phút</span>
                </div>
              ` : ''}
            </div>

            <!-- 6. Tùy chọn trộn & hình thức thi -->
            <div class="config-section" style="margin-bottom:0;">
              <label class="config-label">6. Tùy chọn trộn câu hỏi & Chế độ làm bài:</label>
              <div class="checkbox-chips">
                <button type="button" class="chip-option ${builderState.shuffleQuestions ? 'selected' : ''}" id="toggle-shuffle-q">
                  ${builderState.shuffleQuestions ? '✓' : ''} Trộn thứ tự câu hỏi
                </button>
                <button type="button" class="chip-option ${builderState.shuffleOptions ? 'selected' : ''}" id="toggle-shuffle-opt">
                  ${builderState.shuffleOptions ? '✓' : ''} Trộn thứ tự đáp án
                </button>
                <button type="button" class="chip-option ${builderState.examMode === 'exam' ? 'selected' : ''}" data-mode-select="exam">
                  🏆 Chế độ Thi (Ẩn đáp án cho tới khi nộp)
                </button>
                <button type="button" class="chip-option ${builderState.examMode === 'practice' ? 'selected' : ''}" data-mode-select="practice">
                  💡 Chế độ Luyện tập (Có giải thích ngay)
                </button>
              </div>
            </div>
          </div>

          <!-- Bảng Xem lại cấu hình trước khi bắt đầu -->
          <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <h3 style="font-size:1.1rem;font-weight:800;margin-bottom:0.85rem;color:var(--primary-600);">📋 Xem Lại Cấu Hình Bài Kiểm Tra</h3>
              <div style="display:flex;flex-direction:column;gap:0.65rem;font-size:0.9rem;">
                <div style="display:flex;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--text-muted);">Các Part đã chọn:</span>
                  <strong>${builderState.selectedParts.join(', ') || 'Chưa chọn'}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--text-muted);">Phạm vi Đề:</span>
                  <strong>${builderState.selectedTests === 'all' ? 'Tất cả đề' : `${builderState.customTestIds.length} đề cụ thể`}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--text-muted);">Nguồn lấy câu:</span>
                  <strong>${
                    builderState.selectionMode === 'random' ? 'Ngẫu nhiên' :
                    builderState.selectionMode === 'sequential' ? 'Tuần tự' :
                    builderState.selectionMode === 'unanswered' ? 'Chỉ câu chưa làm' : 'Chỉ câu làm sai'
                  }</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--text-muted);">Số câu thực tế sẽ tạo:</span>
                  <strong style="color:var(--primary-600);font-size:1.05rem;">${effectiveCount} câu <span style="font-size:0.8rem;font-weight:400;color:var(--text-muted);">/ ${availablePool.length} câu có sẵn</span></strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--text-muted);">Thời gian làm bài:</span>
                  <strong>${requestedMinutes === 0 ? 'Không giới hạn' : `${requestedMinutes} phút`}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--text-muted);">Trộn câu / Trộn đáp án:</span>
                  <strong>${builderState.shuffleQuestions ? 'Có trộn câu' : 'Giữ thứ tự câu'} · ${builderState.shuffleOptions ? 'Có trộn ĐA' : 'Giữ thứ tự ĐA'}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-muted);">Chế độ:</span>
                  <span class="badge ${builderState.examMode === 'exam' ? 'badge-danger' : 'badge-success'}">
                    ${builderState.examMode === 'exam' ? 'Chế độ Thi (Chấm khi nộp)' : 'Chế độ Luyện tập'}
                  </span>
                </div>
              </div>

              ${requestedCount > availablePool.length && availablePool.length > 0 ? `
                <div style="margin-top:0.85rem;padding:0.65rem;background:var(--warning-50);color:var(--warning-600);border-radius:8px;font-size:0.82rem;">
                  ⚠️ Số câu bạn chọn (${requestedCount}) lớn hơn số câu hiện có trong phạm vi (${availablePool.length}). Hệ thống tự động giới hạn ở <strong>${availablePool.length} câu</strong> để không lặp câu hỏi.
                </div>
              ` : ''}
            </div>

            <div style="margin-top:1.25rem;">
              <button type="button" class="btn btn-primary btn-lg" style="width:100%;" id="btn-launch-custom-exam" ${effectiveCount === 0 ? 'disabled' : ''}>
                🚀 Bắt đầu Làm Bài Ngay (${effectiveCount} câu)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Gắn sự kiện cấu hình
    container.querySelectorAll('[data-toggle-part]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-toggle-part');
        if (builderState.selectedParts.includes(pId)) {
          if (builderState.selectedParts.length > 1) {
            builderState.selectedParts = builderState.selectedParts.filter(x => x !== pId);
          } else {
            window.AppUtils.showToast('Phải chọn ít nhất 1 Part.', 'warning');
          }
        } else {
          builderState.selectedParts.push(pId);
        }
        renderExamBuilderView(container);
      });
    });

    container.querySelectorAll('[data-test-scope]').forEach(btn => {
      btn.addEventListener('click', () => {
        builderState.selectedTests = btn.getAttribute('data-test-scope');
        renderExamBuilderView(container);
      });
    });

    container.querySelectorAll('[data-toggle-testid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tId = btn.getAttribute('data-toggle-testid');
        if (builderState.customTestIds.includes(tId)) {
          builderState.customTestIds = builderState.customTestIds.filter(x => x !== tId);
        } else {
          builderState.customTestIds.push(tId);
        }
        renderExamBuilderView(container);
      });
    });

    container.querySelectorAll('[data-sel-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        builderState.selectionMode = btn.getAttribute('data-sel-mode');
        renderExamBuilderView(container);
      });
    });

    container.querySelectorAll('[data-qcount]').forEach(btn => {
      btn.addEventListener('click', () => {
        builderState.questionCountPreset = btn.getAttribute('data-qcount');
        renderExamBuilderView(container);
      });
    });

    const customQInp = container.querySelector('#custom-qcount-inp');
    if (customQInp) {
      customQInp.addEventListener('input', (e) => {
        builderState.customQuestionCount = parseInt(e.target.value, 10) || 10;
        renderExamBuilderView(container);
      });
    }

    container.querySelectorAll('[data-duration]').forEach(btn => {
      btn.addEventListener('click', () => {
        builderState.durationPreset = btn.getAttribute('data-duration');
        renderExamBuilderView(container);
      });
    });

    const customDurInp = container.querySelector('#custom-duration-inp');
    if (customDurInp) {
      customDurInp.addEventListener('input', (e) => {
        builderState.customDurationMinutes = parseInt(e.target.value, 10) || 30;
        renderExamBuilderView(container);
      });
    }

    container.querySelector('#toggle-shuffle-q').addEventListener('click', () => {
      builderState.shuffleQuestions = !builderState.shuffleQuestions;
      renderExamBuilderView(container);
    });

    container.querySelector('#toggle-shuffle-opt').addEventListener('click', () => {
      builderState.shuffleOptions = !builderState.shuffleOptions;
      renderExamBuilderView(container);
    });

    container.querySelectorAll('[data-mode-select]').forEach(btn => {
      btn.addEventListener('click', () => {
        builderState.examMode = btn.getAttribute('data-mode-select');
        renderExamBuilderView(container);
      });
    });

    container.querySelector('#btn-preset-b1-exam').addEventListener('click', () => {
      window.AppPractice.startStandardB1SimulatedExam();
    });

    container.querySelector('#btn-launch-custom-exam').addEventListener('click', () => {
      if (effectiveCount <= 0) {
        window.AppUtils.showToast('Không có câu hỏi nào trong phạm vi đã chọn.', 'warning');
        return;
      }
      let pool = availablePool.slice();
      if (builderState.selectionMode === 'random' || builderState.shuffleQuestions) {
        pool = window.AppUtils.shuffleArray(pool);
      }
      const chosen = pool.slice(0, effectiveCount);

      window.AppExamEngine.startCustomSession({
        title: `Bài kiểm tra tùy biến (${chosen.length} câu)`,
        mode: builderState.examMode,
        questions: chosen,
        durationSeconds: requestedMinutes * 60,
        shuffleOptions: builderState.shuffleOptions,
        config: Object.assign({}, builderState)
      });
    });
  }

  return {
    renderExamBuilderView
  };
})();
