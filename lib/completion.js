"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = completion;

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

'use strict';

// add bash completions to your
//  yargs-powered applications.
// add bash completions to your
//  yargs-powered applications.
function completion(yargs, usage, command) {
  var self = {
    completionKey: 'get-yargs-completions'
  };

  var zshShell = process.env.SHELL && process.env.SHELL.indexOf('zsh') !== -1;
  // get a list of completion commands.
  // 'args' is the array of strings from the line to be completed
  self.getCompletion = function getCompletion(args, done) {
    var completions = [];
    var current = args.length ? args[args.length - 1] : '';
    var argv = yargs.parse(args, true);
    var aliases = yargs.parsed.aliases;
    var parentCommands = yargs.getContext().commands;

    // a custom completion function can be provided
    // to completion().
    if (completionFunction) {
      if (completionFunction.length < 3) {
        var result = completionFunction(current, argv);

        // promise based completion function.
        if (typeof result.then === 'function') {
          return result.then(function (list) {
            process.nextTick(function () {
              done(list);
            });
          }).catch(function (err) {
            process.nextTick(function () {
              throw err;
            });
          });
        }

        // synchronous completion function.
        return done(result);
      } else {
        // asynchronous completion function
        return completionFunction(current, argv, function (completions) {
          done(completions);
        });
      }
    }

    var handlers = command.getCommandHandlers();
    for (var i = 0, ii = args.length; i < ii; ++i) {
      if (handlers[args[i]] && handlers[args[i]].builder) {
        var builder = handlers[args[i]].builder;
        if (typeof builder === 'function') {
          var y = yargs.reset();
          builder(y);
          return y.argv;
        }
      }
    }

    if (!current.match(/^-/) && parentCommands[parentCommands.length - 1] !== current) {
      usage.getCommands().forEach(function (usageCommand) {
        var commandName = command.parseCommand(usageCommand[0]).cmd;
        if (args.indexOf(commandName) === -1) {
          if (!zshShell) {
            completions.push(commandName);
          } else {
            var desc = usageCommand[1] || '';
            completions.push(commandName.replace(/:/g, '\\:') + ':' + desc);
          }
        }
      });
    }

    if (current.match(/^-/) || current === '' && completions.length === 0) {
      var descs = usage.getDescriptions();
      Object.keys(yargs.getOptions().key).forEach(function (key) {
        // If the key and its aliases aren't in 'args', add the key to 'completions'
        var keyAndAliases = [key].concat(aliases[key] || []);
        var notInArgs = keyAndAliases.every(function (val) {
          return args.indexOf("--" + val) === -1;
        });
        if (notInArgs) {
          if (!zshShell) {
            completions.push("--" + key);
          } else {
            var desc = descs[key] || '';
            completions.push("--" + key.replace(/:/g, '\\:') + ":" + desc.replace('__yargsString__:', ''));
          }
        }
      });
    }

    done(completions);
  };

  // generate the completion script to add to your .bashrc.
  self.generateCompletionScript = function generateCompletionScript($0, cmd) {
    var script = _fs2.default.readFileSync(_path2.default.resolve(__dirname, zshShell ? '../completion.zsh.hbs' : '../completion.sh.hbs'), 'utf-8');
    var name = _path2.default.basename($0);

    // add ./to applications not yet installed as bin.
    if ($0.match(/\.js$/)) $0 = "./" + $0;

    script = script.replace(/{{app_name}}/g, name);
    script = script.replace(/{{completion_command}}/g, cmd);
    return script.replace(/{{app_path}}/g, $0);
  };

  // register a function to perform your own custom
  // completions., this function can be either
  // synchrnous or asynchronous.
  var completionFunction = null;
  self.registerFunction = function (fn) {
    completionFunction = fn;
  };

  return self;
};;
module.exports = exports.default;
