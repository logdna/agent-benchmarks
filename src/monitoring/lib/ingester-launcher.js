const { fork } = require('child_process');
const path = require('path');

function launcher() {
  return new Promise((resolve, reject) => {
    const pathToFile = path.join(__dirname, 'ingester.js')
    const p = fork(pathToFile, [], { silent: true});
    console.log(`Ingester process ${p.pid} started from "${pathToFile}"`);
    p.stdout.on('data', d => console.log('stdout', d.toString()));
    p.stderr.on('data', d => console.error('Ingester stderr', d.toString()));
    p.on('spawn', resolve);
    p.on('error', e => {
      console.error('Node.js ingester returned error', e);
      reject(e);
    })
    p.on('exit', (code, signal) => {
      console.log('Process exited', code, signal);
    });

    if (p.pid > 0) {
      resolve();
    }
  });
}

module.exports = launcher;
