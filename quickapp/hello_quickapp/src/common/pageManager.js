/**
 * 动感教练 - 页面生命周期管理器
 * 统一控制页面的活跃/非活跃状态，优化功耗
 */

var eventBus = require('./eventBus.js');

var _currentPage = null;
var _pageStack = [];
var _pages = {};

function registerPage(page, name) {
  if (!page || !name) return;
  page._pageName = name;
  page._isActive = false;
  _pages[name] = page;
}

function showPage(page) {
  if (_currentPage && _currentPage !== page) {
    hidePage(_currentPage);
  }

  _currentPage = page;
  page._isActive = true;

  var stackIdx = _pageStack.indexOf(page);
  if (stackIdx >= 0) {
    _pageStack = _pageStack.slice(0, stackIdx + 1);
  } else {
    _pageStack.push(page);
  }

  eventBus.emit(eventBus.EVENTS.PAGE_SHOW, { page: page._pageName });
}

function hidePage(page) {
  if (!page) return;
  page._isActive = false;

  eventBus.emit(eventBus.EVENTS.PAGE_HIDE, { page: page._pageName });
}

function getCurrentPage() {
  return _currentPage;
}

function getPageByName(name) {
  return _pages[name] || null;
}

function destroy() {
  _currentPage = null;
  _pageStack = [];
  _pages = {};
}

module.exports = {
  registerPage: registerPage,
  showPage: showPage,
  hidePage: hidePage,
  getCurrentPage: getCurrentPage,
  getPageByName: getPageByName,
  destroy: destroy
};
