/* practice.js - Hệ thống học theo từng Part, 5 Chế độ luyện tập & Chế độ Học câu hỏi hiển thị liên tục */
window.AppPractice = (function () {
  const { escapeHtml } = window.AppUtils;

  let currentPartFilter = {
    status: 'all', // 'all' | 'not_started' | 'in_progress' | 'completed'
    qFilter: 'all', // 'all' | 'unanswered' | 'correct' | 'wrong' | 'flagged'
    search: ''
  };

  let studyState = {
    questions: [],
    currentIndex: 0,
    showTranslation: false,
    showAnswer: true,
    revealedMap: {}
  };

  function renderPartDetailView(container, partId) {
    const part = window.AppDataLoader.getPart(partId) || window.AppDataLoader.getParts()[0];
    if (!part) return;

    const overall = window.AppStatistics.getOverallStats();
    const pStat = overall.partStats.find(p => p.partId === part.partId) || {
      done: 0, correct: 0, wrong: 0, unanswered: part.totalQuestions, accuracy: 0, progressPercent: 0
    };

    const filteredTests = part.tests.filter(t => {
      const ts = window.AppStatistics.getTestStats(t.testId);
      if (currentPartFilter.status !== 'all' && ts.status !== currentPartFilter.status) return false;
      if (currentPartFilter.search) {
        const kw = currentPartFilter.search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(kw) || (t.passageTitle || '').toLowerCase().includes(kw);
        const matchQ = t.questions.some(q => q.prompt.toLowerCase().includes(kw));
        if (!matchTitle && !matchQ) return false;
      }
      return true;
    });

    container.innerHTML = `
      <div class="view-enter">
        <div class="part-header-banner">
          <div>
            <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.35rem;">
              <span class="badge badge-primary">${escapeHtml(part.code)}</span>
              <span class="badge badge-neutral">${escapeHtml(part.examQuestionsRange)}</span>
              <span class="badge badge-neutral">${part.totalTests} Đề · ${part.totalQuestions} Câu hỏi</span>
            </div>
            <h2 style="font-size:1.35rem;font-weight:800;">${escapeHtml(part.title)}</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin-top:0.2rem;">${escapeHtml(part.description)}</p>
          </div>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary" id="btn-practice-part-all">
              🎯 Luyện toàn bộ ${escapeHtml(part.code)}
            </button>
            <button type="button" class="btn btn-secondary" id="btn-study-part-cards">
              📖 Chế độ Học chi tiết
            </button>
            ${pStat.wrong > 0 ? `
              <button type="button" class="btn btn-danger" id="btn-practice-part-wrong">
                🔥 Luyện ${pStat.wrong} câu sai của ${escapeHtml(part.code)}
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Thanh tiến độ Part -->
        <div class="card" style="margin-bottom:1.25rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;font-size:0.86rem;">
            <span><strong>Tiến độ hoàn thành ${escapeHtml(part.code)}:</strong> ${pStat.done}/${part.totalQuestions} câu (${pStat.progressPercent}%)</span>
            <span>
              <strong style="color:var(--success-600);">Đúng: ${pStat.correct}</strong> ·
              <strong style="color:var(--danger-600);">Sai: ${pStat.wrong}</strong> ·
              <span>Chưa làm: ${pStat.unanswered}</span> ·
              <strong>Độ chính xác: ${pStat.accuracy}%</strong>
            </span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width:${pStat.progressPercent}%;"></div>
          </div>
        </div>

        <!-- Bộ lọc đề và câu hỏi -->
        <div class="filter-toolbar">
          <div class="filter-pills">
            <button type="button" class="filter-pill ${currentPartFilter.status === 'all' ? 'active' : ''}" data-status="all">Tất cả đề (${part.tests.length})</button>
            <button type="button" class="filter-pill ${currentPartFilter.status === 'not_started' ? 'active' : ''}" data-status="not_started">Chưa học</button>
            <button type="button" class="filter-pill ${currentPartFilter.status === 'in_progress' ? 'active' : ''}" data-status="in_progress">Đang học dở</button>
            <button type="button" class="filter-pill ${currentPartFilter.status === 'completed' ? 'active' : ''}" data-status="completed">Đã hoàn thành</button>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <select id="part-qfilter-select" style="padding:0.42rem 0.75rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.82rem;">
              <option value="all" ${currentPartFilter.qFilter === 'all' ? 'selected' : ''}>Lọc nhanh câu hỏi theo trạng thái...</option>
              <option value="unanswered" ${currentPartFilter.qFilter === 'unanswered' ? 'selected' : ''}>Chỉ luyện câu chưa làm (${pStat.unanswered})</option>
              <option value="wrong" ${currentPartFilter.qFilter === 'wrong' ? 'selected' : ''}>Chỉ luyện câu làm sai (${pStat.wrong})</option>
              <option value="correct" ${currentPartFilter.qFilter === 'correct' ? 'selected' : ''}>Xem lại câu đã làm đúng (${pStat.correct})</option>
              <option value="flagged" ${currentPartFilter.qFilter === 'flagged' ? 'selected' : ''}>Câu đã đánh dấu 🚩</option>
            </select>
            <input type="search" id="part-search-input" value="${escapeHtml(currentPartFilter.search)}" placeholder="Tìm đề hoặc nội dung câu hỏi..." style="padding:0.42rem 0.85rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.83rem;min-width:210px;" />
          </div>
        </div>

        <!-- Danh sách Đề / Test -->
        <div class="tests-grid">
          ${filteredTests.map(test => {
            const ts = window.AppStatistics.getTestStats(test.testId);
            const statusBadge = ts.status === 'completed'
              ? '<span class="badge badge-success">✓ Đã hoàn thành</span>'
              : (ts.status === 'in_progress' ? '<span class="badge badge-warning">⏳ Đang học dở</span>' : '<span class="badge badge-neutral">Chưa học</span>');

            return `
              <div class="card card-hover test-card">
                <div>
                  <div class="test-card-header">
                    <div class="test-card-title">${escapeHtml(test.title)}</div>
                    ${statusBadge}
                  </div>
                  ${test.passageTitle ? `<div style="font-size:0.82rem;color:var(--primary-600);font-weight:600;margin-top:0.25rem;">📄 ${escapeHtml(test.passageTitle)}</div>` : ''}
                  <div class="test-card-meta">
                    <span>Số câu: <strong>${ts.total}</strong></span>
                    <span>Đã làm: <strong>${ts.done}/${ts.total}</strong></span>
                    <span style="color:var(--success-600);">Đúng: <strong>${ts.correct}</strong></span>
                    <span style="color:var(--danger-600);">Sai: <strong>${ts.wrong}</strong></span>
                  </div>
                  <div class="progress-bar-track" style="margin-top:0.65rem;height:6px;">
                    <div class="progress-bar-fill" style="width:${ts.percent}%;"></div>
                  </div>
                </div>
                <div class="test-card-actions">
                  <button type="button" class="btn btn-primary btn-sm" data-action="start-test-practice" data-testid="${escapeHtml(test.testId)}">
                    ${ts.done > 0 && ts.done < ts.total ? '▶ Tiếp tục làm' : '✏ Luyện đề này'}
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" data-action="start-test-exam" data-testid="${escapeHtml(test.testId)}">
                    ⏱ Thi thử đề này
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" data-action="study-test" data-testid="${escapeHtml(test.testId)}">
                    📖 Học & Ghi chú
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Gắn sự kiện
    container.querySelectorAll('.filter-pill[data-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPartFilter.status = btn.getAttribute('data-status');
        renderPartDetailView(container, part.partId);
      });
    });

    const searchInp = container.querySelector('#part-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        currentPartFilter.search = e.target.value;
        renderPartDetailView(container, part.partId);
      });
    }

    const qFilterSel = container.querySelector('#part-qfilter-select');
    if (qFilterSel) {
      qFilterSel.addEventListener('change', (e) => {
        const val = e.target.value;
        currentPartFilter.qFilter = val;
        if (val !== 'all') {
          startFilteredPartPractice(part, val);
        }
      });
    }

    const btnAll = container.querySelector('#btn-practice-part-all');
    if (btnAll) {
      btnAll.addEventListener('click', () => startFilteredPartPractice(part, 'all'));
    }

    const btnStudy = container.querySelector('#btn-study-part-cards');
    if (btnStudy) {
      btnStudy.addEventListener('click', () => {
        const qs = [];
        part.tests.forEach(t => qs.push(...t.questions.map(q => window.AppDataLoader.getQuestion(q.id))));
        window.AppRouter.navigate('study-card', { questions: qs, title: `Học chi tiết: ${part.code} - ${part.title}` });
      });
    }

    const btnWrong = container.querySelector('#btn-practice-part-wrong');
    if (btnWrong) {
      btnWrong.addEventListener('click', () => startFilteredPartPractice(part, 'wrong'));
    }

    container.querySelectorAll('[data-action="start-test-practice"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tId = btn.getAttribute('data-testid');
        window.AppExamEngine.startTestSession(tId, 'practice');
      });
    });

    container.querySelectorAll('[data-action="start-test-exam"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tId = btn.getAttribute('data-testid');
        window.AppExamEngine.startTestSession(tId, 'exam');
      });
    });

    container.querySelectorAll('[data-action="study-test"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tId = btn.getAttribute('data-testid');
        const test = window.AppDataLoader.getTest(tId);
        if (test) {
          const qs = test.questions.map(q => window.AppDataLoader.getQuestion(q.id));
          window.AppRouter.navigate('study-card', { questions: qs, title: `Học chi tiết: ${test.title}` });
        }
      });
    });
  }

  function startFilteredPartPractice(part, filterType) {
    const st = window.AppStorage.loadState();
    const pm = st.questionProgress || {};
    const pool = [];
    part.tests.forEach(t => {
      t.questions.forEach(q => {
        const fullQ = window.AppDataLoader.getQuestion(q.id);
        const qp = pm[q.id];
        if (filterType === 'all') pool.push(fullQ);
        else if (filterType === 'unanswered' && (!qp || !qp.lastSelected)) pool.push(fullQ);
        else if (filterType === 'wrong' && qp && qp.isCorrect === false) pool.push(fullQ);
        else if (filterType === 'correct' && qp && qp.isCorrect === true) pool.push(fullQ);
        else if (filterType === 'flagged' && qp && qp.flagged) pool.push(fullQ);
      });
    });

    if (pool.length === 0) {
      window.AppUtils.showToast('Không có câu hỏi nào khớp với bộ lọc đã chọn.', 'warning');
      return;
    }

    window.AppExamEngine.startCustomSession({
      title: `Luyện ${part.code} (${pool.length} câu)`,
      mode: 'practice',
      questions: window.AppDataLoader.sortQuestionsCanonically(pool),
      durationSeconds: 0,
      shuffleOptions: false
    });
  }

  // Màn hình 5 Chế độ luyện tập tổng hợp (Section 5)
  function renderPracticeModesView(container) {
    const parts = window.AppDataLoader.getParts();

    container.innerHTML = `
      <div class="view-enter">
        <div class="part-header-banner">
          <div>
            <h2 style="font-size:1.35rem;font-weight:800;">🎯 5 Chế Độ Luyện Tập Chuyên Sâu</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">Chọn phương pháp luyện tập phù hợp với mục tiêu ôn thi B1 Reading của bạn.</p>
          </div>
          <button type="button" class="btn btn-primary" onclick="window.AppRouter.navigate('exam-builder')">
            ⚙️ Mở trình Tạo bài kiểm tra tùy biến
          </button>
        </div>

        <div class="tests-grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr));">
          <!-- Mode A -->
          <div class="card card-hover test-card">
            <div>
              <span class="badge badge-primary">Chế độ A</span>
              <h3 style="font-size:1.08rem;font-weight:700;margin:0.45rem 0;">Luyện theo từng Đề / Test</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);">Làm toàn bộ các câu hỏi trong một đề chuẩn hiển thị liên tục trên 1 trang theo đúng thứ tự đề cương gốc.</p>
              <div style="margin-top:0.85rem;">
                <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.35rem;">Chọn nhanh Đề muốn luyện:</label>
                <select id="mode-a-test-select" style="width:100%;padding:0.5rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.84rem;">
                  ${parts.map(p => `
                    <optgroup label="${escapeHtml(p.code)} - ${escapeHtml(p.title)}">
                      ${p.tests.map(t => `<option value="${escapeHtml(t.testId)}">${escapeHtml(t.title)} (${t.questions.length} câu)</option>`).join('')}
                    </optgroup>
                  `).join('')}
                </select>
              </div>
            </div>
            <button type="button" class="btn btn-primary" id="btn-mode-a-start">▶ Bắt đầu Luyện theo Đề</button>
          </div>

          <!-- Mode B -->
          <div class="card card-hover test-card">
            <div>
              <span class="badge badge-primary">Chế độ B</span>
              <h3 style="font-size:1.08rem;font-weight:700;margin:0.45rem 0;">Luyện chuyên sâu theo Part</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);">Chọn một Part (I–V) và lọc chỉ câu chưa làm hoặc câu từng làm sai, giữ nguyên cấu trúc đoạn văn và thứ tự câu gốc.</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.85rem;">
                <select id="mode-b-part" style="padding:0.48rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.83rem;">
                  ${parts.map(p => `<option value="${escapeHtml(p.partId)}">${escapeHtml(p.code)} (${p.totalQuestions} câu)</option>`).join('')}
                </select>
                <select id="mode-b-filter" style="padding:0.48rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.83rem;">
                  <option value="all">Tất cả câu</option>
                  <option value="unanswered">Chỉ câu chưa làm</option>
                  <option value="wrong">Chỉ câu làm sai</option>
                </select>
              </div>
            </div>
            <button type="button" class="btn btn-primary" id="btn-mode-b-start">▶ Bắt đầu Luyện theo Part</button>
          </div>

          <!-- Mode C -->
          <div class="card card-hover test-card">
            <div>
              <span class="badge badge-warning">Chế độ C</span>
              <h3 style="font-size:1.08rem;font-weight:700;margin:0.45rem 0;">Luyện nhanh theo cụm đề (Quick Quiz)</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);">Rút ngẫu nhiên các đề từ kho 5 Part theo số lượng câu mong muốn, giữ đúng cấu trúc Part và đoạn văn đi liền câu hỏi.</p>
              <div style="margin-top:0.85rem;">
                <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.35rem;">Số câu luyện nhanh:</label>
                <select id="mode-c-count" style="width:100%;padding:0.48rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.84rem;">
                  <option value="10">10 câu</option>
                  <option value="15">15 câu</option>
                  <option value="20">20 câu</option>
                  <option value="35">35 câu (Cấu trúc 1 đề chuẩn)</option>
                </select>
              </div>
            </div>
            <button type="button" class="btn btn-primary" id="btn-mode-c-start">⚡ Bắt đầu Luyện nhanh</button>
          </div>

          <!-- Mode D -->
          <div class="card card-hover test-card">
            <div>
              <span class="badge badge-success">Chế độ D</span>
              <h3 style="font-size:1.08rem;font-weight:700;margin:0.45rem 0;">Học & Xem giải thích ngay (Không giới hạn giờ)</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);">Hiển thị liên tục các bài đọc, câu hỏi, đáp án đối chiếu, dẫn chứng và sổ ghi chú từ vựng cá nhân.</p>
            </div>
            <button type="button" class="btn btn-secondary" id="btn-mode-d-start">📖 Mở Chế độ Học chi tiết</button>
          </div>

          <!-- Mode E -->
          <div class="card card-hover test-card">
            <div>
              <span class="badge badge-danger">Chế độ E</span>
              <h3 style="font-size:1.08rem;font-weight:700;margin:0.45rem 0;">Chế độ Thi chuẩn B1 (35 câu / 30 điểm)</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);">Mô phỏng đề thi thật gồm đủ 5 Phần theo đúng thứ tự: Part I (5 câu), Part II (5 câu), Part III (10 câu), Part IV (5 câu), Part V (10 câu).</p>
            </div>
            <button type="button" class="btn btn-primary" id="btn-mode-e-start">🏆 Thi thử Đề tổng hợp 35 câu (45 phút)</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-mode-a-start').addEventListener('click', () => {
      const tId = container.querySelector('#mode-a-test-select').value;
      window.AppExamEngine.startTestSession(tId, 'practice');
    });

    container.querySelector('#btn-mode-b-start').addEventListener('click', () => {
      const pId = container.querySelector('#mode-b-part').value;
      const fType = container.querySelector('#mode-b-filter').value;
      const part = window.AppDataLoader.getPart(pId);
      if (part) startFilteredPartPractice(part, fType);
    });

    container.querySelector('#btn-mode-c-start').addEventListener('click', () => {
      const cnt = parseInt(container.querySelector('#mode-c-count').value, 10) || 10;
      const allQs = window.AppDataLoader.selectStructuredQuestions(
        window.AppDataLoader.getAllQuestions(),
        cnt,
        { random: true }
      );
      window.AppExamEngine.startCustomSession({
        title: `Luyện nhanh (${allQs.length} câu)`,
        mode: 'practice',
        questions: allQs,
        durationSeconds: 0,
        shuffleOptions: false
      });
    });

    container.querySelector('#btn-mode-d-start').addEventListener('click', () => {
      const firstPart = window.AppDataLoader.getParts()[0];
      const qs = [];
      if (firstPart) {
        firstPart.tests.forEach(t => qs.push(...t.questions.map(q => window.AppDataLoader.getQuestion(q.id))));
      }
      window.AppRouter.navigate('study-card', {
        questions: qs.length > 0 ? qs : window.AppDataLoader.getAllQuestions(),
        title: firstPart ? `Chế độ Học chi tiết: ${firstPart.code} (${qs.length} câu)` : 'Chế độ Học chi tiết'
      });
    });

    container.querySelector('#btn-mode-e-start').addEventListener('click', () => {
      startStandardB1SimulatedExam();
    });
  }

  function startStandardB1SimulatedExam() {
    // Lấy 1 đề từ mỗi Part theo đúng thứ tự: Part I (5), Part II (5), Part III (10), Part IV (5), Part V (10) = 35 câu chuẩn B1
    const parts = window.AppDataLoader.getParts();
    const selectedQuestions = [];
    parts.forEach(part => {
      const randomTest = part.tests[Math.floor(Math.random() * part.tests.length)];
      if (randomTest) {
        randomTest.questions.forEach(q => {
          selectedQuestions.push(window.AppDataLoader.getQuestion(q.id));
        });
      }
    });
    const settings = window.AppStorage.getSettings();
    window.AppExamEngine.startCustomSession({
      title: 'Đề thi thử B1 Reading chuẩn cấu trúc (35 câu - 30 điểm)',
      mode: 'exam',
      questions: window.AppDataLoader.sortQuestionsCanonically(selectedQuestions),
      durationSeconds: (settings.defaultExamMinutes || 45) * 60,
      shuffleOptions: false
    });
  }

  // Section 10: Chế độ Học câu hỏi (Hiển thị liên tục toàn bộ đề/Part đang chọn + Ghi chú & Từ vựng + Bảng điều hướng cuộn mượt)
  function renderStudyCardView(container, params = {}) {
    const parts = window.AppDataLoader.getParts();
    if (params.questions && params.questions.length > 0) {
      studyState.questions = window.AppDataLoader.sortQuestionsCanonically(params.questions);
      studyState.currentIndex = Math.min(Math.max(0, params.startIndex || 0), studyState.questions.length - 1);
      studyState.title = params.title || 'Chế độ Học chi tiết';
    } else if (!studyState.questions || studyState.questions.length === 0) {
      const firstPart = parts[0];
      const defaultQs = [];
      if (firstPart) {
        firstPart.tests.forEach(t => defaultQs.push(...t.questions.map(q => window.AppDataLoader.getQuestion(q.id))));
      }
      studyState.questions = window.AppDataLoader.sortQuestionsCanonically(defaultQs);
      studyState.currentIndex = 0;
      studyState.title = firstPart ? `Học chi tiết: ${firstPart.code} - ${firstPart.title}` : 'Chế độ Học chi tiết';
    }

    const total = studyState.questions.length;
    if (total === 0) return;

    const grouped = window.AppDataLoader.groupQuestionsByPartAndTest(studyState.questions);
    const seqIndexMap = {};
    studyState.questions.forEach((q, idx) => {
      seqIndexMap[q.id] = idx;
    });

    const st = window.AppStorage.loadState();
    const currentQ = studyState.questions[studyState.currentIndex] || studyState.questions[0];

    container.innerHTML = `
      <div class="view-enter">
        <div class="workspace-top-bar">
          <div>
            <h2 style="font-size:1.15rem;font-weight:800;">📖 ${escapeHtml(studyState.title)}</h2>
            <span style="font-size:0.82rem;color:var(--text-muted);">
              Hiển thị liên tục <strong>${total} câu hỏi</strong> · Chọn nhanh Part bên phải hoặc bấm số câu trong Bảng điều hướng để cuộn đến câu cần học
            </span>
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
            <select id="study-part-switcher" style="padding:0.42rem 0.75rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.83rem;font-weight:600;">
              <option value="">-- Đổi nhanh Part đang học --</option>
              ${parts.map(p => `<option value="${escapeHtml(p.partId)}">${escapeHtml(p.code)} (${p.totalQuestions} câu)</option>`).join('')}
              <option value="ALL">Toàn bộ 5 Part (305 câu)</option>
            </select>
            <button type="button" class="btn btn-secondary btn-sm" id="study-prev-btn">↑ Câu trước</button>
            <button type="button" class="btn btn-secondary btn-sm" id="study-toggle-ans">
              ${studyState.showAnswer ? '🙈 Ẩn tất cả giải thích' : '👁️ Hiện tất cả đáp án & giải thích'}
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="study-next-btn">↓ Câu tiếp</button>
          </div>
        </div>

        <div class="workspace-layout">
          <div id="study-continuous-slot">
            ${grouped.partGroups.map(pGroup => `
              <section class="workspace-part-section" data-part-id="${escapeHtml(pGroup.partId)}">
                <div class="workspace-part-banner">
                  <div>
                    <span class="badge badge-primary">${escapeHtml(pGroup.partCode)}</span>
                    <strong style="margin-left:0.5rem;font-size:1.02rem;">${escapeHtml(pGroup.partTitle)}</strong>
                  </div>
                </div>

                ${pGroup.testGroups.map(tGroup => {
                  const hasSharedPassage = tGroup.partId !== 'PART_I' && (Boolean(tGroup.passageText) || Array.isArray(tGroup.passageItems));
                  return `
                    <div class="workspace-test-group" id="study-test-group-${escapeHtml(tGroup.testId)}">
                      <div class="workspace-test-group-header">
                        <div>
                          <h4 style="font-size:1rem;font-weight:800;">${escapeHtml(tGroup.testTitle)}</h4>
                          ${tGroup.instructions ? `<p style="font-size:0.85rem;color:var(--text-secondary);font-style:italic;margin-top:0.2rem;">${escapeHtml(tGroup.instructions)}</p>` : ''}
                        </div>
                      </div>

                      ${hasSharedPassage ? `
                        <div id="study-passage-slot-${escapeHtml(tGroup.testId)}">
                          ${window.AppQuestionRenderer.renderPassageOrContext(tGroup, {
                            useStoredProgress: true,
                            showAnswer: studyState.showAnswer,
                            isExamMode: false,
                            activeQuestionId: currentQ ? currentQ.id : null,
                            seqIndexMap: seqIndexMap
                          })}
                        </div>
                      ` : ''}

                      <div class="workspace-questions-stack">
                        ${tGroup.items.map(item => {
                          const q = item.q;
                          const qState = window.AppStorage.getQuestionState(q.id);
                          const customVocabForQ = (st.customVocab || []).filter(v => v.questionId === q.id);
                          const showThisAns = Boolean(studyState.showAnswer || studyState.revealedMap[q.id] || qState.lastSelected);

                          return `
                            <div class="study-question-wrapper" data-study-seq="${item.seqIndex}">
                              ${window.AppQuestionRenderer.renderQuestionCard(q, {
                                seqIndex: item.seqIndex,
                                seqNumber: item.seqNumber,
                                isCurrent: item.seqIndex === studyState.currentIndex,
                                omitSharedPassage: hasSharedPassage,
                                selectedKey: qState.lastSelected,
                                useStoredProgress: true,
                                showAnswer: showThisAns,
                                isExamMode: false
                              })}

                              <div class="card" style="margin-top:0.45rem;padding:0.85rem 1rem;background:var(--bg-elevated);">
                                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
                                  <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);">📝 Ghi chú Câu ${item.seqNumber}:</span>
                                  <input type="text" class="study-note-inp" data-note-qid="${escapeHtml(q.id)}" value="${escapeHtml(qState.note || '')}" placeholder="Nhập ghi chú hoặc từ vựng cần nhớ cho câu này..." style="flex:1;min-width:180px;padding:0.38rem 0.7rem;border-radius:6px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.82rem;" />
                                  <button type="button" class="btn btn-secondary btn-sm" data-save-note-qid="${escapeHtml(q.id)}">Lưu ghi chú</button>
                                </div>
                                ${customVocabForQ.length > 0 ? `
                                  <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem;">
                                    ${customVocabForQ.map(v => `
                                      <span class="badge badge-primary">
                                        <strong>${escapeHtml(v.word)}</strong>: ${escapeHtml(v.meaning)}
                                      </span>
                                    `).join('')}
                                  </div>
                                ` : ''}
                              </div>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </section>
            `).join('')}
          </div>

          <!-- Cột phải: Bảng điều hướng câu hỏi cố định & Thêm nhanh ghi chú/từ vựng -->
          <div class="card nav-palette-card">
            <div style="font-weight:700;font-size:0.92rem;margin-bottom:0.4rem;">Bảng điều hướng câu hỏi (${total})</div>
            <div class="palette-grid" id="study-palette-grid">
              ${studyState.questions.map((item, idx) => {
                const stItem = window.AppStorage.getQuestionState(item.id);
                let cls = '';
                if (idx === studyState.currentIndex) cls += ' current';
                if (stItem.isCorrect === true) cls += ' correct';
                else if (stItem.isCorrect === false) cls += ' wrong';
                else if (stItem.lastSelected) cls += ' answered';
                if (stItem.flagged) cls += ' flagged';
                return `<button type="button" class="palette-cell ${cls}" data-study-idx="${idx}" title="Cuộn đến Câu ${idx + 1}">${idx + 1}</button>`;
              }).join('')}
            </div>
            <div style="border-top:1px solid var(--border-color);padding-top:0.75rem;margin-top:0.5rem;">
              <div style="font-size:0.8rem;font-weight:700;margin-bottom:0.4rem;">📝 Ghi chú & Từ vựng (Câu ${studyState.currentIndex + 1}):</div>
              <div style="display:flex;gap:0.35rem;margin-bottom:0.5rem;">
                <input type="text" id="study-note-input" value="${escapeHtml(window.AppStorage.getQuestionState(currentQ.id).note || '')}" placeholder="Ghi chú nhanh..." style="flex:1;padding:0.35rem 0.55rem;border-radius:6px;border:1px solid var(--border-strong);background:var(--bg-elevated);font-size:0.78rem;" />
                <button type="button" class="btn btn-primary btn-sm" id="study-save-note-btn">Lưu</button>
              </div>
              <div style="display:flex;flex-direction:column;gap:0.35rem;">
                <input type="text" id="vocab-word-inp" placeholder="Từ vựng (VD: fetch)" style="padding:0.35rem 0.55rem;border-radius:6px;border:1px solid var(--border-strong);background:var(--bg-elevated);font-size:0.78rem;" />
                <input type="text" id="vocab-meaning-inp" placeholder="Nghĩa tiếng Việt (VD: đón về)" style="padding:0.35rem 0.55rem;border-radius:6px;border:1px solid var(--border-strong);background:var(--bg-elevated);font-size:0.78rem;" />
                <button type="button" class="btn btn-secondary btn-sm" id="study-add-vocab-btn">+ Thêm từ vựng</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Gắn sự kiện trong Study Mode liên tục
    const partSwitcher = container.querySelector('#study-part-switcher');
    if (partSwitcher) {
      partSwitcher.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        if (val === 'ALL') {
          renderStudyCardView(container, {
            questions: window.AppDataLoader.getAllQuestions(),
            startIndex: 0,
            title: 'Chế độ Học chi tiết: Toàn bộ 5 Part (305 câu)'
          });
        } else {
          const p = window.AppDataLoader.getPart(val);
          if (p) {
            const qs = [];
            p.tests.forEach(t => qs.push(...t.questions.map(q => window.AppDataLoader.getQuestion(q.id))));
            renderStudyCardView(container, {
              questions: qs,
              startIndex: 0,
              title: `Học chi tiết: ${p.code} - ${p.title}`
            });
          }
        }
      });
    }

    const toggleAllBtn = container.querySelector('#study-toggle-ans');
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => {
        studyState.showAnswer = !studyState.showAnswer;
        renderStudyCardView(container);
      });
    }

    function scrollStudyToIdx(targetIdx, scrollToBlankOnly = false) {
      if (targetIdx < 0 || targetIdx >= studyState.questions.length) return;
      studyState.currentIndex = targetIdx;
      const targetQ = studyState.questions[targetIdx];
      container.querySelectorAll('.question-card-item').forEach(c => {
        c.classList.toggle('is-active-question', parseInt(c.getAttribute('data-seq-idx'), 10) === targetIdx);
      });
      container.querySelectorAll('#study-palette-grid .palette-cell').forEach(b => {
        b.classList.toggle('current', parseInt(b.getAttribute('data-study-idx'), 10) === targetIdx);
      });
      if (targetQ) {
        container.querySelectorAll('.cloze-blank').forEach(b => {
          b.classList.toggle('is-current', b.getAttribute('data-qid') === targetQ.id);
        });
      }

      const cardEl = container.querySelector(`.question-card-item[data-seq-idx="${targetIdx}"]`) || container.querySelector(`#question-card-${targetQ ? targetQ.id : ""}`);
      const blankEl = targetQ ? container.querySelector(`#cloze-blank-${targetQ.id}`) : null;
      const el = (scrollToBlankOnly && blankEl) ? blankEl : (cardEl || blankEl);
      if (el) {
        const headerEl = document.querySelector('.top-header');
        const headerH = headerEl ? headerEl.getBoundingClientRect().height : 64;
        const offset = headerH + 24;
        el.style.scrollMarginTop = offset + 'px';
        const curScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const targetTop = Math.min(maxScroll, Math.max(0, curScroll + el.getBoundingClientRect().top - offset));
        window.scrollTo(0, Math.round(targetTop));
        el.classList.remove('question-highlight-flash');
        void el.offsetWidth;
        el.classList.add('question-highlight-flash');
      }
    }

    const slot = container.querySelector('#study-continuous-slot');
    if (slot) {
      slot.addEventListener('click', (e) => {
        const blankEl = e.target.closest('[data-action="jump-blank-question"]');
        if (blankEl) {
          const qId = blankEl.getAttribute('data-qid');
          const tIdx = studyState.questions.findIndex(item => item.id === qId);
          if (tIdx !== -1) scrollStudyToIdx(tIdx, false);
          return;
        }

        const scrollBlankBtn = e.target.closest('[data-action="scroll-to-blank"]');
        if (scrollBlankBtn) {
          const qId = scrollBlankBtn.getAttribute('data-qid');
          const tIdx = studyState.questions.findIndex(item => item.id === qId);
          if (tIdx !== -1) scrollStudyToIdx(tIdx, true);
          return;
        }

        const optBtn = e.target.closest('[data-action="select-option"]');
        if (optBtn) {
          const qId = optBtn.getAttribute('data-qid');
          const key = optBtn.getAttribute('data-key');
          const tIdx = studyState.questions.findIndex(item => item.id === qId);
          if (tIdx !== -1) {
            studyState.currentIndex = tIdx;
            studyState.revealedMap[qId] = true;
            const ansObj = window.AppDataLoader.getAnswerObj(qId);
            const updated = window.AppStorage.recordQuestionAttempt(qId, key, ansObj, false);
            window.AppUtils.playSound(updated.isCorrect ? 'correct' : 'wrong');
            const scrollY = window.pageYOffset || 0;
            renderStudyCardView(container);
            window.scrollTo(0, scrollY);
            window.AppController.refreshHeaderProgress();
          }
          return;
        }

        const expBtn = e.target.closest('[data-action="toggle-explain"]');
        if (expBtn) {
          const qId = expBtn.getAttribute('data-qid');
          studyState.revealedMap[qId] = !studyState.revealedMap[qId];
          const scrollY = window.pageYOffset || 0;
          renderStudyCardView(container);
          window.scrollTo(0, scrollY);
          return;
        }

        const flagBtn = e.target.closest('[data-action="toggle-flag"]');
        if (flagBtn) {
          const qId = flagBtn.getAttribute('data-qid');
          const flagged = window.AppStorage.toggleFlag(qId);
          flagBtn.className = `btn btn-sm ${flagged ? 'btn-primary' : 'btn-secondary'}`;
          flagBtn.innerHTML = `🚩 ${flagged ? 'Đã đánh dấu' : 'Đánh dấu'}`;
          window.AppController.refreshHeaderProgress();
          return;
        }

        const favBtn = e.target.closest('[data-action="toggle-fav"]');
        if (favBtn) {
          const qId = favBtn.getAttribute('data-qid');
          const fav = window.AppStorage.toggleFavorite(qId);
          favBtn.className = `btn btn-sm ${fav ? 'btn-primary' : 'btn-secondary'}`;
          favBtn.innerHTML = `${fav ? '★ Yêu thích' : '☆ Yêu thích'}`;
          window.AppController.refreshHeaderProgress();
          return;
        }

        const saveNoteBtn = e.target.closest('[data-save-note-qid]');
        if (saveNoteBtn) {
          const qId = saveNoteBtn.getAttribute('data-save-note-qid');
          const inp = slot.querySelector(`.study-note-inp[data-note-qid="${qId}"]`);
          if (inp) {
            window.AppStorage.saveNote(qId, inp.value);
            window.AppUtils.showToast('Đã lưu ghi chú cho câu hỏi!', 'success');
          }
        }
      });
    }

    const sPrev = container.querySelector('#study-prev-btn');
    if (sPrev) {
      sPrev.addEventListener('click', () => {
        if (studyState.currentIndex > 0) scrollStudyToIdx(studyState.currentIndex - 1, false);
      });
    }
    const sNext = container.querySelector('#study-next-btn');
    if (sNext) {
      sNext.addEventListener('click', () => {
        if (studyState.currentIndex < studyState.questions.length - 1) scrollStudyToIdx(studyState.currentIndex + 1, false);
      });
    }
    const sSaveNote = container.querySelector('#study-save-note-btn');
    if (sSaveNote) {
      sSaveNote.addEventListener('click', () => {
        const activeQ = studyState.questions[studyState.currentIndex] || currentQ;
        const val = container.querySelector('#study-note-input').value;
        if (activeQ) {
          window.AppStorage.saveNote(activeQ.id, val);
          window.AppUtils.showToast('Đã lưu ghi chú cá nhân!', 'success');
        }
      });
    }
    const sAddVocab = container.querySelector('#study-add-vocab-btn');
    if (sAddVocab) {
      sAddVocab.addEventListener('click', () => {
        const activeQ = studyState.questions[studyState.currentIndex] || currentQ;
        const w = container.querySelector('#vocab-word-inp').value.trim();
        const m = container.querySelector('#vocab-meaning-inp').value.trim();
        if (!w || !m) {
          window.AppUtils.showToast('Vui lòng nhập từ vựng và nghĩa tiếng Việt.', 'warning');
          return;
        }
        window.AppStorage.addCustomVocab(w, m, '', activeQ ? activeQ.id : null);
        window.AppUtils.showToast('Đã thêm vào sổ từ vựng!', 'success');
        const sy = window.pageYOffset || 0;
        renderStudyCardView(container);
        window.scrollTo(0, sy);
      });
    }

    container.querySelectorAll('[data-study-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tIdx = parseInt(btn.getAttribute('data-study-idx'), 10);
        if (!isNaN(tIdx)) {
          scrollStudyToIdx(tIdx, false);
        }
      });
    });
  }

  return {
    renderPartDetailView,
    renderPracticeModesView,
    renderStudyCardView,
    startStandardB1SimulatedExam
  };
})();
