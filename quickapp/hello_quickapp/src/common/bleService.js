/**
 * 动感教练 - 蓝牙小智AI通信模块
 * 通过BLE与手机端小智AI服务通信
 * 发送运动特征数据，接收AI评分与建议
 */

var logger = require('./logger.js');
var eventBus = require('./eventBus.js');

var _ble = null;
try { _ble = require('@system.bluetooth'); } catch (e) {
  try { _ble = require('@service.ble'); } catch (e2) { _ble = null; }
}

var BLE_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

var _state = BLE_STATE.DISCONNECTED;
var _deviceId = null;
var _serviceId = null;
var _characteristicId = null;
var _reconnectTimer = null;
var _dataBuffer = [];
var _isProcessing = false;

// 小智AI服务UUID
var XIAOZHI_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
var XIAOZHI_CHAR_WRITE = '0000fff1-0000-1000-8000-00805f9b34fb';
var XIAOZHI_CHAR_NOTIFY = '0000fff2-0000-1000-8000-00805f9b34fb';

/**
 * 初始化BLE服务
 */
function init() {
  logger.info('BLE服务初始化');
  _state = BLE_STATE.DISCONNECTED;
  _dataBuffer = [];
  _isProcessing = false;
  
  eventBus.emit('ble:stateChanged', { state: _state });
}

/**
 * 连接BLE设备
 * @param {string} deviceId - 设备ID
 */
function connect(deviceId) {
  if (_state === BLE_STATE.CONNECTED && _deviceId === deviceId) {
    logger.info('BLE已连接到设备: ' + deviceId);
    return Promise.resolve();
  }

  if (!_ble) {
    // 无 BLE 能力时退回模拟
    _state = BLE_STATE.CONNECTED;
    _deviceId = deviceId || 'sim-device';
    logger.info('BLE模拟连接: ' + _deviceId);
    eventBus.emit('ble:stateChanged', { state: _state, deviceId: _deviceId });
    return Promise.resolve();
  }

  _state = BLE_STATE.CONNECTING;
  _deviceId = deviceId;
  eventBus.emit('ble:stateChanged', { state: _state, deviceId: deviceId });

  return new Promise(function(resolve, reject) {
    _ble.createBLEAdapter({ success: function() {
      _ble.connectBLEDevice({
        deviceId: deviceId,
        success: function() {
          _state = BLE_STATE.CONNECTED;
          _serviceId = XIAOZHI_SERVICE_UUID;
          _characteristicId = XIAOZHI_CHAR_NOTIFY;
          _ble.notifyBLECharacteristicValueChange({
            deviceId: deviceId,
            serviceId: XIAOZHI_SERVICE_UUID,
            characteristicId: XIAOZHI_CHAR_NOTIFY,
            state: true,
            callback: function(res) { _handleNotify(res.data); },
            fail: function() { logger.warn('notify 订阅失败'); }
          });
          logger.info('BLE连接成功: ' + deviceId);
          eventBus.emit('ble:stateChanged', { state: _state, deviceId: deviceId });
          resolve();
        },
        fail: function(err) {
          _state = BLE_STATE.ERROR;
          eventBus.emit('ble:error', { type: 'connect_failed', error: err });
          reject(new Error('BLE 连接失败'));
        }
      });
    }, fail: function(err) {
      reject(new Error('BLE adapter 创建失败'));
    }});
  });
}

/**
 * 断开BLE连接
 */
function disconnect() {
  if (_state === BLE_STATE.DISCONNECTED) {
    return;
  }
  
  logger.info('BLE断开连接');
  _state = BLE_STATE.DISCONNECTED;
  _deviceId = null;
  _serviceId = null;
  _characteristicId = null;
  
  if (_reconnectTimer) {
    clearInterval(_reconnectTimer);
    _reconnectTimer = null;
  }
  
  eventBus.emit('ble:stateChanged', { state: _state });
}

/**
 * 发送运动数据到小智AI
 * @param {Object} data - 运动数据
 */
function sendExerciseData(data) {
  if (_state !== BLE_STATE.CONNECTED) {
    logger.warn('BLE未连接，无法发送数据');
    return Promise.reject(new Error('BLE未连接'));
  }
  
  var packet = {
    type: 'exercise_data',
    timestamp: Date.now(),
    data: {
      exerciseType: data.exerciseType || 'unknown',
      count: data.count || 0,
      duration: data.duration || 0,
      heartRate: data.heartRate || 0,
      calories: data.calories || 0,
      motionFeatures: data.motionFeatures || {},
      setInfo: {
        currentSet: data.currentSet || 1,
        totalSets: data.totalSets || 1
      }
    }
  };
  
  logger.info('发送运动数据到小智AI: ' + JSON.stringify(packet));
  
  return _sendPacket(packet).then(function() {
    logger.debug('运动数据发送成功');
    eventBus.emit('ble:dataSent', { type: 'exercise_data', data: packet.data });
  }).catch(function(err) {
    logger.error('运动数据发送失败: ' + err.message);
    eventBus.emit('ble:error', { type: 'send_failed', error: err });
  });
}

