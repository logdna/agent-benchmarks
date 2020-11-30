'use strict';

const rustLauncher = require('./lib/rust-agent-launcher');
const nodeLauncher = require('./lib/node-agent-launcher');
const ingesterLauncher = require('./lib/ingester-launcher');
const generateFileStructure = require('./lib/file-generator');
const ProcessMonitor = require('./lib/process-monitor');

const fileLineLength = parseInt(process.env['LOG_LINES']) || 10_000_000;

async function run() {
  await generateFileStructure('/tmp/test-logs/', fileLineLength)
  const ingesterContext = await ingesterLauncher(fileLineLength);

  const agentProcess = await (process.env['AGENT_TYPE'] !== 'node' ? rustLauncher() : nodeLauncher());
  const monitor = new ProcessMonitor(agentProcess.pid);

  console.log('Launch completed');

  // Wait for the ingester to receive all the data
  await ingesterContext.finishReceiving;

  console.log('Generating results...')
  monitor.stop();
  await monitor.generateResults();

  console.log('Shutting down...');
  agentProcess.kill();
  ingesterContext.process.kill();
}

run()
  .catch(e => {
    console.error('There was an error while launching', e);
    process.exit(1);
  });


