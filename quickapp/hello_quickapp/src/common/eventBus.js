/**
 * 动感教练 - 全局事件总线
 * 用于解耦输入（触摸、传感器）和业务逻辑
 */

var logger = require('./logger.js');

var _listeners = {};

function on(event, callback) {
  if (!_listeners[event]) {
    _listeners[event] = [];
  }
  _listeners[event].push(callback);
}

function off(event, callback) {
  if (!_listeners[event]) return;
  if (!callback) {
    delete _listeners[event];
    return;
  }
  _listeners[event] = _listeners[event].filter(function(cb) {
    return cb !== callback;
  });
  if (_listeners[event].length === 0) {
    delete _listeners[event];
  }
}

function emit(event, data) {
  if (!_listeners[event]) return;
  var callbacks = _listeners[event].slice();
  for (var i = 0; i < callbacks.length; i++) {
    try {
      callbacks[i](data);
    } catch (e) {
      logger.error('EventBus error in ' + event + ': ' + e);
    }
  }
}

function removeAll() {
  _listeners = {};
}

module.exports = {
  on: on,
  off: off,
  emit: emit,
  removeAll: removeAll,
  EVENTS: {
    TOUCH_TAP: 'touch:tap',
    SWIPE_LEFT: 'swipe:left',
    SWIPE_RIGHT: 'swipe:right',
    SWIPE_UP: 'swipe:up',
    SWIPE_DOWN: 'swipe:down',
    TIMER_TICK: 'timer:tick',
    HEART_RATE_CHANGED: 'heart:changed',
    STEP_CHANGED: 'step:changed',
    POWER_STATE_CHANGED: 'power:stateChanged',
    PAGE_SHOW: 'page:show',
    PAGE_HIDE: 'page:hide',
    SENSOR_RATE_CHANGED: 'sensor:rateChanged'
  }
};
