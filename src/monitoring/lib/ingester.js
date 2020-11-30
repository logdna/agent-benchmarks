'use strict';

const fastifyStart = require('fastify');

function start() {
  const expectedLines = parseInt(process.env['EXPECTED_LINES'], 10);
  if (!expectedLines) {
    throw new Error('EXPECTED_LINES environment variable must be set');
  }

  let totalLines = 0;

  const fastify = fastifyStart({});
  fastify.register(require('fastify-compress'));

  fastify.get('/', function (request, reply) {
    reply.code(200).send('OK: ingester running');
  });

  fastify.post('/logs/agent', function (request, reply) {
    const lines = request.body.ls;
    totalLines += lines.length;
    if (totalLines >= expectedLines) {
      process.send({ finished: true });
    }

    reply.code(200).send({});
  });

  fastify.listen(443);

  console.log('Ingester listening on 443');
}

start();
