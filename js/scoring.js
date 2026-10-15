/* scoring.js - Chấm điểm bài thi, quy đổi thang điểm B1 Reading (30 điểm & 10 điểm) */
window.AppScoring = (function () {
  function gradeSession(session) {
    const questions = session.questions || [];
    const userAnswers = session.userAnswers || {};
    const st = window.AppStorage.loadState();
    const strictOfficialOnly = st.settings.gradingMode === 'strict_official_only';

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let unverifiedCount = 0;

    const partBreakdown = {};
    const details = [];

    questions.forEach(q => {
      const qId = q.id;
      const selected = userAnswers[qId] || null;
      const ansObj = window.AppDataLoader.getAnswerObj(qId);
      const effectiveAns = ansObj ? ansObj.answer : null;
      const isUnverified = !ansObj || (strictOfficialOnly && !ansObj.officialInDocx);

      if (!partBreakdown[q.partId]) {
        partBreakdown[q.partId] = {
          partId: q.partId,
          partCode: q.partCode || q.partId,
          total: 0,
          correct: 0,
          wrong: 0,
          unanswered: 0,
          unverified: 0
        };
      }
      partBreakdown[q.partId].total += 1;

      let status = 'unanswered';
      if (!selected) {
        unansweredCount += 1;
        partBreakdown[q.partId].unanswered += 1;
      } else if (isUnverified || !effectiveAns) {
        status = 'unverified';
        unverifiedCount += 1;
        partBreakdown[q.partId].unverified += 1;
        window.AppStorage.recordQuestionAttempt(qId, selected, ansObj, true);
      } else if (selected === effectiveAns) {
        status = 'correct';
        correctCount += 1;
        partBreakdown[q.partId].correct += 1;
        window.AppStorage.recordQuestionAttempt(qId, selected, ansObj, true);
      } else {
        status = 'wrong';
        wrongCount += 1;
        partBreakdown[q.partId].wrong += 1;
        window.AppStorage.recordQuestionAttempt(qId, selected, ansObj, true);
      }

      details.push({
        questionId: qId,
        number: q.number,
        partId: q.partId,
        partCode: q.partCode,
        testTitle: q.testTitle,
        prompt: q.prompt,
        selected: selected,
        correctAnswer: isUnverified ? null : effectiveAns,
        status: status,
        evidence: ansObj ? ansObj.evidence : '',
        explanation: ansObj ? ansObj.explanation : '',
        officialInDocx: ansObj ? ansObj.officialInDocx : false,
        answerStatus: ansObj ? ansObj.status : 'unverified'
      });
    });

    const gradableTotal = questions.length - unverifiedCount;
    const accuracy = gradableTotal > 0 ? Math.round((correctCount / gradableTotal) * 100) : 0;
    const score10 = gradableTotal > 0 ? Number(((correctCount / gradableTotal) * 10).toFixed(1)) : 0;
    const score30 = gradableTotal > 0 ? Number(((correctCount / gradableTotal) * 30).toFixed(1)) : 0;

    const resultRecord = {
      id: 'res_' + Date.now(),
      title: session.title || 'Bài kiểm tra tùy chỉnh',
      mode: session.mode || 'exam',
      completedAt: new Date().toISOString(),
      elapsedSeconds: session.elapsedSeconds || 0,
      totalQuestions: questions.length,
      correctCount,
      wrongCount,
      unansweredCount,
      unverifiedCount,
      accuracy,
      score10,
      score30,
      partBreakdown: Object.values(partBreakdown),
      details,
      configSnapshot: session.config || null
    };

    window.AppStorage.addExamHistory(resultRecord);
    return resultRecord;
  }

  return {
    gradeSession
  };
})();
