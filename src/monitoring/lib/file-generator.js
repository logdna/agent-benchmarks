'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const stream = require('stream');
const {once} = require('events');
const finished = util.promisify(stream.finished);
const delay = util.promisify(setTimeout);

const maxChunkSize = parseInt(process.env['MAX_CHUNK_SIZE_KB']) * 1000 || 64_000;
const line = Buffer.from('Nov 30 09:14:47 sample-host-name sampleprocess[1204]: Hello from sample process\n');
const fileOptions = {encoding: 'utf8', mode: 0o777};
const delayAppendMs = parseInt(process.env['DELAY_APPEND_MS']);

async function generateFileStructure(folderPath, totalFiles, fileLineLength) {
  await fs.promises.mkdir(folderPath, {recursive: true});
  console.log('Created folder %s', folderPath);
  for (let i = 0; i < totalFiles; i++) {
    const filePath = getFilePath(folderPath, i);
    await generateFile(filePath, fileLineLength);
    const fileStat = await fs.promises.stat(filePath);
    console.log(
      'Created file %s (lines: %d, file size: %d MiB)',
      filePath,
      fileLineLength,
      Math.round(fileStat.size / 1024 / 1024));
  }
}

function getFilePath(folderPath, index = 0) {
  return path.join(folderPath, `sample${index}.log`);
}

async function appendOneLine(folderPath) {
  await fs.promises.appendFile(getFilePath(folderPath), line, fileOptions)
}

function appendPeriodically(folderPath, totalFiles) {
  const options = {
    hasStopped: false,
    folderPath,
    totalFiles
  };

  // Start appending in the background
  const promise = startAppendChunks(options);

  return {
    stop: () => {
      options.hasStopped = true;
      // await for appending to end
      return promise;
    }
  };
}

async function startAppendChunks(options) {
  const chunk = createChunk();
  const delayMs = !isNaN(delayAppendMs) ? delayAppendMs : 20;
  let fileIndex = 0;
  while (!options.hasStopped) {
    const filePath = getFilePath(options.folderPath, fileIndex++ % options.totalFiles);
    await fs.promises.appendFile(filePath, chunk.buffer, fileOptions);
    await delay(delayMs);
  }
}

async function generateFile(filePath, lineLength) {
  const fileStream = fs.createWriteStream(filePath, fileOptions);
  let chunk = createChunk();
  let lines = 0;

  while (lines < lineLength) {
    const remaining = lineLength - lines;
    if (remaining < chunk.lineLength) {
      // Use a smaller chunk
      chunk = createChunk(remaining);
    }

    if (!fileStream.write(chunk.buffer)) {
      await once(fileStream, 'drain');
    }

    lines += chunk.lineLength;
  }

  fileStream.end();

  await finished(fileStream);
}

function createChunk(lines = Number.MAX_SAFE_INTEGER) {
  let lineLength = 0
  let byteLength = 0;
  const buffers = [];
  while (lineLength <= lines && byteLength < maxChunkSize) {
    buffers.push(line);
    lineLength++;
    byteLength += line.length;
  }
  return {buffer: Buffer.concat(buffers, byteLength), lineLength};
}

module.exports = {generateFileStructure, appendOneLine, appendPeriodically};
