'use strict';

const rustLauncher = require('./lib/rust-agent-launcher');

if (process.env['AGENT_TYPE'] !== 'node') {
  rustLauncher();
} else {
  throw new Error('Not implemented');
}
