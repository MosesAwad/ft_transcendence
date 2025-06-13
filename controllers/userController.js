const fs = require("fs");
const path = require("path");
const util = require("util");
const { pipeline } = require("stream");
const { BadRequestError } = require("../errors");
const { StatusCodes } = require("http-status-codes");

module.exports = (userModel, blockService, matchModel) => {
	const matchService = require("../services/matchService")(
		matchModel,
		userModel
	);

	return {
		listAllUsers: async (request, reply) => {
			const { search, page, limit } = request.query;
			const {
				user: { id: userId },
			} = request.user;
			const users = await userModel.listUsers(
				search,
				page,
				limit,
				userId
			);

			reply.send(users);
		},

		listSingleUser: async (request, reply) => {
			const { userId } = request.params;
			const user = await userModel.listSingleUser(userId);
			const stats = await matchService.getUserStats(userId);

			reply.send({ ...user, stats });
		},

		uploadProfilePicture: async (request, reply) => {
			const {
				user: { id: userId },
			} = request.user;
			const data = await request.file();
			const { fileUrl } = await userModel.updateProfilePicture(
				userId,
				data
			);

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

			const block = await blockService.blockUser(
				userId,
				blockRecipientId
			);
			reply.send(block);
		},

		unblockUser: async (request, reply) => {
			const { blockId } = request.params;
			const {
				user: { id: userId },
			} = request.user;
			const unblockedUserId = await blockService.unblockUser(
				userId,
				blockId
			);

			reply.send({
				msg: `Successfuly unblocked user with id ${unblockedUserId}`,
			});
		},

		listUserMatches: async (request, reply) => {
			const { userId } = request.params;
			const { limit, page, match_type } = request.query;

			const matches = await matchService.listUserMatches(
				userId,
				limit,
				page,
				match_type
			);
			return reply.status(200).send(matches);
		},
	};
};
