/**
 * 动感教练 - 电源管理状态机
 * Active → Idle (30s) → Standby → Wake-up → Active
 */

var eventBus = require('./eventBus.js');
var constants = require('./constants.js');
var logger = require('./logger.js');

var STATE = {
  ACTIVE: 'active',
  IDLE: 'idle',
  STANDBY: 'standby'
};

var _state = STATE.ACTIVE;
var _idleTimer = null;
var _idleTimeout = constants.POWER.IDLE_TIMEOUT;
var _onScreenOff = null;
var _onScreenOn = null;
var _initialized = false;

function init(screenOnCallback, screenOffCallback) {
  if (_initialized) {
    _onScreenOn = screenOnCallback || _onScreenOn;
    _onScreenOff = screenOffCallback || _onScreenOff;
    return;
  }
  _initialized = true;
  _onScreenOn = screenOnCallback || null;
  _onScreenOff = screenOffCallback || null;
  _state = STATE.ACTIVE;
  resetTimer();
  logger.info('PowerManager initialized, state: ' + _state);
}

function resetTimer() {
  if (_idleTimer) {
    clearTimeout(_idleTimer);
    _idleTimer = null;
  }

  if (_state !== STATE.ACTIVE) {
    _state = STATE.ACTIVE;
    eventBus.emit(eventBus.EVENTS.POWER_STATE_CHANGED, { state: _state });
    if (_onScreenOn) {
      _onScreenOn();
    }
  }

  _idleTimer = setTimeout(function() {
    enterIdle();
  }, _idleTimeout);
}

function enterIdle() {
  _state = STATE.IDLE;
  eventBus.emit(eventBus.EVENTS.POWER_STATE_CHANGED, { state: _state });
  logger.info('Power state: IDLE');

  _idleTimer = setTimeout(function() {
    enterStandby();
  }, constants.POWER.STANDBY_DELAY);
}

function enterStandby() {
  _state = STATE.STANDBY;
  eventBus.emit(eventBus.EVENTS.POWER_STATE_CHANGED, { state: _state });
  logger.info('Power state: STANDBY - screen off');

  if (_onScreenOff) {
    _onScreenOff();
  }
}

function getState() {
  return _state;
}

function isActive() {
  return _state === STATE.ACTIVE;
}

function destroy() {
  if (_idleTimer) {
    clearTimeout(_idleTimer);
    _idleTimer = null;
  }
}

module.exports = {
  STATE: STATE,
  init: init,
  resetTimer: resetTimer,
  getState: getState,
  isActive: isActive,
  destroy: destroy
};
