// =============================
// 🔌 SOCKET INITIALIZATION
// =============================
const socket = io("http://localhost:3000", {
	withCredentials: true,
});

// =============================
// 📦 DOM ELEMENTS
// =============================
const chatListDiv = document.getElementById("chatList");
const messageBox = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const userSearchInput = document.getElementById("userSearchInput");
const userSearchResults = document.getElementById("userSearchResults");

// =============================
// 🔄 STATE VARIABLES
// =============================
let currentChatId = null;
let currentUserId = null;

// =============================
// 💬 MESSAGE HANDLING
// =============================
async function appendMessage(msg) {
	if (currentUserId === null) {
		try {
			const res = await fetchWithAutoRefresh(
				"http://localhost:3000/api/v1/users/showUser"
			);
			if (!res.ok) throw new Error("Failed to fetch user");
			const userData = await res.json();
			currentUserId = userData.user.user.id;
		} catch (err) {
			console.error("Error fetching current user:", err);
			return;
		}
	}

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

// =============================
// 🧭 CHAT NAVIGATION
// =============================
async function loadChats() {
	chatListDiv.innerHTML = "";
	const res = await fetchWithAutoRefresh(
		"http://localhost:3000/api/v1/chats"
	);
	const chats = await res.json();

	if (chats.length === 0) {
		chatListDiv.textContent = "No chats yet.";
		return;
	}

	for (const { chat_id, participantId } of chats) {
		const userRes = await fetchWithAutoRefresh(
			`http://localhost:3000/api/v1/users/${participantId}`
		);
		const user = await userRes.json();

		const row = document.createElement("div");
		row.className = "chatRow";
		row.textContent = user.username;

		// Add this data attribute to identify the chat row
		row.dataset.chatId = chat_id;

		row.addEventListener("click", () => joinRoom(chat_id));
		chatListDiv.appendChild(row);
	}
}

function getChatUsernameById(chatId) {
	const chatRows = Array.from(chatListDiv.children);
	for (const row of chatRows) {
		if (row.onclick && row.onclick.toString().includes(chatId)) {
			return row.textContent;
		}
	}
	return "";
}

async function joinRoom(chatId) {
	if (currentChatId !== null) {
		socket.emit("leaveRoom", currentChatId);
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
	socket.emit("joinRoom", chatId);

	const res = await fetchWithAutoRefresh(
		`http://localhost:3000/api/v1/chats/${chatId}/messages`
	);
	const messages = await res.json();
	messages.forEach(appendMessage);
}

// =============================
// 🔍 USER SEARCH + START CHAT
// =============================
userSearchInput.addEventListener("input", async () => {
	const query = userSearchInput.value.trim();
	if (!query) {
		userSearchResults.style.display = "none";
		return;
	}

	const res = await fetchWithAutoRefresh(
		`${baseURL}/users?search=${query}&page=1&limit=5`,
		{ credentials: "include" }
	);

	if (res.ok) {
		const users = await res.json();
		renderSearchResults(users);
	} else {
		userSearchResults.style.display = "none";
	}
});

function renderSearchResults(users) {
	userSearchResults.innerHTML = "";

	users.forEach((user) => {
		const div = document.createElement("div");
		div.classList.add("searchResult");
		div.textContent = user.username;
		div.addEventListener("click", () => {
			handleUserClick(user.id);
			userSearchResults.style.display = "none";
			userSearchInput.value = "";
		});
		userSearchResults.appendChild(div);
	});

	userSearchResults.style.display = "block";
}

async function handleUserClick(userId) {
	try {
		let chatId;

		// Step 1: Check if chat already exists
		const res = await fetchWithAutoRefresh(
			`${baseURL}/chats/between/${userId}`,
			{
				credentials: "include",
			}
		);

		if (res.ok) {
			const data = await res.json();
			chatId = data.chat_id;
		} else if (res.status === 404) {
			// Step 2: Create new chat
			const createRes = await fetchWithAutoRefresh(`${baseURL}/chats`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ user2Id: userId }),
			});

			if (!createRes.ok) throw new Error("Failed to create chat");
			const newChat = await createRes.json();
			chatId = newChat.chat_id;

			// Reload chat list to reflect new chat
			await loadChats();
		}

		// Step 3: Join chat
		joinRoom(chatId);
	} catch (err) {
		console.error("Error starting chat:", err);
	}
}

// =============================
// 🚀 SOCKET EVENTS
// =============================
socket.on("connect", () => {
	console.log("Connected to socket");
	loadChats();
});

socket.on("newMessage", (message) => {
	if (message.chat_id === currentChatId) {
		appendMessage(message);
	}
});

// =============================
// 📤 MESSAGE SEND
// =============================
sendBtn.addEventListener("click", async () => {
	const content = input.value.trim();
	if (!content || !currentChatId) return;

	const res = await fetchWithAutoRefresh(
		`http://localhost:3000/api/v1/messages`,
		{
			method: "POST",
			body: JSON.stringify({ chatId: currentChatId, content }),
		}
	);

	if (res.ok) input.value = "";
});
