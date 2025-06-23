const fs = require("fs");
const path = require("path");
const util = require("util");
const { pipeline } = require("stream");
const { BadRequestError } = require("../errors");
const { StatusCodes } = require("http-status-codes");

module.exports = (
	userModel,
	blockService,
	matchModel,
	teamModel,
	onlineUsers,
	friendModel
) => {
	const matchService = require("../services/matchService")(
		matchModel,
		userModel
	);
	const teamService = require("../services/teamService")(
		matchModel,
		teamModel,
		userModel
	);

	// Helper function to check if a user is online
	const isUserOnline = (userId) => {
		const userSocketsSet = onlineUsers.get(Number(userId));
		const isOnline = userSocketsSet ? userSocketsSet.size > 0 : false;
		console.log(
			`Checking if user ${userId} is online:`,
			isOnline,
			"Socket set:",
			userSocketsSet
		);
		return isOnline;
	};

	return {
		errorHandler: (err, request, reply) => {
			let customError = {
				statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
				msg: err.message || "Something went wrong, try again later",
			};

			// console.log(err);

			// Handle schema validation errors
			if (err.code === "FST_ERR_VALIDATION") {
				customError.statusCode = StatusCodes.BAD_REQUEST;

				// Special case for updateProfile
				if (
					err.validation &&
					err.validation.some((v) => v.keyword === "anyOf")
				) {
					customError.msg =
						"Please provide at least one field to update: username, email, or both currentPassword AND newPassword together to update your password";
				} else {
					const validation = err.validation && err.validation[0];
					if (validation) {
						const field = validation.instancePath.slice(1); // Remove leading slash

						// Special case for missing either currentPassword or newPassword
						if (
							field === "currentPassword" &&
							validation.keyword === "required"
						) {
							customError.msg =
								"Current password is required when setting a new password";
						} else if (
							field === "newPassword" &&
							validation.keyword === "required"
						) {
							customError.msg =
								"New password is required when providing current password";
						} else
							switch (field) {
								case "username":
									if (validation.keyword === "pattern") {
										customError.msg =
											"Username cannot contain spaces";
									} else if (
										validation.keyword === "minLength"
									) {
										customError.msg =
											"Username must be at least 3 characters long";
									} else if (
										validation.keyword === "maxLength"
									) {
										customError.msg =
											"Username cannot be longer than 50 characters";
									}
									break;
								case "email":
									if (validation.keyword === "format") {
										customError.msg =
											"Please provide a valid email address";
									}
									break;
								case "currentPassword":
								case "newPassword":
									if (validation.keyword === "minLength") {
										customError.msg =
											"Password must be at least 6 characters long";
									}
									break;
								default:
									customError.msg = err.message;
							}
					}
				}
			}

			reply
				.status(customError.statusCode)
				.send({ error: customError.msg });
		},

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
			const {
				user: { id: requesterId },
			} = request.user;

			const user = await userModel.listSingleUser(userId);
			const stats = await matchService.getUserStats(userId);

			// Check if there's a block relationship between the users
			const blockStatus = await friendModel.getBlockStatus(
				requesterId,
				userId
			);

			// Only show online status if there's no block in either direction
			let isOnline = false;
			if (
				!blockStatus.user1BlockedUser2 &&
				!blockStatus.user2BlockedUser1
			) {
				isOnline = isUserOnline(userId);
				console.log(`User ${userId} online status:`, isOnline);
			} else {
				console.log(
					`Online status hidden due to block relationship between users ${requesterId} and ${userId}`
				);
			}

			reply.send({ ...user, stats, isOnline });
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
			const multiplayer_matches =
				await teamService.listUserMultiplayerMatches(
					userId,
					limit,
					page
				);

			const allMatches = [...matches, ...multiplayer_matches];
			// Sort by created_at descending
			allMatches.sort(
				(a, b) => new Date(b.created_at) - new Date(a.created_at)
			);

			return reply.status(200).send(allMatches);
		},

		updateProfile: async (request, reply) => {
			const {
				user: { id: userId },
			} = request.user;
			const { username, email, currentPassword, newPassword } =
				request.body;

			const { updatedUser, updatedFields } =
				await userModel.updateProfile(userId, {
					username,
					email,
					newPassword,
					currentPassword,
				});

			// Create a dynamic success message based on what was updated
			let message =
				"Updated: " + updatedFields.join(", ") + " successfully.";

			return reply.status(200).send({
				message,
				user: updatedUser,
			});
		},
	};
};

/*
	NOTES

	Note 1

		* .some() is a JavaScript array method.
		* It checks if at least one element in the array satisfies the condition inside.
		* Here, it's checking if any object in the err.validation array has a keyword property equal to "anyOf".

		If none of the fields entered were correct, you get the following error object:

		  	statusCode: 400,
			code: 'FST_ERR_VALIDATION',
			validation: [
				{
					instancePath: '',
					schemaPath: '#/anyOf/0/required',
					keyword: 'required',
					params: [Object],
					message: "must have required property 'username'"
				},
				{
					instancePath: '',
					schemaPath: '#/anyOf/1/required',
					keyword: 'required',
					params: [Object],
					message: "must have required property 'email'"
				},
				{
					instancePath: '',
					schemaPath: '#/anyOf/2/required',
					keyword: 'required',
					params: [Object],
					message: "must have required property 'currentPassword'"
				},
				{
					instancePath: '',
					schemaPath: '#/anyOf',
					keyword: 'anyOf',
					params: {},
					message: 'must match a schema in anyOf'
				}
				],
				validationContext: 'body'
			}
*/
