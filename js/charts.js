/* charts.js - Vẽ biểu đồ SVG trực quan (Biểu đồ tròn, Biểu đồ cột theo Part, Biểu đồ tiến độ theo ngày & lịch sử thi) */
window.AppCharts = (function () {
  function renderDailyProgressChart(daysData, dailyGoal) {
    const maxVal = Math.max(dailyGoal || 25, ...daysData.map(d => d.answered), 10);
    const width = 520;
    const height = 210;
    const padLeft = 36;
    const padRight = 16;
    const padTop = 20;
    const padBottom = 34;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const colW = plotW / daysData.length;

    let barsSvg = '';
    daysData.forEach((d, idx) => {
      const xCenter = padLeft + idx * colW + colW / 2;
      const barW = Math.min(34, colW * 0.55);
      const totalH = Math.round((d.answered / maxVal) * plotH);
      const correctH = Math.round((d.correct / maxVal) * plotH);
      const yTotal = padTop + plotH - totalH;
      const yCorrect = padTop + plotH - correctH;

      barsSvg += `
        <g class="chart-bar-group">
          <title>${d.label}: Đã làm ${d.answered} câu (Đúng: ${d.correct}, Sai: ${d.wrong})</title>
          <rect x="${xCenter - barW / 2}" y="${padTop}" width="${barW}" height="${plotH}" rx="6" fill="var(--bg-elevated)" />
          ${totalH > 0 ? `<rect x="${xCenter - barW / 2}" y="${yTotal}" width="${barW}" height="${totalH}" rx="6" fill="var(--primary-200)" />` : ''}
          ${correctH > 0 ? `<rect x="${xCenter - barW / 2}" y="${yCorrect}" width="${barW}" height="${correctH}" rx="6" fill="var(--primary-500)" />` : ''}
          <text x="${xCenter}" y="${ padTop + plotH - totalH - 6 }" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-secondary)">${d.answered > 0 ? d.answered : ''}</text>
          <text x="${xCenter}" y="${height - 10}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${d.label}</text>
        </g>
      `;
    });

    const goalY = padTop + plotH - Math.round(((dailyGoal || 25) / maxVal) * plotH);

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;overflow:visible;" role="img" aria-label="Biểu đồ tiến độ học tập 7 ngày qua">
        <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="var(--border-color)" stroke-width="1" />
        ${goalY >= padTop ? `<line x1="${padLeft}" y1="${goalY}" x2="${width - padRight}" y2="${goalY}" stroke="var(--warning-500)" stroke-dasharray="4 4" stroke-width="1.5" />
        <text x="${width - padRight}" y="${goalY - 4}" text-anchor="end" font-size="10" fill="var(--warning-600)" font-weight="600">Mục tiêu (${dailyGoal} câu)</text>` : ''}
        ${barsSvg}
      </svg>
    `;
  }

  function renderPartAccuracyChart(partStats) {
    let rowsHtml = '';
    partStats.forEach(ps => {
      const total = ps.totalQuestions || 1;
      const correctPct = Math.round((ps.correct / total) * 100);
      const wrongPct = Math.round((ps.wrong / total) * 100);
      rowsHtml += `
        <div style="margin-bottom:0.85rem;" title="${ps.code}: Đúng ${ps.correct} câu (${correctPct}%), Sai ${ps.wrong} câu (${wrongPct}%), Chưa làm ${ps.unanswered} câu">
          <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:0.3rem;">
            <span style="font-weight:700;">${ps.code} <span style="font-weight:400;color:var(--text-muted);">(${ps.done}/${ps.totalQuestions} câu)</span></span>
            <span>
              <strong style="color:var(--success-600);">Đúng: ${ps.correct}</strong> ·
              <strong style="color:var(--danger-600);">Sai: ${ps.wrong}</strong> ·
              <span style="color:var(--text-muted);">Tỷ lệ: ${ps.accuracy}%</span>
            </span>
          </div>
          <div style="display:flex;height:10px;border-radius:999px;overflow:hidden;background:var(--bg-elevated);">
            <div style="width:${correctPct}%;background:var(--success-500);transition:width 0.3s;" title="Đúng ${ps.correct} câu"></div>
            <div style="width:${wrongPct}%;background:var(--danger-500);transition:width 0.3s;" title="Sai ${ps.wrong} câu"></div>
          </div>
        </div>
      `;
    });
    return `<div>${rowsHtml}</div>`;
  }

  function renderDonutChart(correct, wrong, unanswered) {
    const total = Math.max(1, correct + wrong + unanswered);
    const r = 54;
    const c = 2 * Math.PI * r;
    const cLen = (correct / total) * c;
    const wLen = (wrong / total) * c;
    const uLen = (unanswered / total) * c;

    const cOffset = 0;
    const wOffset = -cLen;
    const uOffset = -(cLen + wLen);

    const pct = Math.round((correct / total) * 100);

    return `
      <div style="display:flex;align-items:center;justify-content:center;gap:1.25rem;flex-wrap:wrap;">
        <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Biểu đồ tròn kết quả">
          <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--bg-elevated)" stroke-width="16" />
          ${unanswered > 0 ? `<circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--border-strong)" stroke-width="16" stroke-dasharray="${uLen} ${c}" stroke-dashoffset="${uOffset}" transform="rotate(-90 70 70)"><title>Chưa làm: ${unanswered} câu</title></circle>` : ''}
          ${wrong > 0 ? `<circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--danger-500)" stroke-width="16" stroke-dasharray="${wLen} ${c}" stroke-dashoffset="${wOffset}" transform="rotate(-90 70 70)"><title>Sai: ${wrong} câu</title></circle>` : ''}
          ${correct > 0 ? `<circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--success-500)" stroke-width="16" stroke-dasharray="${cLen} ${c}" stroke-dashoffset="${cOffset}" transform="rotate(-90 70 70)"><title>Đúng: ${correct} câu</title></circle>` : ''}
          <text x="70" y="66" text-anchor="middle" font-size="20" font-weight="800" fill="var(--text-primary)">${pct}%</text>
          <text x="70" y="84" text-anchor="middle" font-size="11" fill="var(--text-muted)">Chính xác</text>
        </svg>
        <div style="display:flex;flex-direction:column;gap:0.45rem;font-size:0.84rem;">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span style="width:12px;height:12px;border-radius:3px;background:var(--success-500);display:inline-block;"></span>
            <span>Đúng: <strong>${correct}</strong> câu</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span style="width:12px;height:12px;border-radius:3px;background:var(--danger-500);display:inline-block;"></span>
            <span>Sai: <strong>${wrong}</strong> câu</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span style="width:12px;height:12px;border-radius:3px;background:var(--border-strong);display:inline-block;"></span>
            <span>Chưa trả lời: <strong>${unanswered}</strong> câu</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderHistoryLineChart(historyList) {
    const items = (historyList || []).slice(0, 10).reverse();
    if (items.length === 0) {
      return `<div class="empty-state" style="padding:1.25rem;"><p>Chưa có dữ liệu lịch sử thi để vẽ biểu đồ đường.</p></div>`;
    }
    const width = 460;
    const height = 180;
    const padL = 34, padR = 18, padT = 20, padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const points = items.map((item, idx) => {
      const x = items.length === 1 ? padL + plotW / 2 : padL + (idx / (items.length - 1)) * plotW;
      const y = padT + plotH - ((item.accuracy || 0) / 100) * plotH;
      return { x, y, item, idx: idx + 1 };
    });

    const polylinePts = points.map(p => `${p.x},${p.y}`).join(' ');

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;overflow:visible;" role="img" aria-label="Biểu đồ đường tiến độ qua các lần thi">
        <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="var(--border-color)" />
        <line x1="${padL}" y1="${padT + plotH / 2}" x2="${width - padR}" y2="${padT + plotH / 2}" stroke="var(--border-color)" stroke-dasharray="3 3" />
        <line x1="${padL}" y1="${padT}" x2="${width - padR}" y2="${padT}" stroke="var(--border-color)" stroke-dasharray="3 3" />
        <text x="${padL - 6}" y="${padT + 4}" text-anchor="end" font-size="10" fill="var(--text-muted)">100%</text>
        <text x="${padL - 6}" y="${padT + plotH / 2 + 4}" text-anchor="end" font-size="10" fill="var(--text-muted)">50%</text>
        <text x="${padL - 6}" y="${padT + plotH + 4}" text-anchor="end" font-size="10" fill="var(--text-muted)">0%</text>
        ${points.length > 1 ? `<polyline fill="none" stroke="var(--primary-500)" stroke-width="2.5" points="${polylinePts}" />` : ''}
        ${points.map(p => `
          <g>
            <title>Lần ${p.idx} (${p.item.title}): ${p.item.accuracy}% (${p.item.score10}/10 điểm)</title>
            <circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--primary-600)" stroke="#fff" stroke-width="2" />
            <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--primary-600)">${p.item.accuracy}%</text>
            <text x="${p.x}" y="${height - 8}" text-anchor="middle" font-size="10" fill="var(--text-muted)">#${p.idx}</text>
          </g>
        `).join('')}
      </svg>
    `;
  }

  return {
    renderDailyProgressChart,
    renderPartAccuracyChart,
    renderDonutChart,
    renderHistoryLineChart
  };
})();
