/* practice.js - Hệ thống học theo từng Part, 5 Chế độ luyện tập & Chế độ Học từng câu */
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
    showAnswer: false
  };

  function renderPartDetailView(container, partId) {
    const part = window.AppDataLoader.getPart(partId) || window.AppDataLoader.getParts()[0];
    if (!part) return;

    const overall = window.AppStatistics.getOverallStats();
    const pStat = overall.partStats.find(p => p.partId === part.partId) || {
      done: 0, correct: 0, wrong: 0, unanswered: part.totalQuestions, accuracy: 0, progressPercent: 0
    };

    // Lọc danh sách đề
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
              📖 Chế độ Học từng câu
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
                    📖 Học từng câu
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
        window.AppRouter.navigate('study-card', { questions: qs, title: `Học từng câu: ${part.code} - ${part.title}` });
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
          window.AppRouter.navigate('study-card', { questions: qs, title: `Học từng câu: ${test.title}` });
        }
      });
    });
  }

  function startFilteredPartPractice(part, filterType) {
    const st = window.AppStorage.loadState();
    const pm = st.questionProgress || {};
    let pool = [];
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
      questions: pool,
      durationSeconds: 0,
      shuffleOptions: false
    });
  }

  // Màn hình 5 Chế độ luyện tập tổng hợp (Section 5)
  function renderPracticeModesView(container) {
    const parts = window.AppDataLoader.getParts();
    const stats = window.AppStatistics.getOverallStats();

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
              <p style="font-size:0.86rem;color:var(--text-secondary);">Làm lần lượt các câu hỏi trong một đề chuẩn theo đúng thứ tự đề cương gốc. Tự động lưu tiến độ và tiếp tục từ câu đang làm dở.</p>
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
              <p style="font-size:0.86rem;color:var(--text-secondary);">Chọn một Part (I–V), tùy chọn số lượng câu và lọc chỉ câu chưa làm hoặc câu từng làm sai.</p>
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
              <h3 style="font-size:1.08rem;font-weight:700;margin:0.45rem 0;">Luyện nhanh ngẫu nhiên (Quick Quiz)</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);">Rút ngẫu nhiên 10 hoặc 20 câu từ toàn bộ 5 Part, trộn thứ tự câu hỏi để kiểm tra phản xạ nhanh.</p>
              <div style="margin-top:0.85rem;">
                <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.35rem;">Số câu ngẫu nhiên:</label>
                <select id="mode-c-count" style="width:100%;padding:0.48rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-surface);font-size:0.84rem;">
                  <option value="10">10 câu ngẫu nhiên</option>
                  <option value="15">15 câu ngẫu nhiên</option>
                  <option value="20">20 câu ngẫu nhiên</option>
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
              <p style="font-size:0.86rem;color:var(--text-secondary);">Tập trung hiểu sâu từng câu: không đếm ngược thời gian, hiển thị ngay đáp án đối chiếu, dẫn chứng và ghi chú cá nhân.</p>
            </div>
            <button type="button" class="btn btn-secondary" id="btn-mode-d-start">📖 Mở Chế độ Học từng câu (305 câu)</button>
          </div>

          <!-- Mode E -->
          <div class="card card-hover test-card">
            <div>
              <span class="badge badge-danger">Chế độ E</span>
              <h3 style="font-size:1.08rem;font-weight:700;margin:0.45rem 0;">Chế độ Thi chuẩn B1 (35 câu / 30 điểm)</h3>
              <p style="font-size:0.86rem;color:var(--text-secondary);">Mô phỏng đề thi thật gồm đủ 5 Phần: Part 1 (5 câu), Part 2 (5 câu), Part 3 (10 câu), Part 4 (5 câu), Part 5 (10 câu). Ẩn đáp án khi làm và chấm thang 30 điểm.</p>
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
      const allQs = window.AppUtils.shuffleArray(window.AppDataLoader.getAllQuestions()).slice(0, cnt);
      window.AppExamEngine.startCustomSession({
        title: `Luyện nhanh ngẫu nhiên (${allQs.length} câu)`,
        mode: 'practice',
        questions: allQs,
        durationSeconds: 0,
        shuffleOptions: false
      });
    });

    container.querySelector('#btn-mode-d-start').addEventListener('click', () => {
      window.AppRouter.navigate('study-card', {
        questions: window.AppDataLoader.getAllQuestions(),
        title: 'Chế độ Học từng câu (Toàn bộ 305 câu)'
      });
    });

    container.querySelector('#btn-mode-e-start').addEventListener('click', () => {
      startStandardB1SimulatedExam();
    });
  }

  function startStandardB1SimulatedExam() {
    // Lấy ngẫu nhiên 1 đề từ mỗi Part: Part I (5), Part II (5), Part III (10), Part IV (5), Part V (10) = 35 câu chuẩn cấu trúc bảng đầu đề cương!
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
      questions: selectedQuestions,
      durationSeconds: (settings.defaultExamMinutes || 45) * 60,
      shuffleOptions: false
    });
  }

  // Section 10: Chế độ Học từng câu (Study Flashcard/Detail Mode)
  function renderStudyCardView(container, params = {}) {
    if (params.questions && params.questions.length > 0) {
      studyState.questions = params.questions;
      studyState.currentIndex = params.startIndex || 0;
      studyState.title = params.title || 'Chế độ Học câu hỏi';
      studyState.showAnswer = false;
    } else if (studyState.questions.length === 0) {
      studyState.questions = window.AppDataLoader.getAllQuestions();
      studyState.currentIndex = 0;
      studyState.title = 'Chế độ Học từng câu (305 câu)';
    }

    const q = studyState.questions[studyState.currentIndex];
    if (!q) return;

    const qState = window.AppStorage.getQuestionState(q.id);
    const ansObj = window.AppDataLoader.getAnswerObj(q.id);
    const st = window.AppStorage.loadState();
    const customVocabForQ = (st.customVocab || []).filter(v => v.questionId === q.id);
    const accuracyPct = qState.attempts > 0 ? Math.round((qState.correctCount / qState.attempts) * 100) : 0;

    container.innerHTML = `
      <div class="view-enter">
        <div class="workspace-top-bar">
          <div>
            <h2 style="font-size:1.15rem;font-weight:800;">📖 ${escapeHtml(studyState.title)}</h2>
            <span style="font-size:0.82rem;color:var(--text-muted);">
              Câu ${studyState.currentIndex + 1} / ${studyState.questions.length} · Đã làm: <strong>${qState.attempts} lần</strong> (Tỷ lệ đúng: <strong>${accuracyPct}%</strong>)
            </span>
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="study-prev-btn" ${studyState.currentIndex === 0 ? 'disabled' : ''}>← Câu trước</button>
            <button type="button" class="btn btn-secondary btn-sm" id="study-toggle-ans">
              ${studyState.showAnswer ? '🙈 Ẩn đáp án & giải thích' : '👁️ Xem đáp án & giải thích'}
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="study-next-btn" ${studyState.currentIndex >= studyState.questions.length - 1 ? 'disabled' : ''}>Câu tiếp theo →</button>
          </div>
        </div>

        <div class="workspace-layout">
          <div>
            ${window.AppQuestionRenderer.renderQuestionCard(q, {
              selectedKey: qState.lastSelected,
              useStoredProgress: true,
              showAnswer: studyState.showAnswer,
              isExamMode: false
            })}

            <!-- Khu vực Ghi chú cá nhân & Từ vựng của câu hỏi -->
            <div class="card" style="margin-top:1rem;">
              <h3 style="font-size:0.98rem;font-weight:700;margin-bottom:0.65rem;">📝 Ghi chú cá nhân & Từ vựng cần nhớ</h3>
              <div style="display:flex;gap:0.5rem;margin-bottom:0.85rem;">
                <input type="text" id="study-note-input" value="${escapeHtml(qState.note || '')}" placeholder="Nhập ghi chú cá nhân cho câu hỏi này..." style="flex:1;padding:0.5rem 0.85rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-elevated);font-size:0.86rem;" />
                <button type="button" class="btn btn-primary btn-sm" id="study-save-note-btn">Lưu ghi chú</button>
              </div>

              <div style="border-top:1px solid var(--border-color);padding-top:0.75rem;">
                <div style="font-size:0.84rem;font-weight:700;margin-bottom:0.45rem;">Từ vựng tự thêm cho câu này (${customVocabForQ.length}):</div>
                <div style="display:flex;gap:0.45rem;flex-wrap:wrap;margin-bottom:0.6rem;">
                  ${customVocabForQ.map(v => `
                    <span class="badge badge-primary" style="padding:0.3rem 0.65rem;">
                      <strong>${escapeHtml(v.word)}</strong>: ${escapeHtml(v.meaning)}
                      <button type="button" data-del-vocab="${escapeHtml(v.id)}" style="margin-left:0.35rem;color:inherit;font-weight:700;">✕</button>
                    </span>
                  `).join('')}
                </div>
                <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
                  <input type="text" id="vocab-word-inp" placeholder="Từ vựng (VD: fetch)" style="padding:0.4rem 0.7rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-elevated);font-size:0.82rem;" />
                  <input type="text" id="vocab-meaning-inp" placeholder="Nghĩa tiếng Việt (VD: đón về)" style="flex:1;padding:0.4rem 0.7rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-elevated);font-size:0.82rem;" />
                  <button type="button" class="btn btn-secondary btn-sm" id="study-add-vocab-btn">+ Thêm từ vựng</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cột phải: Chọn nhanh câu hỏi -->
          <div class="card nav-palette-card">
            <div style="font-weight:700;font-size:0.92rem;margin-bottom:0.4rem;">Danh sách câu đang học (${studyState.questions.length})</div>
            <div class="palette-grid" style="max-height:360px;overflow-y:auto;">
              ${studyState.questions.map((item, idx) => {
                const stItem = window.AppStorage.getQuestionState(item.id);
                let cls = '';
                if (idx === studyState.currentIndex) cls += ' current';
                if (stItem.isCorrect === true) cls += ' correct';
                else if (stItem.isCorrect === false) cls += ' wrong';
                else if (stItem.lastSelected) cls += ' answered';
                if (stItem.flagged) cls += ' flagged';
                return `<button type="button" class="palette-cell ${cls}" data-study-idx="${idx}">${idx + 1}</button>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Đồng bộ nút mở rộng / thu gọn bài đọc
    window.AppQuestionRenderer.syncPassageExpandUI(container);

    // Gắn sự kiện tương tác trong Study Mode
    container.querySelectorAll('[data-action="jump-blank-question"]').forEach(blankEl => {
      blankEl.addEventListener('click', () => {
        const targetQid = blankEl.getAttribute('data-qid');
        if (targetQid) {
          const targetIdx = studyState.questions.findIndex(item => item.id === targetQid);
          if (targetIdx !== -1 && targetIdx !== studyState.currentIndex) {
            studyState.currentIndex = targetIdx;
            studyState.showAnswer = false;
            renderStudyCardView(container);
          }
        }
      });
    });

    container.querySelectorAll('[data-action="select-option"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        const updated = window.AppStorage.recordQuestionAttempt(q.id, key, ansObj, false);
        studyState.showAnswer = true;
        window.AppUtils.playSound(updated.isCorrect ? 'correct' : 'wrong');
        renderStudyCardView(container);
        window.AppController.refreshHeaderProgress();
      });
    });

    container.querySelectorAll('[data-action="toggle-flag"]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AppStorage.toggleFlag(q.id);
        renderStudyCardView(container);
      });
    });

    container.querySelectorAll('[data-action="toggle-fav"]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AppStorage.toggleFavorite(q.id);
        renderStudyCardView(container);
      });
    });

    const prevBtn = container.querySelector('#study-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (studyState.currentIndex > 0) {
          studyState.currentIndex -= 1;
          studyState.showAnswer = false;
          renderStudyCardView(container);
        }
      });
    }

    const nextBtn = container.querySelector('#study-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (studyState.currentIndex < studyState.questions.length - 1) {
          studyState.currentIndex += 1;
          studyState.showAnswer = false;
          renderStudyCardView(container);
        }
      });
    }

    const toggleAnsBtn = container.querySelector('#study-toggle-ans');
    if (toggleAnsBtn) {
      toggleAnsBtn.addEventListener('click', () => {
        studyState.showAnswer = !studyState.showAnswer;
        renderStudyCardView(container);
      });
    }

    const saveNoteBtn = container.querySelector('#study-save-note-btn');
    if (saveNoteBtn) {
      saveNoteBtn.addEventListener('click', () => {
        const noteVal = container.querySelector('#study-note-input').value;
        window.AppStorage.saveNote(q.id, noteVal);
        window.AppUtils.showToast('Đã lưu ghi chú cá nhân cho câu hỏi!', 'success');
      });
    }

    const addVocabBtn = container.querySelector('#study-add-vocab-btn');
    if (addVocabBtn) {
      addVocabBtn.addEventListener('click', () => {
        const w = container.querySelector('#vocab-word-inp').value.trim();
        const m = container.querySelector('#vocab-meaning-inp').value.trim();
        if (!w || !m) {
          window.AppUtils.showToast('Vui lòng nhập cả từ vựng và nghĩa tiếng Việt.', 'warning');
          return;
        }
        window.AppStorage.addCustomVocab(w, m, '', q.id);
        window.AppUtils.showToast('Đã thêm vào sổ từ vựng!', 'success');
        renderStudyCardView(container);
      });
    }

    container.querySelectorAll('[data-del-vocab]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AppStorage.removeCustomVocab(btn.getAttribute('data-del-vocab'));
        renderStudyCardView(container);
      });
    });

    container.querySelectorAll('[data-study-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        studyState.currentIndex = parseInt(btn.getAttribute('data-study-idx'), 10);
        studyState.showAnswer = false;
        renderStudyCardView(container);
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
