const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcryptjs");
const CustomError = require("../errors");

module.exports = (friendModel) => ({
    sendRequest: async (request, reply) => {
        const { friendId } = request.body;
        if (request.user.id === friendId) {
            throw new CustomError.BadRequestError("Cannot send friend request to yourself");
        }
        await friendModel.sendRequest(request.user.id, friendId);
        reply.code(StatusCodes.CREATED).send({ success: true });
    },

    acceptRequest: async (request, reply) => {
        const { friendId } = request.body;
        await friendModel.acceptRequest(request.user.id, friendId);
        reply.send({ success: true });
    },

    listFriends: async (request, reply) => {
        const friends = await friendModel.listFriends(request.user.id);
        reply.send(friends);
    }
});