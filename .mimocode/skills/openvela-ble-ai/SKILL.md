---
name: openvela-ble-ai
description: Build and debug BLE AI communication modules for openvela quick apps. Use when the user asks about BLE bluetooth communication, AI assistant integration, sending sensor data via BLE, receiving AI responses on watch, xiaozhi AI voice assistant, or BLE service UUID configuration. Also triggers on "BLE通信", "蓝牙模块", "小智AI", "BLE连接", "writeBLECharacteristicValue", "notifyBLECharacteristicValueChange".
---

# openvela 快应用 BLE AI 通信模块开发

## Overview

This skill guides you through building a complete BLE communication module for openvela quick apps (watch apps) that exchanges data with a phone-side AI assistant (e.g., xiaozhi AI). It covers BLE service discovery, characteristic read/write, notification subscription, data packet protocol, and error handling patterns specific to the openvela quick app framework.

## Architecture

```
Watch (Quick App)                    Phone (AI Service)
┌─────────────────┐                  ┌─────────────────┐
│  bleService.js  │◄── BLE 5.3 ──►│  xiaozhi Server  │
│  - connect()    │                  │  - receive data  │
│  - send()       │                  │  - AI inference  │
│  - onNotify()   │                  │  - send response │
└─────────────────┘                  └─────────────────┘
```

## Step 1: BLE Module Structure

Create `src/common/bleService.js` with this structure:

```javascript
// Required imports (with fallback for simulator)
var _ble = null;
try { _ble = require('@system.bluetooth'); } catch (e) {
  try { _ble = require('@service.ble'); } catch (e2) { _ble = null; }
}

// UUIDs for xiaozhi AI service
var XIAOZHI_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
var XIAOZHI_CHAR_WRITE   = '0000fff1-0000-1000-8000-00805f9b34fb';
var XIAOZHI_CHAR_NOTIFY  = '0000fff2-0000-1000-8000-00805f9b34fb';
```

Key design decisions:
- **Fallback chain**: `@system.bluetooth` → `@service.ble` → `null` (simulator mode)
- When `_ble` is null, all operations resolve immediately with simulated data
- This allows the app to run in both simulator and real device without code changes

## Step 2: Manifest Configuration

Add BLE permissions to `manifest.json`:

```json
{
  "features": [
    { "name": "system.bluetooth" },
    { "name": "service.ble" }
  ],
  "permissions": [
    { "name": "hapjs.permission.BLUETOOTH" }
  ]
}
```

**Critical**: Without these declarations, BLE APIs will throw on real devices. The simulator may work without them, hiding the bug until device testing.

## Step 3: Connection Flow

```javascript
function connect(deviceId) {
  // Already connected check
  if (_state === BLE_STATE.CONNECTED && _deviceId === deviceId) {
    return Promise.resolve();
  }

  // Simulator fallback
  if (!_ble) {
    _state = BLE_STATE.CONNECTED;
    _deviceId = deviceId || 'sim-device';
    eventBus.emit('ble:stateChanged', { state: _state, deviceId: _deviceId });
    return Promise.resolve();
  }

  // Real device connection
  return new Promise(function(resolve, reject) {
    _ble.createBLEAdapter({
      success: function() {
        _ble.connectBLEDevice({
          deviceId: deviceId,
          success: function() {
            // Subscribe to notifications AFTER connection
            _ble.notifyBLECharacteristicValueChange({
              deviceId: deviceId,
              serviceId: XIAOZHI_SERVICE_UUID,
              characteristicId: XIAOZHI_CHAR_NOTIFY,
              state: true,
              callback: function(res) { _handleNotify(res.data); },
              fail: function() { logger.warn('notify subscription failed'); }
            });
            resolve();
          },
          fail: function(err) { reject(new Error('BLE connect failed')); }
        });
      },
      fail: function(err) { reject(new Error('BLE adapter create failed')); }
    });
  });
}
```

**Important**: Subscribe to notifications only AFTER successful connection, not before.

## Step 4: Data Packet Protocol

Define a JSON packet structure for sending exercise data:

```javascript
function sendExerciseData(data) {
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
  return _sendPacket(packet);
}
```

For AI analysis requests:

```javascript
function requestAIAnalysis(features) {
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
  return _sendPacket(packet);
}
```

## Step 5: Write & Notify Helpers

```javascript
function _sendPacket(packet) {
  return new Promise(function(resolve, reject) {
    if (_state !== BLE_STATE.CONNECTED) { reject(new Error('not connected')); return; }
    if (!_ble) { setTimeout(resolve, 100); return; } // simulator: fake success

    var dataStr = JSON.stringify(packet);
    var bytes = _stringToBytes(dataStr);
    _ble.writeBLECharacteristicValue({
      deviceId: _deviceId,
      serviceId: XIAOZHI_SERVICE_UUID,
      characteristicId: XIAOZHI_CHAR_WRITE,
      value: bytes,
      success: function() { resolve(); },
      fail: function(err) { reject(new Error('BLE write failed')); }
    });
  });
}

function _handleNotify(data) {
  try {
    var dataStr = _bytesToString(new Uint8Array(data));
    var response = JSON.parse(dataStr);

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
    logger.error('Parse AI response failed: ' + err.message);
  }
}

// String <-> Bytes conversion (openvela BLE uses byte arrays)
function _stringToBytes(str) {
  var bytes = [];
  for (var i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  return bytes;
}

function _bytesToString(bytes) {
  var str = '';
  for (var i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}
```

## Step 6: Event Integration with Exercise Flow

Wire BLE events into the exercise state machine:

```javascript
// In exercise_active page or controller
var bleService = require('../common/bleService.js');
var eventBus = require('../common/eventBus.js');

// Send data when exercise finishes
eventBus.on('exercise:stateChanged', function(evt) {
  if (evt.state === 'finished') {
    var features = motion.getQualityFeatures();
    bleService.sendExerciseData({
      exerciseType: motion.getType(),
      count: motion.getCount(),
      duration: exerciseStateMachine.getActiveDuration(),
      heartRate: sensorManager.getLastHeartRate(),
      motionFeatures: features
    }).then(function() {
      return bleService.requestAIAnalysis(features);
    });
  }
});

// Handle AI response
eventBus.on('ble:aiResponse', function(data) {
  // Update UI with score and suggestions
  // Navigate to ai_result page
});
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| BLE connect fails on device | Missing manifest permissions | Add `system.bluetooth` + `hapjs.permission.BLUETOOTH` to manifest.json |
| Notifications not received | Subscribe before connect | Move `notifyBLECharacteristicValueChange` to connect success callback |
| Data truncated on send | BLE MTU limit (~20 bytes) | Implement packet chunking for large payloads |
| Works in simulator, fails on device | Simulator ignores BLE errors | Always test with `_ble = null` path disabled |
| `require('@system.bluetooth')` throws | Module not declared in features | Add `{ "name": "system.bluetooth" }` to manifest features |

## Example: Complete BLE Service Module

See `src/common/bleService.js` in the project for a full working implementation (321 lines) including:
- State machine (DISCONNECTED → CONNECTING → CONNECTED → ERROR)
- Auto-reconnect support
- Data packet protocol with timestamp
- Simulator fallback mode
- Event-driven architecture via eventBus
