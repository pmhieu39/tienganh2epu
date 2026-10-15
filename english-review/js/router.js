/* router.js - Điều hướng SPA giữa các trang và bảo vệ bài thi đang làm */
window.AppRouter = (function () {
  let currentRoute = { page: 'dashboard', params: {} };
  let routeListeners = [];

  function navigate(page, params = {}, force = false) {
    // Cảnh báo nếu người học đang trong chế độ thi (exam mode) chưa nộp bài
    if (!force && currentRoute.page === 'workspace' && window.AppExamEngine && window.AppExamEngine.hasUnsubmittedExam()) {
      window.AppUtils.showModal({
        title: 'Cảnh báo thoát bài kiểm tra',
        message: 'Bạn đang có bài kiểm tra chưa nộp. Tiến độ đã được tự động lưu, nhưng đồng hồ vẫn được ghi nhận. Bạn có chắc muốn rời khỏi màn hình làm bài?',
        confirmText: 'Rời khỏi',
        cancelText: 'Tiếp tục làm bài',
        confirmClass: 'btn-danger',
        onConfirm: () => {
          performNavigation(page, params);
        }
      });
      return;
    }
    performNavigation(page, params);
  }

  function performNavigation(page, params = {}) {
    currentRoute = { page, params };
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateActiveNav(page, params);
    routeListeners.forEach(fn => fn(currentRoute));
  }

  function updateActiveNav(page, params) {
    document.querySelectorAll('.nav-item').forEach(btn => {
      const targetPage = btn.getAttribute('data-page');
      const targetPart = btn.getAttribute('data-part');
      if (targetPage === 'part-detail' && page === 'part-detail') {
        btn.classList.toggle('active', targetPart === params.partId);
      } else {
        btn.classList.toggle('active', targetPage === page && !targetPart);
      }
    });
    // Đóng sidebar trên mobile sau khi chọn mục
    const sb = document.getElementById('app-sidebar');
    const bd = document.getElementById('sidebar-backdrop');
    if (sb) sb.classList.remove('open');
    if (bd) bd.classList.remove('open');
  }

  function getCurrentRoute() {
    return currentRoute;
  }

  function onRouteChange(fn) {
    routeListeners.push(fn);
  }

  return {
    navigate,
    getCurrentRoute,
    onRouteChange
  };
})();
