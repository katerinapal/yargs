'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Argv;

var _yargs = require('./yargs');

var _yargs2 = _interopRequireDefault(_yargs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

'use strict';

Argv(process.argv.slice(2));

function Argv(processArgs, cwd) {
  var argv = (0, _yargs2.default)(processArgs, cwd, require);
  singletonify(argv);
  return argv;
}

/*  Hack an instance of Argv with process.argv into Argv
    so people can do
    require('yargs')(['--beeble=1','-z','zizzle']).argv
    to parse a list of args and
    require('yargs').argv
    to get a parsed version of process.argv.
*/
function singletonify(inst) {
  Object.keys(inst).forEach(function (key) {
    if (key === 'argv') {
      Argv.__defineGetter__(key, inst.__lookupGetter__(key));
    } else {
      Argv[key] = typeof inst[key] === 'function' ? inst[key].bind(inst) : inst[key];
    }
  });
}
module.exports = exports.default;
