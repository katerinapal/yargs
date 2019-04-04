"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = usage;

var _decamelize = require("./decamelize");

var _decamelize2 = _interopRequireDefault(_decamelize);

var _stringWidth = require("string-width");

var _stringWidth2 = _interopRequireDefault(_stringWidth);

var _objFilter = require("./obj-filter");

var _objFilter2 = _interopRequireDefault(_objFilter);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _setBlocking = require("set-blocking");

var _setBlocking2 = _interopRequireDefault(_setBlocking);

var _yerror = require("./yerror");

var _yerror2 = _interopRequireDefault(_yerror);

var _cliui = require("cliui");

var _cliui2 = _interopRequireDefault(_cliui);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

'use strict';

function usage(yargs, y18n) {
  var __ = y18n.__;
  var self = {};

  // methods for ouputting/building failure message.
  var fails = [];
  self.failFn = function failFn(f) {
    fails.push(f);
  };

  var failMessage = null;
  var showHelpOnFail = true;
  self.showHelpOnFail = function showHelpOnFailFn(enabled, message) {
    if (typeof enabled === 'string') {
      message = enabled;
      enabled = true;
    } else if (typeof enabled === 'undefined') {
      enabled = true;
    }
    failMessage = message;
    showHelpOnFail = enabled;
    return self;
  };

  var failureOutput = false;
  self.fail = function fail(msg, err) {
    var logger = yargs._getLoggerInstance();

    if (fails.length) {
      for (var i = fails.length - 1; i >= 0; --i) {
        fails[i](msg, err, self);
      }
    } else {
      if (yargs.getExitProcess()) (0, _setBlocking2.default)(true);

      // don't output failure message more than once
      if (!failureOutput) {
        failureOutput = true;
        if (showHelpOnFail) {
          yargs.showHelp('error');
          logger.error();
        }
        if (msg || err) logger.error(msg || err);
        if (failMessage) {
          if (msg || err) logger.error('');
          logger.error(failMessage);
        }
      }

      err = err || new _yerror2.default(msg);
      if (yargs.getExitProcess()) {
        return yargs.exit(1);
      } else if (yargs._hasParseCallback()) {
        return yargs.exit(1, err);
      } else {
        throw err;
      }
    }
  };

  // methods for ouputting/building help (usage) message.
  var usages = [];
  var usageDisabled = false;
  self.usage = function (msg, description) {
    if (msg === null) {
      usageDisabled = true;
      usages = [];
      return;
    }
    usageDisabled = false;
    usages.push([msg, description || '']);
    return self;
  };
  self.getUsage = function () {
    return usages;
  };
  self.getUsageDisabled = function () {
    return usageDisabled;
  };

  self.getPositionalGroupName = function () {
    return __('Positionals:');
  };

  var examples = [];
  self.example = function (cmd, description) {
    examples.push([cmd, description || '']);
  };

  var commands = [];
  self.command = function command(cmd, description, isDefault, aliases) {
    // the last default wins, so cancel out any previously set default
    if (isDefault) {
      commands = commands.map(function (cmdArray) {
        cmdArray[2] = false;
        return cmdArray;
      });
    }
    commands.push([cmd, description || '', isDefault, aliases]);
  };
  self.getCommands = function () {
    return commands;
  };

  var descriptions = {};
  self.describe = function describe(key, desc) {
    if ((typeof key === "undefined" ? "undefined" : _typeof(key)) === 'object') {
      Object.keys(key).forEach(function (k) {
        self.describe(k, key[k]);
      });
    } else {
      descriptions[key] = desc;
    }
  };
  self.getDescriptions = function () {
    return descriptions;
  };

  var epilog = void 0;
  self.epilog = function (msg) {
    epilog = msg;
  };

  var wrapSet = false;
  var wrap = void 0;
  self.wrap = function (cols) {
    wrapSet = true;
    wrap = cols;
  };

  function getWrap() {
    if (!wrapSet) {
      wrap = windowWidth();
      wrapSet = true;
    }

    return wrap;
  }

  var deferY18nLookupPrefix = '__yargsString__:';
  self.deferY18nLookup = function (str) {
    return deferY18nLookupPrefix + str;
  };

  var defaultGroup = 'Options:';
  self.help = function help() {
    normalizeAliases();

    // handle old demanded API
    var base$0 = _path2.default.basename(yargs.$0);
    var demandedOptions = yargs.getDemandedOptions();
    var demandedCommands = yargs.getDemandedCommands();
    var groups = yargs.getGroups();
    var options = yargs.getOptions();

    var keys = [];
    keys = keys.concat(Object.keys(descriptions));
    keys = keys.concat(Object.keys(demandedOptions));
    keys = keys.concat(Object.keys(demandedCommands));
    keys = keys.concat(Object.keys(options.default));
    keys = keys.filter(filterHiddenOptions);
    keys = Object.keys(keys.reduce(function (acc, key) {
      if (key !== '_') acc[key] = true;
      return acc;
    }, {}));

    var theWrap = getWrap();
    var ui = (0, _cliui2.default)({
      width: theWrap,
      wrap: !!theWrap
    });

    // the usage string.
    if (!usageDisabled) {
      if (usages.length) {
        // user-defined usage.
        usages.forEach(function (usage) {
          ui.div("" + usage[0].replace(/\$0/g, base$0));
          if (usage[1]) {
            ui.div({ text: "" + usage[1], padding: [1, 0, 0, 0] });
          }
        });
        ui.div();
      } else if (commands.length) {
        var u = null;
        // demonstrate how commands are used.
        if (demandedCommands._) {
          u = base$0 + " <" + __('command') + ">\n";
        } else {
          u = base$0 + " [" + __('command') + "]\n";
        }
        ui.div("" + u);
      }
    }

    // your application's commands, i.e., non-option
    // arguments populated in '_'.
    if (commands.length) {
      ui.div(__('Commands:'));

      var context = yargs.getContext();
      var parentCommands = context.commands.length ? context.commands.join(' ') + " " : '';

      if (yargs.getParserConfiguration()['sort-commands'] === true) {
        commands = commands.sort(function (a, b) {
          return a[0].localeCompare(b[0]);
        });
      }

      commands.forEach(function (command) {
        var commandString = base$0 + " " + parentCommands + command[0].replace(/^\$0 ?/, ''); // drop $0 from default commands.
        ui.span({
          text: commandString,
          padding: [0, 2, 0, 2],
          width: maxWidth(commands, theWrap, "" + base$0 + parentCommands) + 4
        }, { text: command[1] });
        var hints = [];
        if (command[2]) hints.push("[" + __('default:').slice(0, -1) + "]"); // TODO hacking around i18n here
        if (command[3] && command[3].length) {
          hints.push("[" + __('aliases:') + " " + command[3].join(', ') + "]");
        }
        if (hints.length) {
          ui.div({ text: hints.join(' '), padding: [0, 0, 0, 2], align: 'right' });
        } else {
          ui.div();
        }
      });

      ui.div();
    }

    // perform some cleanup on the keys array, making it
    // only include top-level keys not their aliases.
    var aliasKeys = (Object.keys(options.alias) || []).concat(Object.keys(yargs.parsed.newAliases) || []);

    keys = keys.filter(function (key) {
      return !yargs.parsed.newAliases[key] && aliasKeys.every(function (alias) {
        return (options.alias[alias] || []).indexOf(key) === -1;
      });
    });

    // populate 'Options:' group with any keys that have not
    // explicitly had a group set.
    if (!groups[defaultGroup]) groups[defaultGroup] = [];
    addUngroupedKeys(keys, options.alias, groups);

    // display 'Options:' table along with any custom tables:
    Object.keys(groups).forEach(function (groupName) {
      if (!groups[groupName].length) return;

      // if we've grouped the key 'f', but 'f' aliases 'foobar',
      // normalizedKeys should contain only 'foobar'.
      var normalizedKeys = groups[groupName].filter(filterHiddenOptions).map(function (key) {
        if (~aliasKeys.indexOf(key)) return key;
        for (var i = 0, aliasKey; (aliasKey = aliasKeys[i]) !== undefined; i++) {
          if (~(options.alias[aliasKey] || []).indexOf(key)) return aliasKey;
        }
        return key;
      });

      if (normalizedKeys.length < 1) return;

      ui.div(__(groupName));

      // actually generate the switches string --foo, -f, --bar.
      var switches = normalizedKeys.reduce(function (acc, key) {
        acc[key] = [key].concat(options.alias[key] || []).map(function (sw) {
          // for the special positional group don't
          // add '--' or '-' prefix.
          if (groupName === self.getPositionalGroupName()) return sw;else return (sw.length > 1 ? '--' : '-') + sw;
        }).join(', ');

        return acc;
      }, {});

      normalizedKeys.forEach(function (key) {
        var kswitch = switches[key];
        var desc = descriptions[key] || '';
        var type = null;

        if (~desc.lastIndexOf(deferY18nLookupPrefix)) desc = __(desc.substring(deferY18nLookupPrefix.length));

        if (~options.boolean.indexOf(key)) type = "[" + __('boolean') + "]";
        if (~options.count.indexOf(key)) type = "[" + __('count') + "]";
        if (~options.string.indexOf(key)) type = "[" + __('string') + "]";
        if (~options.normalize.indexOf(key)) type = "[" + __('string') + "]";
        if (~options.array.indexOf(key)) type = "[" + __('array') + "]";
        if (~options.number.indexOf(key)) type = "[" + __('number') + "]";

        var extra = [type, key in demandedOptions ? "[" + __('required') + "]" : null, options.choices && options.choices[key] ? "[" + __('choices:') + " " + self.stringifiedValues(options.choices[key]) + "]" : null, defaultString(options.default[key], options.defaultDescription[key])].filter(Boolean).join(' ');

        ui.span({ text: kswitch, padding: [0, 2, 0, 2], width: maxWidth(switches, theWrap) + 4 }, desc);

        if (extra) ui.div({ text: extra, padding: [0, 0, 0, 2], align: 'right' });else ui.div();
      });

      ui.div();
    });

    // describe some common use-cases for your application.
    if (examples.length) {
      ui.div(__('Examples:'));

      examples.forEach(function (example) {
        example[0] = example[0].replace(/\$0/g, base$0);
      });

      examples.forEach(function (example) {
        if (example[1] === '') {
          ui.div({
            text: example[0],
            padding: [0, 2, 0, 2]
          });
        } else {
          ui.div({
            text: example[0],
            padding: [0, 2, 0, 2],
            width: maxWidth(examples, theWrap) + 4
          }, {
            text: example[1]
          });
        }
      });

      ui.div();
    }

    // the usage string.
    if (epilog) {
      var e = epilog.replace(/\$0/g, base$0);
      ui.div(e + "\n");
    }

    // Remove the trailing white spaces
    return ui.toString().replace(/\s*$/, '');
  };

  // return the maximum width of a string
  // in the left-hand column of a table.
  function maxWidth(table, theWrap, modifier) {
    var width = 0;

    // table might be of the form [leftColumn],
    // or {key: leftColumn}
    if (!Array.isArray(table)) {
      table = Object.keys(table).map(function (key) {
        return [table[key]];
      });
    }

    table.forEach(function (v) {
      width = Math.max((0, _stringWidth2.default)(modifier ? modifier + " " + v[0] : v[0]), width);
    });

    // if we've enabled 'wrap' we should limit
    // the max-width of the left-column.
    if (theWrap) width = Math.min(width, parseInt(theWrap * 0.5, 10));

    return width;
  }

  // make sure any options set for aliases,
  // are copied to the keys being aliased.
  function normalizeAliases() {
    // handle old demanded API
    var demandedOptions = yargs.getDemandedOptions();
    var options = yargs.getOptions();(Object.keys(options.alias) || []).forEach(function (key) {
      options.alias[key].forEach(function (alias) {
        // copy descriptions.
        if (descriptions[alias]) self.describe(key, descriptions[alias]);
        // copy demanded.
        if (alias in demandedOptions) yargs.demandOption(key, demandedOptions[alias]);
        // type messages.
        if (~options.boolean.indexOf(alias)) yargs.boolean(key);
        if (~options.count.indexOf(alias)) yargs.count(key);
        if (~options.string.indexOf(alias)) yargs.string(key);
        if (~options.normalize.indexOf(alias)) yargs.normalize(key);
        if (~options.array.indexOf(alias)) yargs.array(key);
        if (~options.number.indexOf(alias)) yargs.number(key);
      });
    });
  }

  // given a set of keys, place any keys that are
  // ungrouped under the 'Options:' grouping.
  function addUngroupedKeys(keys, aliases, groups) {
    var groupedKeys = [];
    var toCheck = null;
    Object.keys(groups).forEach(function (group) {
      groupedKeys = groupedKeys.concat(groups[group]);
    });

    keys.forEach(function (key) {
      toCheck = [key].concat(aliases[key]);
      if (!toCheck.some(function (k) {
        return groupedKeys.indexOf(k) !== -1;
      })) {
        groups[defaultGroup].push(key);
      }
    });
    return groupedKeys;
  }

  function filterHiddenOptions(key) {
    return yargs.getOptions().hiddenOptions.indexOf(key) < 0 || yargs.parsed.argv[yargs.getOptions().showHiddenOpt];
  }

  self.showHelp = function (level) {
    var logger = yargs._getLoggerInstance();
    if (!level) level = 'error';
    var emit = typeof level === 'function' ? level : logger[level];
    emit(self.help());
  };

  self.functionDescription = function (fn) {
    var description = fn.name ? (0, _decamelize2.default)(fn.name, '-') : __('generated-value');
    return ['(', description, ')'].join('');
  };

  self.stringifiedValues = function stringifiedValues(values, separator) {
    var string = '';
    var sep = separator || ', ';
    var array = [].concat(values);

    if (!values || !array.length) return string;

    array.forEach(function (value) {
      if (string.length) string += sep;
      string += JSON.stringify(value);
    });

    return string;
  };

  // format the default-value-string displayed in
  // the right-hand column.
  function defaultString(value, defaultDescription) {
    var string = "[" + __('default:') + " ";

    if (value === undefined && !defaultDescription) return null;

    if (defaultDescription) {
      string += defaultDescription;
    } else {
      switch (typeof value === "undefined" ? "undefined" : _typeof(value)) {
        case 'string':
          string += "\"" + value + "\"";
          break;
        case 'object':
          string += JSON.stringify(value);
          break;
        default:
          string += value;
      }
    }

    return string + "]";
  }

  // guess the width of the console window, max-width 80.
  function windowWidth() {
    var maxWidth = 80;
    if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === 'object' && process.stdout && process.stdout.columns) {
      return Math.min(maxWidth, process.stdout.columns);
    } else {
      return maxWidth;
    }
  }

  // logic for displaying application version.
  var version = null;
  self.version = function (ver) {
    version = ver;
  };

  self.showVersion = function () {
    var logger = yargs._getLoggerInstance();
    logger.log(version);
  };

  self.reset = function reset(localLookup) {
    // do not reset wrap here
    // do not reset fails here
    failMessage = null;
    failureOutput = false;
    usages = [];
    usageDisabled = false;
    epilog = undefined;
    examples = [];
    commands = [];
    descriptions = (0, _objFilter2.default)(descriptions, function (k, v) {
      return !localLookup[k];
    });
    return self;
  };

  var frozen = void 0;
  self.freeze = function freeze() {
    frozen = {};
    frozen.failMessage = failMessage;
    frozen.failureOutput = failureOutput;
    frozen.usages = usages;
    frozen.usageDisabled = usageDisabled;
    frozen.epilog = epilog;
    frozen.examples = examples;
    frozen.commands = commands;
    frozen.descriptions = descriptions;
  };
  self.unfreeze = function unfreeze() {
    failMessage = frozen.failMessage;
    failureOutput = frozen.failureOutput;
    usages = frozen.usages;
    usageDisabled = frozen.usageDisabled;
    epilog = frozen.epilog;
    examples = frozen.examples;
    commands = frozen.commands;
    descriptions = frozen.descriptions;
    frozen = undefined;
  };

  return self;
};;
module.exports = exports.default;