/**
 * 请求AI分析
 * @param {Object} features - 运动特征
 */
function requestAIAnalysis(features) {
  if (_state !== BLE_STATE.CONNECTED) {
    logger.warn('BLE未连接，无法请求AI分析');
    return Promise.reject(new Error('BLE未连接'));
  }
  
  var packet = {
    type: 'ai_request',
    timestamp: Date.now(),
    features: {
      exerciseType: features.exerciseType,
      repSpeed: features.repSpeed || 0,
      motionRange: features.motionRange || 0,
      consistency: features.consistency || 0,
      heartRateTrend: features.heartRateTrend || 'stable',
      duration: features.duration || 0
    }
  };
  
  logger.info('请求小智AI分析: ' + JSON.stringify(packet));
  
  return _sendPacket(packet).then(function() {
    logger.debug('AI分析请求发送成功');
    eventBus.emit('ble:aiRequested', { features: packet.features });
  }).catch(function(err) {
    logger.error('AI分析请求失败: ' + err.message);
    eventBus.emit('ble:error', { type: 'ai_request_failed', error: err });
  });
}

/**
 * 发送数据包
 * @param {Object} packet - 数据包
 */
function _sendPacket(packet) {
  return new Promise(function(resolve, reject) {
    if (_state !== BLE_STATE.CONNECTED) { reject(new Error('BLE未连接')); return; }
    if (!_ble) { setTimeout(resolve, 100); return; }

    var dataStr = JSON.stringify(packet);
    var bytes = _stringToBytes(dataStr);
    _ble.writeBLECharacteristicValue({
      deviceId: _deviceId,
      serviceId: XIAOZHI_SERVICE_UUID,
      characteristicId: XIAOZHI_CHAR_WRITE,
      value: bytes,
      success: function() { resolve(); },
      fail: function(err) {
        logger.error('BLE 写入失败: ' + JSON.stringify(err));
        eventBus.emit('ble:error', { type: 'write_failed', error: err });
        reject(new Error('BLE 写入失败'));
      }
    });
  });
}

/**
 * 处理接收到的AI响应
 * @param {ArrayBuffer} data - 接收的数据
 */
function _handleNotify(data) {
  try {
    var dataStr = _bytesToString(new Uint8Array(data));
    var response = JSON.parse(dataStr);
    
    logger.info('收到小智AI响应: ' + dataStr);
    
    if (response.type === 'ai_response') {
      eventBus.emit('ble:aiResponse', {
        score: response.score || 0,
        suggestion: response.suggestion || '',
        feedback: response.feedback || '',
        encouragement: response.encouragement || ''
      });
    } else if (response.type === 'exercise_feedback') {
      eventBus.emit('ble:exerciseFeedback', {
        repQuality: response.repQuality || 'good',
        suggestion: response.suggestion || '',
        count: response.count || 0
      });
    }
  } catch (err) {
    logger.error('解析AI响应失败: ' + err.message);
    eventBus.emit('ble:error', { type: 'parse_failed', error: err });
  }
}

/**
 * 获取BLE连接状态
 */
function getState() {
  return _state;
}

/**
 * 是否已连接
 */
function isConnected() {
  return _state === BLE_STATE.CONNECTED;
}

/**
 * 获取设备ID
 */
function getDeviceId() {
  return _deviceId;
}

/**
 * 字符串转字节数组
 */
function _stringToBytes(str) {
  var bytes = [];
  for (var i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  return bytes;
}

/**
 * 字节数组转字符串
 */
function _bytesToString(bytes) {
  var str = '';
  for (var i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

/**
 * 模拟接收AI响应（用于测试）
 */
function simulateAIResponse() {
  var responses = [
    { type: 'ai_response', score: 85, suggestion: '动作标准，继续保持！', feedback: '节奏稳定', encouragement: '加油！' },
    { type: 'ai_response', score: 72, suggestion: '膝盖角度可以再深一点', feedback: '速度偏快', encouragement: '调整节奏' },
    { type: 'exercise_feedback', repQuality: 'good', suggestion: '这一组做得很好', count: 15 }
  ];
  
  var response = responses[Math.floor(Math.random() * responses.length)];
  _handleNotify(JSON.stringify(response));
}

module.exports = {
  BLE_STATE: BLE_STATE,
  init: init,
  connect: connect,
  disconnect: disconnect,
  sendExerciseData: sendExerciseData,
  requestAIAnalysis: requestAIAnalysis,
  getState: getState,
  isConnected: isConnected,
  getDeviceId: getDeviceId,
  simulateAIResponse: simulateAIResponse
};
