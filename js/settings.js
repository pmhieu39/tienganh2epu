/* settings.js - Cài đặt, Sao lưu/Khôi phục, Hướng dẫn sử dụng & Báo cáo đối chiếu file Word gốc */
window.AppSettings = (function () {
  const { escapeHtml } = window.AppUtils;

  function renderSettingsView(container) {
    const settings = window.AppStorage.getSettings();
    const st = window.AppStorage.loadState();

    container.innerHTML = `
      <div class="view-enter">
        <div class="part-header-banner">
          <div>
            <h2 style="font-size:1.35rem;font-weight:800;">⚙️ Cài Đặt Hệ Thống & Sao Lưu Dữ Liệu</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">
              Dữ liệu học tập được lưu cục bộ trên trình duyệt của bạn (LocalStorage & IndexedDB). Hãy sử dụng tính năng Xuất/Nhập JSON để sao lưu hoặc chuyển sang máy tính khác.
            </p>
          </div>
        </div>

        <div class="dashboard-two-col">
          <!-- Cột 1: Tùy chỉnh giao diện & Học tập -->
          <div class="card">
            <h3 style="font-size:1.05rem;font-weight:800;margin-bottom:1rem;">🎨 Giao diện & Trải nghiệm học tập</h3>

            <div style="display:flex;flex-direction:column;gap:1rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-weight:700;">Chế độ giao diện (Light / Dark Mode)</div>
                  <div style="font-size:0.8rem;color:var(--text-muted);">Chuyển đổi nền sáng hoặc nền tối bảo vệ mắt</div>
                </div>
                <button type="button" class="btn btn-secondary" id="set-toggle-theme">
                  ${settings.theme === 'dark' ? '🌙 Đang bật Dark Mode' : '☀️ Đang bật Light Mode'}
                </button>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-weight:700;">Hiệu ứng âm thanh khi trả lời</div>
                  <div style="font-size:0.8rem;color:var(--text-muted);">Âm báo nhẹ khi chọn đáp án đúng/sai và hoàn thành bài</div>
                </div>
                <button type="button" class="btn ${settings.sound ? 'btn-primary' : 'btn-secondary'}" id="set-toggle-sound">
                  ${settings.sound ? '🔊 Đang bật' : '🔇 Đang tắt'}
                </button>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-weight:700;">Hiệu ứng chuyển động (Animations)</div>
                  <div style="font-size:0.8rem;color:var(--text-muted);">Tắt hiệu ứng nếu muốn chuyển trang tức thì</div>
                </div>
                <button type="button" class="btn ${settings.animations ? 'btn-primary' : 'btn-secondary'}" id="set-toggle-anim">
                  ${settings.animations ? '✨ Đang bật' : '⚡ Đã tắt'}
                </button>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-weight:700;">Mục tiêu số câu học mỗi ngày</div>
                  <div style="font-size:0.8rem;color:var(--text-muted);">Dùng để tính thanh mục tiêu trên Dashboard</div>
                </div>
                <input type="number" id="set-daily-goal" min="5" max="305" value="${settings.dailyGoal || 25}" style="width:90px;padding:0.4rem 0.65rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-elevated);text-align:center;font-weight:700;" />
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-weight:700;">Thời gian mặc định cho Đề thi B1 (phút)</div>
                  <div style="font-size:0.8rem;color:var(--text-muted);">Áp dụng khi bấm thi thử nhanh</div>
                </div>
                <input type="number" id="set-exam-mins" min="5" max="180" value="${settings.defaultExamMinutes || 45}" style="width:90px;padding:0.4rem 0.65rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-elevated);text-align:center;font-weight:700;" />
              </div>

              <div style="border-top:1px solid var(--border-color);padding-top:0.85rem;">
                <div style="font-weight:700;margin-bottom:0.3rem;">Chế độ đối chiếu đáp án chấm điểm</div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.55rem;">
                  Bản Word gốc là bản in cho sinh viên (chưa in kèm bảng đáp án). Bạn có thể chọn chấm điểm theo bộ Đáp án đối chiếu văn bản gốc (kèm dẫn chứng) hoặc chỉ chấm những câu do bạn tự nhập đáp án.
                </div>
                <select id="set-grading-mode" style="width:100%;padding:0.5rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-elevated);font-size:0.85rem;">
                  <option value="verified_text" ${settings.gradingMode === 'verified_text' ? 'selected' : ''}>Chấm theo Đáp án đối chiếu văn bản gốc (305/305 câu có dẫn chứng)</option>
                  <option value="strict_official_only" ${settings.gradingMode === 'strict_official_only' ? 'selected' : ''}>Chế độ nghiêm ngặt: Đánh dấu "Chưa có đáp án" nếu tôi chưa tự xác nhận</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Cột 2: Sao lưu, Khôi phục & Xóa dữ liệu -->
          <div class="card">
            <h3 style="font-size:1.05rem;font-weight:800;margin-bottom:1rem;">💾 Sao Lưu, Khôi Phục & Quản Lý Dữ Liệu</h3>
            <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:1rem;">
              Vì ứng dụng chạy cục bộ (localhost / offline), dữ liệu được lưu trên trình duyệt hiện tại và không tự đồng bộ đám mây. Hãy xuất file JSON định kỳ để lưu trữ an toàn.
            </p>

            <div style="display:flex;flex-direction:column;gap:0.85rem;">
              <button type="button" class="btn btn-primary" id="btn-export-backup">
                ⬇ Xuất toàn bộ dữ liệu học tập (.JSON)
              </button>

              <div style="padding:0.85rem;background:var(--bg-elevated);border-radius:10px;border:1px dashed var(--border-strong);">
                <label style="font-weight:700;font-size:0.86rem;display:block;margin-bottom:0.4rem;">⬆ Khôi phục / Nhập dữ liệu từ file JSON:</label>
                <input type="file" id="inp-import-backup" accept=".json,application/json" style="font-size:0.82rem;width:100%;" />
              </div>

              <div style="border-top:1px solid var(--border-color);padding-top:0.85rem;margin-top:0.4rem;">
                <div style="font-weight:700;color:var(--danger-600);margin-bottom:0.35rem;">⚠️ Khu vực nguy hiểm</div>
                <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.65rem;">Xóa toàn bộ lịch sử làm bài, sổ câu sai và ghi chú để bắt đầu lại từ đầu.</p>
                <button type="button" class="btn btn-danger" id="btn-reset-all-data">
                  🗑 Xóa toàn bộ dữ liệu học tập (Có xác nhận)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Trình quản lý & chỉnh sửa Đáp án theo ý giảng viên -->
        <div class="card">
          <h3 style="font-size:1.05rem;font-weight:800;margin-bottom:0.4rem;">🔑 Cập Nhật Đáp Án Thủ Công (Theo Giảng Viên Chữa Trên Lớp)</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.85rem;">
            Nếu trên lớp giảng viên chữa đáp án khác cho bất kỳ câu hỏi nào, bạn có thể chọn câu hỏi dưới đây để ghi đè đáp án chính thức:
          </p>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
            <select id="override-q-select" style="flex:1;min-width:240px;padding:0.48rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-elevated);font-size:0.84rem;">
              ${window.AppDataLoader.getAllQuestions().map(q => {
                const ans = window.AppDataLoader.getAnswerObj(q.id);
                return `<option value="${escapeHtml(q.id)}">[${escapeHtml(q.partCode)} - ${escapeHtml(q.testTitle)}] Câu ${q.number} (Hiện tại: ${ans ? ans.answer : '?'})</option>`;
              }).join('')}
            </select>
            <input type="text" id="override-ans-inp" placeholder="Đáp án mới (A/B/C/D/E/T/F)" style="width:190px;padding:0.48rem;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg-elevated);font-size:0.84rem;" />
            <button type="button" class="btn btn-primary btn-sm" id="btn-save-override">Lưu đáp án</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#set-toggle-theme').addEventListener('click', () => {
      window.AppController.toggleTheme();
      renderSettingsView(container);
    });

    container.querySelector('#set-toggle-sound').addEventListener('click', () => {
      window.AppStorage.updateSettings({ sound: !settings.sound });
      renderSettingsView(container);
    });

    container.querySelector('#set-toggle-anim').addEventListener('click', () => {
      const nextAnim = !settings.animations;
      window.AppStorage.updateSettings({ animations: nextAnim });
      document.body.classList.toggle('no-animations', !nextAnim);
      renderSettingsView(container);
    });

    container.querySelector('#set-daily-goal').addEventListener('change', (e) => {
      const v = Math.max(5, parseInt(e.target.value, 10) || 25);
      window.AppStorage.updateSettings({ dailyGoal: v });
      window.AppUtils.showToast(`Đã cập nhật mục tiêu ngày: ${v} câu/ngày.`, 'success');
      window.AppController.refreshHeaderProgress();
    });

    container.querySelector('#set-exam-mins').addEventListener('change', (e) => {
      const v = Math.max(5, parseInt(e.target.value, 10) || 45);
      window.AppStorage.updateSettings({ defaultExamMinutes: v });
      window.AppUtils.showToast(`Đã cập nhật thời gian thi mặc định: ${v} phút.`, 'success');
    });

    container.querySelector('#set-grading-mode').addEventListener('change', (e) => {
      window.AppStorage.updateSettings({ gradingMode: e.target.value });
      window.AppUtils.showToast('Đã cập nhật chế độ chấm điểm.', 'success');
    });

    container.querySelector('#btn-export-backup').addEventListener('click', () => {
      const jsonStr = window.AppStorage.exportBackupJSON();
      window.AppUtils.downloadFile(`sao-luu-anh2-${window.AppUtils.getTodayKey()}.json`, jsonStr);
      window.AppUtils.showToast('Đã tải xuống file sao lưu dữ liệu (.JSON)!', 'success');
    });

    container.querySelector('#inp-import-backup').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          window.AppStorage.importBackupJSON(ev.target.result);
          window.AppController.applyThemeAndSettings();
          window.AppController.refreshHeaderProgress();
          window.AppUtils.showToast('Khôi phục dữ liệu học tập thành công!', 'success');
          renderSettingsView(container);
        } catch (err) {
          window.AppUtils.showToast('Lỗi nhập file: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    });

    container.querySelector('#btn-reset-all-data').addEventListener('click', () => {
      window.AppUtils.showModal({
        title: 'Xác nhận xóa toàn bộ dữ liệu học tập',
        message: 'Toàn bộ lịch sử làm bài, tiến độ câu hỏi, sổ câu sai và ghi chú cá nhân sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?',
        confirmText: 'Xóa toàn bộ dữ liệu',
        confirmClass: 'btn-danger',
        onConfirm: () => {
          window.AppStorage.resetAllData();
          window.AppController.refreshHeaderProgress();
          window.AppUtils.showToast('Đã xóa toàn bộ dữ liệu và đặt lại về trạng thái ban đầu.', 'info');
          renderSettingsView(container);
        }
      });
    });

    container.querySelector('#btn-save-override').addEventListener('click', () => {
      const qId = container.querySelector('#override-q-select').value;
      const newAns = container.querySelector('#override-ans-inp').value.trim().toUpperCase();
      if (!newAns) {
        window.AppUtils.showToast('Vui lòng nhập ký tự đáp án (A, B, C, D, E, T hoặc F).', 'warning');
        return;
      }
      window.AppStorage.setCustomAnswer(qId, newAns, 'Giảng viên chữa trên lớp');
      window.AppUtils.showToast(`Đã cập nhật đáp án câu ${qId} thành ${newAns}!`, 'success');
      renderSettingsView(container);
    });
  }

  // Báo cáo đối chiếu dữ liệu gốc & Hướng dẫn sử dụng (Sections 1, 11, 16)
  function renderGuideAndAuditView(container) {
    const meta = window.AppDataLoader.getMetadata();
    const parts = window.AppDataLoader.getParts();

    container.innerHTML = `
      <div class="view-enter">
        <div class="part-header-banner">
          <div>
            <h2 style="font-size:1.35rem;font-weight:800;">📘 Hướng Dẫn Sử Dụng & Báo Cáo Đối Chiếu File Word Gốc</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">
              Tài liệu gốc: <strong>${escapeHtml(meta.sourceDocument)}</strong> · Đã nhập chuẩn xác <strong>100% (${meta.totals.parts} Part, ${meta.totals.tests} Đề/Test, ${meta.totals.questions} Câu hỏi, ${meta.totals.images} Hình ảnh)</strong>.
            </p>
          </div>
        </div>

        <!-- Bảng Cấu trúc đề thi chuẩn B1 từ trang 1 file Word -->
        <div class="card" style="margin-bottom:1.25rem;">
          <h3 style="font-size:1.05rem;font-weight:800;margin-bottom:0.75rem;">1. Cấu trúc bài thi Đọc B1 (Theo bảng hướng dẫn trang 1 Đề cương)</h3>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
              <thead>
                <tr style="border-bottom:2px solid var(--border-color);text-align:left;background:var(--bg-elevated);">
                  <th style="padding:0.7rem;">Phần thi</th>
                  <th style="padding:0.7rem;">Định dạng câu hỏi</th>
                  <th style="padding:0.7rem;text-align:right;">Số câu trong đề thi</th>
                  <th style="padding:0.7rem;text-align:right;">Điểm số</th>
                  <th style="padding:0.7rem;text-align:right;">Kho đề cương đã nhập</th>
                </tr>
              </thead>
              <tbody>
                ${meta.examStructure.sections.map((sec, idx) => {
                  const p = parts[idx];
                  return `
                    <tr style="border-bottom:1px solid var(--border-color);">
                      <td style="padding:0.7rem;font-weight:700;">${escapeHtml(sec.name)}</td>
                      <td style="padding:0.7rem;">${escapeHtml(sec.format)}</td>
                      <td style="padding:0.7rem;text-align:right;font-weight:600;">${sec.questionsCount} câu</td>
                      <td style="padding:0.7rem;text-align:right;font-weight:700;color:var(--primary-600);">${sec.points} điểm</td>
                      <td style="padding:0.7rem;text-align:right;font-weight:700;">${p ? `${p.totalTests} đề (${p.totalQuestions} câu)` : ''}</td>
                    </tr>
                  `;
                }).join('')}
                <tr style="background:var(--primary-50);font-weight:800;">
                  <td style="padding:0.75rem;" colspan="2">TỔNG CỘNG TOÀN ĐỀ CƯƠNG</td>
                  <td style="padding:0.75rem;text-align:right;">35 câu / đề thi</td>
                  <td style="padding:0.75rem;text-align:right;color:var(--primary-600);">30 điểm</td>
                  <td style="padding:0.75rem;text-align:right;">41 Đề · 305 Câu hỏi</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Danh sách các điểm lỗi chế bản/thiếu dữ liệu trong file Word gốc được phát hiện và xử lý -->
        <div class="card" style="margin-bottom:1.25rem;">
          <h3 style="font-size:1.05rem;font-weight:800;margin-bottom:0.75rem;">2. Báo cáo rà soát & Xử lý các lỗi chế bản trong file Word gốc</h3>
          <div style="display:flex;flex-direction:column;gap:0.65rem;">
            ${meta.sourceDocumentAudit.map(item => `
              <div style="padding:0.8rem 1rem;background:var(--bg-elevated);border-left:4px solid var(--primary-500);border-radius:8px;font-size:0.88rem;">
                <div style="font-weight:700;color:var(--primary-600);margin-bottom:0.2rem;">📌 ${escapeHtml(item.item)}</div>
                <div style="color:var(--text-secondary);">${escapeHtml(item.detail)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Hướng dẫn sử dụng nhanh -->
        <div class="card">
          <h3 style="font-size:1.05rem;font-weight:800;margin-bottom:0.75rem;">3. Hướng dẫn sử dụng hiệu quả & Phím tắt</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;font-size:0.88rem;">
            <div style="padding:0.9rem;background:var(--bg-elevated);border-radius:10px;">
              <strong>🎯 Bước 1: Học theo từng Part</strong>
              <p style="color:var(--text-secondary);margin-top:0.3rem;">Chọn Part I → Part V ở thanh menu bên trái để làm lần lượt từng đề hoặc mở <em>Chế độ Học từng câu</em> để xem dẫn chứng & ghi chú từ vựng.</p>
            </div>
            <div style="padding:0.9rem;background:var(--bg-elevated);border-radius:10px;">
              <strong>📕 Bước 2: Ôn Sổ câu sai (1-3-7 ngày)</strong>
              <p style="color:var(--text-secondary);margin-top:0.3rem;">Mọi câu làm sai tự động vào Sổ câu sai. Bạn cần trả lời đúng liên tiếp 3 lần qua các kỳ ôn tập để câu hỏi chuyển sang trạng thái Đã thuộc.</p>
            </div>
            <div style="padding:0.9rem;background:var(--bg-elevated);border-radius:10px;">
              <strong>⏱ Bước 3: Luyện thi B1 chuẩn 35 câu</strong>
              <p style="color:var(--text-secondary);margin-top:0.3rem;">Vào mục <em>Tạo bài kiểm tra</em> hoặc bấm <em>Kiểm tra nhanh</em> trên Dashboard để làm đề tổng hợp 35 câu / 45 phút chấm thang 30 điểm.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return {
    renderSettingsView,
    renderGuideAndAuditView
  };
})();
