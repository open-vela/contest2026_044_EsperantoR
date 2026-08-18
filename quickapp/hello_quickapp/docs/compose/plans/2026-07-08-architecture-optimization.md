# Architecture Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the "动感教练" app with power management, event bus, modular architecture, and improved UI

**Architecture:** Implement a layered architecture with Foundation Layer (power management, event bus), Core Modules (clock, sport dashboard), and modular page system with standardized interfaces.

**Tech Stack:** AIoT QuickApp, JavaScript, CSS

## Global Constraints

- Target platform: Xiaomi Watch (圆形表盘, 454x454px)
- Must maintain backward compatibility with existing exercise detection
- Use existing `@system.sensor`, `@service.health`, `@system.storage` APIs
- Follow existing code style (var declarations, CommonJS modules)

---

## File Structure

```
src/
├── app.ux                          # App entry (keep as-is)
├── common/
│   ├── eventBus.js                 # NEW: Global event bus
│   ├── powerManager.js             # NEW: Power management state machine
│   ├── dataStore.js                # NEW: Centralized data store
│   ├── motion.js                   # EXISTING: Keep
│   ├── utils.js                    # EXISTING: Keep
│   └── storage.js                  # EXISTING: Keep
├── pages/
│   ├── index/                      # MODIFY: Add power management, use dataStore
│   │   └── index.ux
│   ├── clock/                      # NEW: Clock main page
│   │   └── clock.ux
│   ├── exercise_select/            # EXISTING: Keep
│   ├── exercise_active/            # MODIFY: Use event bus, dataStore
│   ├── ai_result/                  # EXISTING: Keep
│   ├── history/                    # EXISTING: Keep
│   └── compass/                    # EXISTING: Keep
└── manifest.json                   # MODIFY: Add clock page route
```

---

## Task 1: Create Global Event Bus

**Covers:** Foundation Layer - Event Bus

**Files:**
- Create: `src/common/eventBus.js`

**Interfaces:**
- Produces: `eventBus.on(event, callback)`, `eventBus.off(event, callback)`, `eventBus.emit(event, data)`

- [ ] **Step 1: Create eventBus.js**

```javascript
/**
 * 动感教练 - 全局事件总线
 * 用于解耦输入（触摸、传感器）和业务逻辑
 */

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
    _listeners[event] = [];
    return;
  }
  _listeners[event] = _listeners[event].filter(function(cb) {
    return cb !== callback;
  });
}

function emit(event, data) {
  if (!_listeners[event]) return;
  var callbacks = _listeners[event].slice();
  for (var i = 0; i < callbacks.length; i++) {
    try {
      callbacks[i](data);
    } catch (e) {
      console.log('EventBus error in ' + event + ': ' + e);
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
  // 预定义事件常量
  EVENTS: {
    TOUCH_TAP: 'touch:tap',
    SWIPE_LEFT: 'swipe:left',
    SWIPE_RIGHT: 'swipe:right',
    SWIPE_UP: 'swipe:up',
    SWIPE_DOWN: 'swipe:down',
    TIMER_TICK: 'timer:tick',
    HEART_RATE_CHANGED: 'heart:changed',
    STEP_CHANGED: 'step:changed',
    POWER_STATE_CHANGED: 'power:stateChanged'
  }
};
```

- [ ] **Step 2: Verify file created**

Run: `cat src/common/eventBus.js`
Expected: File exists with module.exports

---

## Task 2: Create Power Manager

**Covers:** Foundation Layer - Power Management State Machine

**Files:**
- Create: `src/common/powerManager.js`
- Modify: `src/common/eventBus.js` (add EVENTS if needed)

**Interfaces:**
- Consumes: `eventBus` from Task 1
- Produces: `powerManager.init()`, `powerManager.getState()`, `powerManager.resetTimer()`, `powerManager.setScreenOffCallback()`

- [ ] **Step 1: Create powerManager.js**

