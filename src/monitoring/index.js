'use strict';

const util = require('util');
const {once} = require('events');
const rustLauncher = require('./lib/rust-agent-launcher');
const nodeLauncher = require('./lib/node-agent-launcher');
const ingesterLauncher = require('./lib/ingester-launcher');
const {generateFileStructure, appendOneLine, appendPeriodically} = require('./lib/file-generator');
const ProcessMonitor = require('./lib/process-monitor');
const {scenarios, agentTypes, getSettings} = require('./lib/common');

const delay = util.promisify(setTimeout);
const settings = getSettings();

async function run() {
  if (!settings.folderPath) {
    throw new Error('DEFAULT_LOG_PATH must be set');
  }

  let scenarioRunner;
  if (settings.testScenario === scenarios.lookback) {
    scenarioRunner = runScenarioLookback;
  } else {
    scenarioRunner = runScenarioAppend;
  }

  await scenarioRunner('baseline', settings.baselineAgent);
  await scenarioRunner('compare', settings.compareAgent);
}

async function runScenarioLookback(name, agentType) {
  await generateFileStructure(settings, settings.fileLineLength);
  const ingesterContext = await ingesterLauncher(settings.fileLineLength);
  const monitor = await startAgent(name, agentType);

  // Rust requires the file to be changed to kick in
  const backgroundTimer = agentType === agentTypes.rust ? appendInTheBackground() : null;

  // Wait for the ingester to receive all the data
  await ingesterContext.finishReceiving;

  console.log('Waiting a few seconds after finished receiving...');
  await delay(5000);

  monitor.stop();
  clearInterval(backgroundTimer);

  await shutdown(monitor, ingesterContext);
}

async function runScenarioAppend(name, agentType) {
  await generateFileStructure(settings, 0)
  const ingesterContext = await ingesterLauncher(0);
  const monitor = await startAgent(name, agentType);

  console.log('Starting to append to file periodically');
  const appendContext = appendPeriodically(settings);
  await delay(settings.runTimeInSeconds * 1000);

  console.log(`Stopping after ${settings.runTimeInSeconds} seconds...`);
  await appendContext.stop();

  // Adding an extra delay to see how it catches up and allowing GC
  await delay(5000);
  monitor.stop();

  await shutdown(monitor, ingesterContext);
}

async function startAgent(name, agentType) {
  const launcher = agentType === agentTypes.rust ? rustLauncher : nodeLauncher;

  await Promise.race([
    launcher(name),
    delay(10000).then(() => { throw new Error('Process could not start before timeout'); })
  ]);

  const agentProcess = await agentLaunchPromise;
  const monitor = new ProcessMonitor(agentProcess, name);
  await monitor.init();

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
    appendOneLine(settings.folderPath)
      .catch(e => console.log('Error while appending in the background', e));
  }, 500);
}
