const {fork} = require('child_process');
const path = require('path');
const {agentTypes} = require('./common')

function launcher(expectedLines, agentType) {
  return new Promise((resolve, reject) => {
    const ingesterContext = {};
    ingesterContext.finishReceiving = new Promise(receivedResolver => {
      const pathToFile = path.join(__dirname, 'ingester.js');
      const port = agentType === agentTypes.rust ? 80 : 443;
      const env = Object.assign({EXPECTED_LINES: expectedLines, INGESTER_PORT: port}, process.env);
      const p = fork(pathToFile, [], { silent: true, env});
      ingesterContext.process = p;
      console.log(`Ingester process ${p.pid} started from "${pathToFile}"`);
      p.stdout.on('data', d => console.log('Ingester stdout', d.toString()));
      p.stderr.on('data', d => console.error('Ingester stderr', d.toString()));
      p.on('message', (m) => {
        if (m.finished) {
          console.log('Finished receiving');
          receivedResolver(m);
        }
      });
      p.on('spawn', () => resolve(ingesterContext));
      p.on('error', e => {
        console.error('Node.js ingester returned error', e);
        reject(e);
      })
      p.on('exit', (code, signal) => {
        console.log('Ingester process exited', code, signal);
      });

      if (p.pid > 0) {
        resolve(ingesterContext);
      }
    });
  });
}

module.exports = launcher;
