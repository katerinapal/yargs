'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = YError;
function YError(msg) {
  this.name = 'YError';
  this.message = msg || 'yargs error';
  Error.captureStackTrace(this, YError);
}

YError.prototype = Object.create(Error.prototype);
YError.prototype.constructor = YError;
module.exports = exports.default;
