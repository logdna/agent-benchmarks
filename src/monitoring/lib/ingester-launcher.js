const { fork } = require('child_process');
const path = require('path');

function launcher() {
  const pathToFile = path.join(__dirname, 'ingester.js')
  const p = fork(pathToFile, [], { silent: true});
  console.log(`Ingester process ${p.pid} started from "${pathToFile}"`);
  p.stdout.on('data', d => console.log('stdout', d.toString()));
  p.stderr.on('data', d => console.error('stderr', d.toString()));
  p.on('error', e => {
    console.error('Node.js ingester returned error', e);
  })
  p.on('exit', (code, signal) => {
    console.log('Process exited', code, signal);
  });
}

module.exports = launcher;
