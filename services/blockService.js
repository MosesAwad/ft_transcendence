const CustomError = require("../errors");

module.exports = (
	userModel,
	friendModel,
	notificationModel,
	io,
	onlineUsers
) => {
	const friendNotificationService = require("./friendNotificationService")(
		notificationModel,
		io,
		onlineUsers
	);

	return {
		blockUser: async (blockerId, blockedId) => {
			// 1. Create the block in database
			const block = await userModel.blockUser(blockerId, blockedId);

			// 2. Find and update any existing friendship
			const friendship = await friendModel.findFriendshipBetweenUsers(
				blockerId,
				blockedId
			);
			if (friendship) {
				let newStatus;
				if (friendship.status === "pending") {
					if (friendship.user_id === blockerId) {
						newStatus = "cancelled";
					} else {
						newStatus = "declined";
					}
				} else if (friendship.status === "accepted") {
					newStatus = "unfriended";
				}

				await friendModel.updateFriendshipStatus(
					friendship.id,
					newStatus
				);
				await friendNotificationService.cleanupBilateralRequestNotifications(
					blockerId,
					blockedId
				);
			}

			return block;
		},

		unblockUser: async (userId, blockId) => {
			return await userModel.unblockUser(userId, blockId);
		},
	};
};
