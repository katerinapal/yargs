'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = objFilter;
function objFilter(original, filter) {
  var obj = {};
  filter = filter || function (k, v) {
    return true;
  };
  Object.keys(original || {}).forEach(function (key) {
    if (filter(key, original[key])) {
      obj[key] = original[key];
    }
  });
  return obj;
};;
module.exports = exports.default;
