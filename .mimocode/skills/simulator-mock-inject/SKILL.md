---
name: simulator-mock-inject
description: Inject mock sensor data into openvela quick app simulator for testing watch apps without real hardware. Use when the user asks about simulator testing, mock data injection, simulating accelerometer/heart rate/gyroscope data, testing motion detection algorithms, faking sensor readings, or "模拟器数据", "Mock注入", "传感器模拟", "运动数据模拟", "心率模拟", "加速度模拟". Also covers custom data curve injection and exercise scenario simulation.
---

# 模拟器运动数据 Mock 注入

## Overview

This skill teaches you how to inject mock sensor data into the openvela quick app simulator so you can develop and test watch apps without physical hardware. It covers the built-in simulation fallback, custom data curve injection, exercise scenario simulation, and testing motion detection algorithms.

## Architecture

```
┌─────────────────────────────────────────┐
│              Quick App                   │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ sensorManager│  │ motion.js      │  │
│  │ - subscribe() │  │ - feedSample() │  │
│  │ - mock data   │  │ - detect rep   │  │
│  └──────┬───────┘  └───────┬────────┘  │
│         │                  │            │
│  ┌──────▼──────────────────▼────────┐  │
│  │      Event Bus (eventBus.js)     │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
         ▲                ▲
         │                │
    Real Sensor      Mock Inject
    (device)         (simulator)
```

## Step 1: Understand the Fallback Mechanism

The `sensorManager.js` automatically falls back to simulated data when real sensors are unavailable:

```javascript
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
          logger.warn('Accelerometer unavailable, using mock data');
          _startSimulatedSensor();  // <-- automatic fallback
        }
      });
      return;
    } catch (e) {
      logger.warn('Sensor exception, using mock data');
    }
  }
  _startSimulatedSensor();  // <-- no sensor service at all
}
```

**Key insight**: In the simulator, `_sensorService` is null, so mock data is always used. No configuration needed.

## Step 2: Built-in Simulation Patterns

### Accelerometer Mock (sinusoidal + noise)

```javascript
function _startSimulatedSensor() {
  if (_simSensorTimer) return;

  _simSensorTimer = setInterval(function() {
    if (!_isActive) return;
    var t = Date.now() / 1000;
    var ax = Math.sin(t * 2) * 9.8 + (Math.random() * 2 - 1);
    var ay = Math.cos(t * 2) * 2 + (Math.random() * 2 - 1);
    var az = 9.8 + Math.sin(t * 2) * 3 + (Math.random() * 2 - 1);
    _notifyAccelSubscribers({ x: ax, y: ay, z: az });
  }, 20);  // 50Hz sample rate
}
```

### Heart Rate Mock (base + random fluctuation)

```javascript
function _startSimulatedHeartRate() {
  if (_simHeartTimer) return;

  var HR = constants.SIM_HEART_RATE;  // { BASE: 72, FLUCTUATION: 7 }
  _simHeartTimer = setInterval(function() {
    var fluctuation = Math.floor(Math.random() * HR.FLUCTUATION * 2) - HR.FLUCTUATION;
    _notifyHeartRateSubscribers(HR.BASE + fluctuation);
  }, 2000);  // 0.5Hz sample rate
}
```

## Step 3: Custom Data Curve Injection

To test specific exercise scenarios, replace the built-in mock with custom data curves:

### Option A: Override the simulator functions

```javascript
// In your page's onCreate or onShow
var sensorManager = require('../common/sensorManager.js');

// Override with squat-like motion pattern
var _customTimer = null;
function startSquatMock() {
  sensorManager.unsubscribeAccelerometer();  // stop built-in mock

  var t0 = Date.now();
  _customTimer = setInterval(function() {
    var t = (Date.now() - t0) / 1000;
    // Squat: slow up-down cycle, ~3 seconds per rep
    var phase = (t % 3) / 3;  // 0→1 over 3 seconds
    var squatDepth = Math.sin(phase * Math.PI);  // 0→1→0

    var ax = squatDepth * 12 + (Math.random() * 0.5 - 0.25);
    var ay = Math.cos(phase * Math.PI) * 2;
    var az = 9.8 - squatDepth * 5 + (Math.random() * 0.5 - 0.25);

    // Notify via eventBus directly
    var eventBus = require('../common/eventBus.js');
    eventBus.emit('sensor:accel', { x: ax, y: ay, z: az });
  }, 20);  // 50Hz
}

function stopSquatMock() {
  if (_customTimer) { clearInterval(_customTimer); _customTimer = null; }
}
```

### Option B: Feed directly to motion detection

```javascript
var motion = require('../common/motion.js');
motion.init('squat');

// Simulate 15 squats over 45 seconds
var squatCount = 0;
var mockTimer = setInterval(function() {
  if (squatCount >= 15) {
    clearInterval(mockTimer);
    return;
  }

  var t = squatCount * 3;  // 3 seconds per rep
  // Peak at the bottom of squat
  var ax = Math.sin(t * 2.1) * 13;
  var ay = Math.cos(t * 2.1) * 2;
  var az = 9.8 + Math.sin(t * 2.1) * 4;

  var detected = motion.feedSample(ax, ay, az);
  if (detected) {
    squatCount++;
    console.log('Rep detected: ' + squatCount);
  }
}, 20);
```

