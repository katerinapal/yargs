"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = argsert;

var _command = require("./command");

var _command2 = _interopRequireDefault(_command);

var _yerror = require("./yerror");

var _yerror2 = _interopRequireDefault(_yerror);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

'use strict';

var command = (0, _command2.default)();

var positionName = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

function argsert(expected, callerArguments, length) {
  // TODO: should this eventually raise an exception.
  try {
    // preface the argument description with "cmd", so
    // that we can run it through yargs' command parser.
    var position = 0;
    var parsed = { demanded: [], optional: [] };
    if ((typeof expected === "undefined" ? "undefined" : _typeof(expected)) === 'object') {
      length = callerArguments;
      callerArguments = expected;
    } else {
      parsed = command.parseCommand("cmd " + expected);
    }
    var args = [].slice.call(callerArguments);

    while (args.length && args[args.length - 1] === undefined) {
      args.pop();
    }length = length || args.length;

    if (length < parsed.demanded.length) {
      throw new _yerror2.default("Not enough arguments provided. Expected " + parsed.demanded.length + " but received " + args.length + ".");
    }

    var totalCommands = parsed.demanded.length + parsed.optional.length;
    if (length > totalCommands) {
      throw new _yerror2.default("Too many arguments provided. Expected max " + totalCommands + " but received " + length + ".");
    }

    parsed.demanded.forEach(function (demanded) {
      var arg = args.shift();
      var observedType = guessType(arg);
      var matchingTypes = demanded.cmd.filter(function (type) {
        return type === observedType || type === '*';
      });
      if (matchingTypes.length === 0) argumentTypeError(observedType, demanded.cmd, position, false);
      position += 1;
    });

    parsed.optional.forEach(function (optional) {
      if (args.length === 0) return;
      var arg = args.shift();
      var observedType = guessType(arg);
      var matchingTypes = optional.cmd.filter(function (type) {
        return type === observedType || type === '*';
      });
      if (matchingTypes.length === 0) argumentTypeError(observedType, optional.cmd, position, true);
      position += 1;
    });
  } catch (err) {
    console.warn(err.stack);
  }
}

function guessType(arg) {
  if (Array.isArray(arg)) {
    return 'array';
  } else if (arg === null) {
    return 'null';
  }
  return typeof arg === "undefined" ? "undefined" : _typeof(arg);
}

function argumentTypeError(observedType, allowedTypes, position, optional) {
  throw new _yerror2.default("Invalid " + (positionName[position] || 'manyith') + " argument. Expected " + allowedTypes.join(' or ') + " but received " + observedType + ".");
}
module.exports = exports.default;
