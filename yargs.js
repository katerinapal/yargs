"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = Yargs;

var _argsert = require("./lib/argsert");

var _argsert2 = _interopRequireDefault(_argsert);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _command = require("./lib/command");

var _command2 = _interopRequireDefault(_command);

var _completion = require("./lib/completion");

var _completion2 = _interopRequireDefault(_completion);

var _yargsParser = require("yargs-parser");

var _yargsParser2 = _interopRequireDefault(_yargsParser);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _usage = require("./lib/usage");

var _usage2 = _interopRequireDefault(_usage);

var _validation = require("./lib/validation");

var _validation2 = _interopRequireDefault(_validation);

var _y18n = require("y18n");

var _y18n2 = _interopRequireDefault(_y18n);

var _objFilter = require("./lib/obj-filter");

var _objFilter2 = _interopRequireDefault(_objFilter);

var _setBlocking = require("set-blocking");

var _setBlocking2 = _interopRequireDefault(_setBlocking);

var _applyExtends = require("./lib/apply-extends");

var _applyExtends2 = _interopRequireDefault(_applyExtends);

var _middleware = require("./lib/middleware");

var _middleware2 = _interopRequireDefault(_middleware);

var _yerror = require("./lib/yerror");

var _yerror2 = _interopRequireDefault(_yerror);

var _getCallerFile = require("get-caller-file");

var _getCallerFile2 = _interopRequireDefault(_getCallerFile);

var _findUp = require("find-up");

var _findUp2 = _interopRequireDefault(_findUp);

var _requireMainFilename = require("require-main-filename");

var _requireMainFilename2 = _interopRequireDefault(_requireMainFilename);

var _osLocale = require("os-locale");

var _osLocale2 = _interopRequireDefault(_osLocale);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

