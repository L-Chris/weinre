const path = require('path')

const Program = path.basename(process.argv[1])

const log = exports.log = function(message) {
  const date = new Date()
  const time = date.toISOString()
  return console.log(`${time} ${Program}: ${message}`)
}

exports.logVerbose = function(message) {
  var _ref;
  if (!(utils != null ? (_ref = utils.options) != null ? _ref.verbose : void 0 : void 0)) {
    return;
  }
  return log(message);
};

exports.ensureInteger = function(value, message) {
  var newValue;
  newValue = parseInt(value);
  if (isNaN(newValue)) {
    utils.exit("" + message + ": '" + value + "'");
  }
  return newValue;
};

exports.ensureString = function(value, message) {
  if (typeof value !== 'string') {
    utils.exit("" + message + ": '" + value + "'");
  }
  return value;
};

exports.ensureBoolean = function(value, message) {
  var newValue, uValue;
  uValue = value.toString().toUpperCase();
  newValue = null;
  switch (uValue) {
    case 'TRUE':
      newValue = true;
      break;
    case 'FALSE':
      newValue = false;
  }
  if (typeof newValue !== 'boolean') {
    utils.exit("" + message + ": '" + value + "'");
  }
  return newValue;
};

exports.exit = function(message) {
  log(message)
  return process.exit(1)
}

exports.alignLeft = function(string, length) {
  while (string.length < length) {
    string = "" + string + " ";
  }
  return string;
};

exports.alignRight = function(string, length) {
  while (string.length < length) {
    string = " " + string;
  }
  return string;
};