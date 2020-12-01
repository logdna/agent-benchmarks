'use strict';

const EventEmitter = require('events');
const pidusage = require('pidusage');
const hdr = require('hdr-histogram-js');

const bytesToMiB = 1 / (1024 * 1024);
const interval = 200;

class ProcessMonitor extends EventEmitter {
  constructor(pid) {
    super();

    this._pid = pid;
    this._timer = setInterval(() => this._recordStats(), interval);
    this._cpuTime = 0;
    this._memoryHistogram = hdr.build();
    this._cpuHistogram = hdr.build();
  }

  async _recordStats() {
    try {
      const stats = await pidusage(this._pid);
      this._cpuTime = stats.ctime;
      this._memoryHistogram.recordValue(stats.memory * bytesToMiB);
      this._cpuHistogram.recordValue(stats.cpu);
    } catch (e) {
      // We are executing in the background
      console.error('There was an error while recording stats', e);
      if (e.code === 'ESRCH') {
        console.log('Process is no longer available, preventing further lookups');
        clearInterval(this._timer);
      }
    }
  }

  async generateResults() {
    // if (process.env['SAVE_TO_S3'] !== 'true') {
      console.log('TOTAL CPU TIME (in ms): %d', this._cpuTime);
      console.log('MEMORY HISTOGRAM (in MiB): %s', this._memoryHistogram);
      console.log('CPU HISTOGRAM (in percentage): %s', this._cpuHistogram);
    // }
  }

  stop() {
    clearInterval(this._timer);
  }
}

module.exports = ProcessMonitor;
