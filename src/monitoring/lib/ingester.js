'use strict';

const fastifyStart = require('fastify');

const fastify = fastifyStart({});
fastify.register(require('fastify-compress'));

fastify.get('/', function (request, reply) {
  reply.code(200).send('OK: ingester running');
});

fastify.post('/logs/agent', function (request, reply) {
  const lines = request.body.ls;
  let totalLength = 0;
  const files = new Map();

  for (const { line, f } of lines) {
    let fileLength = files.get(f);
    if (!fileLength) {
      fileLength = 0
    }
    fileLength += line.length;
    files.set(f, fileLength)
    totalLength += line.length;
  }

  console.log('-- post received with %d files: %d', files.size, totalLength);

  for (const [file, length] of files) {
    console.log('---- %s: %d', file, length);
  }

  console.log('--last line', lines[lines.length-1])

  reply.code(200).send({});
});

fastify.listen(443);

console.log('Ingester listening on 443');
