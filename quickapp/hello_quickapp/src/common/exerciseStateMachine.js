/**
 * 动感教练 - 运动状态机
 * 管理运动生命周期：READY → RUNNING → PAUSED → FINISHED
 * 解决暂停/恢复时数据衔接问题
 */

var eventBus = require('./eventBus.js');
var logger = require('./logger.js');

var STATE = {
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished'
};

var _state = STATE.READY;
var _exerciseType = null;
var _pauseCount = 0;
var _startTime = 0;
var _pauseTime = 0;
var _totalPausedDuration = 0;

/**
 * 初始化状态机
 * @param {string} exerciseType - 运动类型
 */
function init(exerciseType) {
  _exerciseType = exerciseType;
  _state = STATE.READY;
  _pauseCount = 0;
  _startTime = 0;
  _pauseTime = 0;
  _totalPausedDuration = 0;
}

/**
 * 开始运动
 */
function start() {
  if (_state !== STATE.READY && _state !== STATE.PAUSED) {
    logger.warn('StateMachine: 无法从 ' + _state + ' 状态开始运动');
    return false;
  }

  var wasPaused = (_state === STATE.PAUSED);
  _state = STATE.RUNNING;

  if (!wasPaused) {
    _startTime = Date.now();
  } else if (_pauseTime > 0) {
    _totalPausedDuration += (Date.now() - _pauseTime);
    _pauseTime = 0;
  }

  eventBus.emit('exercise:stateChanged', { state: _state, wasPaused: wasPaused });
  return true;
}

/**
 * 暂停运动
 */
function pause() {
  if (_state !== STATE.RUNNING) {
    logger.warn('StateMachine: 无法从 ' + _state + ' 状态暂停');
    return false;
  }

  _state = STATE.PAUSED;
  _pauseCount++;
  _pauseTime = Date.now();

  eventBus.emit('exercise:stateChanged', { state: _state, pauseCount: _pauseCount });
  return true;
}

/**
 * 恢复运动（从暂停状态）
 */
function resume() {
  if (_state !== STATE.PAUSED) {
    logger.warn('StateMachine: 无法从 ' + _state + ' 状态恢复');
    return false;
  }
  return start();
}

/**
 * 结束运动
 */
function finish() {
  if (_state === STATE.FINISHED) {
    return false;
  }

  if (_state === STATE.PAUSED && _pauseTime > 0) {
    _totalPausedDuration += (Date.now() - _pauseTime);
    _pauseTime = 0;
  }

  _state = STATE.FINISHED;
  eventBus.emit('exercise:stateChanged', { state: _state });
  return true;
}

/**
 * 获取当前状态
 */
function getState() {
  return _state;
}

/**
 * 是否正在运动中
 */
function isRunning() {
  return _state === STATE.RUNNING;
}

/**
 * 是否已暂停
 */
function isPaused() {
  return _state === STATE.PAUSED;
}

/**
 * 是否已结束
 */
function isFinished() {
  return _state === STATE.FINISHED;
}

/**
 * 获取实际运动时长（排除暂停时间）
 * @returns {number} 秒数
 */
function getActiveDuration() {
  if (_startTime === 0) return 0;

  var now = Date.now();
  var totalElapsed = now - _startTime;
  var paused = _totalPausedDuration;

  if (_state === STATE.PAUSED && _pauseTime > 0) {
    paused += (now - _pauseTime);
  }

  return Math.floor((totalElapsed - paused) / 1000);
}

/**
 * 获取暂停次数
 */
function getPauseCount() {
  return _pauseCount;
}

/**
 * 重置状态机
 */
function reset() {
  _state = STATE.READY;
  _pauseCount = 0;
  _startTime = 0;
  _pauseTime = 0;
  _totalPausedDuration = 0;
}

module.exports = {
  STATE: STATE,
  init: init,
  start: start,
  pause: pause,
  resume: resume,
  finish: finish,
  getState: getState,
  isRunning: isRunning,
  isPaused: isPaused,
  isFinished: isFinished,
  getActiveDuration: getActiveDuration,
  getPauseCount: getPauseCount,
  reset: reset
};
