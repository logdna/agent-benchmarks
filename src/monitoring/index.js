'use strict';

const util = require('util');
const {once} = require('events');
const rustLauncher = require('./lib/rust-agent-launcher');
const nodeLauncher = require('./lib/node-agent-launcher');
const ingesterLauncher = require('./lib/ingester-launcher');
const {generateFileStructure, appendOneLine} = require('./lib/file-generator');
const ProcessMonitor = require('./lib/process-monitor');
const delay = util.promisify(setTimeout);

const folderPath = '/tmp/test-logs/';
const fileLineLength = parseInt(process.env['LOG_LINES']) || 10_000_000;

async function run() {
  await generateFileStructure(folderPath, fileLineLength)
  const ingesterContext = await ingesterLauncher(fileLineLength);

  const agentLaunchPromise = process.env['AGENT_TYPE'] !== 'node' ? rustLauncher() : nodeLauncher();

  await Promise.race([
    agentLaunchPromise,
    delay(2000).then(() => { throw new Error('Process could not start before timeout'); })
  ]);

  const agentProcess = await agentLaunchPromise;
  const monitor = new ProcessMonitor(agentProcess.pid);

  console.log('Launch completed');

  // Rust requires the file to be changed to kick in
  await appendOneLine(folderPath);

  // Wait for the ingester to receive all the data
  await ingesterContext.finishReceiving;

  console.log('Generating results...')
  monitor.stop();
  await monitor.generateResults();

  console.log('Shutting down...');

  const agentClosedPromise = once(agentProcess, 'close');
  agentProcess.kill();
  await agentClosedPromise;
  // Kill the ingester only after the agent
  ingesterContext.process.kill();
}

run()
  .catch(e => {
    console.error('There was an error while launching', e);
    process.exit(1);
  });


