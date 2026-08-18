/**
 * 动感教练 - 本地存储模块
 * 使用内存缓存 + 可选的 storage 持久化
 */

var logger = require('./logger.js');

var storageService = null;
try {
  storageService = require('@system.storage');
} catch (e) {
  logger.warn('storage service 不可用，使用内存存储');
}

// 内存缓存（主存储，确保同步调用可用）
var _memoryCache = {};

var utils = require('./utils.js');
var constants = require('./constants.js');

/**
 * 读取数据（同步返回缓存，可选异步回调）
 * @param {string} key
 * @param {function} [callback] - 可选回调 callback(value)
 * @returns {string|null} 缓存值，无缓存时返回 null
 */
function get(key, callback) {
  var cached = _memoryCache[key] || null;
  if (callback) {
    if (storageService && cached === null) {
      storageService.get({
        key: key,
        success: function(data) {
          _memoryCache[key] = data;
          callback(data);
        },
        fail: function() { callback(null); }
      });
    } else {
      callback(cached);
    }
  }
  return cached;
}

/**
 * 写入数据
 * @param {string} key
 * @param {string} value
 */
function put(key, value) {
  _memoryCache[key] = value;
  if (storageService) {
    storageService.set({ key: key, value: value });
  }
}

/**
 * 保存运动记录
 * @param {object} record - { type, typeName, count, duration, avgHeartRate, maxHeartRate, calories, score, timestamp }
 */
function saveRecord(record) {
  var recordsJson = _memoryCache['exercise_records'] || '[]';
  var records = [];
  try { records = JSON.parse(recordsJson); } catch (e) { records = []; }
  records.push(record);
  if (records.length > constants.HISTORY.MAX_RECORDS) {
    records = records.slice(records.length - constants.HISTORY.MAX_RECORDS);
  }
  put('exercise_records', JSON.stringify(records));

  // 更新今日统计
  var todayKey = utils.getDateKey();
  var statsKey = 'stats_' + todayKey;
  var statsJson = _memoryCache[statsKey] || '{"count":0,"calories":0,"totalDuration":0}';
  var stats = { count: 0, calories: 0, totalDuration: 0 };
  try { stats = JSON.parse(statsJson); } catch (e) {}
  stats.count++;
  stats.calories += record.calories;
  stats.totalDuration += record.duration;
  put(statsKey, JSON.stringify(stats));
}

/**
 * 获取今日统计（同步）
 * @returns {{ count: number, calories: number, totalDuration: number }}
 */
function getTodayStats() {
  var todayKey = utils.getDateKey();
  var statsKey = 'stats_' + todayKey;
  var statsJson = _memoryCache[statsKey];
  if (statsJson) {
    try { return JSON.parse(statsJson); } catch (e) {}
  }
  return { count: 0, calories: 0, totalDuration: 0 };
}

/**
 * 获取历史记录（同步）
 * @param {number} limit - 最多返回条数
 * @returns {Array} 运动记录列表
 */
function getRecords(limit) {
  var recordsJson = _memoryCache['exercise_records'] || '[]';
  var records = [];
  try { records = JSON.parse(recordsJson); } catch (e) { records = []; }
  records.sort(function(a, b) { return b.timestamp - a.timestamp; });
  if (limit && records.length > limit) {
    records = records.slice(0, limit);
  }
  return records;
}

module.exports = {
  get: get,
  put: put,
  saveRecord: saveRecord,
  getTodayStats: getTodayStats,
  getRecords: getRecords
};
