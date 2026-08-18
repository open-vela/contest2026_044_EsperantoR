/**
 * 动感教练 - 全局常量
 * 集中管理所有魔法数字和配置值
 */

// 评分系统常量
var SCORE = {
  BASE: 70,                    // 基础分
  COMPLETION_MAX: 15,          // 完成度最高加分
  SPEED_OPTIMAL_MIN: 0.3,     // 最佳速度下限 (次/秒)
  SPEED_OPTIMAL_MAX: 1.0,     // 最佳速度上限 (次/秒)
  SPEED_BONUS_OPTIMAL: 10,    // 最佳速度加分
  SPEED_BONUS_FAST: 3,        // 过快速度加分
  SPEED_BONUS_SLOW: 5,        // 过慢速度加分
  HR_OPTIMAL_MIN: 120,        // 最佳心率下限 (bpm)
  HR_OPTIMAL_MAX: 160,        // 最佳心率上限 (bpm)
  HR_BONUS_OPTIMAL: 5,        // 最佳心率加分
  HR_BONUS_ELEVATED: 2,       // 偏高心率加分
  HR_ELEVATED_THRESHOLD: 100, // 偏高心率阈值 (bpm)
  MAX: 100,                   // 最高分
  MIN: 0                      // 最低分
};

// 卡路里计算常量
var CALORIES = {
  TIME_THRESHOLD: 30,         // 时间因子阈值 (秒)
  TIME_FACTOR: 0.05           // 时间因子系数 (千卡/秒)
};

// 电源管理常量
var POWER = {
  IDLE_TIMEOUT: 30000,        // 空闲超时 (ms)
  STANDBY_DELAY: 10000        // 待机延迟 (ms)
};

// 传感器采样率常量 (ms)
var SENSOR_RATE = {
  HIGH: 100,                  // 高频采样
  LOW: 500,                   // 低频采样
  IDLE: 2000                  // 空闲采样
};

// 波形图常量
var WAVEFORM = {
  BAR_COUNT: 12,              // 波形条数
  HEIGHT_MIN: 5,              // 最小高度 (px)
  HEIGHT_MAX: 25,             // 最大高度 (px)
  HEIGHT_SCALE: 1.5,          // 高度缩放系数
  DEFAULT_HEIGHT: 8           // 默认高度 (px)
};

// 进度条常量
var PROGRESS = {
  BAR_WIDTH: 200              // 进度条最大宽度 (px)
};

// 历史记录常量
var HISTORY = {
  MAX_RECORDS: 100,           // 最大记录数
  DEFAULT_LIMIT: 10           // 默认显示条数
};

// 模拟心率常量
var SIM_HEART_RATE = {
  BASE: 72,                   // 基础心率 (bpm)
  FLUCTUATION: 7              // 波动范围 (±bpm)
};

// 振动反馈常量 (ms)
var VIBRATE = {
  REP_DETECTED: 50,           // 检测到动作
  SET_COMPLETE: 200           // 完成一组
};

module.exports = {
  SCORE: SCORE,
  CALORIES: CALORIES,
  POWER: POWER,
  SENSOR_RATE: SENSOR_RATE,
  WAVEFORM: WAVEFORM,
  PROGRESS: PROGRESS,
  HISTORY: HISTORY,
  SIM_HEART_RATE: SIM_HEART_RATE,
  VIBRATE: VIBRATE
};
