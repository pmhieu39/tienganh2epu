/* data-loader.js - Tải, lập chỉ mục và bảo toàn cấu trúc đề thi gốc (Part I -> Part V) */
window.AppDataLoader = (function () {
  const PART_ORDER = {
    PART_I: 1,
    PART_II: 2,
    PART_III: 3,
    PART_IV: 4,
    PART_V: 5
  };

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

    // Đảm bảo các Part luôn theo đúng thứ tự partNumber (1 -> 5)
    const sortedParts = (qData.parts || []).slice().sort((a, b) => {
      const pa = a.partNumber || PART_ORDER[a.partId] || 99;
      const pb = b.partNumber || PART_ORDER[b.partId] || 99;
      return pa - pb;
    });
    qData.parts = sortedParts;

    sortedParts.forEach(part => {
      const pNum = part.partNumber || PART_ORDER[part.partId] || 99;
      cache.partsMap[part.partId] = part;

      // Đảm bảo các Test trong mỗi Part luôn theo đúng thứ tự testNumber
      const sortedTests = (part.tests || []).slice().sort((a, b) => (a.testNumber || 0) - (b.testNumber || 0));
      part.tests = sortedTests;

      sortedTests.forEach(test => {
        // Đảm bảo các câu hỏi trong mỗi Test luôn theo đúng thứ tự number (1, 2, 3...)
        const sortedQs = (test.questions || []).slice().sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
        test.questions = sortedQs;

        cache.testsMap[test.testId] = Object.assign({}, test, {
          partId: part.partId,
          partNumber: pNum,
          partCode: part.code,
          partTitle: part.title,
          partShortTitle: part.shortTitle,
          partDescription: part.description
        });

        sortedQs.forEach(q => {
          const ansObj = (aData.answers && aData.answers[q.id]) ? aData.answers[q.id] : null;
          const enriched = Object.assign({}, q, {
            partId: part.partId,
            partNumber: pNum,
            partCode: part.code,
            partTitle: part.title,
            partShortTitle: part.shortTitle,
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

  // Sắp xếp danh sách câu hỏi bất kỳ theo đúng cấu trúc đề gốc:
  // 1. Part đúng thứ tự (PART I -> PART V)
  // 2. Các câu cùng Đề/Đoạn văn (testId) luôn nằm liền nhau theo thứ tự testNumber
  // 3. Các câu trong cùng một Đề luôn theo đúng thứ tự gốc (q.number tăng dần 1, 2, 3...)
  function sortQuestionsCanonically(questions) {
    if (!Array.isArray(questions)) return [];
    const seen = new Set();
    const enrichedList = [];
    questions.forEach(item => {
      if (!item) return;
      const qId = typeof item === 'string' ? item : item.id;
      if (!qId || seen.has(qId)) return;
      seen.add(qId);
      const fullQ = cache.questionsMap[qId] || item;
      if (fullQ) enrichedList.push(fullQ);
    });

    return enrichedList.sort((a, b) => {
      const pa = a.partNumber || PART_ORDER[a.partId] || 99;
      const pb = b.partNumber || PART_ORDER[b.partId] || 99;
      if (pa !== pb) return pa - pb;

      const ta = a.testNumber || 0;
      const tb = b.testNumber || 0;
      if (ta !== tb) return ta - tb;

      if (a.testId !== b.testId) return String(a.testId).localeCompare(String(b.testId));

      return (Number(a.number) || 0) - (Number(b.number) || 0);
    });
  }

  // Gom nhóm danh sách câu hỏi theo Cấu trúc Đề gốc: Part -> Test/Đoạn văn -> Danh sách câu hỏi
  // Đảm bảo đoạn văn và các câu hỏi liên quan luôn nằm liền nhau, không bao giờ tách rời hay ghép nhầm
  function groupQuestionsByPartAndTest(questions) {
    const ordered = sortQuestionsCanonically(questions);
    const partGroups = [];
    const partGroupMap = {};

    ordered.forEach((q, seqIndex) => {
      const partObj = cache.partsMap[q.partId] || {};
      let pGroup = partGroupMap[q.partId];
      if (!pGroup) {
        pGroup = {
          partId: q.partId,
          partNumber: q.partNumber || PART_ORDER[q.partId] || 99,
          partCode: q.partCode || partObj.code || q.partId,
          partTitle: q.partTitle || partObj.title || '',
          partShortTitle: q.partShortTitle || partObj.shortTitle || '',
          partDescription: partObj.description || '',
          questionType: partObj.questionType || '',
          testGroups: [],
          testGroupMap: {}
        };
        partGroupMap[q.partId] = pGroup;
        partGroups.push(pGroup);
      }

      let tGroup = pGroup.testGroupMap[q.testId];
      if (!tGroup) {
        const testObj = cache.testsMap[q.testId] || {};
        tGroup = {
          testId: q.testId,
          testNumber: q.testNumber || testObj.testNumber || 1,
          testTitle: q.testTitle || testObj.title || '',
          partId: q.partId,
          partCode: pGroup.partCode,
          instructions: q.instructions || testObj.instructions || '',
          passageTitle: q.passageTitle || testObj.passageTitle || '',
          passageText: q.passageText || testObj.passageText || '',
          passageItems: q.passageItems || testObj.passageItems || null,
          items: []
        };
        pGroup.testGroupMap[q.testId] = tGroup;
        pGroup.testGroups.push(tGroup);
      }

      tGroup.items.push({
        q: q,
        seqIndex: seqIndex,
        seqNumber: seqIndex + 1
      });
    });

    return {
      orderedQuestions: ordered,
      partGroups: partGroups
    };
  }

  // Chọn ra đúng targetCount câu hỏi không trùng lặp từ pool nhưng luôn bảo toàn cấu trúc Part và cụm Đoạn văn - Câu hỏi
  function selectStructuredQuestions(pool, targetCount, options = {}) {
    const canonicalPool = sortQuestionsCanonically(pool);
    const maxCount = Math.min(Math.max(1, parseInt(targetCount, 10) || 10), canonicalPool.length);
    if (canonicalPool.length <= maxCount) {
      return canonicalPool;
    }

    const isRandom = Boolean(options.random);

    // Gom pool thành các cụm theo từng testId để không xé lẻ bài đọc và câu hỏi
    const testBucketsMap = {};
    const testBuckets = [];
    canonicalPool.forEach(q => {
      if (!testBucketsMap[q.testId]) {
        const b = {
          testId: q.testId,
          partId: q.partId,
          partNumber: q.partNumber || PART_ORDER[q.partId] || 99,
          testNumber: q.testNumber || 1,
          questions: []
        };
        testBucketsMap[q.testId] = b;
        testBuckets.push(b);
      }
      testBucketsMap[q.testId].questions.push(q);
    });

    // Trường hợp đặc biệt: nếu chọn 35 câu và có đủ 5 Part (cấu trúc chuẩn đề thi B1: 5 + 5 + 10 + 5 + 10 = 35 câu)
    const partsPresent = [...new Set(testBuckets.map(b => b.partId))];
    if (maxCount === 35 && partsPresent.length === 5) {
      const b1Quota = { PART_I: 5, PART_II: 5, PART_III: 10, PART_IV: 5, PART_V: 10 };
      const pickedB1 = [];
      let canFormStandard35 = true;
      ['PART_I', 'PART_II', 'PART_III', 'PART_IV', 'PART_V'].forEach(pid => {
        const need = b1Quota[pid];
        let candidates = testBuckets.filter(b => b.partId === pid && b.questions.length === need);
        if (candidates.length === 0) {
          canFormStandard35 = false;
          return;
        }
        if (isRandom) {
          candidates = window.AppUtils.shuffleArray(candidates);
        }
        pickedB1.push(...candidates[0].questions);
      });
      if (canFormStandard35 && pickedB1.length === 35) {
        return sortQuestionsCanonically(pickedB1);
      }
    }

    // Nếu chế độ tuần tự (sequential) và không trộn: lấy tuần tự các đề theo thứ tự gốc nhưng ưu tiên giữ nguyên bài đọc hoàn chỉnh
    let orderedBuckets = testBuckets.slice();
    if (isRandom) {
      // Trộn thứ tự các Đề (Test) để lấy đề ngẫu nhiên nhưng vẫn giữ nguyên vẹn các câu trong cùng một Đề/Đoạn văn
      orderedBuckets = window.AppUtils.shuffleArray(orderedBuckets);
    }

    const selected = [];
    const usedIds = new Set();
    const remainingBuckets = [];

    // Bước 1: Ưu tiên chọn các Đề (Test/Passage) trọn vẹn vừa khít với số câu còn thiếu
    for (let i = 0; i < orderedBuckets.length; i++) {
      const bucket = orderedBuckets[i];
      const rem = maxCount - selected.length;
      if (rem === 0) break;
      if (bucket.questions.length <= rem) {
        bucket.questions.forEach(q => {
          if (!usedIds.has(q.id)) {
            usedIds.add(q.id);
            selected.push(q);
          }
        });
      } else {
        remainingBuckets.push(bucket);
      }
    }

    // Bước 2: Nếu vẫn còn thiếu câu (ví dụ chọn 15 câu từ các bài 10 câu, hoặc chọn 7 câu), lấy thêm các câu đầu tiên theo đúng thứ tự 1..k của đề tiếp theo
    if (selected.length < maxCount && remainingBuckets.length > 0) {
      // Ưu tiên lấy từ Part I (câu rời) hoặc Part có độ dài nhỏ trước để hạn chế cắt ngang bài đọc dài
      remainingBuckets.sort((a, b) => a.questions.length - b.questions.length);
      for (let i = 0; i < remainingBuckets.length; i++) {
        const bucket = remainingBuckets[i];
        for (let j = 0; j < bucket.questions.length; j++) {
          if (selected.length >= maxCount) break;
          const q = bucket.questions[j];
          if (!usedIds.has(q.id)) {
            usedIds.add(q.id);
            selected.push(q);
          }
        }
        if (selected.length >= maxCount) break;
      }
    }

    // Bước 3: Luôn sắp xếp lại danh sách câu đã chọn theo đúng thứ tự cấu trúc đề gốc:
    // Part I -> Part II -> Part III -> Part IV -> Part V, gom theo Đề và đúng thứ tự câu 1, 2, 3...
    return sortQuestionsCanonically(selected);
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
    PART_ORDER,
    initData,
    getParts,
    getPart,
    getTest,
    getQuestion,
    getAllQuestions,
    getAnswerObj,
    getMetadata,
    sortQuestionsCanonically,
    groupQuestionsByPartAndTest,
    selectStructuredQuestions
  };
})();
