const fs = require('fs');
const util = require('util');
const moment = require('moment');
let logFile, logStdout;

let openLog = function (logFileName) {
  logFile = fs.createWriteStream(__dirname + '/' + logFileName, {
    flags: 'w',
  });
  logStdout = process.stdout;
};

let log = function (d) {
  let date = moment().format('(YYYY-MM-DD hh:mm:ss a)');
  d = date + '\t' + d;
  logFile.write(util.format(d) + '\n');
  // log_stdout.write(util.format(d) + '\n');
};
module.exports = { openLog, log };
