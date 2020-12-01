'use strict';

const { fork } = require('child_process');
const path = require('path');

function launcher() {
  return new Promise((resolve, reject) => {
    let pathToFile = process.env['PATH_TO_NODE_AGENT'];
    if (!pathToFile) {
      pathToFile = path.join(process.env['HOME'], 'agent-linux', 'index.js')
    }

    const p = fork(pathToFile, ['-R'], { silent: true});
    console.log(`Process ${p.pid} started from node module "${pathToFile}"`);
    p.stderr.on('data', d => {
      const data = d.toString();
      if (data.includes('successfully started')) {
        console.log('Node agent started according to stdout/stderr');
        resolve(p);
      }
      console.error('stderr', data);
    });
    p.on('error', e => {
      console.error('Node.js agent returned error', e);
      reject(e);
    });
    p.on('exit', (code, signal) => {
      console.log('Node.js agent process exited', code, signal);
    });
  });
}

module.exports = launcher;
