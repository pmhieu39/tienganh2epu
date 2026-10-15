/* exam-config.js - Trang Tạo bài kiểm tra tùy biến với đồng bộ Nút chọn, Ô nhập số & Thanh kéo (Lỗi 1 & Lỗi 3) */
window.AppExamConfig = (function () {
  const { escapeHtml } = window.AppUtils;

  const QCOUNT_PRESETS = ['5', '10', '15', '20', '30', '35'];
  const DURATION_PRESETS = ['0', '5', '10', '15', '30', '45', '60'];

  let builderState = {
    selectedParts: ['PART_I', 'PART_II', 'PART_III', 'PART_IV', 'PART_V'],
    selectedTests: 'all', // 'all' hoặc 'custom'
    customTestIds: [],
    questionCountPreset: '10', // '5'|'10'|'15'|'20'|'30'|'35'|'custom' (Mặc định đồng bộ 10 câu như trên giao diện)
    customQuestionCount: 10,
    durationPreset: '30', // '0'|'5'|'10'|'15'|'30'|'45'|'60'|'custom'
    customDurationMinutes: 30,
    selectionMode: 'sequential', // Mặc định 'sequential' để giữ đúng thứ tự đề gốc
    shuffleQuestions: false,     // Mặc định false để không tự ý đảo câu hỏi
    shuffleOptions: false,
    allowRepeat: false,
    examMode: 'exam' // 'exam' | 'practice'
  };

  function getSystemTotalQuestions() {
    const all = window.AppDataLoader.getAllQuestions();
    return (all && all.length > 0) ? all.length : 305;
  }

  function getAvailablePool() {
    const parts = window.AppDataLoader.getParts();
    const st = window.AppStorage.loadState();
    const pm = st.questionProgress || {};
    const pool = [];

    // Duyệt theo đúng thứ tự Part I -> Part V và thứ tự đề, thứ tự câu gốc
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

    return window.AppDataLoader.sortQuestionsCanonically(pool);
  }

  function getRequestedQuestionCount() {
    const raw = builderState.questionCountPreset === 'custom'
      ? parseInt(builderState.customQuestionCount, 10)
      : parseInt(builderState.questionCountPreset, 10);
    if (isNaN(raw) || raw < 1) return 1;
    const sysMax = getSystemTotalQuestions();
    return Math.min(raw, sysMax);
  }

  function getRequestedDurationMinutes() {
    if (builderState.durationPreset === '0') return 0;
    const raw = builderState.durationPreset === 'custom'
      ? parseInt(builderState.customDurationMinutes, 10)
      : parseInt(builderState.durationPreset, 10);
    if (isNaN(raw) || raw < 0) return 0;
    return Math.min(raw, 180);
  }

  // Cập nhật nhanh vùng Xem lại cấu hình và trạng thái nút mà không phá hủy focus của ô input/slider
  function syncDynamicSummaryAndControls(container, options = {}) {
    const availablePool = getAvailablePool();
    const sysMax = getSystemTotalQuestions();
    const maxSliderQ = Math.max(1, availablePool.length || sysMax);
    const requestedCount = getRequestedQuestionCount();
    const effectiveCount = builderState.allowRepeat
      ? requestedCount
      : Math.min(requestedCount, availablePool.length);
    const requestedMinutes = getRequestedDurationMinutes();

    // 1. Cập nhật trạng thái nút chọn số câu
    container.querySelectorAll('[data-qcount]').forEach(btn => {
      const val = btn.getAttribute('data-qcount');
      btn.classList.toggle('selected', builderState.questionCountPreset === val);
    });

    const qBar = container.querySelector('#qcount-control-bar');
    if (qBar) {
      qBar.classList.toggle('is-custom-focused', builderState.questionCountPreset === 'custom');
    }

    const qInp = container.querySelector('#custom-qcount-inp');
    if (qInp && !options.skipQInput) {
      qInp.value = String(requestedCount);
      qInp.max = String(sysMax);
    }

    const qSlider = container.querySelector('#custom-qcount-slider');
    if (qSlider && !options.skipQSlider) {
      qSlider.max = String(maxSliderQ);
      qSlider.value = String(Math.min(requestedCount, maxSliderQ));
    }

    const qStatusText = container.querySelector('#qcount-status-label');
    if (qStatusText) {
      qStatusText.innerHTML = `Đang chọn: <strong style="color:var(--primary-600);">${requestedCount} câu</strong> (Tối đa <strong>${availablePool.length} câu</strong> không lặp trong phạm vi đã chọn)`;
    }

    // 2. Cập nhật trạng thái nút chọn thời gian
    container.querySelectorAll('[data-duration]').forEach(btn => {
      const val = btn.getAttribute('data-duration');
      btn.classList.toggle('selected', builderState.durationPreset === val);
    });

    const durBar = container.querySelector('#duration-control-bar');
    if (durBar) {
      durBar.classList.toggle('is-custom-focused', builderState.durationPreset === 'custom');
    }

    const durInp = container.querySelector('#custom-duration-inp');
    if (durInp && !options.skipDurInput) {
      durInp.value = String(requestedMinutes);
    }

    const durSlider = container.querySelector('#custom-duration-slider');
    if (durSlider && !options.skipDurSlider) {
      durSlider.value = String(Math.min(requestedMinutes, 180));
    }

    const durStatusText = container.querySelector('#duration-status-label');
    if (durStatusText) {
      durStatusText.innerHTML = requestedMinutes === 0
        ? `Đang chọn: <strong style="color:var(--success-600);">Không giới hạn thời gian</strong> (Tắt đồng hồ đếm ngược)`
        : `Đang chọn: <strong style="color:var(--primary-600);">${requestedMinutes} phút</strong> (Đồng hồ đếm ngược ${requestedMinutes}:00)`;
    }

    // 3. Cập nhật bảng Xem lại cấu hình bên phải
    const sumCountEl = container.querySelector('#summary-effective-count');
    if (sumCountEl) {
      sumCountEl.innerHTML = `${effectiveCount} câu <span style="font-size:0.8rem;font-weight:400;color:var(--text-muted);">/ ${availablePool.length} câu có sẵn</span>`;
    }

    const sumDurEl = container.querySelector('#summary-duration-text');
    if (sumDurEl) {
      sumDurEl.textContent = requestedMinutes === 0 ? 'Không giới hạn' : `${requestedMinutes} phút`;
    }

    const warnBox = container.querySelector('#qcount-warning-box');
    if (warnBox) {
      if (requestedCount > availablePool.length && availablePool.length > 0) {
        warnBox.style.display = 'block';
        warnBox.innerHTML = `⚠️ Số câu bạn yêu cầu (<strong>${requestedCount} câu</strong>) nhiều hơn số câu hiện có trong phạm vi lọc (<strong>${availablePool.length} câu</strong>). Hệ thống tự động lấy tối đa <strong>${availablePool.length} câu không trùng lặp</strong> theo đúng cấu trúc đề.`;
      } else if (availablePool.length === 0) {
        warnBox.style.display = 'block';
        warnBox.innerHTML = `⚠️ Không có câu hỏi nào thỏa mãn bộ lọc hiện tại. Vui lòng chọn thêm Part/Đề hoặc đổi chế độ lọc nguồn câu hỏi.`;
      } else {
        warnBox.style.display = 'none';
      }
    }

    const launchBtn = container.querySelector('#btn-launch-custom-exam');
    if (launchBtn) {
      launchBtn.disabled = effectiveCount === 0;
      launchBtn.innerHTML = `🚀 Bắt đầu Làm Bài Ngay (${effectiveCount} câu · ${requestedMinutes === 0 ? 'Không giới hạn giờ' : requestedMinutes + ' phút'})`;
    }
  }

  function renderExamBuilderView(container) {
    const parts = window.AppDataLoader.getParts();
    const availablePool = getAvailablePool();
    const sysMax = getSystemTotalQuestions();
    const maxSliderQ = Math.max(1, availablePool.length || sysMax);
    const requestedCount = getRequestedQuestionCount();
    const effectiveCount = builderState.allowRepeat
      ? requestedCount
      : Math.min(requestedCount, availablePool.length);
    const requestedMinutes = getRequestedDurationMinutes();

    container.innerHTML = `
      <div class="view-enter">
        <div class="part-header-banner">
          <div>
            <h2 style="font-size:1.35rem;font-weight:800;">⚙️ Tạo Bài Kiểm Tra Tùy Biến</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">Thiết lập bài thi hoặc bài luyện tập theo đúng cấu trúc Part, Đề, số lượng câu hỏi và thời gian làm bài mong muốn.</p>
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
                <button type="button" class="chip-option ${builderState.selectionMode === 'sequential' ? 'selected' : ''}" data-sel-mode="sequential">📋 Tuần tự theo đề gốc</button>
                <button type="button" class="chip-option ${builderState.selectionMode === 'random' ? 'selected' : ''}" data-sel-mode="random">🎲 Ngẫu nhiên từ kho (Giữ cấu trúc Part & bài đọc)</button>
                <button type="button" class="chip-option ${builderState.selectionMode === 'unanswered' ? 'selected' : ''}" data-sel-mode="unanswered">🆕 Chỉ lấy câu chưa làm</button>
                <button type="button" class="chip-option ${builderState.selectionMode === 'wrong' ? 'selected' : ''}" data-sel-mode="wrong">🔥 Chỉ lấy câu từng làm sai</button>
              </div>
            </div>

            <!-- 4. Số lượng câu hỏi (Đồng bộ Nút chọn nhanh + Ô nhập số + Thanh kéo) -->
            <div class="config-section">
              <label class="config-label">4. Số lượng câu hỏi (Kho câu hỏi khả dụng: <strong id="available-pool-count">${availablePool.length}</strong> / ${sysMax} câu):</label>
              <div class="checkbox-chips">
                ${['5', '10', '15', '20', '30', '35', 'custom'].map(val => `
                  <button type="button" class="chip-option ${builderState.questionCountPreset === val ? 'selected' : ''}" data-qcount="${val}">
                    ${val === 'custom' ? 'Tự nhập...' : `${val} câu`}
                  </button>
                `).join('')}
              </div>
              <div class="custom-control-bar ${builderState.questionCountPreset === 'custom' ? 'is-custom-focused' : ''}" id="qcount-control-bar">
                <div style="display:flex;align-items:center;gap:0.45rem;">
                  <label for="custom-qcount-inp" style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);">Số câu:</label>
                  <input type="number" id="custom-qcount-inp" class="custom-number-input" min="1" max="${sysMax}" value="${requestedCount}" aria-label="Nhập số lượng câu hỏi" />
                </div>
                <input type="range" id="custom-qcount-slider" class="custom-range-slider" min="1" max="${maxSliderQ}" value="${Math.min(requestedCount, maxSliderQ)}" aria-label="Thanh kéo điều chỉnh số lượng câu hỏi" />
                <div id="qcount-status-label" style="width:100%;font-size:0.79rem;color:var(--text-muted);">
                  Đang chọn: <strong style="color:var(--primary-600);">${requestedCount} câu</strong> (Tối đa <strong>${availablePool.length} câu</strong> không lặp trong phạm vi đã chọn)
                </div>
              </div>
            </div>

            <!-- 5. Thời gian làm bài (Đồng bộ Nút chọn nhanh + Ô nhập số phút + Thanh kéo) -->
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
              <div class="custom-control-bar ${builderState.durationPreset === 'custom' ? 'is-custom-focused' : ''}" id="duration-control-bar">
                <div style="display:flex;align-items:center;gap:0.45rem;">
                  <label for="custom-duration-inp" style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);">Số phút:</label>
                  <input type="number" id="custom-duration-inp" class="custom-number-input" min="0" max="180" value="${requestedMinutes}" aria-label="Nhập thời gian làm bài (phút)" />
                  <span style="font-size:0.82rem;color:var(--text-muted);">phút (0 = Không giới hạn)</span>
                </div>
                <input type="range" id="custom-duration-slider" class="custom-range-slider" min="0" max="180" step="1" value="${Math.min(requestedMinutes, 180)}" aria-label="Thanh kéo điều chỉnh thời gian làm bài" />
                <div id="duration-status-label" style="width:100%;font-size:0.79rem;color:var(--text-muted);">
                  ${requestedMinutes === 0
                    ? `Đang chọn: <strong style="color:var(--success-600);">Không giới hạn thời gian</strong> (Tắt đồng hồ đếm ngược)`
                    : `Đang chọn: <strong style="color:var(--primary-600);">${requestedMinutes} phút</strong> (Đồng hồ đếm ngược ${requestedMinutes}:00)`}
                </div>
              </div>
            </div>

            <!-- 6. Tùy chọn trộn & hình thức thi -->
            <div class="config-section" style="margin-bottom:0;">
              <label class="config-label">6. Chế độ làm bài & Tùy chọn hiển thị:</label>
              <div class="checkbox-chips">
                <button type="button" class="chip-option ${builderState.examMode === 'exam' ? 'selected' : ''}" data-mode-select="exam">
                  🏆 Chế độ Thi (Ẩn đáp án cho tới khi nộp)
                </button>
                <button type="button" class="chip-option ${builderState.examMode === 'practice' ? 'selected' : ''}" data-mode-select="practice">
                  💡 Chế độ Luyện tập (Có giải thích ngay)
                </button>
                <button type="button" class="chip-option ${builderState.shuffleQuestions ? 'selected' : ''}" id="toggle-shuffle-q">
                  ${builderState.shuffleQuestions ? '✓' : ''} Đổi ngẫu nhiên cụm đề (Giữ cấu trúc Part & thứ tự câu gốc)
                </button>
                <button type="button" class="chip-option ${builderState.shuffleOptions ? 'selected' : ''}" id="toggle-shuffle-opt">
                  ${builderState.shuffleOptions ? '✓' : ''} Trộn thứ tự phương án A/B/C/D
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
                    builderState.selectionMode === 'random' ? 'Ngẫu nhiên theo cụm đề' :
                    builderState.selectionMode === 'sequential' ? 'Tuần tự theo đề gốc' :
                    builderState.selectionMode === 'unanswered' ? 'Chỉ câu chưa làm' : 'Chỉ câu làm sai'
                  }</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--text-muted);">Số câu thực tế sẽ tạo:</span>
                  <strong id="summary-effective-count" style="color:var(--primary-600);font-size:1.05rem;">${effectiveCount} câu <span style="font-size:0.8rem;font-weight:400;color:var(--text-muted);">/ ${availablePool.length} câu có sẵn</span></strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--text-muted);">Thời gian làm bài:</span>
                  <strong id="summary-duration-text">${requestedMinutes === 0 ? 'Không giới hạn' : `${requestedMinutes} phút`}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;padding-bottom:0.5rem;border-bottom:1px solid var(--border-color);">
                  <span style="color:var(--text-muted);">Cấu trúc hiển thị:</span>
                  <strong>Đúng thứ tự Part & Đề gốc · Hiển thị liên tục 1 trang</strong>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-muted);">Chế độ:</span>
                  <span class="badge ${builderState.examMode === 'exam' ? 'badge-danger' : 'badge-success'}">
                    ${builderState.examMode === 'exam' ? 'Chế độ Thi (Chấm khi nộp)' : 'Chế độ Luyện tập'}
                  </span>
                </div>
              </div>

              <div id="qcount-warning-box" style="display:${(requestedCount > availablePool.length || availablePool.length === 0) ? 'block' : 'none'};margin-top:0.85rem;padding:0.65rem;background:var(--warning-50);color:var(--warning-600);border:1px solid var(--warning-100);border-radius:8px;font-size:0.82rem;">
                ${requestedCount > availablePool.length && availablePool.length > 0
                  ? `⚠️ Số câu bạn yêu cầu (<strong>${requestedCount} câu</strong>) nhiều hơn số câu hiện có trong phạm vi lọc (<strong>${availablePool.length} câu</strong>). Hệ thống tự động lấy tối đa <strong>${availablePool.length} câu không trùng lặp</strong> theo đúng cấu trúc đề.`
                  : (availablePool.length === 0 ? `⚠️ Không có câu hỏi nào thỏa mãn bộ lọc hiện tại. Vui lòng chọn thêm Part/Đề hoặc đổi chế độ lọc nguồn câu hỏi.` : '')}
              </div>
            </div>

            <div style="margin-top:1.25rem;">
              <button type="button" class="btn btn-primary btn-lg" style="width:100%;" id="btn-launch-custom-exam" ${effectiveCount === 0 ? 'disabled' : ''}>
                🚀 Bắt đầu Làm Bài Ngay (${effectiveCount} câu · ${requestedMinutes === 0 ? 'Không giới hạn giờ' : requestedMinutes + ' phút'})
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 1. Sự kiện chọn Part
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
          const order = window.AppDataLoader.PART_ORDER;
          builderState.selectedParts.push(pId);
          builderState.selectedParts.sort((a, b) => (order[a] || 99) - (order[b] || 99));
        }
        renderExamBuilderView(container);
      });
    });

    // 2. Sự kiện phạm vi Đề
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

    // 3. Sự kiện chế độ lọc nguồn câu
    container.querySelectorAll('[data-sel-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        builderState.selectionMode = btn.getAttribute('data-sel-mode');
        renderExamBuilderView(container);
      });
    });

    // 4. Sự kiện chọn Số lượng câu hỏi (Nút mức cố định, Nút Tự nhập, Ô nhập số, Thanh kéo)
    const customQInp = container.querySelector('#custom-qcount-inp');
    const customQSlider = container.querySelector('#custom-qcount-slider');

    container.querySelectorAll('[data-qcount]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-qcount');
        builderState.questionCountPreset = val;
        if (val !== 'custom') {
          builderState.customQuestionCount = parseInt(val, 10);
          syncDynamicSummaryAndControls(container);
        } else {
          // Khi bấm "Tự nhập...", giữ nguyên số câu hiện tại và focus vào ô nhập để gõ ngay
          builderState.customQuestionCount = getRequestedQuestionCount();
          syncDynamicSummaryAndControls(container);
          if (customQInp) {
            customQInp.focus();
            customQInp.select();
          }
        }
      });
    });

    if (customQInp) {
      customQInp.addEventListener('focus', () => {
        const qBar = container.querySelector('#qcount-control-bar');
        if (qBar) qBar.classList.add('is-custom-focused');
      });

      customQInp.addEventListener('input', (e) => {
        const rawStr = e.target.value.trim();
        if (rawStr === '') {
          // Cho phép người dùng xóa trắng tạm thời khi đang gõ mà không reset hay mất focus
          builderState.questionCountPreset = 'custom';
          container.querySelectorAll('[data-qcount]').forEach(btn => {
            btn.classList.toggle('selected', btn.getAttribute('data-qcount') === 'custom');
          });
          return;
        }
        let parsed = parseInt(rawStr, 10);
        if (isNaN(parsed)) return;
        const sysLimit = getSystemTotalQuestions();
        if (parsed < 1) parsed = 1;
        if (parsed > sysLimit) {
          parsed = sysLimit;
          e.target.value = String(sysLimit);
          window.AppUtils.showToast(`Kho đề cương có tối đa ${sysLimit} câu hỏi.`, 'info');
        }
        builderState.customQuestionCount = parsed;
        builderState.questionCountPreset = QCOUNT_PRESETS.includes(String(parsed)) ? String(parsed) : 'custom';
        syncDynamicSummaryAndControls(container, { skipQInput: true });
      });

      customQInp.addEventListener('change', (e) => {
        const poolNow = getAvailablePool();
        const sysLimit = getSystemTotalQuestions();
        let parsed = parseInt(e.target.value, 10);
        if (isNaN(parsed) || parsed < 1) {
          parsed = 1;
          window.AppUtils.showToast('Số lượng câu hỏi tối thiểu là 1 câu.', 'warning');
        } else if (parsed > sysLimit) {
          parsed = sysLimit;
          window.AppUtils.showToast(`Số câu không được vượt quá tổng số ${sysLimit} câu của hệ thống.`, 'warning');
        } else if (parsed > poolNow.length && poolNow.length > 0) {
          window.AppUtils.showToast(`Phạm vi lọc hiện có ${poolNow.length} câu. Đề tạo ra sẽ lấy tối đa ${poolNow.length} câu không lặp.`, 'info');
        }
        builderState.customQuestionCount = parsed;
        e.target.value = String(parsed);
        builderState.questionCountPreset = QCOUNT_PRESETS.includes(String(parsed)) ? String(parsed) : 'custom';
        syncDynamicSummaryAndControls(container);
      });
    }

    if (customQSlider) {
      customQSlider.addEventListener('input', (e) => {
        const val = Math.max(1, parseInt(e.target.value, 10) || 10);
        builderState.customQuestionCount = val;
        builderState.questionCountPreset = QCOUNT_PRESETS.includes(String(val)) ? String(val) : 'custom';
        syncDynamicSummaryAndControls(container, { skipQSlider: true });
      });
    }

    // 5. Sự kiện chọn Thời gian làm bài (Nút mức cố định, Không giới hạn, Tự nhập, Ô nhập số, Thanh kéo)
    const customDurInp = container.querySelector('#custom-duration-inp');
    const customDurSlider = container.querySelector('#custom-duration-slider');

    container.querySelectorAll('[data-duration]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-duration');
        builderState.durationPreset = val;
        if (val !== 'custom') {
          builderState.customDurationMinutes = parseInt(val, 10);
          syncDynamicSummaryAndControls(container);
        } else {
          if (!builderState.customDurationMinutes || builderState.customDurationMinutes <= 0) {
            builderState.customDurationMinutes = 25;
          }
          syncDynamicSummaryAndControls(container);
          if (customDurInp) {
            customDurInp.focus();
            customDurInp.select();
          }
        }
      });
    });

    if (customDurInp) {
      customDurInp.addEventListener('focus', () => {
        const durBar = container.querySelector('#duration-control-bar');
        if (durBar) durBar.classList.add('is-custom-focused');
      });

      customDurInp.addEventListener('input', (e) => {
        const rawStr = e.target.value.trim();
        if (rawStr === '') {
          builderState.durationPreset = 'custom';
          container.querySelectorAll('[data-duration]').forEach(btn => {
            btn.classList.toggle('selected', btn.getAttribute('data-duration') === 'custom');
          });
          return;
        }
        let parsed = parseInt(rawStr, 10);
        if (isNaN(parsed)) return;
        if (parsed < 0) parsed = 0;
        if (parsed > 180) {
          parsed = 180;
          e.target.value = '180';
          window.AppUtils.showToast('Thời gian làm bài tối đa là 180 phút.', 'info');
        }
        builderState.customDurationMinutes = parsed;
        if (parsed === 0) {
          builderState.durationPreset = '0';
        } else if (DURATION_PRESETS.includes(String(parsed))) {
          builderState.durationPreset = String(parsed);
        } else {
          builderState.durationPreset = 'custom';
        }
        syncDynamicSummaryAndControls(container, { skipDurInput: true });
      });

      customDurInp.addEventListener('change', (e) => {
        let parsed = parseInt(e.target.value, 10);
        if (isNaN(parsed) || parsed < 0) {
          parsed = 0;
        } else if (parsed > 180) {
          parsed = 180;
          window.AppUtils.showToast('Thời gian tối đa là 180 phút.', 'warning');
        }
        builderState.customDurationMinutes = parsed;
        e.target.value = String(parsed);
        if (parsed === 0) {
          builderState.durationPreset = '0';
        } else if (DURATION_PRESETS.includes(String(parsed))) {
          builderState.durationPreset = String(parsed);
        } else {
          builderState.durationPreset = 'custom';
        }
        syncDynamicSummaryAndControls(container);
      });
    }

    if (customDurSlider) {
      customDurSlider.addEventListener('input', (e) => {
        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
        builderState.customDurationMinutes = val;
        if (val === 0) {
          builderState.durationPreset = '0';
        } else if (DURATION_PRESETS.includes(String(val))) {
          builderState.durationPreset = String(val);
        } else {
          builderState.durationPreset = 'custom';
        }
        syncDynamicSummaryAndControls(container, { skipDurSlider: true });
      });
    }

    // 6. Tùy chọn trộn cụm đề, trộn đáp án & chế độ thi
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
      builderState.selectedParts = ['PART_I', 'PART_II', 'PART_III', 'PART_IV', 'PART_V'];
      builderState.selectedTests = 'all';
      builderState.selectionMode = 'random';
      builderState.questionCountPreset = '35';
      builderState.customQuestionCount = 35;
      builderState.durationPreset = '45';
      builderState.customDurationMinutes = 45;
      builderState.examMode = 'exam';
      renderExamBuilderView(container);
      window.AppUtils.showToast('Đã nạp cấu hình Đề thi B1 chuẩn: 35 câu (đủ 5 Part) / 45 phút!', 'success');
    });

    container.querySelector('#btn-launch-custom-exam').addEventListener('click', () => {
      const poolNow = getAvailablePool();
      const reqCount = getRequestedQuestionCount();
      const effCount = builderState.allowRepeat ? reqCount : Math.min(reqCount, poolNow.length);
      const reqMinutes = getRequestedDurationMinutes();

      if (effCount <= 0 || poolNow.length === 0) {
        window.AppUtils.showToast('Không có câu hỏi nào trong phạm vi đã chọn.', 'warning');
        return;
      }

      if (reqCount > poolNow.length) {
        window.AppUtils.showToast(`Kho câu hỏi trong phạm vi lọc có ${poolNow.length} câu. Đã tạo đề với ${poolNow.length} câu không trùng lặp.`, 'info');
      }

      const chosen = window.AppDataLoader.selectStructuredQuestions(poolNow, effCount, {
        random: builderState.selectionMode === 'random' || builderState.shuffleQuestions
      });

      window.AppExamEngine.startCustomSession({
        title: `Bài kiểm tra tùy biến (${chosen.length} câu${reqMinutes > 0 ? ` · ${reqMinutes} phút` : ' · Không giới hạn giờ'})`,
        mode: builderState.examMode,
        questions: chosen,
        durationSeconds: reqMinutes > 0 ? reqMinutes * 60 : 0,
        shuffleOptions: builderState.shuffleOptions,
        config: Object.assign({}, builderState)
      });
    });
  }

  return {
    renderExamBuilderView,
    getBuilderState: () => builderState
  };
})();
