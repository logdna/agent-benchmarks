'use strict';

const EventEmitter = require('events');
const pidusage = require('pidusage');
const hdr = require('hdr-histogram-js');

const bytesToMiB = 1 / (1024 * 1024);
const interval = 1000;

class ProcessMonitor extends EventEmitter {
  constructor(pid) {
    super();

    if (typeof pid === 'number'){
      this._pid = pid;
      this._timer = setInterval(() => this._getUsage(), interval);
      this._cpuTime = 0;
      this._memoryHistogram = hdr.build();
    }
  }

  async _getUsage() {
    try {
      const stats = await pidusage(this._pid);
      this._cpuTime = stats.ctime;
      this._memoryHistogram.recordValue(stats.memory * bytesToMiB);

      console.log('--used cpu time', this._cpuTime);
      console.log('--used memory %d MiB', Math.round(stats.memory * bytesToMiB, 3));
    } catch (e) {
      // We are executing in the background, we should
      // emit the error
      this.emit('error', e);
    }
  }

  shutdown() {
    clearInterval(this._timer);
  }
}

module.exports = ProcessMonitor;


