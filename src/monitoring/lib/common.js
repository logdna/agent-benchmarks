'use strict';

const self = module.exports = {
  scenarios: {
    /**
     * Test scenario that uses a single pre-generated large file and waits for all the data
     * to reach the ingester.
     */
    lookback: 1,

    /**
     * Test scenario that uses a single file and appends the data while the agent is reading from it.
     */
    readWhileAppending: 2
  },
  agentTypes: {
    node: 1,
    rust: 2
  },
  getSettings() {
    const delayAppendMs = parseInt(process.env['DELAY_APPEND_MS']);
    return {
      folderPath: process.env['DEFAULT_LOG_PATH'],
      testScenario: parseInt(process.env['TEST_SCENARIO']) || 2,
      baselineAgent: self.agentTypes[process.env['BASELINE_AGENT_TYPE']] || self.agentTypes.node,
      compareAgent: self.agentTypes[process.env['COMPARE_AGENT_TYPE']],
      totalFiles: parseInt(process.env['TOTAL_FILES']) || 1,

      // For scenarios that are completed by total run time
      runTimeInSeconds: parseInt(process.env['RUN_TIME_IN_SECONDS']) || 30,

      // For scenarios that are completed once n lines are received
      fileLineLength: parseInt(process.env['LOG_LINES']) || 10_000_000,

      maxChunkSize: parseInt(process.env['MAX_CHUNK_SIZE_KB']) * 1000 || 64_000,
      delayAppendMs: !isNaN(delayAppendMs) ? delayAppendMs : 20,
    };
  }
};
