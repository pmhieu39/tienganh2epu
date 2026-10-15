/* timer.js - Bộ đếm thời gian làm bài chính xác */
window.AppTimer = (function () {
  let intervalId = null;
  let remainingSeconds = 0;
  let elapsedSeconds = 0;
  let isCountdown = false;
  let onTickCallback = null;
  let onExpireCallback = null;

  function startTimer(config) {
    stopTimer();
    elapsedSeconds = config.initialElapsed || 0;
    isCountdown = (config.durationSeconds && config.durationSeconds > 0);
    remainingSeconds = isCountdown ? Math.max(0, config.durationSeconds - elapsedSeconds) : 0;
    onTickCallback = config.onTick || null;
    onExpireCallback = config.onExpire || null;

    if (onTickCallback) {
      onTickCallback({ remainingSeconds, elapsedSeconds, isCountdown });
    }

    intervalId = setInterval(() => {
      elapsedSeconds += 1;
      if (isCountdown) {
        remainingSeconds = Math.max(0, remainingSeconds - 1);
      }
      if (onTickCallback) {
        onTickCallback({ remainingSeconds, elapsedSeconds, isCountdown });
      }
      if (isCountdown && remainingSeconds <= 0) {
        stopTimer();
        if (onExpireCallback) onExpireCallback();
      }
    }, 1000);
  }

  function stopTimer() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function getTimeState() {
    return { remainingSeconds, elapsedSeconds, isCountdown };
  }

  return {
    startTimer,
    stopTimer,
    getTimeState
  };
})();
