/* data-loader.js - Tải và lập chỉ mục dữ liệu câu hỏi, đáp án và metadata */
window.AppDataLoader = (function () {
  let cache = {
    questionsData: null,
    answersData: null,
    metadata: null,
    partsMap: {},
    testsMap: {},
    questionsMap: {},
    allQuestions: []
  };

  async function initData() {
    if (cache.questionsData) return cache;

    // Ưu tiên 1: Nếu đã nhúng sẵn trong window.__EMBEDDED_DATA__ (hỗ trợ chạy offline file:// và Canvas)
    if (window.__EMBEDDED_DATA__ && window.__EMBEDDED_DATA__.questions) {
      buildIndex(
        window.__EMBEDDED_DATA__.questions,
        window.__EMBEDDED_DATA__.answers,
        window.__EMBEDDED_DATA__.metadata
      );
      return cache;
    }

    // Ưu tiên 2: Fetch từ thư mục data/ khi chạy trên localhost server
    const [qRes, aRes, mRes] = await Promise.all([
      fetch(['data', 'questions.json'].join('/')),
      fetch(['data', 'answers.json'].join('/')),
      fetch(['data', 'metadata.json'].join('/'))
    ]);
    const [qData, aData, mData] = await Promise.all([
      qRes.json(),
      aRes.json(),
      mRes.json()
    ]);
    buildIndex(qData, aData, mData);
    return cache;
  }

  function buildIndex(qData, aData, mData) {
    cache.questionsData = qData;
    cache.answersData = aData;
    cache.metadata = mData;
    cache.partsMap = {};
    cache.testsMap = {};
    cache.questionsMap = {};
    cache.allQuestions = [];

    (qData.parts || []).forEach(part => {
      cache.partsMap[part.partId] = part;
      (part.tests || []).forEach(test => {
        cache.testsMap[test.testId] = Object.assign({}, test, {
          partCode: part.code,
          partTitle: part.title,
          partShortTitle: part.shortTitle
        });
        (test.questions || []).forEach(q => {
          const ansObj = (aData.answers && aData.answers[q.id]) ? aData.answers[q.id] : null;
          const enriched = Object.assign({}, q, {
            partId: part.partId,
            partCode: part.code,
            partTitle: part.title,
            testId: test.testId,
            testTitle: test.title,
            testNumber: test.testNumber,
            instructions: test.instructions,
            passageTitle: test.passageTitle || '',
            passageText: test.passageText || '',
            passageItems: test.passageItems || null,
            answerInfo: ansObj
          });
          cache.questionsMap[q.id] = enriched;
          cache.allQuestions.push(enriched);
        });
      });
    });
  }

  function getParts() {
    return cache.questionsData ? cache.questionsData.parts : [];
  }

  function getPart(partId) {
    return cache.partsMap[partId] || null;
  }

  function getTest(testId) {
    return cache.testsMap[testId] || null;
  }

  function getQuestion(qId) {
    return cache.questionsMap[qId] || null;
  }

  function getAllQuestions() {
    return cache.allQuestions;
  }

  function getAnswerObj(qId) {
    const st = window.AppStorage ? window.AppStorage.loadState() : null;
    const base = cache.answersData && cache.answersData.answers ? cache.answersData.answers[qId] : null;
    if (st && st.customAnswers && st.customAnswers[qId]) {
      return Object.assign({}, base || {}, {
        answer: st.customAnswers[qId].answer,
        officialInDocx: true,
        status: 'verified_custom',
        explanation: (st.customAnswers[qId].note ? `[Đáp án cập nhật: ${st.customAnswers[qId].note}] ` : '') + (base ? base.explanation : '')
      });
    }
    return base;
  }

  function getMetadata() {
    return cache.metadata;
  }

  return {
    initData,
    getParts,
    getPart,
    getTest,
    getQuestion,
    getAllQuestions,
    getAnswerObj,
    getMetadata
  };
})();
