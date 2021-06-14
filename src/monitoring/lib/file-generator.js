'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const stream = require('stream');
const {once} = require('events');
const finished = util.promisify(stream.finished);
const delay = util.promisify(setTimeout);

const line = Buffer.from('Nov 30 09:14:47 sample-host-name sampleprocess[1204]: Hello from sample process\n');
const fileOptions = {encoding: 'utf8', mode: 0o777};

let lineCounter = 0;

async function generateFileStructure(settings, initialFileLineLength) {
  const {folderPath,totalFiles} = settings;
  await fs.promises.rmdir(folderPath, {recursive: true});
  await fs.promises.mkdir(folderPath, {recursive: true});
  console.log('Created folder %s', folderPath);
  for (let i = 0; i < totalFiles; i++) {
    const filePath = getFilePath(folderPath, i);
    await generateFile(filePath, settings, initialFileLineLength);
    const fileStat = await fs.promises.stat(filePath);
    console.log(
      'Created file %s (lines: %d, file size: %d MiB)',
      filePath,
      initialFileLineLength,
      Math.round(fileStat.size / 1024 / 1024));
  }
}

function getFilePath(folderPath, index = 0) {
  return path.join(folderPath, `sample${index}.log`);
}

async function appendOneLine(folderPath) {
  await fs.promises.appendFile(getFilePath(folderPath), line, fileOptions)
}

function appendPeriodically(settings) {
  const stopContext = {
    hasStopped: false
  };

  // Start appending in the background
  const promise = startAppendChunks(stopContext, settings);

  return {
    stop: () => {
      stopContext.hasStopped = true;
      // await for appending to end
      return promise;
    }
  };
}

async function startAppendChunks(options, settings) {
  const chunk = createChunk(settings.maxChunkSize);
  let fileIndex = 0;
  while (!options.hasStopped) {
    const filePath = getFilePath(settings.folderPath, fileIndex++ % settings.totalFiles);
    await fs.promises.appendFile(filePath, chunk.buffer, fileOptions);
    await delay(settings.delayAppendMs);
  }
}

async function generateFile(filePath, settings, lineLength) {
  const fileStream = fs.createWriteStream(filePath, fileOptions);
  let chunk = createChunk(settings.maxChunkSize);
  let lines = 0;

  while (lines < lineLength) {
    const remaining = lineLength - lines;
    if (remaining < chunk.lineLength) {
      // Use a smaller chunk
      chunk = createChunk(settings.maxChunkSize, remaining);
    }

    if (!fileStream.write(chunk.buffer)) {
      await once(fileStream, 'drain');
    }

    lines += chunk.lineLength;
  }

  fileStream.end();

  await finished(fileStream);
}

function createChunk(maxChunkSize, lines = Number.MAX_SAFE_INTEGER) {
  let lineLength = 0
  let byteLength = 0;
  const buffers = [];
  while (lineLength <= lines && byteLength < maxChunkSize) {
    const line = Buffer.from('Nov 30 09:14:47 sample-host-name sampleprocess[1]: Hello from sample process ' + (lineCounter++) + '\n');
    buffers.push(line);
    lineLength++;
    byteLength += line.length;
  }
  return {buffer: Buffer.concat(buffers, byteLength), lineLength};
}

module.exports = {generateFileStructure, appendOneLine, appendPeriodically};
