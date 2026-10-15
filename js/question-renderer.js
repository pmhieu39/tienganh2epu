/* question-renderer.js - Hiển thị liên tục toàn bộ đoạn văn, chỗ trống Cloze và câu hỏi theo đúng cấu trúc đề gốc */
window.AppQuestionRenderer = (function () {
  const { escapeHtml } = window.AppUtils;

  const expandedPassages = {};

  function getPassageKey(q) {
    if (!q) return 'default';
    return q.testId || q.id || 'default';
  }

  function isPassageExpanded(key) {
    return true;
  }

  function setPassageExpanded(key, val) {
    if (!key) return;
    expandedPassages[key] = Boolean(val);
  }

  // Trích xuất câu văn chứa chỗ trống (num) trong bài đọc Part V để hiển thị ngữ cảnh ngay trên thẻ câu hỏi
  function extractClozeSentenceSnippet(passageText, blankNum) {
    if (!passageText || !blankNum) return '';
    const pattern = new RegExp(`\\(${blankNum}\\)\\s*[….…]+`);
    const paragraphs = String(passageText).split(/\n+/);
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      if (pattern.test(p)) {
        // Tách theo câu nhưng giữ nguyên câu chứa chỗ trống (blankNum)
        const sentences = p.split(/(?<=[.!?])\s+/);
        for (let j = 0; j < sentences.length; j++) {
          if (pattern.test(sentences[j])) {
            return sentences[j].replace(pattern, `[(${blankNum}) ___]`).trim();
          }
        }
        return p.replace(pattern, `[(${blankNum}) ___]`).trim();
      }
    }
    return '';
  }

  // Render bài đọc Part V với đủ 10 chỗ trống (1)–(10) chính xác tuyệt đối, mỗi chỗ trống có ID định danh riêng để cuộn tới
  function renderClozePassageText(qOrGroup, options = {}) {
    const rawText = qOrGroup.passageText || '';
    const rawEscaped = escapeHtml(rawText);
    const testId = qOrGroup.testId || '';
    const testObj = testId ? window.AppDataLoader.getTest(testId) : null;
    const testQuestions = (testObj && Array.isArray(testObj.questions)) ? testObj.questions : [];
    const sessionAnswers = options.sessionAnswers || null;
    const isExamMode = Boolean(options.isExamMode);
    const showAnswer = Boolean(options.showAnswer);
    const revealedQuestions = options.revealedQuestions || {};
    const activeQuestionId = options.activeQuestionId || (qOrGroup.id ? qOrGroup.id : null);
    const seqIndexMap = options.seqIndexMap || {};
    const st = window.AppStorage.loadState();
    const strictMode = st.settings && st.settings.gradingMode === 'strict_official_only';

    return rawEscaped.replace(/\((10|[1-9])\)\s*[….…]+/g, (match, numStr) => {
      const num = parseInt(numStr, 10);
      const blankQ = testQuestions.find(item => Number(item.number) === num) || null;
      const blankQid = blankQ ? blankQ.id : `${testId}_q${num}`;
      const isCurrent = Boolean(
        (activeQuestionId && blankQid === activeQuestionId) ||
        (!activeQuestionId && Number(qOrGroup.number) === num)
      );
      const seqIdx = Object.prototype.hasOwnProperty.call(seqIndexMap, blankQid)
        ? seqIndexMap[blankQid]
        : '';

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
        const canRevealThisBlank = !isExamMode && (showAnswer || Boolean(revealedQuestions[blankQid]) || Boolean(userChoice));
        if (canRevealThisBlank && blankQid) {
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

      return `<span id="cloze-blank-${escapeHtml(blankQid)}" class="cloze-blank${stateCls}" data-action="jump-blank-question" data-qid="${escapeHtml(blankQid)}" data-qnumber="${num}" ${seqIdx !== '' ? `data-seq-idx="${seqIdx}"` : ''} role="button" tabindex="0" title="Chỗ trống (${num}) – Bấm để đến câu hỏi chọn đáp án"><span class="cloze-blank-num">(${num})</span><span class="cloze-blank-val">${displayVal}</span></span>`;
    });
  }

  // Render đoạn văn dùng chung cho một cụm câu hỏi của cùng một Đề (Part II, III, IV, V) - hiển thị đầy đủ 100%, không cuộn riêng
  function renderPassageOrContext(qOrGroup, options = {}) {
    if (!qOrGroup) return '';

    // PART I: Hình ảnh biển báo / thông báo / tin nhắn + văn bản trích xuất từ hình
    if (qOrGroup.partId === 'PART_I' && qOrGroup.image) {
      return `
        <div class="question-image-box">
          <img src="${escapeHtml(qOrGroup.image)}" alt="Hình ảnh câu hỏi ${escapeHtml(qOrGroup.id)}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
          <div style="display:none;padding:0.75rem;background:var(--warning-50);color:var(--warning-600);border-radius:8px;font-size:0.84rem;">
            Không tải được file ảnh gốc (${escapeHtml(qOrGroup.image)}). Đang hiển thị nguyên văn nội dung biển báo/tin nhắn bên dưới:
          </div>
          ${qOrGroup.imageText ? `
            <details style="width:100%;max-width:520px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:8px;padding:0.55rem 0.85rem;font-size:0.84rem;">
              <summary style="cursor:pointer;font-weight:600;color:var(--primary-600);">Xem văn bản trong hình ảnh (Transcript)</summary>
              <pre style="white-space:pre-wrap;font-family:inherit;margin-top:0.5rem;color:var(--text-primary);line-height:1.5;">${escapeHtml(qOrGroup.imageText)}</pre>
            </details>
          ` : ''}
        </div>
      `;
    }

    const passageKey = getPassageKey(qOrGroup);

    // PART II: 5 đoạn văn ngắn A-E để ghép nối
    if (qOrGroup.partId === 'PART_II' && Array.isArray(qOrGroup.passageItems)) {
      return `
        <div class="passage-container is-expanded" id="passage-box-${escapeHtml(passageKey)}" data-passage-key="${escapeHtml(passageKey)}">
          <div class="passage-header">
            <div class="passage-header-title">
              <strong style="color:var(--primary-600);font-size:0.95rem;">📖 ${escapeHtml(qOrGroup.passageTitle || 'Danh sách 5 đoạn văn (A–E)')}</strong>
              <span class="badge badge-primary">Đọc và ghép A–E</span>
            </div>
          </div>
          <div class="passage-body">
            ${qOrGroup.passageItems.map(item => `
              <div class="passage-item-card">
                <div style="font-weight:700;color:var(--primary-600);margin-bottom:0.25rem;">${escapeHtml(item.key)}. ${escapeHtml(item.title)}</div>
                <div style="font-size:0.92rem;color:var(--text-primary);line-height:1.65;">${escapeHtml(item.text)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // PART III, IV, V: Đoạn văn bài đọc hiển thị toàn bộ liên tục trên trang chính
    if (qOrGroup.passageText) {
      const formattedPassage = (qOrGroup.partId === 'PART_V')
        ? renderClozePassageText(qOrGroup, options)
        : escapeHtml(qOrGroup.passageText);

      return `
        <div class="passage-container is-expanded" id="passage-box-${escapeHtml(passageKey)}" data-passage-key="${escapeHtml(passageKey)}">
          <div class="passage-header">
            <div class="passage-header-title">
              <strong style="color:var(--primary-600);font-size:0.98rem;">📖 ${escapeHtml(qOrGroup.passageTitle || 'Bài đọc (Reading Passage)')}</strong>
              <span class="badge badge-neutral">${escapeHtml(qOrGroup.partCode || '')}</span>
              ${qOrGroup.partId === 'PART_V' ? '<span class="badge badge-primary">Đoạn văn 10 chỗ trống (1)–(10)</span>' : ''}
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

  function syncPassageExpandUI() {
    // Toàn bộ đoạn văn luôn hiển thị đầy đủ trên trang chính (không còn khung cuộn riêng)
  }

  function togglePassageExpand() {
    // Giữ hàm tương thích API
  }

  function renderQuestionCard(q, options = {}) {
    const selectedKey = options.selectedKey || null;
    const showAnswer = Boolean(options.showAnswer);
    const isExamMode = Boolean(options.isExamMode);
    const omitSharedPassage = Boolean(options.omitSharedPassage);
    const seqIndex = typeof options.seqIndex === 'number' ? options.seqIndex : null;
    const seqNumber = typeof options.seqNumber === 'number' ? options.seqNumber : q.number;
    const isCurrent = Boolean(options.isCurrent);
    const displayOptions = options.shuffledOptions || q.options || [];
    const ansObj = window.AppDataLoader.getAnswerObj(q.id);
    const qState = window.AppStorage.getQuestionState(q.id);
    const st = window.AppStorage.loadState();
    const isUnverified = !ansObj || (st.settings.gradingMode === 'strict_official_only' && !ansObj.officialInDocx);
    const correctKey = (!isUnverified && ansObj) ? ansObj.answer : null;

    const seqAttr = seqIndex !== null ? `data-seq-idx="${seqIndex}"` : "";
    const isCloze = q.partId === 'PART_V';
    const clozeSnippet = (isCloze && omitSharedPassage) ? extractClozeSentenceSnippet(q.passageText, q.number) : '';

    // Tiêu đề câu hỏi rõ ràng, hiển thị đúng số thứ tự câu trên bảng điều hướng và số câu/chỗ trống trong đề gốc
    let questionHeading = escapeHtml(q.prompt);
    if (isCloze) {
      questionHeading = seqNumber !== q.number
        ? `Câu ${seqNumber} — Chỗ trống (${q.number})`
        : `Câu ${seqNumber} (Chỗ trống số ${q.number})`;
    } else if (seqNumber !== q.number) {
      questionHeading = `Câu ${seqNumber} (${escapeHtml(q.prompt)})`;
    }

    return `
      <div class="card question-card-item ${isCurrent ? 'is-active-question' : ''}"
           id="question-card-${escapeHtml(q.id)}"
           data-question-card-id="${escapeHtml(q.id)}"
           data-qid="${escapeHtml(q.id)}"
           ${seqAttr}>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
          <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
            <span class="badge badge-primary">Câu ${seqNumber}</span>
            <span class="badge badge-neutral">${escapeHtml(q.partCode)}</span>
            <span class="badge badge-neutral">${escapeHtml(q.testTitle)}</span>
            ${isCloze ? `<span class="badge badge-warning">Chỗ trống (${q.number})</span>` : (seqNumber !== q.number ? `<span class="badge badge-neutral">Câu ${q.number} trong đề</span>` : '')}
          </div>
          <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
            ${(isCloze && omitSharedPassage) ? `
              <button type="button" class="btn btn-sm btn-secondary" data-action="scroll-to-blank" data-qid="${escapeHtml(q.id)}" title="Cuộn lên vị trí chỗ trống (${q.number}) trong đoạn văn">
                ↑ Xem chỗ trống (${q.number})
              </button>
            ` : ''}
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

        ${(!omitSharedPassage || q.partId === 'PART_I') ? renderPassageOrContext(q, options) : ''}

        ${clozeSnippet ? `
          <div class="cloze-context-snippet">
            <strong>Ngữ cảnh chỗ trống (${q.number}):</strong> "${escapeHtml(clozeSnippet)}"
          </div>
        ` : ''}

        <div style="font-size:1.02rem;font-weight:700;margin-bottom:0.65rem;color:var(--text-primary);">
          ${questionHeading}
        </div>

        <div class="options-list" role="radiogroup" aria-label="Các lựa chọn đáp án cho câu ${seqNumber}">
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

        ${!isExamMode ? `
          <div style="display:flex;justify-content:flex-end;margin-top:0.35rem;">
            <button type="button" class="btn btn-secondary btn-sm" data-action="toggle-explain" data-qid="${escapeHtml(q.id)}">
              👁️ ${showAnswer ? 'Ẩn đáp án & giải thích' : 'Hiện đáp án & giải thích'}
            </button>
          </div>
        ` : ''}

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

  return {
    extractClozeSentenceSnippet,
    renderClozePassageText,
    renderPassageOrContext,
    renderQuestionCard,
    renderFeedbackBlock,
    syncPassageExpandUI,
    togglePassageExpand,
    isPassageExpanded,
    setPassageExpanded
  };
})();
