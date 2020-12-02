'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const stream = require('stream');
const {once} = require('events');
const finished = util.promisify(stream.finished);
const delay = util.promisify(setTimeout);

const maxChunkSize = 64_000;
const line = Buffer.from('Nov 30 09:14:47 sample-host-name sampleprocess[1204]: Hello from sample process\n');
const fileOptions = {encoding: 'utf8', mode: 0o777};
const delayAppendMs = parseInt(process.env['DELAY_APPEND_MS']);

async function generateFileStructure(folderPath, fileLineLength) {
  await fs.promises.mkdir(folderPath, {recursive: true});
  console.log('Created folder %s', folderPath);
  const filePath = path.join(folderPath, 'system.log');
  await generateFile(filePath, fileLineLength);
  const fileStat = await fs.promises.stat(filePath);
  console.log(
    'Created file %s (lines: %d, file size: %d MiB)',
    filePath,
    fileLineLength,
    Math.round(fileStat.size / 1024 / 1024));
}

async function appendOneLine(folderPath) {
  const filePath = path.join(folderPath, 'system.log');
  await fs.promises.appendFile(filePath, line, fileOptions)
}

function appendPeriodically(folderPath) {
  const context = { hasStopped: false, folderPath };

  // Start appending in the background
  const promise = startAppendChunks(context);

  return {
    stop: () => {
      context.hasStopped = true;
      // await for appending to end
      return promise;
    }
  };
}

async function startAppendChunks(context) {
  const filePath = path.join(context.folderPath, 'system.log');
  const chunk = createChunk();
  const delayMs = !isNaN(delayAppendMs) ? delayAppendMs : 20;
  while (!context.hasStopped) {
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
