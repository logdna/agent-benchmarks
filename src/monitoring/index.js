'use strict';

const util = require('util');
const {once} = require('events');
const rustLauncher = require('./lib/rust-agent-launcher');
const nodeLauncher = require('./lib/node-agent-launcher');
const ingesterLauncher = require('./lib/ingester-launcher');
const {generateFileStructure, appendOneLine, appendPeriodically} = require('./lib/file-generator');
const ProcessMonitor = require('./lib/process-monitor');
const delay = util.promisify(setTimeout);

const folderPath = '/tmp/test-logs/';
const fileLineLength = parseInt(process.env['LOG_LINES']) || 10_000_000;
const testScenario = parseInt(process.env['TEST_SCENARIO']) || 1;
const isRust = process.env['AGENT_TYPE'] !== 'node';
const runTimeInSeconds = parseInt(process.env['RUN_TIME_IN_SECONDS']) || 30;

const scenarios = {
  /**
   * Test scenario that uses a single pre-generated large file and waits for all the data
   * to reach the ingester.
   */
  lookback: 1,

  /**
   * Test scenario that uses a single file and appends the data while the agent is reading from it.
   */
  readWhileAppending: 2
};

async function run() {
  if (testScenario === scenarios.lookback) {
    await runScenarioLookback();
  } else {
    await runScenarioAppend();
  }
}

async function runScenarioLookback() {
  await generateFileStructure(folderPath, fileLineLength)

  const ingesterContext = await ingesterLauncher(fileLineLength);

  const monitor = await startAgent();

  // Rust requires the file to be changed to kick in
  const backgroundTimer = isRust ? appendInTheBackground() : null;

  // Wait for the ingester to receive all the data
  await ingesterContext.finishReceiving;

  console.log('Waiting a few seconds after finished receiving...');
  await delay(5000);

  monitor.stop();
  clearInterval(backgroundTimer);

  await shutdown(monitor, ingesterContext);
}

async function runScenarioAppend() {
  await generateFileStructure(folderPath, 0)
  const ingesterContext = await ingesterLauncher(0);
  const monitor = await startAgent();

  console.log('Starting to append to file periodically');
  const appendContext = appendPeriodically(folderPath);
  await delay(runTimeInSeconds * 1000);

  console.log('Stopping...');
  await appendContext.stop();

  // Adding an extra delay to see how it catches up and allowing GC
  await delay(5000);
  monitor.stop();

  await shutdown(monitor, ingesterContext);
}

async function startAgent() {
  const agentLaunchPromise = isRust ? rustLauncher() : nodeLauncher();

  await Promise.race([
    agentLaunchPromise,
    delay(10000).then(() => { throw new Error('Process could not start before timeout'); })
  ]);

  const agentProcess = await agentLaunchPromise;
  const monitor = new ProcessMonitor(agentProcess);

  console.log('Launch completed');
  return monitor;
}

async function shutdown(monitor, ingesterContext) {
  console.log('Generating results...');

  await monitor.generateResults();

  console.log('Shutting down...');

  const agentClosedPromise = once(monitor.process, 'close');
  monitor.process.kill();
  await agentClosedPromise;
  // Kill the ingester only after the agent
  ingesterContext.process.kill();
}

run()
  .catch(e => {
    console.error('There was an error while launching', e);
    process.exit(1);
  });

function appendInTheBackground() {
  return setInterval(() => {
    appendOneLine(folderPath)
      .catch(e => console.log('Error while appending in the background', e));
  }, 500);
}
