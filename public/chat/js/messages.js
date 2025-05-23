// Chat state
let currentChatId = null;
let currentUserId = null;

// DOM Elements
const messageBox = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// Message handling
async function appendMessage(msg) {
	const div = document.createElement("div");
	div.classList.add("message");
	div.classList.add(msg.sender_id === currentUserId ? "user" : "other");
	div.textContent = msg.content;
	messageBox.appendChild(div);
	messageBox.scrollTop = messageBox.scrollHeight;
}

function clearMessages() {
	messageBox.innerHTML = "";
}

async function joinRoom(chatId) {
	if (currentUserId === null) {
		try {
			const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
			if (!res.ok) throw new Error("Failed to fetch user");
			const userData = await res.json();
			currentUserId = userData.user.user.id;
		} catch (err) {
			console.error("Error fetching current user:", err);
			return;
		}
	}

	if (currentChatId !== null) {
		chatSocket.emit("leaveRoom", currentChatId);
	}

	currentChatId = chatId;

	// Remove "active" class from all chat rows
	document.querySelectorAll(".chatRow").forEach((row) => {
		row.classList.remove("active");
	});

	// Add "active" class to the clicked chat row
	const activeRow = document.querySelector(
		`.chatRow[data-chat-id="${chatId}"]`
	);
	if (activeRow) {
		activeRow.classList.add("active");
	}

	clearMessages();
	chatSocket.emit("joinRoom", chatId);

	const res = await fetchWithAutoRefresh(
		`${baseURL}/chats/${chatId}/messages`
	);
	const messages = await res.json();
	for (const msg of messages) {
		await appendMessage(msg);
	}
}

// Event listeners
sendBtn.addEventListener("click", async () => {
	const content = input.value.trim();
	if (!content || !currentChatId) return;

	const sendToChatId = currentChatId;

	const res = await fetchWithAutoRefresh(`${baseURL}/messages`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chatId: sendToChatId, content }),
	});

	if (res.ok) {
		input.value = "";
	}
});

// Socket event handlers
chatSocket.on("newMessage", (message) => {
	if (message.chat_id === currentChatId) {
		appendMessage(message);
	}
	// Reload chats to update the order (most recent at top)
	window.chatUI.debouncedReloadChats();
});

// Handle page exit
window.addEventListener("beforeunload", () => {
	if (currentChatId !== null) {
		chatSocket.emit("leaveRoom", currentChatId);
	}
});

// Export chat functionality
window.chatMessages = {
	joinRoom,
	getCurrentChatId: () => currentChatId,
	setCurrentUserId: (id) => {
		currentUserId = id;
	},
};
