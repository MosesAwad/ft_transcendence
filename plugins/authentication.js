const fp = require('fastify-plugin');
const { UnauthenticatedError } = require('../errors');

async function authenticate(request, reply) {
  try {
    // Verify JWT using fastify-jwt; the decoded payload is automatically attached to request.user by @fastify/jwt (no manual decoding needed)
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthenticatedError('Authentication invalid');
  }
}

module.exports = fp(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
});
