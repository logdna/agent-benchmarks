'use strict';

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs/promises');
const pidusage = require('pidusage');
const hdr = require('hdr-histogram-js');

const flushMaxItems = 100;
const bytesToMiB = 1 / (1024 * 1024);
const interval = 200;
// interval * resolutionForTimeSeries = resolutionInMs
const resolution = parseInt(process.env['RESOLUTION_TIME_SERIES']) || 5;
const fileOptions = {encoding: 'utf8', mode: 0o777};
const logProcessed = process.env['LOG_PROCESSED'] === 'true';

class ProcessMonitor extends EventEmitter {
  constructor(p, resultKey) {
    super();

    this.process = p;
    this._resultKey = resultKey;
    this._pid = p.pid;
    this._timer = setInterval(() => this._recordStats(), interval);
    this._cpuTime = 0;
    this._memoryHistogram = hdr.build();
    this._cpuHistogram = hdr.build();
    this._counter = 0;
    this._fileIndex = 0;
    this._memoryTimeSeries = [];
  }

  async init() {
    await fs.mkdir(this._getResultPath(), {recursive: true});
  }

  async _recordStats() {
    try {
      const stats = await pidusage(this._pid);
      const memoryInMiB = stats.memory * bytesToMiB;
      this._cpuTime = stats.ctime;
      this._memoryHistogram.recordValue(memoryInMiB);
      this._cpuHistogram.recordValue(stats.cpu);

      if (this._counter++ % resolution === 0) {
        const length = this._memoryTimeSeries.push(Math.round(memoryInMiB));
        if (length >= flushMaxItems) {
          await this._flushTimeSeries();
        }
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
    await this._flushTimeSeries();

    await fs.writeFile(this._getResultPath('cpu-time.txt'), this._cpuTime.toFixed(), fileOptions);
    await fs.writeFile(
      this._getResultPath('memory.txt'),
      this._memoryHistogram.outputPercentileDistribution(),
      fileOptions);
    await fs.writeFile(
      this._getResultPath('cpu.txt'),
      this._cpuHistogram.outputPercentileDistribution(),
      fileOptions);

    console.log('TOTAL CPU TIME (in ms): %d', this._cpuTime);
    console.log('MEMORY HISTOGRAM (in MiB): %s', this._memoryHistogram);
    console.log('CPU HISTOGRAM (in percentage):%s', this._cpuHistogram);
  }

  async _flushTimeSeries() {
    const values = this._memoryTimeSeries;
    this._memoryTimeSeries = [];
    let data = '';

    if (this._fileIndex === 0) {
      data = `time,${this._resultKey}\n`
    }

    for (let i = 0; i < values.length; i++) {
      data += `${this._fileIndex + i},${values[i]}\n`;
    }

    const filePath = this._getResultPath('memory-time-series.csv');
    await fs.appendFile(filePath, data, fileOptions);
    this._fileIndex += values.length;

    if (logProcessed) {
      console.log(`Memory usage: ${values[values.length-1]} MiB`);
    }
  }

  _getResultPath(fileName) {
    const basePath = path.join(process.env['RESULT_BASE_PATH'] || process.env['HOME'], 'results', this._resultKey);

    if (!fileName) {
      return basePath;
    }

    return path.join(basePath, fileName);
  }

  stop() {
    clearInterval(this._timer);
  }
}

module.exports = ProcessMonitor;