```javascript
/**
 * 动感教练 - 电源管理状态机
 * Active → Idle (30s) → Standby → Wake-up → Active
 */

var eventBus = require('./eventBus.js');

var STATE = {
  ACTIVE: 'active',
  IDLE: 'idle',
  STANDBY: 'standby'
};

var _state = STATE.ACTIVE;
var _idleTimer = null;
var _idleTimeout = 30000; // 30秒
var _onScreenOff = null;
var _onScreenOn = null;

function init(screenOnCallback, screenOffCallback) {
  _onScreenOn = screenOnCallback || null;
  _onScreenOff = screenOffCallback || null;
  _state = STATE.ACTIVE;
  resetTimer();
  console.log('PowerManager initialized, state: ' + _state);
}

function resetTimer() {
  if (_idleTimer) {
    clearTimeout(_idleTimer);
    _idleTimer = null;
  }

  if (_state !== STATE.ACTIVE) {
    // 唤醒时恢复 Active 态
    _state = STATE.ACTIVE;
    eventBus.emit(eventBus.EVENTS.POWER_STATE_CHANGED, { state: _state });
    if (_onScreenOn) {
      _onScreenOn();
    }
  }

  // 启动空闲倒计时
  _idleTimer = setTimeout(function() {
    enterIdle();
  }, _idleTimeout);
}

function enterIdle() {
  _state = STATE.IDLE;
  eventBus.emit(eventBus.EVENTS.POWER_STATE_CHANGED, { state: _state });
  console.log('Power state: IDLE');

  // 再等10秒进入待机
  _idleTimer = setTimeout(function() {
    enterStandby();
  }, 10000);
}

function enterStandby() {
  _state = STATE.STANDBY;
  eventBus.emit(eventBus.EVENTS.POWER_STATE_CHANGED, { state: _state });
  console.log('Power state: STANDBY - screen off');

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
```

- [ ] **Step 2: Verify file created**

Run: `cat src/common/powerManager.js`
Expected: File exists with module.exports

---

## Task 3: Create Data Store

**Covers:** Foundation Layer - Data Store

**Files:**
- Create: `src/common/dataStore.js`
- Modify: `src/common/storage.js` (integrate with dataStore)

**Interfaces:**
- Consumes: `storage` from existing storage.js
- Produces: `dataStore.get(key)`, `dataStore.set(key, value)`, `dataStore.subscribe(key, callback)`, `dataStore.getTodayStats()`

- [ ] **Step 1: Create dataStore.js**

```javascript
/**
 * 动感教练 - 全局数据存储
 * 管理所有应用的共享数据，自动持久化
 */

var eventBus = require('./eventBus.js');
var storage = require('./storage.js');

var _cache = {};
var _subscribers = {};

// 初始化时从存储加载数据
function init() {
  // 加载今日统计
  var todayStats = storage.getTodayStats();
  _cache['todaySteps'] = todayStats.count || 0;
  _cache['todayCalories'] = todayStats.calories || 0;
  _cache['todayDuration'] = todayStats.totalDuration || 0;

  // 加载心率
  var lastHR = storage.get('lastHeartRate');
  _cache['heartRate'] = lastHR ? parseInt(lastHR) : 72;

  console.log('DataStore initialized');
}

function get(key) {
  return _cache[key];
}

function set(key, value) {
  var oldValue = _cache[key];
  _cache[key] = value;

  // 持久化到存储
  storage.put(key, String(value));

  // 通知订阅者
  if (oldValue !== value && _subscribers[key]) {
    var callbacks = _subscribers[key].slice();
    for (var i = 0; i < callbacks.length; i++) {
      try {
        callbacks[i](value, oldValue);
      } catch (e) {
        console.log('DataStore subscriber error: ' + e);
      }
    }
  }

  // 触发全局事件
  eventBus.emit(key + ':changed', { key: key, value: value, oldValue: oldValue });
}

function subscribe(key, callback) {
  if (!_subscribers[key]) {
    _subscribers[key] = [];
  }
  _subscribers[key].push(callback);

  // 返回取消订阅函数
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
```

- [ ] **Step 2: Verify file created**

Run: `cat src/common/dataStore.js`
Expected: File exists with module.exports

---

## Task 4: Create Clock Page (Main Interface)

**Covers:** Core Application - Clock Page

**Files:**
- Create: `src/pages/clock/clock.ux`
- Modify: `src/manifest.json` (add clock route)

**Interfaces:**
- Consumes: `eventBus`, `powerManager`, `dataStore`

- [ ] **Step 1: Create clock.ux**

