// DOM Elements
const chatListDiv = document.getElementById("chatList");

// Chat list management
let chatReloadTimeout = null;

function debouncedReloadChats() {
	if (chatReloadTimeout) {
		clearTimeout(chatReloadTimeout);
	}
	chatReloadTimeout = setTimeout(() => {
		loadChats();
		chatReloadTimeout = null;
	}, 300);
}

async function loadChats() {
	while (chatListDiv.firstChild) {
		chatListDiv.removeChild(chatListDiv.firstChild);
	}

	try {
		const res = await fetchWithAutoRefresh(`${baseURL}/chats`);
		const chats = await res.json();

		if (chats.length === 0) {
			const noChatsMsg = document.createElement("div");
			noChatsMsg.textContent = "No chats yet.";
			chatListDiv.appendChild(noChatsMsg);
			return;
		}

		const fragment = document.createDocumentFragment();

		for (const { chat_id, participantId } of chats) {
			const userRes = await fetchWithAutoRefresh(
				`${baseURL}/users/${participantId}`
			);
			const user = await userRes.json();

			const row = document.createElement("div");
			row.className = "chatRow";
			row.textContent = user.username;
			row.dataset.chatId = chat_id;

			if (window.chatMessages.getCurrentChatId() === chat_id) {
				row.classList.add("active");
			}

			row.addEventListener("click", async () => {
				window.chatMessages.joinRoom(chat_id);

				// Mark notifications as read for the current chat
				const res = await fetchWithAutoRefresh(
					`${baseURL}/notifications/messages/by-chat/${chat_id}`,
					{
						method: "PATCH",
						credentials: "include",
					}
				);
				if (res.ok) {
					mailboxNotificationCount--;
					window.chatNotifications.updateMailboxCount(
						mailboxNotificationCount
					);
				}

				// Update URL
				const url = new URL(window.location.href);
				url.searchParams.set("chatId", chat_id);
				window.history.pushState({}, "", url);
			});
			fragment.appendChild(row);
		}

		chatListDiv.appendChild(fragment);
		return chats;
	} catch (error) {
		console.error("Error loading chats:", error);
		chatListDiv.textContent = "Error loading chats.";
		return [];
	}
}

// Initialize chat list when socket connects
chatSocket.on("connect", () => {
	console.log("Connected to socket");
	loadChats();

	const params = new URLSearchParams(window.location.search);
	const chatIdString = params.get("chatId");
	if (chatIdString) {
		console.log("Found chatId in URL, joining room:", chatIdString);
		const chatId = parseInt(chatIdString);
		setTimeout(() => {
			window.chatMessages.joinRoom(chatId);
		}, 500);
	}
});

// Export UI functionality
window.chatUI = {
	loadChats,
	debouncedReloadChats,
};
