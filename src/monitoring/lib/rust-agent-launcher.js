'use strict';

const { execFile } = require('child_process');
const path = require('path');

function launcher() {
  return new Promise((resolve, reject) => {
    let pathToFile = process.env['PATH_TO_RUST_AGENT'];
    if (!pathToFile) {
      pathToFile = path.join(process.env['HOME'], 'logdna-agent-v2/target/release/logdna-agent')
    }

    const p = execFile(pathToFile, []);
    console.log(`Rust process started from executable "${pathToFile}"`);
    p.stderr.on('data', d => {
      const data = d.toString();
      if (data.includes('initialized')) {
        console.log('Rust agent started according to stdout/stderr');
        resolve(p);
      }
      console.error('stderr', data);
    });
    p.on('error', e => {
      console.error('Rust agent returned error', e);
      reject(e);
    })
    p.on('exit', (code, signal) => {
      console.log('Rust agent process exited', code, signal);
    });

    if (p.pid > 0) {
      resolve(p);
    }
  });
}

module.exports = launcher;
