'use strict';

const EventEmitter = require('events');
const pidusage = require('pidusage');
const hdr = require('hdr-histogram-js');

const bytesToMiB = 1 / (1024 * 1024);
const interval = 200;
// interval * resolutionForTimeSeries = resolutionInMs
const resolution = parseInt(process.env['RESOLUTION_TIME_SERIES']) || 5;

class ProcessMonitor extends EventEmitter {
  constructor(p) {
    super();

    this.process = p;
    this._pid = p.pid;
    this._timer = setInterval(() => this._recordStats(), interval);
    this._cpuTime = 0;
    this._memoryHistogram = hdr.build();
    this._cpuHistogram = hdr.build();
    this._counter = 0;
    // Small amount of values in memory
    this._memoryTimeSeries = [];
  }

  async _recordStats() {
    try {
      const stats = await pidusage(this._pid);
      const memoryInMiB = stats.memory * bytesToMiB;
      this._cpuTime = stats.ctime;
      this._memoryHistogram.recordValue(memoryInMiB);
      this._cpuHistogram.recordValue(stats.cpu);

      if (this._counter++ % resolution === 0) {
        this._memoryTimeSeries.push(Math.round(memoryInMiB));
      }
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
    console.log('TOTAL CPU TIME (in ms): %d', this._cpuTime);
    console.log('MEMORY HISTOGRAM (in MiB): %s', this._memoryHistogram);
    console.log('CPU HISTOGRAM (in percentage):%s', this._cpuHistogram);

    console.log('------------------');
    console.log(`time_index,value_${process.env['AGENT_TYPE']}`);
    for (let i = 0; i < this._memoryTimeSeries.length; i++) {
      console.log(`${i},${this._memoryTimeSeries[i]}`);
    }
  }

  stop() {
    clearInterval(this._timer);
  }
}

module.exports = ProcessMonitor;
