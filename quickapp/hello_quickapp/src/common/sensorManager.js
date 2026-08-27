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
    _stopAccelerometerSource();
  } else if (data.state === powerManager.STATE.ACTIVE) {
    setActive(true);
    if (Object.keys(_accelSubscribers).length > 0) {
      _startAccelerometerSource();
    }
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
    var t = Date.now() / 1000;
    var ax = Math.sin(t * 2) * 9.8 + (Math.random() * 2 - 1);
    var ay = Math.cos(t * 2) * 2 + (Math.random() * 2 - 1);
    var az = 9.8 + Math.sin(t * 2) * 3 + (Math.random() * 2 - 1);
    _notifyAccelSubscribers({ x: ax, y: ay, z: az });
  }, 20);
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
  unsubscribeGyroscope();
  unsubscribeMagnetometer();
  unsubscribeAmbientLight();
  eventBus.off(eventBus.EVENTS.POWER_STATE_CHANGED, _onPowerChanged);
}

// 陀螺仪订阅
var _gyroSubscribers = {};
var _gyroId = 1;

function subscribeGyroscope(callback) {
  var id = 'gyro_' + (_gyroId++);
  _gyroSubscribers[id] = { callback: callback, active: true };
  if (_sensorService) {
    try {
      _sensorService.subscribe({
        sensorId: _sensorService.SENSOR_ID.GYROSCOPE,
        callback: function(data) { if (_isActive) _notifyGyroSubscribers(data); },
        fail: function() { logger.warn('陀螺仪不可用'); }
      });
    } catch (e) {}
  }
  return function() { delete _gyroSubscribers[id]; };
}

function _notifyGyroSubscribers(data) {
  var keys = Object.keys(_gyroSubscribers);
  for (var i = 0; i < keys.length; i++) {
    var sub = _gyroSubscribers[keys[i]];
    if (sub && sub.active) { try { sub.callback(data); } catch (e) {} }
  }
}

function unsubscribeGyroscope() {
  _gyroSubscribers = {};
  if (_sensorService) {
    try { _sensorService.unsubscribe({ sensorId: _sensorService.SENSOR_ID.GYROSCOPE }); } catch (e) {}
  }
}

// 地磁订阅
var _magSubscribers = {};
var _magId = 1;

function subscribeMagnetometer(callback) {
  var id = 'mag_' + (_magId++);
  _magSubscribers[id] = { callback: callback, active: true };
  if (_sensorService) {
    try {
      _sensorService.subscribe({
        sensorId: _sensorService.SENSOR_ID.MAGNETOMETER,
        callback: function(data) { if (_isActive) _notifyMagSubscribers(data); },
        fail: function() { logger.warn('地磁传感器不可用'); }
      });
    } catch (e) {}
  }
  return function() { delete _magSubscribers[id]; };
}

function _notifyMagSubscribers(data) {
  var keys = Object.keys(_magSubscribers);
  for (var i = 0; i < keys.length; i++) {
    var sub = _magSubscribers[keys[i]];
    if (sub && sub.active) { try { sub.callback(data); } catch (e) {} }
  }
}

function unsubscribeMagnetometer() {
  _magSubscribers = {};
  if (_sensorService) {
    try { _sensorService.unsubscribe({ sensorId: _sensorService.SENSOR_ID.MAGNETOMETER }); } catch (e) {}
  }
}

// 环境光订阅
var _lightSubscribers = {};
var _lightId = 1;

function subscribeAmbientLight(callback) {
  var id = 'light_' + (_lightId++);
  _lightSubscribers[id] = { callback: callback, active: true };
  if (_sensorService) {
    try {
      _sensorService.subscribe({
        sensorId: _sensorService.SENSOR_ID.LIGHT,
        callback: function(data) { if (_isActive) _notifyLightSubscribers(data); },
        fail: function() { logger.warn('环境光传感器不可用'); }
      });
    } catch (e) {}
  }
  return function() { delete _lightSubscribers[id]; };
}

function _notifyLightSubscribers(data) {
  var keys = Object.keys(_lightSubscribers);
  for (var i = 0; i < keys.length; i++) {
    var sub = _lightSubscribers[keys[i]];
    if (sub && sub.active) { try { sub.callback(data); } catch (e) {} }
  }
}

function unsubscribeAmbientLight() {
  _lightSubscribers = {};
  if (_sensorService) {
    try { _sensorService.unsubscribe({ sensorId: _sensorService.SENSOR_ID.LIGHT }); } catch (e) {}
  }
}

module.exports = {
  SAMPLE_RATE: SAMPLE_RATE,
  init: init,
  setActive: setActive,
  subscribeAccelerometer: subscribeAccelerometer,
  unsubscribeAccelerometer: unsubscribeAccelerometer,
  subscribeHeartRate: subscribeHeartRate,
  unsubscribeHeartRate: unsubscribeHeartRate,
  subscribeGyroscope: subscribeGyroscope,
  unsubscribeGyroscope: unsubscribeGyroscope,
  subscribeMagnetometer: subscribeMagnetometer,
  unsubscribeMagnetometer: unsubscribeMagnetometer,
  subscribeAmbientLight: subscribeAmbientLight,
  unsubscribeAmbientLight: unsubscribeAmbientLight,
  destroy: destroy
};
