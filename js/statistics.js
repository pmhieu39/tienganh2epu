/* statistics.js - Tính toán thống kê thực tế từ dữ liệu người học */
window.AppStatistics = (function () {
  function getOverallStats() {
    const allQuestions = window.AppDataLoader.getAllQuestions();
    const parts = window.AppDataLoader.getParts();
    const st = window.AppStorage.loadState();
    const progressMap = st.questionProgress || {};

    let doneCount = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let flaggedCount = 0;
    let favoriteCount = 0;

    const partStats = {};
    parts.forEach(p => {
      partStats[p.partId] = {
        partId: p.partId,
        code: p.code,
        title: p.title,
        shortTitle: p.shortTitle,
        totalTests: p.tests.length,
        totalQuestions: p.totalQuestions,
        done: 0,
        correct: 0,
        wrong: 0,
        unanswered: p.totalQuestions,
        accuracy: 0,
        progressPercent: 0
      };
    });

    allQuestions.forEach(q => {
      const p = progressMap[q.id];
      const ps = partStats[q.partId];
      if (p && p.lastSelected) {
        doneCount += 1;
        if (ps) ps.done += 1;
        if (p.isCorrect === true) {
          correctCount += 1;
          if (ps) ps.correct += 1;
        } else if (p.isCorrect === false) {
          wrongCount += 1;
          if (ps) ps.wrong += 1;
        }
      }
      if (p && p.flagged) flaggedCount += 1;
      if (p && p.favorite) favoriteCount += 1;
    });

    Object.values(partStats).forEach(ps => {
      ps.unanswered = Math.max(0, ps.totalQuestions - ps.done);
      ps.progressPercent = ps.totalQuestions > 0 ? Math.round((ps.done / ps.totalQuestions) * 100) : 0;
      const gradableDone = ps.correct + ps.wrong;
      ps.accuracy = gradableDone > 0 ? Math.round((ps.correct / gradableDone) * 100) : 0;
    });

    const totalQuestions = allQuestions.length;
    const unansweredCount = Math.max(0, totalQuestions - doneCount);
    const gradableTotal = correctCount + wrongCount;
    const overallAccuracy = gradableTotal > 0 ? Math.round((correctCount / gradableTotal) * 100) : 0;

    // Tính danh sách đề đang học dở / đã hoàn thành
    const inProgressTests = [];
    let completedTestsCount = 0;
    parts.forEach(part => {
      part.tests.forEach(test => {
        let tDone = 0;
        let tCorrect = 0;
        let tWrong = 0;
        test.questions.forEach(q => {
          const qp = progressMap[q.id];
          if (qp && qp.lastSelected) {
            tDone += 1;
            if (qp.isCorrect === true) tCorrect += 1;
            if (qp.isCorrect === false) tWrong += 1;
          }
        });
        if (tDone === test.questions.length && tDone > 0) {
          completedTestsCount += 1;
        } else if (tDone > 0 && tDone < test.questions.length) {
          inProgressTests.push({
            testId: test.testId,
            partId: part.partId,
            partCode: part.code,
            title: test.title,
            done: tDone,
            total: test.questions.length,
            percent: Math.round((tDone / test.questions.length) * 100)
          });
        }
      });
    });

    // Tính chuỗi ngày học liên tiếp (Streak) & mục tiêu hôm nay
    const todayKey = window.AppUtils.getTodayKey();
    const todayStat = (st.dailyStats && st.dailyStats[todayKey]) ? st.dailyStats[todayKey] : { answered: 0, correct: 0, wrong: 0 };
    const dailyGoal = (st.settings && st.settings.dailyGoal) ? st.settings.dailyGoal : 25;

    let streakDays = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(d.getTime() - i * 24 * 3600 * 1000);
      const y = checkDate.getFullYear();
      const m = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const k = `${y}-${m}-${day}`;
      if (st.dailyStats && st.dailyStats[k] && st.dailyStats[k].answered > 0) {
        streakDays += 1;
      } else if (i === 0) {
        // Nếu hôm nay chưa làm câu nào, kiểm tra tiếp hôm qua
        continue;
      } else {
        break;
      }
    }

    // Dữ liệu 7 ngày gần nhất cho biểu đồ
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const cd = new Date(d.getTime() - i * 24 * 3600 * 1000);
      const y = cd.getFullYear();
      const m = String(cd.getMonth() + 1).padStart(2, '0');
      const day = String(cd.getDate()).padStart(2, '0');
      const k = `${y}-${m}-${day}`;
      const ds = (st.dailyStats && st.dailyStats[k]) ? st.dailyStats[k] : { answered: 0, correct: 0, wrong: 0 };
      last7Days.push({
        dateKey: k,
        label: `${day}/${m}`,
        answered: ds.answered,
        correct: ds.correct,
        wrong: ds.wrong
      });
    }

    const wrongBookList = Object.values(st.wrongBook || {});
    const unreviewedWrongCount = wrongBookList.filter(w => w.reviewedStatus !== 'mastered').length;

    return {
      totalParts: parts.length,
      totalTests: parts.reduce((acc, p) => acc + p.tests.length, 0),
      totalQuestions,
      doneCount,
      correctCount,
      wrongCount,
      unansweredCount,
      flaggedCount,
      favoriteCount,
      overallAccuracy,
      completedTestsCount,
      inProgressTests,
      partStats: Object.values(partStats),
      todayAnswered: todayStat.answered,
      dailyGoal,
      streakDays,
      last7Days,
      wrongBookTotal: wrongBookList.length,
      unreviewedWrongCount
    };
  }

  function getTestStats(testId) {
    const test = window.AppDataLoader.getTest(testId);
    if (!test) return { done: 0, correct: 0, wrong: 0, unanswered: 0, total: 0, status: 'not_started', percent: 0 };
    const st = window.AppStorage.loadState();
    const pm = st.questionProgress || {};
    let done = 0, correct = 0, wrong = 0, flagged = 0;
    test.questions.forEach(q => {
      const p = pm[q.id];
      if (p && p.lastSelected) {
        done += 1;
        if (p.isCorrect === true) correct += 1;
        if (p.isCorrect === false) wrong += 1;
      }
      if (p && p.flagged) flagged += 1;
    });
    const total = test.questions.length;
    const status = done === 0 ? 'not_started' : (done >= total ? 'completed' : 'in_progress');
    return {
      done,
      correct,
      wrong,
      flagged,
      unanswered: Math.max(0, total - done),
      total,
      status,
      percent: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }

  return {
    getOverallStats,
    getTestStats
  };
})();