## Step 4: Exercise Scenario Presets

### Squat Pattern (3s per rep, peak at bottom)
```javascript
function mockSquat(t) {
  var phase = (t % 3) / 3;
  var depth = Math.sin(phase * Math.PI);
  return {
    x: depth * 12 + rand(),
    y: Math.cos(phase * Math.PI) * 2 + rand(),
    z: 9.8 - depth * 5 + rand()
  };
}
```

### Push-up Pattern (2.5s per rep, arm movement)
```javascript
function mockPushup(t) {
  var phase = (t % 2.5) / 2.5;
  var armAngle = Math.sin(phase * Math.PI);
  return {
    x: armAngle * 10 + rand(),
    y: 9.8 * Math.cos(phase * Math.PI * 0.3) + rand(),
    z: 9.8 - armAngle * 3 + rand()
  };
}
```

### Jumping Jack Pattern (1.5s per rep, high frequency)
```javascript
function mockJumpingJack(t) {
  var phase = (t % 1.5) / 1.5;
  var spread = Math.abs(Math.sin(phase * Math.PI));
  return {
    x: spread * 14 + rand(),
    y: Math.sin(phase * Math.PI * 2) * 5 + rand(),
    z: 9.8 + Math.sin(phase * Math.PI) * 6 + rand()
  };
}
```

### High Knee Pattern (0.8s per rep, fast alternating)
```javascript
function mockHighKnee(t) {
  var phase = (t % 0.8) / 0.8;
  var knee = Math.sin(phase * Math.PI * 2);
  return {
    x: knee * 11 + rand(),
    y: Math.abs(knee) * 4 + rand(),
    z: 9.8 + Math.sin(phase * Math.PI) * 3 + rand()
  };
}

function rand() { return Math.random() * 2 - 1; }
```

## Step 5: Testing Motion Detection Algorithm

The motion detection uses sliding window + peak detection:

```javascript
var motion = require('../common/motion.js');

// Initialize for specific exercise
motion.init('squat');

// Feed samples and check for rep detection
var samples = generateSquatSamples(15);  // generate 15 reps worth of data
samples.forEach(function(s) {
  var detected = motion.feedSample(s.x, s.y, s.z);
  if (detected) {
    console.log('Rep! Count: ' + motion.getCount());
  }
});

// Get quality features for AI analysis
var features = motion.getQualityFeatures();
// {
//   exerciseType: 'squat',
//   repCount: 15,
//   avgPeak: 12.34,
//   peakStd: 0.56,
//   avgInterval: 3000,
//   intervalStd: 200,
//   durationMs: 45000
// }
```

### Algorithm Parameters by Exercise Type

| Type | Threshold | Window | Min Interval | Peak Range |
|------|-----------|--------|--------------|------------|
| squat | 12.0 | 20 | 800ms | 5 |
| pushup | 10.0 | 18 | 700ms | 4 |
| jumping_jack | 14.0 | 15 | 400ms | 3 |
| high_knee | 11.0 | 12 | 300ms | 3 |

## Step 6: Heart Rate Scenario Testing

```javascript
var sensorManager = require('../common/sensorManager.js');

// Simulate exercise heart rate curve
var hrTimer = null;
function mockExerciseHeartRate() {
  var startTime = Date.now();
  hrTimer = setInterval(function() {
    var elapsed = (Date.now() - startTime) / 1000;
    // Warm-up: 72→140 over 60s, then plateau with fluctuation
    var baseHR;
    if (elapsed < 60) {
      baseHR = 72 + (elapsed / 60) * 68;  // ramp up
    } else {
      baseHR = 140 + Math.sin(elapsed * 0.1) * 10;  // plateau
    }
    var hr = Math.round(baseHR + (Math.random() * 8 - 4));
    // Emit via eventBus for subscribers
    var eventBus = require('../common/eventBus.js');
    eventBus.emit('sensor:heartRate', hr);
  }, 2000);
}
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| No mock data in simulator | `_sensorService` not null | Simulator should have null sensor service; check openvela version |
| Motion not detected | Threshold too high for mock data | Lower `motionParams[type].threshold` or increase mock amplitude |
| Too many false positives | Noise too high in mock data | Reduce random range in `rand()` calls |
| Heart rate stuck at 72 | `_startSimulatedHeartRate` not called | Check `subscribeHeartRate` is invoked |
| Custom mock conflicts with built-in | Both timers running | Call `unsubscribeAccelerometer()` before starting custom mock |
| Rep count wrong | Window size mismatch | Adjust `windowSize` in motionParams to match your mock frequency |

## File Locations

| File | Purpose |
|------|---------|
| `src/common/sensorManager.js` | Sensor subscription + built-in mock fallback |
| `src/common/motion.js` | Motion detection algorithm (sliding window + peak) |
| `src/common/constants.js` | Mock parameters (SIM_HEART_RATE, SENSOR_RATE) |
| `src/common/eventBus.js` | Event system for sensor data distribution |
| `src/common/exerciseStateMachine.js` | Exercise lifecycle (READY→RUNNING→PAUSED→FINISHED) |
