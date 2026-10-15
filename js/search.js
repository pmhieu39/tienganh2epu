/* search.js - Tìm kiếm toàn bộ 305 câu hỏi, Bộ lọc nâng cao, Yêu thích, Ghi chú & Lịch sử thi (Section 11) */
window.AppSearch = (function () {
  const { escapeHtml, formatDateTime, formatTime } = window.AppUtils;

  let searchFilters = {
    query: '',
    partId: 'all',
    status: 'all', // 'all' | 'unanswered' | 'correct' | 'wrong' | 'favorite' | 'flagged' | 'has_note'
  };

  function setQueryAndOpen(qStr) {
    searchFilters.query = qStr || '';
    window.AppRouter.navigate('search');
  }

  function renderSearchView(container, params = {}) {
    if (params.presetFilter) {
      searchFilters.status = params.presetFilter;
    }
    const allQs = window.AppDataLoader.getAllQuestions();
    const parts = window.AppDataLoader.getParts();
    const st = window.AppStorage.loadState();
    const pm = st.questionProgress || {};

    const results = allQs.filter(q => {
      if (searchFilters.partId !== 'all' && q.partId !== searchFilters.partId) return false;
      const qp = pm[q.id];
      if (searchFilters.status === 'unanswered' && qp && qp.lastSelected) return false;
      if (searchFilters.status === 'correct' && (!qp || qp.isCorrect !== true)) return false;
      if (searchFilters.status === 'wrong' && (!qp || qp.isCorrect !== false)) return false;
      if (searchFilters.status === 'favorite' && (!qp || !qp.favorite)) return false;
      if (searchFilters.status === 'flagged' && (!qp || !qp.flagged)) return false;
      if (searchFilters.status === 'has_note' && (!qp || !qp.note)) return false;

      if (searchFilters.query.trim()) {
        const kw = searchFilters.query.toLowerCase();
        const inPrompt = q.prompt.toLowerCase().includes(kw);
        const inPassage = (q.passageText || '').toLowerCase().includes(kw) || (q.imageText || '').toLowerCase().includes(kw);
        const inOpts = q.options.some(o => o.text.toLowerCase().includes(kw));
        const inNote = qp && qp.note && qp.note.toLowerCase().includes(kw);
        if (!inPrompt && !inPassage && !inOpts && !inNote) return false;
      }
      return true;
    });

    container.innerHTML = `
      <div class="view-enter">
        <div class="part-header-banner">
          <div>
            <h2 style="font-size:1.35rem;font-weight:800;">🔍 Kho Câu Hỏi, Yêu Thích & Ghi Chú Cá Nhân</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">Tìm kiếm tức thì trên toàn bộ 305 câu hỏi, lọc theo câu yêu thích, câu đã đánh dấu hoặc câu có ghi chú.</p>
          </div>
          <button type="button" class="btn btn-primary" id="btn-practice-search-results" ${results.length === 0 ? 'disabled' : ''}>
            ▶ Luyện ${Math.min(results.length, 35)} câu trong kết quả lọc
          </button>
        </div>

        <div class="filter-toolbar">
          <div class="filter-pills">
            ${[
              { k: 'all', l: 'Tất cả (305)' },
              { k: 'favorite', l: '★ Yêu thích' },
              { k: 'flagged', l: '🚩 Đã đánh dấu' },
              { k: 'has_note', l: '📝 Có ghi chú' },
              { k: 'unanswered', l: 'Chưa làm' },
              { k: 'wrong', l: 'Làm sai' },
              { k: 'correct', l: 'Làm đúng' }
            ].map(f => `
              <button type="button" class="filter-pill ${searchFilters.status === f.k ? 'active' : ''}" data-sfilter="${f.k}">${f.l}</button>
            `).join('')}
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <select id="search-part-select" style="padding:0.42rem 0.75rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.83rem;">
              <option value="all">Tất cả 5 Part</option>
              ${parts.map(p => `<option value="${escapeHtml(p.partId)}" ${searchFilters.partId === p.partId ? 'selected' : ''}>${escapeHtml(p.code)}</option>`).join('')}
            </select>
            <input type="search" id="search-kw-input" value="${escapeHtml(searchFilters.query)}" placeholder="Nhập từ khóa câu hỏi, bài đọc, đáp án..." style="padding:0.42rem 0.85rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.84rem;min-width:240px;" />
          </div>
        </div>

        <div style="margin-bottom:0.75rem;font-size:0.85rem;color:var(--text-muted);">
          Tìm thấy <strong>${results.length}</strong> câu hỏi phù hợp.
        </div>

        <div style="display:flex;flex-direction:column;gap:0.75rem;">
          ${results.slice(0, 60).map(q => {
            const qp = pm[q.id] || {};
            const ansObj = window.AppDataLoader.getAnswerObj(q.id);
            return `
              <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.4rem;">
                  <div style="display:flex;gap:0.45rem;align-items:center;flex-wrap:wrap;">
                    <span class="badge badge-primary">${escapeHtml(q.partCode)}</span>
                    <span class="badge badge-neutral">${escapeHtml(q.testTitle)} · Câu ${q.number}</span>
                    ${qp.isCorrect === true ? '<span class="badge badge-success">✓ Đã làm đúng</span>' : ''}
                    ${qp.isCorrect === false ? '<span class="badge badge-danger">✕ Đã làm sai</span>' : ''}
                    ${qp.favorite ? '<span class="badge badge-warning">★ Yêu thích</span>' : ''}
                    ${qp.flagged ? '<span class="badge badge-warning">🚩 Đánh dấu</span>' : ''}
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" data-open-study="${escapeHtml(q.id)}">📖 Học chi tiết câu này</button>
                </div>
                <div style="font-weight:700;margin-bottom:0.4rem;">${escapeHtml(q.prompt)}</div>
                <div style="display:flex;flex-wrap:wrap;gap:0.65rem;font-size:0.84rem;color:var(--text-secondary);">
                  ${q.options.map(o => `<span><strong>${escapeHtml(o.key)}.</strong> ${escapeHtml(o.text)}</span>`).join(' · ')}
                </div>
                ${qp.note ? `<div class="note-box">📝 <strong>Ghi chú cá nhân:</strong> ${escapeHtml(qp.note)}</div>` : ''}
                ${ansObj ? `<div style="margin-top:0.45rem;font-size:0.8rem;color:var(--text-muted);">Đáp án đối chiếu: <strong style="color:var(--success-600);">${escapeHtml(ansObj.answer)}</strong> — ${escapeHtml(ansObj.explanation)}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('[data-sfilter]').forEach(btn => {
      btn.addEventListener('click', () => {
        searchFilters.status = btn.getAttribute('data-sfilter');
        renderSearchView(container);
      });
    });

    container.querySelector('#search-part-select').addEventListener('change', (e) => {
      searchFilters.partId = e.target.value;
      renderSearchView(container);
    });

    container.querySelector('#search-kw-input').addEventListener('input', (e) => {
      searchFilters.query = e.target.value;
      renderSearchView(container);
    });

    container.querySelector('#btn-practice-search-results').addEventListener('click', () => {
      window.AppExamEngine.startCustomSession({
        title: `Luyện theo bộ lọc (${Math.min(results.length, 35)} câu)`,
        mode: 'practice',
        questions: results.slice(0, 35),
        durationSeconds: 0
      });
    });

    container.querySelectorAll('[data-open-study]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-open-study');
        const idx = results.findIndex(x => x.id === qId);
        window.AppRouter.navigate('study-card', {
          questions: results,
          startIndex: Math.max(0, idx),
          title: 'Học câu hỏi từ kết quả tìm kiếm'
        });
      });
    });
  }

  // Lịch sử các lần thi & So sánh kết quả
  function renderHistoryView(container) {
    const history = window.AppStorage.getExamHistory();

    container.innerHTML = `
      <div class="view-enter">
        <div class="part-header-banner">
          <div>
            <h2 style="font-size:1.35rem;font-weight:800;">📊 Lịch Sử Kiểm Tra & So Sánh Kết Quả</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">Theo dõi sự tiến bộ của bạn qua tất cả các lần làm đề và kiểm tra thử.</p>
          </div>
          <button type="button" class="btn btn-primary" onclick="window.AppRouter.navigate('exam-builder')">+ Tạo bài kiểm tra mới</button>
        </div>

        <div class="card" style="margin-bottom:1.25rem;">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.85rem;">Biểu đồ đường tiến độ qua các lần thi gần nhất</h3>
          ${window.AppCharts.renderHistoryLineChart(history)}
        </div>

        ${history.length === 0 ? `
          <div class="card empty-state">
            <div style="font-size:2.2rem;">📭</div>
            <h3>Chưa có lịch sử làm bài kiểm tra</h3>
            <p>Sau khi bạn nộp bất kỳ bài luyện tập hoặc bài thi nào, kết quả chi tiết sẽ được lưu tại đây để so sánh.</p>
          </div>
        ` : `
          <div class="card" style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
              <thead>
                <tr style="border-bottom:2px solid var(--border-color);text-align:left;">
                  <th style="padding:0.75rem;">Lần</th>
                  <th style="padding:0.75rem;">Tên bài kiểm tra</th>
                  <th style="padding:0.75rem;">Thời điểm nộp</th>
                  <th style="padding:0.75rem;text-align:right;">Điểm B1 (/30)</th>
                  <th style="padding:0.75rem;text-align:right;">Thang 10</th>
                  <th style="padding:0.75rem;text-align:right;">Đúng / Tổng</th>
                  <th style="padding:0.75rem;text-align:right;">Chính xác</th>
                  <th style="padding:0.75rem;text-align:right;">Thời gian</th>
                  <th style="padding:0.75rem;text-align:right;">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                ${history.map((h, i) => {
                  const prev = history[i + 1];
                  const diff = prev ? (h.accuracy - prev.accuracy) : null;
                  const diffTag = diff !== null
                    ? `<span style="font-size:0.75rem;color:${diff >= 0 ? 'var(--success-600)' : 'var(--danger-600)'};">(${diff >= 0 ? '+' : ''}${diff}%)</span>`
                    : '';
                  return `
                    <tr style="border-bottom:1px solid var(--border-color);">
                      <td style="padding:0.75rem;font-weight:700;">#${history.length - i}</td>
                      <td style="padding:0.75rem;font-weight:600;">${escapeHtml(h.title)}</td>
                      <td style="padding:0.75rem;color:var(--text-muted);">${escapeHtml(formatDateTime(h.completedAt))}</td>
                      <td style="padding:0.75rem;text-align:right;font-weight:800;color:var(--primary-600);">${h.score30} / 30</td>
                      <td style="padding:0.75rem;text-align:right;font-weight:700;">${h.score10} / 10</td>
                      <td style="padding:0.75rem;text-align:right;">${h.correctCount}/${h.totalQuestions}</td>
                      <td style="padding:0.75rem;text-align:right;font-weight:700;">${h.accuracy}% ${diffTag}</td>
                      <td style="padding:0.75rem;text-align:right;">${formatTime(h.elapsedSeconds)}</td>
                      <td style="padding:0.75rem;text-align:right;">
                        <button type="button" class="btn btn-secondary btn-sm" data-view-hist="${escapeHtml(h.id)}">Xem chi tiết</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('[data-view-hist]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-view-hist');
        const found = history.find(x => x.id === id);
        if (found) {
          window.AppRouter.navigate('results', { result: found });
        }
      });
    });
  }

  return {
    setQueryAndOpen,
    renderSearchView,
    renderHistoryView
  };
})();
