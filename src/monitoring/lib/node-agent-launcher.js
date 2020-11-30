'use strict';

const { fork } = require('child_process');
const path = require('path');

function launcher() {
  return new Promise((resolve, reject) => {
    let pathToFile = process.env['PATH_TO_AGENT'];
    if (!pathToFile) {
      pathToFile = path.join(process.env['HOME'], 'agent-linux', 'index.js')
    }

    const p = fork(pathToFile, ['-R'], { silent: true});
    console.log(`Process ${p.pid} started from node module "${pathToFile}"`);
    p.stderr.on('data', d => console.error('stderr', d.toString()));
    p.on('error', e => {
      console.error('Node.js agent returned error', e);
      reject(e);
    });
    p.on('spawn', () => resolve(p));
    p.on('exit', (code, signal) => {
      console.log('Node.js agent process exited', code, signal);
    });

    if (p.pid > 0) {
      resolve(p);
    }
  });
}

module.exports = launcher;