'use strict';
var globalMiddlewareFactory = _middleware2.default.globalMiddlewareFactory;
function Yargs(processArgs, cwd, parentRequire) {
  processArgs = processArgs || []; // handle calling yargs().

  var self = {};
  var command = null;
  var completion = null;
  var groups = {};
  var globalMiddleware = [];
  var output = '';
  var preservedGroups = {};
  var usage = null;
  var validation = null;

  var y18n = (0, _y18n2.default)({
    directory: _path2.default.resolve(__dirname, './locales'),
    updateFiles: false
  });

  self.middleware = globalMiddlewareFactory(globalMiddleware, self);

  if (!cwd) cwd = process.cwd();

  self.scriptName = function scriptName(scriptName) {
    self.$0 = scriptName;
    return self;
  };

  // ignore the node bin, specify this in your
  // bin file with #!/usr/bin/env node
  if (/\b(node|iojs|electron)(\.exe)?$/.test(process.argv[0])) {
    self.$0 = process.argv.slice(1, 2);
  } else {
    self.$0 = process.argv.slice(0, 1);
  }

  self.$0 = self.$0.map(function (x, i) {
    var b = rebase(cwd, x);
    return x.match(/^(\/|([a-zA-Z]:)?\\)/) && b.length < x.length ? b : x;
  }).join(' ').trim();

  if (process.env._ !== undefined && process.argv[1] === process.env._) {
    self.$0 = process.env._.replace(_path2.default.dirname(process.execPath) + "/", '');
  }

  // use context object to keep track of resets, subcommand execution, etc
  // submodules should modify and check the state of context as necessary
  var context = { resets: -1, commands: [], fullCommands: [], files: [] };
  self.getContext = function () {
    return context;
  };

  // puts yargs back into an initial state. any keys
  // that have been set to "global" will not be reset
  // by this action.
  var options = void 0;
  self.resetOptions = self.reset = function resetOptions(aliases) {
    context.resets++;
    aliases = aliases || {};
    options = options || {};
    // put yargs back into an initial state, this
    // logic is used to build a nested command
    // hierarchy.
    var tmpOptions = {};
    tmpOptions.local = options.local ? options.local : [];
    tmpOptions.configObjects = options.configObjects ? options.configObjects : [];

    // if a key has been explicitly set as local,
    // we should reset it before passing options to command.
    var localLookup = {};
    tmpOptions.local.forEach(function (l) {
      localLookup[l] = true;(aliases[l] || []).forEach(function (a) {
        localLookup[a] = true;
      });
    });

    // preserve all groups not set to local.
    preservedGroups = Object.keys(groups).reduce(function (acc, groupName) {
      var keys = groups[groupName].filter(function (key) {
        return !(key in localLookup);
      });
      if (keys.length > 0) {
        acc[groupName] = keys;
      }
      return acc;
    }, {});
    // groups can now be reset
    groups = {};

    var arrayOptions = ['array', 'boolean', 'string', 'skipValidation', 'count', 'normalize', 'number', 'hiddenOptions'];

    var objectOptions = ['narg', 'key', 'alias', 'default', 'defaultDescription', 'config', 'choices', 'demandedOptions', 'demandedCommands', 'coerce'];

    arrayOptions.forEach(function (k) {
      tmpOptions[k] = (options[k] || []).filter(function (k) {
        return !localLookup[k];
      });
    });

    objectOptions.forEach(function (k) {
      tmpOptions[k] = (0, _objFilter2.default)(options[k], function (k, v) {
        return !localLookup[k];
      });
    });

    tmpOptions.envPrefix = options.envPrefix;
    options = tmpOptions;

    // if this is the first time being executed, create
    // instances of all our helpers -- otherwise just reset.
    usage = usage ? usage.reset(localLookup) : (0, _usage2.default)(self, y18n);
    validation = validation ? validation.reset(localLookup) : (0, _validation2.default)(self, usage, y18n);
    command = command ? command.reset() : (0, _command2.default)(self, usage, validation, globalMiddleware);
    if (!completion) completion = (0, _completion2.default)(self, usage, command);

    completionCommand = null;
    output = '';
    exitError = null;
    hasOutput = false;
    self.parsed = false;

    return self;
  };
  self.resetOptions();

  // temporary hack: allow "freezing" of reset-able state for parse(msg, cb)
  var frozen = void 0;
  function freeze() {
    frozen = {};
    frozen.options = options;
    frozen.configObjects = options.configObjects.slice(0);
    frozen.exitProcess = exitProcess;
    frozen.groups = groups;
    usage.freeze();
    validation.freeze();
    command.freeze();
    frozen.strict = strict;
    frozen.completionCommand = completionCommand;
    frozen.output = output;
    frozen.exitError = exitError;
    frozen.hasOutput = hasOutput;
    frozen.parsed = self.parsed;
  }
  function unfreeze() {
    options = frozen.options;
    options.configObjects = frozen.configObjects;
    exitProcess = frozen.exitProcess;
    groups = frozen.groups;
    output = frozen.output;
    exitError = frozen.exitError;
    hasOutput = frozen.hasOutput;
    self.parsed = frozen.parsed;
    usage.unfreeze();
    validation.unfreeze();
    command.unfreeze();
    strict = frozen.strict;
    completionCommand = frozen.completionCommand;
    parseFn = null;
    parseContext = null;
    frozen = undefined;
  }

  self.boolean = function (keys) {
    (0, _argsert2.default)('<array|string>', [keys], arguments.length);
    populateParserHintArray('boolean', keys);
    return self;
  };

  self.array = function (keys) {
    (0, _argsert2.default)('<array|string>', [keys], arguments.length);
    populateParserHintArray('array', keys);
    return self;
  };

  self.number = function (keys) {
    (0, _argsert2.default)('<array|string>', [keys], arguments.length);
    populateParserHintArray('number', keys);
    return self;
  };

  self.normalize = function (keys) {
    (0, _argsert2.default)('<array|string>', [keys], arguments.length);
    populateParserHintArray('normalize', keys);
    return self;
  };

  self.count = function (keys) {
    (0, _argsert2.default)('<array|string>', [keys], arguments.length);
    populateParserHintArray('count', keys);
    return self;
  };

  self.string = function (keys) {
    (0, _argsert2.default)('<array|string>', [keys], arguments.length);
    populateParserHintArray('string', keys);
    return self;
  };

  self.requiresArg = function (keys) {
    (0, _argsert2.default)('<array|string>', [keys], arguments.length);
    populateParserHintObject(self.nargs, false, 'narg', keys, 1);
    return self;
  };

  self.skipValidation = function (keys) {
    (0, _argsert2.default)('<array|string>', [keys], arguments.length);
    populateParserHintArray('skipValidation', keys);
    return self;
  };

  function populateParserHintArray(type, keys, value) {
    keys = [].concat(keys);
    keys.forEach(function (key) {
      options[type].push(key);
    });
  }

  self.nargs = function (key, value) {
    (0, _argsert2.default)('<string|object|array> [number]', [key, value], arguments.length);
    populateParserHintObject(self.nargs, false, 'narg', key, value);
    return self;
  };

  self.choices = function (key, value) {
    (0, _argsert2.default)('<object|string|array> [string|array]', [key, value], arguments.length);
    populateParserHintObject(self.choices, true, 'choices', key, value);
    return self;
  };

  self.alias = function (key, value) {
    (0, _argsert2.default)('<object|string|array> [string|array]', [key, value], arguments.length);
    populateParserHintObject(self.alias, true, 'alias', key, value);
    return self;
  };

  // TODO: actually deprecate self.defaults.
  self.default = self.defaults = function (key, value, defaultDescription) {
    (0, _argsert2.default)('<object|string|array> [*] [string]', [key, value, defaultDescription], arguments.length);
    if (defaultDescription) options.defaultDescription[key] = defaultDescription;
    if (typeof value === 'function') {
      if (!options.defaultDescription[key]) options.defaultDescription[key] = usage.functionDescription(value);
      value = value.call();
    }
    populateParserHintObject(self.default, false, 'default', key, value);
    return self;
  };

  self.describe = function (key, desc) {
    (0, _argsert2.default)('<object|string|array> [string]', [key, desc], arguments.length);
    populateParserHintObject(self.describe, false, 'key', key, true);
    usage.describe(key, desc);
    return self;
  };

  self.demandOption = function (keys, msg) {
    (0, _argsert2.default)('<object|string|array> [string]', [keys, msg], arguments.length);
    populateParserHintObject(self.demandOption, false, 'demandedOptions', keys, msg);
    return self;
  };

  self.coerce = function (keys, value) {
    (0, _argsert2.default)('<object|string|array> [function]', [keys, value], arguments.length);
    populateParserHintObject(self.coerce, false, 'coerce', keys, value);
    return self;
  };

  function populateParserHintObject(builder, isArray, type, key, value) {
    if (Array.isArray(key)) {
      // an array of keys with one value ['x', 'y', 'z'], function parse () {}
      var temp = {};
      key.forEach(function (k) {
        temp[k] = value;
      });
      builder(temp);
    } else if ((typeof key === "undefined" ? "undefined" : _typeof(key)) === 'object') {
      // an object of key value pairs: {'x': parse () {}, 'y': parse() {}}
      Object.keys(key).forEach(function (k) {
        builder(k, key[k]);
      });
    } else {
      // a single key value pair 'x', parse() {}
      if (isArray) {
        options[type][key] = (options[type][key] || []).concat(value);
      } else {
        options[type][key] = value;
      }
    }
  }

  function deleteFromParserHintObject(optionKey) {
    // delete from all parsing hints:
    // boolean, array, key, alias, etc.
    Object.keys(options).forEach(function (hintKey) {
      var hint = options[hintKey];
      if (Array.isArray(hint)) {
        if (~hint.indexOf(optionKey)) hint.splice(hint.indexOf(optionKey), 1);
      } else if ((typeof hint === "undefined" ? "undefined" : _typeof(hint)) === 'object') {
        delete hint[optionKey];
      }
    });
    // now delete the description from usage.js.
    delete usage.getDescriptions()[optionKey];
  }

  self.config = function config(key, msg, parseFn) {
    (0, _argsert2.default)('[object|string] [string|function] [function]', [key, msg, parseFn], arguments.length);
    // allow a config object to be provided directly.
    if ((typeof key === "undefined" ? "undefined" : _typeof(key)) === 'object') {
      key = (0, _applyExtends2.default)(key, cwd);
      options.configObjects = (options.configObjects || []).concat(key);
      return self;
    }

    // allow for a custom parsing function.
    if (typeof msg === 'function') {
      parseFn = msg;
      msg = null;
    }

    key = key || 'config';
    self.describe(key, msg || usage.deferY18nLookup('Path to JSON config file'));(Array.isArray(key) ? key : [key]).forEach(function (k) {
      options.config[k] = parseFn || true;
    });

    return self;
  };

  self.example = function (cmd, description) {
    (0, _argsert2.default)('<string> [string]', [cmd, description], arguments.length);
    usage.example(cmd, description);
    return self;
  };

  self.command = function (cmd, description, builder, handler, middlewares) {
    (0, _argsert2.default)('<string|array|object> [string|boolean] [function|object] [function] [array]', [cmd, description, builder, handler, middlewares], arguments.length);
    command.addHandler(cmd, description, builder, handler, middlewares);
    return self;
  };

  self.commandDir = function (dir, opts) {
    (0, _argsert2.default)('<string> [object]', [dir, opts], arguments.length);
    var req = parentRequire || require;
    command.addDirectory(dir, self.getContext(), req, (0, _getCallerFile2.default)(), opts);
    return self;
  };

  // TODO: deprecate self.demand in favor of
  // .demandCommand() .demandOption().
  self.demand = self.required = self.require = function demand(keys, max, msg) {
    // you can optionally provide a 'max' key,
    // which will raise an exception if too many '_'
    // options are provided.
    if (Array.isArray(max)) {
      max.forEach(function (key) {
        self.demandOption(key, msg);
      });
      max = Infinity;
    } else if (typeof max !== 'number') {
      msg = max;
      max = Infinity;
    }

    if (typeof keys === 'number') {
      self.demandCommand(keys, max, msg, msg);
    } else if (Array.isArray(keys)) {
      keys.forEach(function (key) {
        self.demandOption(key, msg);
      });
    } else {
      if (typeof msg === 'string') {
        self.demandOption(keys, msg);
      } else if (msg === true || typeof msg === 'undefined') {
        self.demandOption(keys);
      }
    }

    return self;
  };

  self.demandCommand = function demandCommand(min, max, minMsg, maxMsg) {
    (0, _argsert2.default)('[number] [number|string] [string|null|undefined] [string|null|undefined]', [min, max, minMsg, maxMsg], arguments.length);

    if (typeof min === 'undefined') min = 1;

    if (typeof max !== 'number') {
      minMsg = max;
      max = Infinity;
    }

    self.global('_', false);

    options.demandedCommands._ = {
      min: min,
      max: max,
      minMsg: minMsg,
      maxMsg: maxMsg
    };

    return self;
  };

  self.getDemandedOptions = function () {
    (0, _argsert2.default)([], 0);
    return options.demandedOptions;
  };

  self.getDemandedCommands = function () {
    (0, _argsert2.default)([], 0);
    return options.demandedCommands;
  };

  self.implies = function (key, value) {
    (0, _argsert2.default)('<string|object> [number|string|array]', [key, value], arguments.length);
    validation.implies(key, value);
    return self;
  };

  self.conflicts = function (key1, key2) {
    (0, _argsert2.default)('<string|object> [string|array]', [key1, key2], arguments.length);
    validation.conflicts(key1, key2);
    return self;
  };

  self.usage = function (msg, description, builder, handler) {
    (0, _argsert2.default)('<string|null|undefined> [string|boolean] [function|object] [function]', [msg, description, builder, handler], arguments.length);

    if (description !== undefined) {
      // .usage() can be used as an alias for defining
      // a default command.
      if ((msg || '').match(/^\$0( |$)/)) {
        return self.command(msg, description, builder, handler);
      } else {
        throw new _yerror2.default('.usage() description must start with $0 if being used as alias for .command()');
      }
    } else {
      usage.usage(msg);
      return self;
    }
  };

  self.epilogue = self.epilog = function (msg) {
    (0, _argsert2.default)('<string>', [msg], arguments.length);
    usage.epilog(msg);
    return self;
  };

  self.fail = function (f) {
    (0, _argsert2.default)('<function>', [f], arguments.length);
    usage.failFn(f);
    return self;
  };

  self.check = function (f, _global) {
    (0, _argsert2.default)('<function> [boolean]', [f, _global], arguments.length);
    validation.check(f, _global !== false);
    return self;
  };

  self.global = function global(globals, global) {
    (0, _argsert2.default)('<string|array> [boolean]', [globals, global], arguments.length);
    globals = [].concat(globals);
    if (global !== false) {
      options.local = options.local.filter(function (l) {
        return globals.indexOf(l) === -1;
      });
    } else {
      globals.forEach(function (g) {
        if (options.local.indexOf(g) === -1) options.local.push(g);
      });
    }
    return self;
  };

  self.pkgConf = function pkgConf(key, rootPath) {
    (0, _argsert2.default)('<string> [string]', [key, rootPath], arguments.length);
    var conf = null;
    // prefer cwd to require-main-filename in this method
    // since we're looking for e.g. "nyc" config in nyc consumer
    // rather than "yargs" config in nyc (where nyc is the main filename)
    var obj = pkgUp(rootPath || cwd);

    // If an object exists in the key, add it to options.configObjects
    if (obj[key] && _typeof(obj[key]) === 'object') {
      conf = (0, _applyExtends2.default)(obj[key], rootPath || cwd);
      options.configObjects = (options.configObjects || []).concat(conf);
    }

    return self;
  };

  var pkgs = {};
  function pkgUp(rootPath) {
    var npath = rootPath || '*';
    if (pkgs[npath]) return pkgs[npath];

    var obj = {};
    try {
      var startDir = rootPath || (0, _requireMainFilename2.default)(parentRequire || require);

      // When called in an environment that lacks require.main.filename, such as a jest test runner,
      // startDir is already process.cwd(), and should not be shortened.
      // Whether or not it is _actually_ a directory (e.g., extensionless bin) is irrelevant, find-up handles it.
      if (!rootPath && _path2.default.extname(startDir)) {
        startDir = _path2.default.dirname(startDir);
      }

      var pkgJsonPath = _findUp2.default.sync('package.json', {
        cwd: startDir
      });
      obj = JSON.parse(_fs2.default.readFileSync(pkgJsonPath));
    } catch (noop) {}

    pkgs[npath] = obj || {};
    return pkgs[npath];
  }

  var parseFn = null;
  var parseContext = null;
  self.parse = function parse(args, shortCircuit, _parseFn) {
    (0, _argsert2.default)('[string|array] [function|boolean|object] [function]', [args, shortCircuit, _parseFn], arguments.length);
    if (typeof args === 'undefined') {
      return self._parseArgs(processArgs);
    }

    // a context object can optionally be provided, this allows
    // additional information to be passed to a command handler.
    if ((typeof shortCircuit === "undefined" ? "undefined" : _typeof(shortCircuit)) === 'object') {
      parseContext = shortCircuit;
      shortCircuit = _parseFn;
    }

    // by providing a function as a second argument to
    // parse you can capture output that would otherwise
    // default to printing to stdout/stderr.
    if (typeof shortCircuit === 'function') {
      parseFn = shortCircuit;
      shortCircuit = null;
    }
    // completion short-circuits the parsing process,
    // skipping validation, etc.
    if (!shortCircuit) processArgs = args;

    freeze();
    if (parseFn) exitProcess = false;

    var parsed = self._parseArgs(args, shortCircuit);
    if (parseFn) parseFn(exitError, parsed, output);
    unfreeze();

    return parsed;
  };

  self._getParseContext = function () {
    return parseContext || {};
  };

  self._hasParseCallback = function () {
    return !!parseFn;
  };

  self.option = self.options = function option(key, opt) {
    (0, _argsert2.default)('<string|object> [object]', [key, opt], arguments.length);
    if ((typeof key === "undefined" ? "undefined" : _typeof(key)) === 'object') {
      Object.keys(key).forEach(function (k) {
        self.options(k, key[k]);
      });
    } else {
      if ((typeof opt === "undefined" ? "undefined" : _typeof(opt)) !== 'object') {
        opt = {};
      }

      options.key[key] = true; // track manually set keys.

      if (opt.alias) self.alias(key, opt.alias);

      var demand = opt.demand || opt.required || opt.require;

      // deprecated, use 'demandOption' instead
      if (demand) {
        self.demand(key, demand);
      }

      if (opt.demandOption) {
        self.demandOption(key, typeof opt.demandOption === 'string' ? opt.demandOption : undefined);
      }

      if ('conflicts' in opt) {
        self.conflicts(key, opt.conflicts);
      }

      if ('default' in opt) {
        self.default(key, opt.default);
      }

      if ('implies' in opt) {
        self.implies(key, opt.implies);
      }

      if ('nargs' in opt) {
        self.nargs(key, opt.nargs);
      }

      if (opt.config) {
        self.config(key, opt.configParser);
      }

      if (opt.normalize) {
        self.normalize(key);
      }

      if ('choices' in opt) {
        self.choices(key, opt.choices);
      }

      if ('coerce' in opt) {
        self.coerce(key, opt.coerce);
      }

      if ('group' in opt) {
        self.group(key, opt.group);
      }

      if (opt.boolean || opt.type === 'boolean') {
        self.boolean(key);
        if (opt.alias) self.boolean(opt.alias);
      }

      if (opt.array || opt.type === 'array') {
        self.array(key);
        if (opt.alias) self.array(opt.alias);
      }

      if (opt.number || opt.type === 'number') {
        self.number(key);
        if (opt.alias) self.number(opt.alias);
      }

      if (opt.string || opt.type === 'string') {
        self.string(key);
        if (opt.alias) self.string(opt.alias);
      }

      if (opt.count || opt.type === 'count') {
        self.count(key);
      }

      if (typeof opt.global === 'boolean') {
        self.global(key, opt.global);
      }

      if (opt.defaultDescription) {
        options.defaultDescription[key] = opt.defaultDescription;
      }

      if (opt.skipValidation) {
        self.skipValidation(key);
      }

      var desc = opt.describe || opt.description || opt.desc;
      self.describe(key, desc);
      if (opt.hidden) {
        self.hide(key);
      }

      if (opt.requiresArg) {
        self.requiresArg(key);
      }
    }

    return self;
  };
  self.getOptions = function () {
    return options;
  };

  self.positional = function (key, opts) {
    (0, _argsert2.default)('<string> <object>', [key, opts], arguments.length);
    if (context.resets === 0) {
      throw new _yerror2.default(".positional() can only be called in a command's builder function");
    }

    // .positional() only supports a subset of the configuration
    // options availble to .option().
    var supportedOpts = ['default', 'implies', 'normalize', 'choices', 'conflicts', 'coerce', 'type', 'describe', 'desc', 'description', 'alias'];
    opts = (0, _objFilter2.default)(opts, function (k, v) {
      var accept = supportedOpts.indexOf(k) !== -1;
      // type can be one of string|number|boolean.
      if (k === 'type' && ['string', 'number', 'boolean'].indexOf(v) === -1) accept = false;
      return accept;
    });

    // copy over any settings that can be inferred from the command string.
    var fullCommand = context.fullCommands[context.fullCommands.length - 1];
    var parseOptions = fullCommand ? command.cmdToParseOptions(fullCommand) : {
      array: [],
      alias: {},
      default: {},
      demand: {}
    };
    Object.keys(parseOptions).forEach(function (pk) {
      if (Array.isArray(parseOptions[pk])) {
        if (parseOptions[pk].indexOf(key) !== -1) opts[pk] = true;
      } else {
        if (parseOptions[pk][key] && !(pk in opts)) opts[pk] = parseOptions[pk][key];
      }
    });
    self.group(key, usage.getPositionalGroupName());
    return self.option(key, opts);
  };

  self.group = function group(opts, groupName) {
    (0, _argsert2.default)('<string|array> <string>', [opts, groupName], arguments.length);
    var existing = preservedGroups[groupName] || groups[groupName];
    if (preservedGroups[groupName]) {
      // we now only need to track this group name in groups.
      delete preservedGroups[groupName];
    }

    var seen = {};
    groups[groupName] = (existing || []).concat(opts).filter(function (key) {
      if (seen[key]) return false;
      return seen[key] = true;
    });
    return self;
  };
  // combine explicit and preserved groups. explicit groups should be first
  self.getGroups = function () {
    return Object.assign({}, groups, preservedGroups);
  };

  // as long as options.envPrefix is not undefined,
  // parser will apply env vars matching prefix to argv
  self.env = function (prefix) {
    (0, _argsert2.default)('[string|boolean]', [prefix], arguments.length);
    if (prefix === false) options.envPrefix = undefined;else options.envPrefix = prefix || '';
    return self;
  };

  self.wrap = function (cols) {
    (0, _argsert2.default)('<number|null|undefined>', [cols], arguments.length);
    usage.wrap(cols);
    return self;
  };

  var strict = false;
  self.strict = function (enabled) {
    (0, _argsert2.default)('[boolean]', [enabled], arguments.length);
    strict = enabled !== false;
    return self;
  };
  self.getStrict = function () {
    return strict;
  };

  var parserConfig = {};
  self.parserConfiguration = function parserConfiguration(config) {
    (0, _argsert2.default)('<object>', [config], arguments.length);
    parserConfig = config;
    return self;
  };
  self.getParserConfiguration = function () {
    return parserConfig;
  };

  self.showHelp = function (level) {
    (0, _argsert2.default)('[string|function]', [level], arguments.length);
    if (!self.parsed) self._parseArgs(processArgs); // run parser, if it has not already been executed.
    if (command.hasDefaultCommand()) {
      context.resets++; // override the restriction on top-level positoinals.
      command.runDefaultBuilderOn(self, true);
    }
    usage.showHelp(level);
    return self;
  };

  var versionOpt = null;
  self.version = function version(opt, msg, ver) {
    var defaultVersionOpt = 'version';
    (0, _argsert2.default)('[boolean|string] [string] [string]', [opt, msg, ver], arguments.length);

    // nuke the key previously configured
    // to return version #.
    if (versionOpt) {
      deleteFromParserHintObject(versionOpt);
      usage.version(undefined);
      versionOpt = null;
    }

    if (arguments.length === 0) {
      ver = guessVersion();
      opt = defaultVersionOpt;
    } else if (arguments.length === 1) {
      if (opt === false) {
        // disable default 'version' key.
        return self;
      }
      ver = opt;
      opt = defaultVersionOpt;
    } else if (arguments.length === 2) {
      ver = msg;
      msg = null;
    }

    versionOpt = typeof opt === 'string' ? opt : defaultVersionOpt;
    msg = msg || usage.deferY18nLookup('Show version number');

    usage.version(ver || undefined);
    self.boolean(versionOpt);
    self.describe(versionOpt, msg);
    return self;
  };

  function guessVersion() {
    var obj = pkgUp();

    return obj.version || 'unknown';
  }

  var helpOpt = null;
  self.addHelpOpt = self.help = function addHelpOpt(opt, msg) {
    var defaultHelpOpt = 'help';
    (0, _argsert2.default)('[string|boolean] [string]', [opt, msg], arguments.length);

    // nuke the key previously configured
    // to return help.
    if (helpOpt) {
      deleteFromParserHintObject(helpOpt);
      helpOpt = null;
    }

    if (arguments.length === 1) {
      if (opt === false) return self;
    }

    // use arguments, fallback to defaults for opt and msg
    helpOpt = typeof opt === 'string' ? opt : defaultHelpOpt;
    self.boolean(helpOpt);
    self.describe(helpOpt, msg || usage.deferY18nLookup('Show help'));
    return self;
  };

  var defaultShowHiddenOpt = 'show-hidden';
  options.showHiddenOpt = defaultShowHiddenOpt;
  self.addShowHiddenOpt = self.showHidden = function addShowHiddenOpt(opt, msg) {
    (0, _argsert2.default)('[string|boolean] [string]', [opt, msg], arguments.length);

    if (arguments.length === 1) {
      if (opt === false) return self;
    }

    var showHiddenOpt = typeof opt === 'string' ? opt : defaultShowHiddenOpt;
    self.boolean(showHiddenOpt);
    self.describe(showHiddenOpt, msg || usage.deferY18nLookup('Show hidden options'));
    options.showHiddenOpt = showHiddenOpt;
    return self;
  };

  self.hide = function hide(key) {
    (0, _argsert2.default)('<string|object>', [key], arguments.length);
    options.hiddenOptions.push(key);
    return self;
  };

  self.showHelpOnFail = function showHelpOnFail(enabled, message) {
    (0, _argsert2.default)('[boolean|string] [string]', [enabled, message], arguments.length);
    usage.showHelpOnFail(enabled, message);
    return self;
  };

  var exitProcess = true;
  self.exitProcess = function (enabled) {
    (0, _argsert2.default)('[boolean]', [enabled], arguments.length);
    if (typeof enabled !== 'boolean') {
      enabled = true;
    }
    exitProcess = enabled;
    return self;
  };
  self.getExitProcess = function () {
    return exitProcess;
  };

  var completionCommand = null;
  self.completion = function (cmd, desc, fn) {
    (0, _argsert2.default)('[string] [string|boolean|function] [function]', [cmd, desc, fn], arguments.length);

    // a function to execute when generating
    // completions can be provided as the second
    // or third argument to completion.
    if (typeof desc === 'function') {
      fn = desc;
      desc = null;
    }

    // register the completion command.
    completionCommand = cmd || 'completion';
    if (!desc && desc !== false) {
      desc = 'generate completion script';
    }
    self.command(completionCommand, desc);

    // a function can be provided
    if (fn) completion.registerFunction(fn);

    return self;
  };

  self.showCompletionScript = function ($0) {
    (0, _argsert2.default)('[string]', [$0], arguments.length);
    $0 = $0 || self.$0;
    _logger.log(completion.generateCompletionScript($0, completionCommand));
    return self;
  };

  self.getCompletion = function (args, done) {
    (0, _argsert2.default)('<array> <function>', [args, done], arguments.length);
    completion.getCompletion(args, done);
  };

  self.locale = function (locale) {
    (0, _argsert2.default)('[string]', [locale], arguments.length);
    if (arguments.length === 0) {
      guessLocale();
      return y18n.getLocale();
    }
    detectLocale = false;
    y18n.setLocale(locale);
    return self;
  };

  self.updateStrings = self.updateLocale = function (obj) {
    (0, _argsert2.default)('<object>', [obj], arguments.length);
    detectLocale = false;
    y18n.updateLocale(obj);
    return self;
  };

  var detectLocale = true;
  self.detectLocale = function (detect) {
    (0, _argsert2.default)('<boolean>', [detect], arguments.length);
    detectLocale = detect;
    return self;
  };
  self.getDetectLocale = function () {
    return detectLocale;
  };

  var hasOutput = false;
  var exitError = null;
  // maybe exit, always capture
  // context about why we wanted to exit.
  self.exit = function (code, err) {
    hasOutput = true;
    exitError = err;
    if (exitProcess) process.exit(code);
  };

  // we use a custom logger that buffers output,
  // so that we can print to non-CLIs, e.g., chat-bots.
  var _logger = {
    log: function log() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }if (!self._hasParseCallback()) console.log.apply(console, args);
      hasOutput = true;
      if (output.length) output += '\n';
      output += args.join(' ');
    },
    error: function error() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }if (!self._hasParseCallback()) console.error.apply(console, args);
      hasOutput = true;
      if (output.length) output += '\n';
      output += args.join(' ');
    }
  };
  self._getLoggerInstance = function () {
    return _logger;
  };
  // has yargs output an error our help
  // message in the current execution context.
  self._hasOutput = function () {
    return hasOutput;
  };

  self._setHasOutput = function () {
    hasOutput = true;
  };

  var recommendCommands = void 0;
  self.recommendCommands = function (recommend) {
    (0, _argsert2.default)('[boolean]', [recommend], arguments.length);
    recommendCommands = typeof recommend === 'boolean' ? recommend : true;
    return self;
  };

  self.getUsageInstance = function () {
    return usage;
  };

  self.getValidationInstance = function () {
    return validation;
  };

  self.getCommandInstance = function () {
    return command;
  };

  self.terminalWidth = function () {
    (0, _argsert2.default)([], 0);
    return typeof process.stdout.columns !== 'undefined' ? process.stdout.columns : null;
  };

  Object.defineProperty(self, 'argv', {
    get: function get() {
      return self._parseArgs(processArgs);
    },
    enumerable: true
  });

  self._parseArgs = function parseArgs(args, shortCircuit, _skipValidation, commandIndex) {
    var skipValidation = !!_skipValidation;
    args = args || processArgs;

    options.__ = y18n.__;
    options.configuration = self.getParserConfiguration();

    // Deprecated
    var pkgConfig = pkgUp()['yargs'];
    if (pkgConfig) {
      console.warn('Configuring yargs through package.json is deprecated and will be removed in the next major release, please use the JS API instead.');
      options.configuration = Object.assign({}, pkgConfig, options.configuration);
    }

    var parsed = _yargsParser2.default.detailed(args, options);
    var argv = parsed.argv;
    if (parseContext) argv = Object.assign({}, argv, parseContext);
    var aliases = parsed.aliases;

    argv.$0 = self.$0;
    self.parsed = parsed;

    try {
      guessLocale(); // guess locale lazily, so that it can be turned off in chain.

      // while building up the argv object, there
      // are two passes through the parser. If completion
      // is being performed short-circuit on the first pass.
      if (shortCircuit) {
        return argv;
      }

      // if there's a handler associated with a
      // command defer processing to it.
      if (helpOpt) {
        // consider any multi-char helpOpt alias as a valid help command
        // unless all helpOpt aliases are single-char
        // note that parsed.aliases is a normalized bidirectional map :)
        var helpCmds = [helpOpt].concat(aliases[helpOpt] || []).filter(function (k) {
          return k.length > 1;
        });
        // check if help should trigger and strip it from _.
        if (~helpCmds.indexOf(argv._[argv._.length - 1])) {
          argv._.pop();
          argv[helpOpt] = true;
        }
      }

      var handlerKeys = command.getCommands();
      var requestCompletions = completion.completionKey in argv;
      var skipRecommendation = argv[helpOpt] || requestCompletions;
      var skipDefaultCommand = skipRecommendation && (handlerKeys.length > 1 || handlerKeys[0] !== '$0');

      if (argv._.length) {
        if (handlerKeys.length) {
          var firstUnknownCommand = void 0;
          for (var i = commandIndex || 0, cmd; argv._[i] !== undefined; i++) {
            cmd = String(argv._[i]);
            if (~handlerKeys.indexOf(cmd) && cmd !== completionCommand) {
              // commands are executed using a recursive algorithm that executes
              // the deepest command first; we keep track of the position in the
              // argv._ array that is currently being executed.
              return command.runCommand(cmd, self, parsed, i + 1);
            } else if (!firstUnknownCommand && cmd !== completionCommand) {
              firstUnknownCommand = cmd;
              break;
            }
          }

          // run the default command, if defined
          if (command.hasDefaultCommand() && !skipDefaultCommand) {
            return command.runCommand(null, self, parsed);
          }

          // recommend a command if recommendCommands() has
          // been enabled, and no commands were found to execute
          if (recommendCommands && firstUnknownCommand && !skipRecommendation) {
            validation.recommendCommands(firstUnknownCommand, handlerKeys);
          }
        }

        // generate a completion script for adding to ~/.bashrc.
        if (completionCommand && ~argv._.indexOf(completionCommand) && !requestCompletions) {
          if (exitProcess) (0, _setBlocking2.default)(true);
          self.showCompletionScript();
          self.exit(0);
        }
      } else if (command.hasDefaultCommand() && !skipDefaultCommand) {
        return command.runCommand(null, self, parsed);
      }

      // we must run completions first, a user might
      // want to complete the --help or --version option.
      if (requestCompletions) {
        if (exitProcess) (0, _setBlocking2.default)(true);

        // we allow for asynchronous completions,
        // e.g., loading in a list of commands from an API.
        var completionArgs = args.slice(args.indexOf("--" + completion.completionKey) + 1);
        completion.getCompletion(completionArgs, function (completions) {
          ;(completions || []).forEach(function (completion) {
            _logger.log(completion);
          });

          self.exit(0);
        });
        return argv;
      }

      // Handle 'help' and 'version' options
      // if we haven't already output help!
      if (!hasOutput) {
        Object.keys(argv).forEach(function (key) {
          if (key === helpOpt && argv[key]) {
            if (exitProcess) (0, _setBlocking2.default)(true);

            skipValidation = true;
            self.showHelp('log');
            self.exit(0);
          } else if (key === versionOpt && argv[key]) {
            if (exitProcess) (0, _setBlocking2.default)(true);

            skipValidation = true;
            usage.showVersion();
            self.exit(0);
          }
        });
      }

      // Check if any of the options to skip validation were provided
      if (!skipValidation && options.skipValidation.length > 0) {
        skipValidation = Object.keys(argv).some(function (key) {
          return options.skipValidation.indexOf(key) >= 0 && argv[key] === true;
        });
      }

      // If the help or version options where used and exitProcess is false,
      // or if explicitly skipped, we won't run validations.
      if (!skipValidation) {
        if (parsed.error) throw new _yerror2.default(parsed.error.message);

        // if we're executed via bash completion, don't
        // bother with validation.
        if (!requestCompletions) {
          self._runValidation(argv, aliases, {}, parsed.error);
        }
      }
    } catch (err) {
      if (err instanceof _yerror2.default) usage.fail(err.message, err);else throw err;
    }

    return argv;
  };

  self._runValidation = function runValidation(argv, aliases, positionalMap, parseErrors) {
    if (parseErrors) throw new _yerror2.default(parseErrors.message || parseErrors);
    validation.nonOptionCount(argv);
    validation.requiredArguments(argv);
    if (strict) validation.unknownArguments(argv, aliases, positionalMap);
    validation.customChecks(argv, aliases);
    validation.limitedChoices(argv);
    validation.implications(argv);
    validation.conflicting(argv);
  };

  function guessLocale() {
    if (!detectLocale) return;

    try {
      self.locale(_osLocale2.default.sync({ spawn: false }));
    } catch (err) {
      // if we explode looking up locale just noop
      // we'll keep using the default language 'en'.
    }
  }

  // an app should almost always have --version and --help,
  // if you *really* want to disable this use .help(false)/.version(false).
  self.help();
  self.version();

  return self;
}

// rebase an absolute path to a relative one with respect to a base directory
// exported for tests
Yargs.rebase = rebase;
function rebase(base, dir) {
  return _path2.default.relative(base, dir);
}
module.exports = exports.default;
