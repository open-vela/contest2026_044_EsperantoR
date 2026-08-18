/**
 * 动感教练 - 日志工具模块
 * 支持分级日志，生产环境可关闭 debug
 */

var LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

var _level = LOG_LEVEL.INFO;

function setLevel(level) {
  if (typeof level === 'string') {
    level = level.toUpperCase();
    if (LOG_LEVEL[level] !== undefined) {
      _level = LOG_LEVEL[level];
    }
  } else if (typeof level === 'number') {
    _level = level;
  }
}

function debug(msg) {
  if (_level <= LOG_LEVEL.DEBUG) {
    console.log('[DEBUG] ' + msg);
  }
}

function info(msg) {
  if (_level <= LOG_LEVEL.INFO) {
    console.log('[INFO] ' + msg);
  }
}

function warn(msg) {
  if (_level <= LOG_LEVEL.WARN) {
    console.log('[WARN] ' + msg);
  }
}

function error(msg) {
  if (_level <= LOG_LEVEL.ERROR) {
    console.log('[ERROR] ' + msg);
  }
}

module.exports = {
  LOG_LEVEL: LOG_LEVEL,
  setLevel: setLevel,
  debug: debug,
  info: info,
  warn: warn,
  error: error
};