```html
<template>
  <div class="container" onclick="onTap" onswipe="onSwipe">
    <div class="time-area">
      <text class="time-text">{{ currentTime }}</text>
      <text class="date-text">{{ currentDate }}</text>
    </div>

    <div class="stats-area">
      <div class="stat-item">
        <text class="stat-icon">👣</text>
        <text class="stat-value">{{ todaySteps }}</text>
        <text class="stat-label">步</text>
      </div>
      <div class="stat-item">
        <text class="stat-icon">♥</text>
        <text class="stat-value">{{ heartRate }}</text>
        <text class="stat-label">bpm</text>
      </div>
    </div>

    <div class="hint-area">
      <text class="swipe-hint">← 左滑开始训练</text>
    </div>

    <div class="power-indicator" if="{{ showPowerIndicator }}">
      <text class="power-text">{{ powerStateText }}</text>
    </div>
  </div>
</template>

<script>
import router from '@system.router';

var eventBus = require('../../common/eventBus.js');
var powerManager = require('../../common/powerManager.js');
var dataStore = require('../../common/dataStore.js');

export default {
  private: {
    currentTime: '00:00',
    currentDate: '',
    todaySteps: 0,
    heartRate: 72,
    showPowerIndicator: false,
    powerStateText: '',
    _timer: null,
    _unsubscribeHR: null,
    _unsubscribeSteps: null
  },

  onReady() {
    console.log('Clock page ready');
    this.initTime();
    this.startTimer();
    this.initData();
    this.initPowerManager();
  },

  onDestroy() {
    this.stopTimer();
    if (this._unsubscribeHR) this._unsubscribeHR();
    if (this._unsubscribeSteps) this._unsubscribeSteps();
    powerManager.destroy();
  },

  initTime() {
    this.updateTime();
    this.updateDate();
  },

  startTimer() {
    var self = this;
    this._timer = setInterval(function() {
      self.updateTime();
      eventBus.emit(eventBus.EVENTS.TIMER_TICK);
    }, 1000);
  },

  stopTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },

  updateTime() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    this.currentTime = (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
  },

  updateDate() {
    var now = new Date();
    var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var weekDay = weekDays[now.getDay()];
    this.currentDate = month + '月' + day + '日 周' + weekDay;
  },

  initData() {
    dataStore.init();
    var stats = dataStore.getTodayStats();
    this.todaySteps = stats.count;
    this.heartRate = dataStore.get('heartRate') || 72;

    var self = this;
    this._unsubscribeHR = dataStore.subscribe('heartRate', function(val) {
      self.heartRate = val;
    });
    this._unsubscribeSteps = dataStore.subscribe('todaySteps', function(val) {
      self.todaySteps = val;
    });
  },

  initPowerManager() {
    var self = this;
    powerManager.init(
      // 屏幕开启回调
      function() {
        self.showPowerIndicator = false;
      },
      // 屏幕关闭回调
      function() {
        self.showPowerIndicator = true;
        self.powerStateText = '待机中...';
      }
    );

    eventBus.on(eventBus.EVENTS.POWER_STATE_CHANGED, function(data) {
      if (data.state === powerManager.STATE.IDLE) {
        self.showPowerIndicator = true;
        self.powerStateText = '省电模式';
      } else if (data.state === powerManager.STATE.ACTIVE) {
        self.showPowerIndicator = false;
      }
    });
  },

  onTap() {
    powerManager.resetTimer();
    eventBus.emit(eventBus.EVENTS.TOUCH_TAP);
  },

  onSwipe(evt) {
    powerManager.resetTimer();
    var direction = evt.direction;
    if (direction === 'left') {
      router.push({ uri: '/pages/exercise_select' });
    } else if (direction === 'right') {
      // 预留：消息中心
    } else if (direction === 'down') {
      router.push({ uri: '/pages/compass' });
    }
  }
}
</script>

<style>
.container {
  width: 100%;
  height: 100%;
  background-color: #000000;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 50px 40px 40px 40px;
  border-radius: 50%;
}

.time-area {
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

.time-text {
  color: #ffffff;
  font-size: 72px;
  font-weight: bold;
}

.date-text {
  color: #888888;
  font-size: 18px;
  margin-top: 8px;
}

.stats-area {
  flex-direction: row;
  justify-content: center;
  width: 100%;
}

.stat-item {
  flex-direction: column;
  align-items: center;
  padding: 0px 30px;
}

.stat-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.stat-value {
  color: #00E676;
  font-size: 28px;
  font-weight: bold;
}

.stat-label {
  color: #888888;
  font-size: 14px;
  margin-top: 2px;
}

.hint-area {
  align-items: center;
  margin-bottom: 20px;
}

.swipe-hint {
  color: #666666;
  font-size: 14px;
}

.power-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(255, 165, 0, 0.3);
  border-radius: 8px;
  padding: 4px 8px;
}

.power-text {
  color: #FFA500;
  font-size: 12px;
}
</style>
```

