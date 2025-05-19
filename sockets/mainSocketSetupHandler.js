const { verifySignedCookie } = require("../utils/cookies");
const jwt = require("jsonwebtoken");
const { setupChatSocket } = require("./chatSocketSetupHandler");

const onlineUsers = new Map();

function handleSocketSetup(fastify) {
	fastify.io.on("connection", (socket) => {

		console.log('Client connected from', socket.handshake.address);

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
				onlineUsers.set(userId, new Set());	// Note 1
			}
			onlineUsers.get(userId).add(socket.id);
			console.log(`User ${userId} connected with socket ${socket.id}`);

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

