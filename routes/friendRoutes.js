const authPlugin = require("../plugins/authentication");
const { sendRequestOpts, acceptRequestOpts } = require('../schemas/friendSchemas');

async function friendRoutes(fastify, options) {
  const { friendModel } = options;
  const { sendRequest, acceptRequest, listFriends } = require('../controllers/friendController')(friendModel);

  fastify.register(authPlugin);

  fastify.post('/friends/request', sendRequestOpts, sendRequest);
  fastify.post('/friends/accept', acceptRequestOpts, acceptRequest);
  fastify.get('/friends', listFriends);
}

module.exports = friendRoutes;