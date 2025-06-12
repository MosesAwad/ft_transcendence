const fs = require("fs");
const path = require("path");
const util = require("util");
const { pipeline } = require("stream");
const { BadRequestError } = require("../errors");
const { StatusCodes } = require("http-status-codes");

module.exports = (userModel, blockService, matchModel) => ({
	listAllUsers: async (request, reply) => {
		const { search, page, limit } = request.query;
		const {
			user: { id: userId },
		} = request.user;
		const users = await userModel.listUsers(search, page, limit, userId);

		reply.send(users);
	},

	listSingleUser: async (request, reply) => {
		const { userId } = request.params;
		const user = await userModel.listSingleUser(userId);

		reply.send(user);
	},

	uploadProfilePicture: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		const data = await request.file();
		const { fileUrl } = await userModel.updateProfilePicture(userId, data);

		reply.send({
			message: "Profile picture uploaded successfully",
			url: fileUrl,
		});
	},

	deleteProfilePicture: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		await userModel.deleteProfilePicture(userId);

		reply.send({ message: "Profile picture removed successfully" });
	},

	listAllBlocks: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		const blocks = await userModel.listAllBlocks(userId);

		reply.send(blocks);
	},

	blockUser: async (request, reply) => {
		const { blockRecipientId } = request.body;
		const {
			user: { id: userId },
		} = request.user;

		const block = await blockService.blockUser(userId, blockRecipientId);
		reply.send(block);
	},

	unblockUser: async (request, reply) => {
		const { blockId } = request.params;
		const {
			user: { id: userId },
		} = request.user;
		const unblockedUserId = await blockService.unblockUser(userId, blockId);

		reply.send({
			msg: `Successfuly unblocked user with id ${unblockedUserId}`,
		});
	},

	listUserMatches: async (request, reply) => {
		const { userId } = request.params;
		const { limit = 10, offset = 0 } = request.query;

		const matches = await matchModel.listUserMatches(userId, limit, offset);

		return reply.status(StatusCodes.OK).send(matches);
	},
});