- [ ] **Step 2: Add clock route to manifest.json**

```json
{
  "router": {
    "entry": "pages/clock",
    "pages": {
      "pages/clock": { "component": "clock" },
      "pages/index": { "component": "index" },
      "pages/exercise_select": { "component": "exercise_select" },
      "pages/exercise_active": { "component": "exercise_active" },
      "pages/ai_result": { "component": "ai_result" },
      "pages/history": { "component": "history" },
      "pages/compass": { "component": "compass" }
    }
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 5: Update Exercise Active Page

**Covers:** Core Application - Sport Dashboard Integration

**Files:**
- Modify: `src/pages/exercise_active/exercise_active.ux`

**Interfaces:**
- Consumes: `eventBus`, `dataStore`

- [ ] **Step 1: Update exercise_active.ux imports and data handling**

Replace the script section to use eventBus and dataStore:

```javascript
<script>
import router from '@system.router';

var utils = require('../../common/utils.js');
var motion = require('../../common/motion.js');
var storage = require('../../common/storage.js');
var eventBus = require('../../common/eventBus.js');
var dataStore = require('../../common/dataStore.js');

// ... keep existing sensor/health/vibrator setup ...

export default {
  private: {
    // ... keep existing private data ...
  },

  onReady() {
    // ... keep existing onReady ...
    // 订阅电源状态
    eventBus.on(eventBus.EVENTS.POWER_STATE_CHANGED, this.onPowerChanged);
  },

  onDestroy() {
    this.stopAll();
    eventBus.off(eventBus.EVENTS.POWER_STATE_CHANGED, this.onPowerChanged);
  },

  onPowerChanged(data) {
    if (data.state === 'standby') {
      this._isActive = false;
    } else if (data.state === 'active') {
      this._isActive = true;
    }
  },

  // ... keep existing methods ...

  finishExercise() {
    this._isActive = false;
    this.stopAll();

    var totalCount = motion.getCount();
    // ... keep existing calculation ...

    // 更新 DataStore
    dataStore.incrementSteps(totalCount);

    var record = {
      // ... keep existing record ...
    };
    storage.saveRecord(record);

    router.replace({
      uri: '/pages/ai_result',
      params: {
        // ... keep existing params ...
      }
    });
  },

  // ... keep rest of methods ...
}
</script>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 6: Update Index Page

**Covers:** Core Application - Index Page Integration

**Files:**
- Modify: `src/pages/index/index.ux`

**Interfaces:**
- Consumes: `dataStore`, `eventBus`

- [ ] **Step 1: Update index.ux to use dataStore**

Replace heart rate and stats loading to use dataStore:

```javascript
<script>
import router from '@system.router';

var utils = require('../../common/utils.js');
var storage = require('../../common/storage.js');
var dataStore = require('../../common/dataStore.js');

// ... keep existing healthService setup ...

export default {
  private: {
    // ... keep existing private data ...
  },

  onReady() {
    console.log('index page ready');
    this.updateTime();
    var self = this;
    this.timeTimer = setInterval(function() {
      self.updateTime();
    }, 1000);

    // 从 DataStore 加载数据
    this.loadFromDataStore();
    this.startHeartRateMonitor();

    this.heartTimer = setInterval(function() {
      self.loadFromDataStore();
    }, 3000);
  },

  // ... keep existing methods ...

  loadFromDataStore() {
    var stats = dataStore.getTodayStats();
    this.todayCount = stats.count;
    this.todayCalories = stats.calories.toFixed(1);
    this.heartRate = dataStore.get('heartRate') || 72;
  },

  // ... keep rest of methods ...
}
</script>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

## Task 7: Final Integration and Testing

**Covers:** All tasks

**Files:**
- All modified files

**Interfaces:**
- All interfaces from previous tasks

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Check build output**

Run: `ls dist/*.rpk`
Expected: RPK file exists

- [ ] **Step 3: Verify file structure**

Run: `find src -name "*.js" | head -10`
Expected: All new files exist

---

## Summary

This plan implements:

1. **Event Bus** - Decouples input from business logic
2. **Power Manager** - 30-second idle timeout with standby mode
3. **Data Store** - Centralized data management with subscriptions
4. **Clock Page** - New main interface with time, date, steps, heart rate
5. **Integration** - Updated exercise_active and index pages

After implementation, the app will have:
- Better power efficiency with automatic screen-off
- Cleaner architecture with event-driven communication
- A proper clock face as the main entry point
- Scalable module system for future features
