'use strict';

const { execFile } = require('child_process');
const path = require('path');
const ProcessMonitor = require('./process-monitor');

function launcher() {
  return new Promise((resolve, reject) => {
    let pathToFile = process.env['PATH_TO_AGENT'];
    if (!pathToFile) {
      pathToFile = path.join(process.env['HOME'], 'logdna-agent-v2/target/release/logdna-agent')
    }

    const p = execFile(pathToFile, []);
    console.log(`Rust process started from executable "${pathToFile}"`);
    const monitor = new ProcessMonitor(p.pid);
    p.stderr.on('data', d => console.error('stderr', d));
    p.on('error', e => {
      console.error('Rust agent returned error', e);
      monitor.shutdown();
      reject(e);
    })
    p.on('spawn', resolve);
    p.on('exit', (code, signal) => {
      console.log('Process exited', code, signal);
      monitor.shutdown();
    });
  });
}

module.exports = launcher;
