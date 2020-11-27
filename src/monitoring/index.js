'use strict';

const rustLauncher = require('./lib/rust-agent-launcher');
const nodeLauncher = require('./lib/node-agent-launcher');
const ingesterLauncher = require('./lib/ingester-launcher');

if (process.env['AGENT_TYPE'] !== 'node') {
  rustLauncher();
} else {
  nodeLauncher();
}

ingesterLauncher()
