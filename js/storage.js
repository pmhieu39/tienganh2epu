/* storage.js - Quản lý LocalStorage & IndexedDB, Tiến độ, Sổ câu sai, Sao lưu */
window.AppStorage = (function () {
  const STORAGE_KEY = 'english2_b1_review_state_v1';
  const DATA_VERSION = '1.0.0';

  let memoryFallback = null;

  function getDefaultState() {
    return {
      version: DATA_VERSION,
      settings: {
        theme: 'light',
        sound: true,
        animations: true,
        dailyGoal: 25,
        defaultExamMinutes: 45,
        gradingMode: 'verified_text', // 'verified_text' hoặc 'strict_official_only'
        showTranslations: true
      },
      // Tiến độ từng câu hỏi: { [questionId]: { attempts, correctCount, wrongCount, lastSelected, isCorrect, lastAnsweredAt, flagged, favorite, note } }
      questionProgress: {},
      // Sổ câu sai: { [questionId]: { questionId, partId, testId, selectedAnswer, verifiedAnswer, wrongCount, consecutiveCorrect, lastWrongAt, lastReviewedAt, reviewedStatus, hardFlag, nextReviewDueAt, intervalDays } }
      wrongBook: {},
      // Lịch sử các lần thi/luyện tập đã nộp
      examHistory: [],
      // Bài kiểm tra hoặc bài luyện đang làm dở (để khôi phục khi tải lại trang)
      activeSession: null,
      // Tiến độ theo ngày: { 'YYYY-MM-DD': { answered: 0, correct: 0, wrong: 0 } }
      dailyStats: {},
      // Từ vựng cá nhân người học tự thêm
      customVocab: [],
      // Đáp án do người học/giảng viên tự cập nhật: { [questionId]: { answer: 'A', note: '...' } }
      customAnswers: {}
    };
  }

  function loadState() {
    if (memoryFallback) return memoryFallback;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        memoryFallback = getDefaultState();
        saveState(memoryFallback);
        return memoryFallback;
      }
      const parsed = JSON.parse(raw);
      const def = getDefaultState();
      memoryFallback = Object.assign({}, def, parsed, {
        settings: Object.assign({}, def.settings, parsed.settings || {})
      });
      return memoryFallback;
    } catch (e) {
      if (!memoryFallback) memoryFallback = getDefaultState();
      return memoryFallback;
    }
  }

  function saveState(newState) {
    memoryFallback = newState || memoryFallback || getDefaultState();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryFallback));
    } catch (e) {
      // Nếu LocalStorage bị chặn trong iframe sandbox, vẫn giữ trong memoryFallback
    }
    syncIndexedDB(memoryFallback);
  }

  function syncIndexedDB(stateObj) {
    try {
      if (!window.indexedDB) return;
      const req = window.indexedDB.open('English2ReviewDB', 1);
      req.onupgradeneeded = function (ev) {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state', { keyPath: 'id' });
        }
      };
      req.onsuccess = function (ev) {
        const db = ev.target.result;
        const tx = db.transaction('app_state', 'readwrite');
        tx.objectStore('app_state').put({ id: 'main', data: stateObj, updatedAt: new Date().toISOString() });
      };
    } catch (e) {
      // Bỏ qua nếu IndexedDB bị hạn chế
    }
  }

  function getSettings() {
    return loadState().settings;
  }

  function updateSettings(partial) {
    const st = loadState();
    st.settings = Object.assign({}, st.settings, partial);
    saveState(st);
    return st.settings;
  }

  function getQuestionState(qId) {
    const st = loadState();
    return st.questionProgress[qId] || {
      attempts: 0,
      correctCount: 0,
      wrongCount: 0,
      lastSelected: null,
      isCorrect: null,
      lastAnsweredAt: null,
      flagged: false,
      favorite: false,
      note: ''
    };
  }

  function recordQuestionAttempt(qId, selectedKey, verifiedAnsObj, isReviewMode = false) {
    const st = loadState();
    const prev = getQuestionState(qId);
    const nowIso = new Date().toISOString();
    const today = window.AppUtils.getTodayKey();

    // Kiểm tra xem câu hỏi có đáp án xác minh không
    const customOverride = st.customAnswers[qId];
    const effectiveAnswer = customOverride ? customOverride.answer : (verifiedAnsObj ? verifiedAnsObj.answer : null);
    const isUnverified = !customOverride && (
      !verifiedAnsObj ||
      (st.settings.gradingMode === 'strict_official_only' && !verifiedAnsObj.officialInDocx)
    );

    let isCorrect = null;
    if (!isUnverified && effectiveAnswer && selectedKey) {
      isCorrect = (selectedKey === effectiveAnswer);
    }

    const updated = Object.assign({}, prev, {
      attempts: prev.attempts + 1,
      correctCount: isCorrect === true ? prev.correctCount + 1 : prev.correctCount,
      wrongCount: isCorrect === false ? prev.wrongCount + 1 : prev.wrongCount,
      lastSelected: selectedKey,
      isCorrect: isCorrect,
      lastAnsweredAt: nowIso
    });
    st.questionProgress[qId] = updated;

    // Cập nhật thống kê ngày
    if (!st.dailyStats[today]) {
      st.dailyStats[today] = { answered: 0, correct: 0, wrong: 0 };
    }
    st.dailyStats[today].answered += 1;
    if (isCorrect === true) st.dailyStats[today].correct += 1;
    if (isCorrect === false) st.dailyStats[today].wrong += 1;

    // Cập nhật Sổ câu sai (Spaced Repetition: 1 ngày -> 3 ngày -> 7 ngày)
    // Quy tắc bắt buộc:
    // - Nếu chưa có đáp án xác minh, không kết luận người học sai.
    // - Không đánh dấu một câu là đã thuộc (mastered) chỉ vì trả lời đúng 1 lần (cần ít nhất 3 lần đúng liên tiếp qua các mốc ôn tập 1d -> 3d -> 7d).
    if (isCorrect === false && verifiedAnsObj) {
      const existingWrong = st.wrongBook[qId];
      const wrongCount = existingWrong ? existingWrong.wrongCount + 1 : 1;
      const nextDue = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 1 ngày sau
      st.wrongBook[qId] = {
        questionId: qId,
        partId: verifiedAnsObj.partId,
        testId: verifiedAnsObj.testId,
        selectedAnswer: selectedKey,
        verifiedAnswer: effectiveAnswer,
        wrongCount: wrongCount,
        consecutiveCorrect: 0,
        lastWrongAt: nowIso,
        lastReviewedAt: nowIso,
        reviewedStatus: 'unreviewed', // 'unreviewed' | 'reviewing' | 'mastered'
        hardFlag: existingWrong ? existingWrong.hardFlag : (wrongCount >= 2),
        intervalDays: 1,
        nextReviewDueAt: nextDue
      };
    } else if (isCorrect === true && st.wrongBook[qId]) {
      const w = st.wrongBook[qId];
      w.consecutiveCorrect = (w.consecutiveCorrect || 0) + 1;
      w.lastReviewedAt = nowIso;
      // Lịch lặp lại ngắt quãng: lần đúng 1 -> hẹn 1 ngày (reviewing); lần đúng 2 -> hẹn 3 ngày (reviewing); lần đúng 3+ -> hẹn 7 ngày & đánh dấu mastered
      if (w.consecutiveCorrect === 1) {
        w.intervalDays = 1;
        w.reviewedStatus = 'reviewing';
      } else if (w.consecutiveCorrect === 2) {
        w.intervalDays = 3;
        w.reviewedStatus = 'reviewing';
      } else {
        w.intervalDays = 7;
        w.reviewedStatus = 'mastered';
      }
      w.nextReviewDueAt = new Date(Date.now() + w.intervalDays * 24 * 3600 * 1000).toISOString();
    }

    saveState(st);
    return updated;
  }

  function toggleFlag(qId) {
    const st = loadState();
    const cur = getQuestionState(qId);
    cur.flagged = !cur.flagged;
    st.questionProgress[qId] = cur;
    saveState(st);
    return cur.flagged;
  }

  function toggleFavorite(qId) {
    const st = loadState();
    const cur = getQuestionState(qId);
    cur.favorite = !cur.favorite;
    st.questionProgress[qId] = cur;
    saveState(st);
    return cur.favorite;
  }

  function saveNote(qId, noteText) {
    const st = loadState();
    const cur = getQuestionState(qId);
    cur.note = noteText.trim();
    st.questionProgress[qId] = cur;
    saveState(st);
    return cur.note;
  }

  function toggleHardWrong(qId) {
    const st = loadState();
    if (st.wrongBook[qId]) {
      st.wrongBook[qId].hardFlag = !st.wrongBook[qId].hardFlag;
      saveState(st);
      return st.wrongBook[qId].hardFlag;
    }
    return false;
  }

  function removeWrongItem(qId) {
    const st = loadState();
    if (st.wrongBook[qId]) {
      delete st.wrongBook[qId];
      saveState(st);
      return true;
    }
    return false;
  }

  function saveActiveSession(sessionObj) {
    const st = loadState();
    st.activeSession = sessionObj;
    saveState(st);
  }

  function getActiveSession() {
    return loadState().activeSession;
  }

  function clearActiveSession() {
    const st = loadState();
    st.activeSession = null;
    saveState(st);
  }

  function addExamHistory(record) {
    const st = loadState();
    st.examHistory.unshift(record);
    if (st.examHistory.length > 100) st.examHistory.pop();
    saveState(st);
  }

  function getExamHistory() {
    return loadState().examHistory || [];
  }

  function setCustomAnswer(qId, answerKey, note) {
    const st = loadState();
    if (!answerKey) {
      delete st.customAnswers[qId];
    } else {
      st.customAnswers[qId] = { answer: answerKey, note: note || 'Cập nhật thủ công', updatedAt: new Date().toISOString() };
    }
    saveState(st);
  }

  function addCustomVocab(word, meaning, example, qId) {
    const st = loadState();
    st.customVocab.unshift({
      id: 'v_' + Date.now(),
      word: word.trim(),
      meaning: meaning.trim(),
      example: (example || '').trim(),
      questionId: qId || null,
      createdAt: new Date().toISOString()
    });
    saveState(st);
  }

  function removeCustomVocab(id) {
    const st = loadState();
    st.customVocab = (st.customVocab || []).filter(v => v.id !== id);
    saveState(st);
  }

  function exportBackupJSON() {
    const st = loadState();
    return JSON.stringify(st, null, 2);
  }

  function importBackupJSON(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || !parsed.version) {
      throw new Error('File sao lưu không hợp lệ hoặc thiếu thông tin phiên bản.');
    }
    const def = getDefaultState();
    const merged = Object.assign({}, def, parsed, {
      settings: Object.assign({}, def.settings, parsed.settings || {})
    });
    saveState(merged);
    return merged;
  }

  function resetAllData() {
    const fresh = getDefaultState();
    saveState(fresh);
    return fresh;
  }

  return {
    loadState,
    saveState,
    getSettings,
    updateSettings,
    getQuestionState,
    recordQuestionAttempt,
    toggleFlag,
    toggleFavorite,
    saveNote,
    toggleHardWrong,
    removeWrongItem,
    saveActiveSession,
    getActiveSession,
    clearActiveSession,
    addExamHistory,
    getExamHistory,
    setCustomAnswer,
    addCustomVocab,
    removeCustomVocab,
    exportBackupJSON,
    importBackupJSON,
    resetAllData
  };
})();
