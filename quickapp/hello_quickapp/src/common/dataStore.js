/**
 * 动感教练 - 全局数据存储
 * 管理所有应用的共享数据，自动持久化
 */

var eventBus = require('./eventBus.js');
var storage = require('./storage.js');
var logger = require('./logger.js');

var _cache = {};
var _subscribers = {};
var _initialized = false;

function init() {
  if (_initialized) return;
  _initialized = true;

  var todayStats = storage.getTodayStats();
  _cache['todaySteps'] = todayStats.count || 0;
  _cache['todayCalories'] = todayStats.calories || 0;
  _cache['todayDuration'] = todayStats.totalDuration || 0;

  var lastHR = storage.get('lastHeartRate');
  _cache['heartRate'] = lastHR ? parseInt(lastHR) : 72;

  logger.info('DataStore initialized');
}

function get(key) {
  return _cache[key];
}

function set(key, value) {
  var oldValue = _cache[key];
  _cache[key] = value;

  storage.put(key, String(value));

  if (oldValue !== value && _subscribers[key]) {
    var callbacks = _subscribers[key].slice();
    for (var i = 0; i < callbacks.length; i++) {
      try {
        callbacks[i](value, oldValue);
      } catch (e) {
        logger.error('DataStore subscriber error: ' + e);
      }
    }
  }

  eventBus.emit(key + ':changed', { key: key, value: value, oldValue: oldValue });
}

function subscribe(key, callback) {
  if (!_subscribers[key]) {
    _subscribers[key] = [];
  }
  _subscribers[key].push(callback);

  return function() {
    _subscribers[key] = _subscribers[key].filter(function(cb) {
      return cb !== callback;
    });
  };
}

function getTodayStats() {
  return {
    count: _cache['todaySteps'] || 0,
    calories: _cache['todayCalories'] || 0,
    totalDuration: _cache['todayDuration'] || 0
  };
}

function incrementSteps(delta) {
  var current = _cache['todaySteps'] || 0;
  set('todaySteps', current + (delta || 1));
}

function updateHeartRate(hr) {
  set('heartRate', hr);
  set('lastHeartRate', hr);
}

module.exports = {
  init: init,
  get: get,
  set: set,
  subscribe: subscribe,
  getTodayStats: getTodayStats,
  incrementSteps: incrementSteps,
  updateHeartRate: updateHeartRate
};
