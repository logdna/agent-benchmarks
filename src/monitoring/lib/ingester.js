'use strict';

const fs = require('fs');
const path = require('path');
const fastifyStart = require('fastify');

function startServer() {
  const fastify = fastifyStart({
    https: {
      key: fs.readFileSync(path.join(process.env['HOME'], 'self-signed-server.key')),
      cert: fs.readFileSync(path.join(process.env['HOME'], 'self-signed-server.cert'))
    }
  });

  fastify.get('/', function (request, reply) {
    reply.code(200).send({ hello: 'world' });
  });

  fastify.listen(443);
}

module.exports = startServer;
