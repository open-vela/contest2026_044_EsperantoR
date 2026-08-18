/**
 * 动感教练 - 传感器统一管理器
 * 支持多订阅者、采样率控制和后台降频
 */

var eventBus = require('./eventBus.js');
var powerManager = require('./powerManager.js');
var constants = require('./constants.js');
var logger = require('./logger.js');

var SAMPLE_RATE = constants.SENSOR_RATE;

var _currentRate = SAMPLE_RATE.HIGH;
var _isActive = true;
var _sensorService = null;
var _heartRateService = null;
var _isSubscribed = false;
var _isHeartSubscribed = false;
var _accelSubscribers = {};
var _heartRateSubscribers = {};
var _simSensorTimer = null;
var _simHeartTimer = null;
var _nextId = 1;

function init() {
  try {
    _sensorService = require('@system.sensor');
  } catch (e) {
    _sensorService = null;
  }

  try {
    _heartRateService = require('@service.health');
  } catch (e) {
    _heartRateService = null;
  }

  eventBus.on(eventBus.EVENTS.POWER_STATE_CHANGED, _onPowerChanged);
  logger.info('SensorManager initialized');
}

function _onPowerChanged(data) {
  if (data.state === powerManager.STATE.STANDBY) {
    setActive(false);
  } else if (data.state === powerManager.STATE.ACTIVE) {
    setActive(true);
  }
}

function setActive(active) {
  _isActive = active;
  _adjustSampleRate();
}

function _adjustSampleRate() {
  var newRate;
  if (_isActive) {
    newRate = SAMPLE_RATE.HIGH;
  } else {
    newRate = SAMPLE_RATE.LOW;
  }

  if (newRate !== _currentRate) {
    _currentRate = newRate;
    eventBus.emit(eventBus.EVENTS.SENSOR_RATE_CHANGED, { rate: _currentRate });
  }
}

function _notifyAccelSubscribers(data) {
  var keys = Object.keys(_accelSubscribers);
  for (var i = 0; i < keys.length; i++) {
    var sub = _accelSubscribers[keys[i]];
    if (sub && sub.active) {
      try {
        sub.callback(data);
      } catch (e) {
        logger.error('Accel subscriber error: ' + e);
      }
    }
  }
}

function _notifyHeartRateSubscribers(hr) {
  var keys = Object.keys(_heartRateSubscribers);
  for (var i = 0; i < keys.length; i++) {
    var sub = _heartRateSubscribers[keys[i]];
    if (sub && sub.active) {
      try {
        sub.callback(hr);
      } catch (e) {
        logger.error('HeartRate subscriber error: ' + e);
      }
    }
  }
}

/**
 * 订阅加速度计
 * @param {function} callback - 数据回调
 * @returns {function} 取消订阅函数
 */
function subscribeAccelerometer(callback) {
  var id = 'accel_' + (_nextId++);
  _accelSubscribers[id] = { callback: callback, active: true };

  if (!_isSubscribed) {
    _startAccelerometerSource();
  }

  return function() {
    delete _accelSubscribers[id];
    if (Object.keys(_accelSubscribers).length === 0) {
      _stopAccelerometerSource();
    }
  };
}

function _startAccelerometerSource() {
  if (_sensorService) {
    try {
      _sensorService.subscribe({
        sensorId: _sensorService.SENSOR_ID.ACCELEROMETER,
        callback: function(data) {
          if (!_isActive) return;
          _notifyAccelSubscribers(data);
        },
        fail: function() {
          logger.warn('加速度计订阅失败，使用模拟数据');
          _startSimulatedSensor();
        }
      });
      _isSubscribed = true;
      return;
    } catch (e) {
      logger.warn('传感器异常，使用模拟数据');
    }
  }
  _startSimulatedSensor();
}

function _stopAccelerometerSource() {
  if (_sensorService && _isSubscribed) {
    try {
      _sensorService.unsubscribe({ sensorId: _sensorService.SENSOR_ID.ACCELEROMETER });
    } catch (e) {}
    _isSubscribed = false;
  }
  if (_simSensorTimer) {
    clearInterval(_simSensorTimer);
    _simSensorTimer = null;
  }
}

function _startSimulatedSensor() {
  if (_simSensorTimer) return;

  _simSensorTimer = setInterval(function() {
    if (!_isActive) return;
    var phase = Math.random();
    var ax, ay, az;
    if (phase > 0.5) {
      ax = 8 + Math.random() * 10;
      ay = -5 + Math.random() * 10;
      az = 3 + Math.random() * 8;
    } else {
      ax = Math.random() * 2 - 1;
      ay = 9.8 + Math.random() * 2 - 1;
      az = Math.random() * 2 - 1;
    }
    _notifyAccelSubscribers({ x: ax, y: ay, z: az });
  }, 500);
}

function unsubscribeAccelerometer() {
  _accelSubscribers = {};
  _stopAccelerometerSource();
}

/**
 * 订阅心率
 * @param {function} callback - 心率回调
 * @returns {function} 取消订阅函数
 */
function subscribeHeartRate(callback) {
  var id = 'hr_' + (_nextId++);
  _heartRateSubscribers[id] = { callback: callback, active: true };

  if (!_isHeartSubscribed) {
    _startHeartRateSource();
  }

  return function() {
    delete _heartRateSubscribers[id];
    if (Object.keys(_heartRateSubscribers).length === 0) {
      _stopHeartRateSource();
    }
  };
}

function _startHeartRateSource() {
  if (_heartRateService) {
    try {
      _heartRateService.subscribeSample({
        dataType: _heartRateService.DATA_TYPES.HEART_RATE,
        callback: function(sample) {
          if (sample && sample.value > 0) {
            _notifyHeartRateSubscribers(Math.round(sample.value));
          }
        },
        fail: function() {
          _startSimulatedHeartRate();
        }
      });
      _isHeartSubscribed = true;
      return;
    } catch (e) {
      logger.warn('心率订阅异常，使用模拟数据');
    }
  }
  _startSimulatedHeartRate();
}

function _stopHeartRateSource() {
  if (_heartRateService && _isHeartSubscribed) {
    try {
      _heartRateService.unsubscribeSample({ dataType: _heartRateService.DATA_TYPES.HEART_RATE });
    } catch (e) {}
    _isHeartSubscribed = false;
  }
  if (_simHeartTimer) {
    clearInterval(_simHeartTimer);
    _simHeartTimer = null;
  }
}

function _startSimulatedHeartRate() {
  if (_simHeartTimer) return;

  var HR = constants.SIM_HEART_RATE;
  _simHeartTimer = setInterval(function() {
    var fluctuation = Math.floor(Math.random() * HR.FLUCTUATION * 2) - HR.FLUCTUATION;
    _notifyHeartRateSubscribers(HR.BASE + fluctuation);
  }, 2000);
}

function unsubscribeHeartRate() {
  _heartRateSubscribers = {};
  _stopHeartRateSource();
}

function destroy() {
  unsubscribeAccelerometer();
  unsubscribeHeartRate();
  eventBus.off(eventBus.EVENTS.POWER_STATE_CHANGED, _onPowerChanged);
}

module.exports = {
  SAMPLE_RATE: SAMPLE_RATE,
  init: init,
  setActive: setActive,
  subscribeAccelerometer: subscribeAccelerometer,
  unsubscribeAccelerometer: unsubscribeAccelerometer,
  subscribeHeartRate: subscribeHeartRate,
  unsubscribeHeartRate: unsubscribeHeartRate,
  destroy: destroy
};
