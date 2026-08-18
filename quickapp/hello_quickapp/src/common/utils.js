/**
 * 动感教练 - 工具函数模块
 */

// 运动类型配置
var exerciseConfigs = {
  squat: {
    name: '深蹲',
    icon: '🏋️',
    defaultReps: 15,
    defaultSets: 3,
    caloriesPerRep: 0.32
  },
  pushup: {
    name: '俯卧撑',
    icon: '💪',
    defaultReps: 12,
    defaultSets: 3,
    caloriesPerRep: 0.36
  },
  jumping_jack: {
    name: '开合跳',
    icon: '⭐',
    defaultReps: 20,
    defaultSets: 3,
    caloriesPerRep: 0.28
  },
  high_knee: {
    name: '高抬腿',
    icon: '🦵',
    defaultReps: 30,
    defaultSets: 3,
    caloriesPerRep: 0.24
  },
  running: {
    name: '跑步',
    icon: '🏃',
    defaultReps: 0,
    defaultSets: 1,
    caloriesPerRep: 0.1,
    isDuration: true
  }
};

/**
 * 获取运动类型配置
 * @param {string} type - 运动类型key
 * @returns {object} 运动配置
 */
function getExerciseConfig(type) {
  return exerciseConfigs[type] || exerciseConfigs.squat;
}

/**
 * 获取所有运动类型列表
 * @returns {Array} 运动类型数组 [{key, name, icon}]
 */
function getAllExerciseTypes() {
  var list = [];
  var keys = Object.keys(exerciseConfigs);
  for (var i = 0; i < keys.length; i++) {
    var cfg = exerciseConfigs[keys[i]];
    list.push({
      key: keys[i],
      name: cfg.name,
      icon: cfg.icon
    });
  }
  return list;
}

/**
 * 格式化秒数为 MM:SS
 * @param {number} seconds
 * @returns {string} 格式化时间
 */
function formatDuration(seconds) {
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return (m < 10 ? '0' + m : '' + m) + ':' + (s < 10 ? '0' + s : '' + s);
}

/**
 * 估算卡路里消耗
 * @param {string} type - 运动类型
 * @param {number} count - 总次数
 * @param {number} durationSeconds - 持续秒数
 * @returns {number} 卡路里
 */
function estimateCalories(type, count, durationSeconds) {
  var config = exerciseConfigs[type] || exerciseConfigs.squat;
  // 基础消耗：次数 * 每次消耗
  var base = count * config.caloriesPerRep;
  // 时间因子：超过30秒后额外消耗
  var timeFactor = durationSeconds > 30 ? (durationSeconds - 30) * 0.05 : 0;
  return Math.round((base + timeFactor) * 10) / 10;
}

/**
 * 获取日期字符串 (YYYY-MM-DD)
 * @param {Date} date
 * @returns {string}
 */
function getDateKey(date) {
  date = date || new Date();
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var d = date.getDate();
  return y + '-' + (m < 10 ? '0' + m : '' + m) + '-' + (d < 10 ? '0' + d : '' + d);
}

module.exports = {
  getExerciseConfig: getExerciseConfig,
  getAllExerciseTypes: getAllExerciseTypes,
  formatDuration: formatDuration,
  estimateCalories: estimateCalories,
  getDateKey: getDateKey
};
