"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _isPromise = require("./is-promise");

var _isPromise2 = _interopRequireDefault(_isPromise);

var _argsert = require("./argsert");

var _argsert2 = _interopRequireDefault(_argsert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

'use strict';

// hoisted due to circular dependency on command.
exports.default = {
  applyMiddleware: applyMiddleware,
  commandMiddlewareFactory: commandMiddlewareFactory,
  globalMiddlewareFactory: globalMiddlewareFactory
};
;

function globalMiddlewareFactory(globalMiddleware, context) {
  return function (callback) {
    var applyBeforeValidation = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    (0, _argsert2.default)('<array|function> [boolean]', [callback, applyBeforeValidation], arguments.length);
    if (Array.isArray(callback)) {
      for (var i = 0; i < callback.length; i++) {
        if (typeof callback[i] !== 'function') {
          throw Error('middleware must be a function');
        }
        callback[i].applyBeforeValidation = applyBeforeValidation;
      }
      Array.prototype.push.apply(globalMiddleware, callback);
    } else if (typeof callback === 'function') {
      callback.applyBeforeValidation = applyBeforeValidation;
      globalMiddleware.push(callback);
    }
    return context;
  };
}

function commandMiddlewareFactory(commandMiddleware) {
  if (!commandMiddleware) return [];
  return commandMiddleware.map(function (middleware) {
    middleware.applyBeforeValidation = false;
    return middleware;
  });
}

function applyMiddleware(argv, yargs, middlewares, beforeValidation) {
  var beforeValidationError = new Error('middleware cannot return a promise when applyBeforeValidation is true');
  return middlewares.reduce(function (accumulation, middleware) {
    if (middleware.applyBeforeValidation !== beforeValidation && !(0, _isPromise2.default)(accumulation)) {
      return accumulation;
    }

    if ((0, _isPromise2.default)(accumulation)) {
      return accumulation.then(function (initialObj) {
        return Promise.all([initialObj, middleware(initialObj, yargs)]);
      }).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            initialObj = _ref2[0],
            middlewareObj = _ref2[1];

        return Object.assign(initialObj, middlewareObj);
      });
    } else {
      var result = middleware(argv, yargs);
      if (beforeValidation && (0, _isPromise2.default)(result)) throw beforeValidationError;

      return (0, _isPromise2.default)(result) ? result.then(function (middlewareObj) {
        return Object.assign(accumulation, middlewareObj);
      }) : Object.assign(accumulation, result);
    }
  }, argv);
}
module.exports = exports.default;
