'use strict';

const rustLauncher = require('./lib/rust-agent-launcher');
const nodeLauncher = require('./lib/node-agent-launcher');
const ingesterLauncher = require('./lib/ingester-launcher');
const generateFileStructure = require('./lib/file-generator');

async function run() {
  await generateFileStructure('/tmp/test-logs/')
  await ingesterLauncher();

  if (process.env['AGENT_TYPE'] !== 'node') {
    await rustLauncher();
  } else {
    await nodeLauncher();
  }
  console.log('Launch completed');
}

run()
  .catch(e => {
    console.error('There was an error while launching', e);
    process.exit(1);
  });
