/**
 * 动感教练 - 运动检测算法模块
 * 基于加速度计的滑动窗口+峰值检测算法
 * 不同运动类型使用不同的阈值和窗口参数
 */

var motionParams = {
  squat: {
    threshold: 12.0,
    windowSize: 20,
    minInterval: 800,
    peakSearchRange: 5
  },
  pushup: {
    threshold: 10.0,
    windowSize: 18,
    minInterval: 700,
    peakSearchRange: 4
  },
  jumping_jack: {
    threshold: 14.0,
    windowSize: 15,
    minInterval: 400,
    peakSearchRange: 3
  },
  high_knee: {
    threshold: 11.0,
    windowSize: 12,
    minInterval: 300,
    peakSearchRange: 3
  }
};

var _type = 'squat';
var _params = motionParams.squat;
var _buffer = [];
var _timestamps = [];
var _count = 0;
var _lastRepTime = 0;
var _lastPeakValue = 0;
var _inUpPhase = true;

function calcMagnitude(ax, ay, az) {
  return Math.sqrt(ax * ax + ay * ay + az * az);
}

function init(type) {
  _type = type || 'squat';
  _params = motionParams[_type] || motionParams.squat;
  reset();
}

function feedSample(ax, ay, az) {
  var mag = calcMagnitude(ax, ay, az);
  var now = Date.now();

  _buffer.push(mag);
  _timestamps.push(now);

  if (_buffer.length > _params.windowSize * 2) {
    _buffer.shift();
    _timestamps.shift();
  }

  if (_buffer.length < _params.windowSize) {
    return false;
  }

  if (now - _lastRepTime < _params.minInterval) {
    return false;
  }

  var currentIdx = _buffer.length - 1;
  var currentVal = _buffer[currentIdx];

  var sum = 0;
  var startIdx = Math.max(0, currentIdx - _params.windowSize + 1);
  var winLen = currentIdx - startIdx + 1;
  for (var i = startIdx; i <= currentIdx; i++) {
    sum += _buffer[i];
  }
  var mean = sum / winLen;

  var variance = 0;
  for (var j = startIdx; j <= currentIdx; j++) {
    variance += (_buffer[j] - mean) * (_buffer[j] - mean);
  }
  variance = variance / winLen;
  var stdDev = Math.sqrt(variance);

  var adaptiveThreshold = mean + _params.threshold * (stdDev / 5.0 + 0.5);
  var thresholdCap = mean + _params.threshold * 2.0;
  if (adaptiveThreshold > thresholdCap) adaptiveThreshold = thresholdCap;
  if (adaptiveThreshold < mean + _params.threshold * 0.4) {
    adaptiveThreshold = mean + _params.threshold * 0.4;
  }

  if (currentVal > adaptiveThreshold) {
    var isPeak = true;
    var searchStart = Math.max(0, currentIdx - _params.peakSearchRange);
    var searchEnd = Math.min(_buffer.length - 1, currentIdx + _params.peakSearchRange);
    for (var k = searchStart; k <= searchEnd; k++) {
      if (k !== currentIdx && _buffer[k] > currentVal) {
        isPeak = false;
        break;
      }
    }

    if (isPeak) {
      if (!_inUpPhase) {
        _inUpPhase = true;
        _count++;
        _recordRep(currentVal, now);
        _lastPeakValue = currentVal;
        return true;
      }
    }
  } else if (currentVal < mean) {
    _inUpPhase = false;
  }

  return false;
}

function getCount() {
  return _count;
}

function getType() {
  return _type;
}

function getLastMagnitude() {
  if (_buffer.length > 0) {
    return _buffer[_buffer.length - 1];
  }
  return 0;
}

function getRecentValues(n) {
  n = n || 20;
  var start = Math.max(0, _buffer.length - n);
  return _buffer.slice(start);
}

function reset() {
  _buffer = [];
  _timestamps = [];
  _count = 0;
  _lastRepTime = 0;
  _lastPeakValue = 0;
  _inUpPhase = true;
  _repStats = [];
}

// Per-rep 质量特征
var _repStats = [];

function _recordRep(peakVal, now) {
  var interval = _lastRepTime > 0 ? (now - _lastRepTime) : 0;
  _repStats.push({ peak: peakVal, interval: interval });
  _lastRepTime = now;
}

function getQualityFeatures() {
  if (_repStats.length === 0) return null;
  var peaks = _repStats.map(function(r) { return r.peak; });
  var intervals = _repStats.filter(function(r) { return r.interval > 0; }).map(function(r) { return r.interval; });
  var mean = function(a) { return a.reduce(function(s, v) { return s + v; }, 0) / a.length; };
  var std = function(a) { var m = mean(a); return Math.sqrt(mean(a.map(function(v) { return (v - m) * (v - m); }))); };

  return {
    exerciseType: _type,
    repCount: _repStats.length,
    avgPeak: +mean(peaks).toFixed(2),
    peakStd: +std(peaks).toFixed(2),
    avgInterval: intervals.length ? +mean(intervals).toFixed(0) : 0,
    intervalStd: intervals.length ? +std(intervals).toFixed(0) : 0,
    durationMs: _timestamps.length ? (_timestamps[_timestamps.length - 1] - _timestamps[0]) : 0
  };
}

module.exports = {
  init: init,
  feedSample: feedSample,
  getCount: getCount,
  getType: getType,
  getLastMagnitude: getLastMagnitude,
  getRecentValues: getRecentValues,
  getQualityFeatures: getQualityFeatures,
  reset: reset
};
