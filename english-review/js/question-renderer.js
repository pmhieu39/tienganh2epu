/* question-renderer.js - Hiển thị câu hỏi, bài đọc, hình ảnh biển báo và lựa chọn đáp án */
window.AppQuestionRenderer = (function () {
  const { escapeHtml } = window.AppUtils;

  // Lưu trạng thái mở rộng / thu gọn bài đọc theo từng đề (testId) hoặc câu hỏi
  const expandedPassages = {};

  function getPassageKey(q) {
    if (!q) return 'default';
    return q.testId || q.id || 'default';
  }

  function isPassageExpanded(key) {
    return Boolean(key && expandedPassages[key]);
  }

  function setPassageExpanded(key, val) {
    if (!key) return;
    expandedPassages[key] = Boolean(val);
  }

  function getCollapsedMaxHeight() {
    return (typeof window !== 'undefined' && window.innerWidth <= 820) ? 250 : 290;
  }

  // Render bài đọc Part V với 10 chỗ trống (1)–(10) chính xác tuyệt đối, mỗi chỗ xuất hiện đúng 1 lần
  function renderClozePassageText(q, options = {}) {
    const rawEscaped = escapeHtml(q.passageText || '');
    const testObj = q.testId ? window.AppDataLoader.getTest(q.testId) : null;
    const testQuestions = (testObj && Array.isArray(testObj.questions)) ? testObj.questions : [];
    const sessionAnswers = options.sessionAnswers || null;
    const isExamMode = Boolean(options.isExamMode);
    const showAnswer = Boolean(options.showAnswer);
    const st = window.AppStorage.loadState();
    const strictMode = st.settings && st.settings.gradingMode === 'strict_official_only';

    // Chỉ khớp đúng các placeholder từ (1) đến (10) kèm dấu chấm lửng trong bài đọc gốc, trong 1 lượt duy nhất
    return rawEscaped.replace(/\((10|[1-9])\)\s*[….…]+/g, (match, numStr) => {
      const num = parseInt(numStr, 10);
      const isCurrent = Number(q.number) === num;
      const blankQ = testQuestions.find(item => Number(item.number) === num) || (isCurrent ? q : null);
      const blankQid = blankQ ? blankQ.id : '';

      let userChoice = null;
      if (sessionAnswers && blankQid && Object.prototype.hasOwnProperty.call(sessionAnswers, blankQid)) {
        userChoice = sessionAnswers[blankQid] || null;
      } else if (isCurrent && options.selectedKey) {
        userChoice = options.selectedKey;
      } else if (blankQid && options.useStoredProgress) {
        const qs = window.AppStorage.getQuestionState(blankQid);
        userChoice = qs ? qs.lastSelected : null;
      }

      let chosenText = '';
      if (userChoice && blankQ && Array.isArray(blankQ.options)) {
        const foundOpt = blankQ.options.find(o => o.key === userChoice);
        if (foundOpt) chosenText = foundOpt.text;
      }

      let stateCls = '';
      if (isCurrent) stateCls += ' is-current';
      if (userChoice) {
        stateCls += ' is-answered';
        if (!isExamMode && showAnswer && isCurrent && blankQid) {
          const ansObj = window.AppDataLoader.getAnswerObj(blankQid);
          const isUnverified = !ansObj || (strictMode && !ansObj.officialInDocx);
          if (!isUnverified && ansObj && ansObj.answer) {
            stateCls += (userChoice === ansObj.answer) ? ' is-correct' : ' is-wrong';
          }
        }
      }

      const displayVal = userChoice
        ? (chosenText ? `${escapeHtml(userChoice)}. ${escapeHtml(chosenText)}` : escapeHtml(userChoice))
        : '___';

      return `<span class="cloze-blank${stateCls}" data-action="jump-blank-question" data-qid="${escapeHtml(blankQid)}" data-qnumber="${num}" role="button" tabindex="0" title="Chuyển đến Câu (${num})"><span class="cloze-blank-num">(${num})</span><span class="cloze-blank-val">${displayVal}</span></span>`;
    });
  }

  function renderPassageToggleBtn(passageKey, isExpanded) {
    return `
      <button type="button"
        class="btn-passage-toggle"
        data-action="toggle-passage-expand"
        data-passage-key="${escapeHtml(passageKey)}"
        aria-expanded="${isExpanded ? 'true' : 'false'}">
        <span class="passage-toggle-icon" aria-hidden="true">${isExpanded ? '▲' : '▼'}</span>
        <span class="passage-toggle-label">${isExpanded ? 'Thu gọn đoạn văn' : 'Hiện toàn bộ đoạn văn'}</span>
      </button>
    `;
  }

  function renderPassageOrContext(q, options = {}) {
    if (!q) return '';

    // PART I: Hình ảnh biển báo / thông báo / tin nhắn + văn bản trích xuất từ hình
    if (q.partId === 'PART_I' && q.image) {
      return `
        <div class="question-image-box">
          <img src="${escapeHtml(q.image)}" alt="Hình ảnh câu hỏi ${escapeHtml(q.id)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
          <div style="display:none;padding:0.75rem;background:var(--warning-50);color:var(--warning-600);border-radius:8px;font-size:0.84rem;">
            Không tải được file ảnh gốc (${escapeHtml(q.image)}). Đang hiển thị nguyên văn nội dung biển báo/tin nhắn bên dưới:
          </div>
          ${q.imageText ? `
            <details style="width:100%;max-width:520px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:8px;padding:0.55rem 0.85rem;font-size:0.84rem;">
              <summary style="cursor:pointer;font-weight:600;color:var(--primary-600);">Xem văn bản trong hình ảnh (Transcript)</summary>
              <pre style="white-space:pre-wrap;font-family:inherit;margin-top:0.5rem;color:var(--text-primary);line-height:1.5;">${escapeHtml(q.imageText)}</pre>
            </details>
          ` : ''}
        </div>
      `;
    }

    const passageKey = getPassageKey(q);
    const isExpanded = isPassageExpanded(passageKey);

    // PART II: 5 đoạn văn ngắn A-E để ghép nối
    if (q.partId === 'PART_II' && Array.isArray(q.passageItems)) {
      return `
        <div class="passage-container ${isExpanded ? 'is-expanded' : ''}" data-passage-key="${escapeHtml(passageKey)}">
          <div class="passage-header">
            <div class="passage-header-title">
              <strong style="color:var(--primary-600);font-size:0.92rem;">📖 ${escapeHtml(q.passageTitle || 'Danh sách 5 đoạn văn (A–E)')}</strong>
              <span class="badge badge-primary">Đọc và ghép A–E</span>
            </div>
            <div class="passage-header-actions">
              ${renderPassageToggleBtn(passageKey, isExpanded)}
            </div>
          </div>
          <div class="passage-body">
            ${q.passageItems.map(item => `
              <div class="passage-item-card">
                <div style="font-weight:700;color:var(--primary-600);margin-bottom:0.25rem;">${escapeHtml(item.key)}. ${escapeHtml(item.title)}</div>
                <div style="font-size:0.9rem;color:var(--text-primary);">${escapeHtml(item.text)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // PART III, IV, V: Đoạn văn bài đọc
    if (q.passageText) {
      const formattedPassage = (q.partId === 'PART_V')
        ? renderClozePassageText(q, options)
        : escapeHtml(q.passageText);

      return `
        <div class="passage-container ${isExpanded ? 'is-expanded' : ''}" data-passage-key="${escapeHtml(passageKey)}">
          <div class="passage-header">
            <div class="passage-header-title">
              <strong style="color:var(--primary-600);font-size:0.95rem;">📖 ${escapeHtml(q.passageTitle || 'Bài đọc (Reading Passage)')}</strong>
              <span class="badge badge-neutral">${escapeHtml(q.partCode || '')}</span>
            </div>
            <div class="passage-header-actions">
              ${renderPassageToggleBtn(passageKey, isExpanded)}
            </div>
          </div>
          <div class="passage-body">
            <div class="passage-text-content">${formattedPassage}</div>
          </div>
        </div>
      `;
    }

    return '';
  }

  // Kiểm tra tự động độ dài bài đọc và đồng bộ nút Hiện toàn bộ / Thu gọn đoạn văn
  function syncPassageExpandUI(rootEl) {
    const scope = rootEl || document;
    const containers = scope.querySelectorAll('.passage-container[data-passage-key]');
    const collapsedLimit = getCollapsedMaxHeight();

    containers.forEach(box => {
      const key = box.getAttribute('data-passage-key');
      const isExp = isPassageExpanded(key);
      const btn = box.querySelector('[data-action="toggle-passage-expand"]');

      // Đo chiều cao tự nhiên của toàn bộ bài đọc khi không giới hạn max-height
      const prevMaxH = box.style.maxHeight;
      const prevOv = box.style.overflowY;
      box.style.maxHeight = 'none';
      box.style.overflowY = 'visible';
      const naturalHeight = box.scrollHeight;
      box.style.maxHeight = prevMaxH;
      box.style.overflowY = prevOv;

      // Nếu bài đọc ngắn (không vượt quá chiều cao khung rút gọn), không cần thu gọn và ẩn nút
      if (naturalHeight <= collapsedLimit + 10) {
        box.classList.add('is-short');
        box.classList.remove('is-expanded');
        if (btn) btn.style.display = 'none';
        return;
      }

      box.classList.remove('is-short');
      if (btn) {
        btn.style.display = 'inline-flex';
        btn.setAttribute('aria-expanded', isExp ? 'true' : 'false');
        const iconEl = btn.querySelector('.passage-toggle-icon');
        const labelEl = btn.querySelector('.passage-toggle-label');
        if (iconEl) iconEl.textContent = isExp ? '▲' : '▼';
        if (labelEl) labelEl.textContent = isExp ? 'Thu gọn đoạn văn' : 'Hiện toàn bộ đoạn văn';
        else btn.textContent = isExp ? 'Thu gọn đoạn văn' : 'Hiện toàn bộ đoạn văn';
      }

      if (isExp) {
        box.classList.add('is-expanded');
      } else {
        box.classList.remove('is-expanded');
        // Với Part V khi đang ở trạng thái rút gọn, đảm bảo ô trống hiện tại nằm trong vùng nhìn thấy của khung bài đọc
        const currentBlank = box.querySelector('.cloze-blank.is-current');
        if (currentBlank) {
          const boxRect = box.getBoundingClientRect();
          const blankRect = currentBlank.getBoundingClientRect();
          const relTop = blankRect.top - boxRect.top + box.scrollTop;
          if (relTop > box.clientHeight - 45 || relTop < 45) {
            box.scrollTop = Math.max(0, relTop - Math.floor(box.clientHeight / 2));
          }
        }
      }
    });
  }

  function togglePassageExpand(btnEl) {
    if (!btnEl) return;
    const box = btnEl.closest('.passage-container');
    if (!box) return;
    const key = btnEl.getAttribute('data-passage-key') || box.getAttribute('data-passage-key') || 'default';
    const nextExpanded = !isPassageExpanded(key);
    setPassageExpanded(key, nextExpanded);

    box.classList.toggle('is-expanded', nextExpanded);
    btnEl.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');

    const iconEl = btnEl.querySelector('.passage-toggle-icon');
    const labelEl = btnEl.querySelector('.passage-toggle-label');
    if (iconEl) iconEl.textContent = nextExpanded ? '▲' : '▼';
    if (labelEl) labelEl.textContent = nextExpanded ? 'Thu gọn đoạn văn' : 'Hiện toàn bộ đoạn văn';
    else btnEl.textContent = nextExpanded ? 'Thu gọn đoạn văn' : 'Hiện toàn bộ đoạn văn';
  }

  function renderQuestionCard(q, options = {}) {
    const selectedKey = options.selectedKey || null;
    const showAnswer = Boolean(options.showAnswer);
    const isExamMode = Boolean(options.isExamMode);
    const displayOptions = options.shuffledOptions || q.options || [];
    const ansObj = window.AppDataLoader.getAnswerObj(q.id);
    const qState = window.AppStorage.getQuestionState(q.id);
    const st = window.AppStorage.loadState();
    const isUnverified = !ansObj || (st.settings.gradingMode === 'strict_official_only' && !ansObj.officialInDocx);
    const correctKey = (!isUnverified && ansObj) ? ansObj.answer : null;

    return `
      <div class="card" id="question-card-${escapeHtml(q.id)}">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.85rem;">
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <span class="badge badge-primary">${escapeHtml(q.partCode)}</span>
            <span class="badge badge-neutral">${escapeHtml(q.testTitle)}</span>
            <span class="badge badge-neutral">Câu ${q.number}</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.4rem;">
            <button type="button" class="btn btn-sm ${qState.flagged ? 'btn-primary' : 'btn-secondary'}" data-action="toggle-flag" data-qid="${escapeHtml(q.id)}" title="Đánh dấu xem lại (Phím M)">
              🚩 ${qState.flagged ? 'Đã đánh dấu' : 'Đánh dấu'}
            </button>
            <button type="button" class="btn btn-sm ${qState.favorite ? 'btn-primary' : 'btn-secondary'}" data-action="toggle-fav" data-qid="${escapeHtml(q.id)}" title="Yêu thích">
              ${qState.favorite ? '★ Yêu thích' : '☆ Yêu thích'}
            </button>
          </div>
        </div>

        ${q.sourceNote ? `
          <div style="background:var(--warning-50);border:1px solid var(--warning-100);color:var(--warning-600);padding:0.55rem 0.85rem;border-radius:8px;font-size:0.8rem;margin-bottom:0.85rem;">
            <strong>📌 Ghi chú đối chiếu file Word gốc:</strong> ${escapeHtml(q.sourceNote)}
          </div>
        ` : ''}

        ${renderPassageOrContext(q, options)}

        <div style="font-size:1.04rem;font-weight:700;margin-bottom:0.85rem;color:var(--text-primary);">
          ${escapeHtml(q.prompt)}
        </div>

        <div class="options-list" role="radiogroup" aria-label="Các lựa chọn đáp án">
          ${displayOptions.map(opt => {
            const isSelected = selectedKey === opt.key;
            let stateClass = '';
            if (showAnswer && !isExamMode) {
              if (correctKey && opt.key === correctKey) {
                stateClass = 'correct';
              } else if (isSelected && correctKey && opt.key !== correctKey) {
                stateClass = 'wrong';
              } else if (isSelected) {
                stateClass = 'selected';
              }
            } else if (isSelected) {
              stateClass = 'selected';
            }

            return `
              <button type="button"
                class="option-btn ${stateClass}"
                data-action="select-option"
                data-qid="${escapeHtml(q.id)}"
                data-key="${escapeHtml(opt.key)}">
                <span class="option-key">${escapeHtml(opt.key)}</span>
                <span style="flex:1;line-height:1.45;">${escapeHtml(opt.text)}</span>
              </button>
            `;
          }).join('')}
        </div>

        ${(!isExamMode && showAnswer) ? renderFeedbackBlock(q, selectedKey, ansObj, isUnverified) : ''}
      </div>
    `;
  }

  function renderFeedbackBlock(q, selectedKey, ansObj, isUnverified) {
    if (isUnverified || !ansObj || !ansObj.answer) {
      return `
        <div class="explanation-box" style="border-left-color:var(--warning-500);background:var(--warning-50);">
          <strong>⚠️ Chưa có đáp án chính thức trong chế độ nghiêm ngặt:</strong>
          <p style="margin-top:0.25rem;">Câu hỏi này đang ở chế độ chỉ dùng đáp án in sẵn trong file Word gốc. Bạn có thể bật <em>"Đáp án đối chiếu văn bản"</em> trong Cài đặt hoặc tự cập nhật đáp án của giảng viên.</p>
        </div>
      `;
    }

    const isCorrect = selectedKey === ansObj.answer;
    return `
      <div class="explanation-box">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.35rem;">
          <strong>
            ${selectedKey
              ? (isCorrect ? '✅ Chính xác!' : `❌ Chưa đúng (Bạn chọn: ${escapeHtml(selectedKey)})`)
              : '💡 Đáp án tham khảo:'}
            Đáp án đúng: <span class="badge badge-success">${escapeHtml(ansObj.answer)}</span>
          </strong>
          <span class="badge badge-neutral" title="Nội dung giải thích được trích xuất đối chiếu từ văn bản gốc">
            ${ansObj.officialInDocx ? 'Đáp án người dùng cập nhật' : '🔍 Đối chiếu văn bản gốc (Hỗ trợ học tập)'}
          </span>
        </div>
        ${ansObj.evidence ? `<div style="font-size:0.83rem;color:var(--text-secondary);margin-top:0.3rem;"><strong>Dẫn chứng trong bài:</strong> <em>"${escapeHtml(ansObj.evidence)}"</em></div>` : ''}
        ${ansObj.explanation ? `<div style="margin-top:0.35rem;"><strong>Giải thích:</strong> ${escapeHtml(ansObj.explanation)}</div>` : ''}
      </div>
    `;
  }

  // Lắng nghe sự kiện toàn cục cho nút Hiện toàn bộ đoạn văn / Thu gọn đoạn văn và resize
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (e) => {
      if (!e || !e.target || typeof e.target.closest !== 'function') return;
      const toggleBtn = e.target.closest('[data-action="toggle-passage-expand"]');
      if (toggleBtn) {
        e.preventDefault();
        togglePassageExpand(toggleBtn);
      }
    });
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', () => {
      if (typeof document !== 'undefined') syncPassageExpandUI(document);
    });
  }

  return {
    renderPassageOrContext,
    renderQuestionCard,
    renderFeedbackBlock,
    syncPassageExpandUI,
    togglePassageExpand,
    isPassageExpanded,
    setPassageExpanded
  };
})();
