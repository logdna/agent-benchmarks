'use strict';

const rustLauncher = require('./lib/rust-agent-launcher');
const nodeLauncher = require('./lib/node-agent-launcher');
const ingester = require('./lib/ingester');

if (process.env['AGENT_TYPE'] !== 'node') {
  rustLauncher();
} else {
  nodeLauncher();
}

ingester()
