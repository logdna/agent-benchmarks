'use strict';

const fastifyStart = require('fastify');
const port = parseInt(process.env['INGESTER_PORT']) || 443;
const listenAddress = '127.0.0.1';

async function start() {
  const expectedLines = parseInt(process.env['EXPECTED_LINES'], 10);
  if (!expectedLines) {
    throw new Error('EXPECTED_LINES environment variable must be set');
  }
  console.log(`Ingester expecting ${expectedLines} lines`);

  let receivedFirstRequest = false;
  let hasFinished = false;
  let totalLines = 0;

  const fastify = fastifyStart({});
  fastify.register(require('fastify-compress'));

  fastify.get('/', function (request, reply) {
    reply.code(200).send('OK: ingester running');
  });

  fastify.post('/logs/agent', function (request, reply) {
    if (!receivedFirstRequest) {
      receivedFirstRequest = true;
      console.log('Ingester received first request');
    }

    const lines = request.body.ls || request.body.lines;
    totalLines += lines.length;
    if (totalLines >= expectedLines) {
      if (!hasFinished) {
        hasFinished = true;
        process.send({ finished: true });
      }
    }

    reply.code(200).send('OK');
  });

  await fastify.listen(port, listenAddress);

  console.log(`Ingester listening on http://${listenAddress}:${port}`);
}

start()
  .catch(e => {
    console.error('There was an error while starting the ingester', e);
    process.exit(1);
  });
