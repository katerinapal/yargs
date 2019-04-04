"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = applyExtends;

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _yerror = require("./yerror");

var _yerror2 = _interopRequireDefault(_yerror);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

'use strict';

var previouslyVisitedConfigs = [];

function checkForCircularExtends(cfgPath) {
  if (previouslyVisitedConfigs.indexOf(cfgPath) > -1) {
    throw new _yerror2.default("Circular extended configurations: '" + cfgPath + "'.");
  }
}

function getPathToDefaultConfig(cwd, pathToExtend) {
  return _path2.default.resolve(cwd, pathToExtend);
}

function applyExtends(config, cwd) {
  var defaultConfig = {};

  if (config.hasOwnProperty('extends')) {
    if (typeof config.extends !== 'string') return defaultConfig;
    var isPath = /\.json|\..*rc$/.test(config.extends);
    var pathToDefault = null;
    if (!isPath) {
      try {
        pathToDefault = require.resolve(config.extends);
      } catch (err) {
        // most likely this simply isn't a module.
      }
    } else {
      pathToDefault = getPathToDefaultConfig(cwd, config.extends);
    }
    // maybe the module uses key for some other reason,
    // err on side of caution.
    if (!pathToDefault && !isPath) return config;

    checkForCircularExtends(pathToDefault);

    previouslyVisitedConfigs.push(pathToDefault);

    defaultConfig = isPath ? JSON.parse(_fs2.default.readFileSync(pathToDefault, 'utf8')) : require(config.extends);
    delete config.extends;
    defaultConfig = applyExtends(defaultConfig, _path2.default.dirname(pathToDefault));
  }

  previouslyVisitedConfigs = [];

  return Object.assign({}, defaultConfig, config);
}
module.exports = exports.default;
