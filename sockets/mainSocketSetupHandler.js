const { verifySignedCookie } = require("../utils/cookies");
const jwt = require("jsonwebtoken");
const { setupChatSocket } = require("./chatSocketSetupHandler");

const onlineUsers = new Map();

function handleSocketSetup(fastify, friendModel) {
	// Define a helper function to emit status changes that respect block relationships
	async function emitStatusChangeToNonBlockedUsers(userId, isOnline) {
		// Get all online users
		const onlineUserIds = Array.from(onlineUsers.keys());

		// For each online user, check if they're blocked before sending the status update
		for (const targetUserId of onlineUserIds) {
			// Skip self-updates
			if (targetUserId === userId) continue;

			try {
				// Check if either user has blocked the other
				const blockStatus = await friendModel.getBlockStatus(
					userId,
					targetUserId
				);

				// Only send the update if neither user has blocked the other
				if (
					!blockStatus.user1BlockedUser2 &&
					!blockStatus.user2BlockedUser1
				) {
					// Get all socket connections for this user
					const targetSockets = onlineUsers.get(targetUserId);
					if (targetSockets) {
						targetSockets.forEach((socketId) => {
							fastify.io.to(socketId).emit("userStatusChange", {
								userId: userId,
								isOnline: isOnline,
							});
						});
					}
				}
			} catch (err) {
				console.error(
					`Error checking block status between ${userId} and ${targetUserId}:`,
					err
				);
			}
		}
	}

	// This event occurs whenever a new client connects to the Socket.io server (new connections are also triggered via page refreshes)
	fastify.io.on("connection", (socket) => {
		console.log("Client connected from", socket.handshake.address);

		const rawCookieHeader = socket.handshake.headers.cookie;
		if (!rawCookieHeader) {
			console.log(
				"No accessToken cookie was found OR client did not initialize socket with the following option withCredentials: true"
			);
			socket.disconnect();
			return;
		}

		const token = verifySignedCookie(
			rawCookieHeader,
			"accessToken",
			process.env.COOKIE_SECRET
		);
		if (!token) {
			console.log("No accessToken cookie found");
			socket.disconnect();
			return;
		}

		try {
			const payload = jwt.verify(token, process.env.JWT_SECRET);
			const userId = payload.user.id;

			if (!onlineUsers.has(userId)) {
				onlineUsers.set(userId, new Set()); // Note 1
			}
			onlineUsers.get(userId).add(socket.id);
			console.log(`User ${userId} connected with socket ${socket.id}`);
			console.log(
				"Current online users:",
				Array.from(onlineUsers.entries()).map(
					([userId, sockets]) =>
						`User ${userId}: ${sockets.size} connections`
				)
			);

			// Broadcast online status to non-blocked users
			emitStatusChangeToNonBlockedUsers(userId, true).catch((err) => {
				console.error("Error emitting status change:", err);
			});

			// Set up the "joinRoom" event socket handler
			setupChatSocket(userId, socket);

			// Handle disconnection (This code block is placed here because we only want register this event on the client's socket once they have logged in successfuly )
			socket.on("disconnect", () => {
				const userSockets = onlineUsers.get(userId);
				if (userSockets) {
					userSockets.delete(socket.id); // delete the socket's id from the set when a socket disconnects to clean up memory.
					if (userSockets.size === 0) {
						// If userSockets is now empty as a result of the delete, clean up the empty set from the onlineUsers map
						onlineUsers.delete(userId);

						// Broadcast offline status to non-blocked users
						emitStatusChangeToNonBlockedUsers(userId, false).catch(
							(err) => {
								console.error(
									"Error emitting status change:",
									err
								);
							}
						);
					}
				}
				console.log(
					`User ${userId} disconnected from socket ${socket.id}`
				);
			});
		} catch (err) {
			console.log("Invalid token:", err.message);
			socket.disconnect();
		}
	});
}

module.exports = {
	onlineUsers,
	handleSocketSetup,
};

/*
	NOTES

	Note 1

		Why are we using a set here? Well, if a client opens the same page from the same browser but on two separate 
		windows, that is two separate socket connections. So if we do not take that into account by not storing all 
		his sockets that he is connected to our server endpoint from, then he would only get notifications/messages 
		on one window and it looks awkward. Thus, we avoid that by not just having a map that "maps" userId's to a 
		single socket.id, but to potentially multiple socket.id's to account for the aforementioned scenario properly.
		
		Quick overview of a set and how it differs from a data structure like an array:

			Feature 			| Array 						 	 | Set
			Duplicates allowed 	| ✅ Yes 	 						| ❌ No
			Fast lookup/remove 	| ❌ Needs .indexOf() or filter 		| ✅ Native .has() / .delete()
			Useful when 		| Order matters / duplicates okay 	 | Unique values, fast ops

*/
