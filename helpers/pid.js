var fs = require('fs'); 
var path = __dirname+'/../app.pid';
var pid = process.pid.toString()

console.log('Writing pid ('+pid+') to', path);
fs.writeFileSync(path, pid);
process.on('exit', function () {
  fs.unlinkSync(path);
});

process
  .on('SIGINT', process.exit)
  .on('SIGTERM', process.exit)
  .on('SIGQUIT', process.exit)
  .on('SIGKILL', process.exit);