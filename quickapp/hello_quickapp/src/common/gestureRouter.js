/**
 * 动感教练 - 手势路由管理器
 * 统一管理页面间的手势导航
 */

var router = require('@system.router');

var ROUTE_MAP = {
  'pages/clock': {
    left: 'pages/exercise_select',
    down: 'pages/control_center'
  },
  'pages/exercise_select': {
    right: 'pages/clock'
  },
  'pages/exercise_list': {
    right: 'pages/exercise_select'
  },
  'pages/exercise_active': {
    // 运动中无法退出
  },
  'pages/ai_result': {
    right: 'pages/clock'
  },
  'pages/history': {
    right: 'pages/exercise_select'
  },
  'pages/compass': {
    right: 'pages/exercise_select'
  },
  'pages/weather': {
    right: 'pages/exercise_select'
  },
  'pages/altitude': {
    right: 'pages/exercise_select'
  },
  'pages/timer': {
    right: 'pages/exercise_select'
  },
  'pages/music': {
    right: 'pages/exercise_select'
  },
  'pages/health': {
    right: 'pages/exercise_select'
  },
  'pages/xiaozhi': {
    right: 'pages/exercise_select'
  },
  'pages/settings': {
    right: 'pages/exercise_select'
  },
  'pages/control_center': {
    up: 'pages/clock'
  }
};

var _currentPagePath = null;
var _onBeforeNavigate = null;

function setCurrentPage(pagePath) {
  _currentPagePath = pagePath;
}

function getCurrentPage() {
  return _currentPagePath;
}

function setBeforeNavigateCallback(callback) {
  _onBeforeNavigate = callback;
}

function handleSwipe(pagePath, direction) {
  var mapping = ROUTE_MAP[pagePath];
  if (!mapping) return false;

  var target = mapping[direction];
  if (!target) return false;

  if (_onBeforeNavigate) {
    var canNavigate = _onBeforeNavigate(pagePath, target);
    if (canNavigate === false) return false;
  }

  if (target === 'back') {
    router.back();
  } else {
    router.push({ uri: target });
  }

  return true;
}

function navigateTo(pagePath, params) {
  var options = { uri: pagePath };
  if (params) {
    options.params = params;
  }
  router.push(options);
}

function navigateBack() {
  router.back();
}

module.exports = {
  ROUTE_MAP: ROUTE_MAP,
  setCurrentPage: setCurrentPage,
  getCurrentPage: getCurrentPage,
  setBeforeNavigateCallback: setBeforeNavigateCallback,
  handleSwipe: handleSwipe,
  navigateTo: navigateTo,
  navigateBack: navigateBack
};
