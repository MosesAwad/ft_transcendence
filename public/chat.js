// =============================
// 🔌 SOCKET INITIALIZATION
// =============================
const socket = io("http://localhost:3000", {
	withCredentials: true,
});

// Toast notification queue system
const toastQueue = [];
let isShowingToast = false;

function createToastElement(username, message) {
	const toast = document.createElement("div");
	toast.className = "toast-notification";

	const header = document.createElement("div");
	header.className = "header";
	header.textContent = username;

	const messageDiv = document.createElement("div");
	messageDiv.className = "message";
	messageDiv.textContent = message;

	toast.appendChild(header);
	toast.appendChild(messageDiv);
	document.body.appendChild(toast);

	return toast;
}

async function showNextToast() {
	if (isShowingToast || toastQueue.length === 0) return;

	isShowingToast = true;
	const { username, message } = toastQueue.shift();

	const toast = createToastElement(username, message);

	// Trigger reflow to ensure transition works
	void toast.offsetWidth;
	toast.classList.add("show");

	await new Promise((resolve) => setTimeout(resolve, 2000));

	toast.classList.remove("show");
	await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for fade out

	toast.remove();
	isShowingToast = false;
	showNextToast(); // Show next toast if any
}

// =============================
// 📦 DOM ELEMENTS
// =============================
const chatListDiv = document.getElementById("chatList");
const messageBox = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const userSearchInput = document.getElementById("userSearchInput");
const userSearchResults = document.getElementById("userSearchResults");

// Added notification elements
const bellBtn = document.getElementById("bellBtn");
const generalNotificationBox = document.getElementById("generalNotifications");
const logoutBtn = document.getElementById("logoutBtn");

// Added mailbox notification elements
const mailboxBtn = document.getElementById("mailboxBtn");
const messageNotificationBox = document.getElementById("messageNotifications");

// =============================
// 🔄 STATE VARIABLES
// =============================
let currentChatId = null;
let currentUserId = null;
let notificationCount = 0;
let mailboxNotificationCount = 0;

// =============================
// 📢 NOTIFICATION HANDLING
// =============================
function addNotification(message) {
	const placeholder = generalNotificationBox.querySelector("em");
	if (placeholder) placeholder.remove();

	const div = document.createElement("div");
	div.classList.add("notification");
	div.textContent = message;
	if (generalNotificationBox.firstChild) {
		generalNotificationBox.insertBefore(
			div,
			generalNotificationBox.firstChild
		);
	} else {
		generalNotificationBox.appendChild(div);
	}

	notificationCount++;
	bellBtn.setAttribute("data-count", notificationCount);
}

// =============================
// 💬 MESSAGE HANDLING
// =============================
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

// =============================
// 🧭 CHAT NAVIGATION
// =============================
// Debounced function to avoid multiple rapid calls
let chatReloadTimeout = null;
function debouncedReloadChats() {
	// Clear any pending reload
	if (chatReloadTimeout) {
		clearTimeout(chatReloadTimeout);
	}

	// Set new timeout
	chatReloadTimeout = setTimeout(() => {
		loadChats();
		chatReloadTimeout = null;
	}, 300); // Wait 300ms before reloading
}

async function loadChats() {
	// Clear existing chat list completely
	while (chatListDiv.firstChild) {
		chatListDiv.removeChild(chatListDiv.firstChild);
	}

	try {
		const res = await fetchWithAutoRefresh(
			"http://localhost:3000/api/v1/chats"
		);
		const chats = await res.json();

		if (chats.length === 0) {
			const noChatsMsg = document.createElement("div");
			noChatsMsg.textContent = "No chats yet.";
			chatListDiv.appendChild(noChatsMsg);
			return;
		}

		// Create a document fragment to batch DOM updates
		const fragment = document.createDocumentFragment();

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

			console.log(row.dataset.chatId, ", ", chat_id);
			// Check if this is the current active chat
			if (currentChatId === chat_id) {
				row.classList.add("active");
			}

			row.addEventListener("click", async () => {
				joinRoom(chat_id);
				// After joining a room, mark notifications as read for the current chat
				const res = await fetchWithAutoRefresh(
					`${baseURL}/notifications/messages/by-chat/${chat_id}`,
					{
						method: "PATCH",
						credentials: "include",
					}
				);
				if (res.ok) {
					const data = await res.json();
					mailboxNotificationCount--;
					mailboxBtn.setAttribute(
						"data-count",
						mailboxNotificationCount
					);
				}
				// Update the URL to reflect the current chat when navigating directly
				const url = new URL(window.location.href);
				url.searchParams.set("chatId", chat_id);
				window.history.pushState({}, "", url);
			});
			fragment.appendChild(row);
		}

		// Append all rows at once
		chatListDiv.appendChild(fragment);

		return chats; // Return the chats data in case it's needed
	} catch (error) {
		console.error("Error loading chats:", error);
		chatListDiv.textContent = "Error loading chats.";
		return []; // Return empty array in case of error
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
	for (const msg of messages) {
		await appendMessage(msg);
	}
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
	loadChats(); // This will clear existing chat rows before adding new ones

	// Check for chatId parameter after socket connection is established
	const params = new URLSearchParams(window.location.search);
	const chatIdString = params.get("chatId");
	if (chatIdString) {
		console.log("Found chatId in URL, joining room:", chatIdString);
		const chatId = parseInt(chatIdString); // convert it to integer because it comes as a string in the params
		// We need to wait a bit to make sure the chats have been loaded
		setTimeout(() => {
			joinRoom(chatId);
		}, 500); // Wait half a second for the chats to load
	}
});

socket.on("newMessage", (message) => {
	// console.log("New message received:", message);
	// console.log("Current chat ID:", currentChatId);
	// console.log("Message chat ID:", message.chat_id);
	// console.log("Are they equal?", message.chat_id === currentChatId);

	if (message.chat_id === currentChatId) {
		console.log("Appending message to chat");
		appendMessage(message);
	} else {
		console.log("Not appending message - chat IDs don't match");
	}
	// Reload chats to update the order (most recent at top)
	debouncedReloadChats();
});

// Added socket event listeners for notifications
socket.on("messageReceivedInform", async (data) => {
	// Don't show toast if we're in the chat room
	if (currentChatId && currentChatId.toString() === data.chatId.toString())
		return;

	// Add to queue using the directly provided username and actual message content
	toastQueue.push({
		username: data.username,
		message: data.message, // Access the content property of the message object
	});

	// Try to show next toast
	showNextToast();

	// Rest of the existing notification logic for mailbox counter
	const page = 1;
	const limit = 50;
	const res = await fetchWithAutoRefresh(
		`${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
		{ credentials: "include" }
	);

	if (res.ok) {
		const notifications = await res.json();
		const uniqueSenders = new Set(
			notifications.filter((n) => !n.is_read).map((n) => n.sender_id)
		);

		mailboxNotificationCount = uniqueSenders.size;
		mailboxBtn.setAttribute("data-count", mailboxNotificationCount);
		renderNotificationList(messageNotificationBox, notifications);
	}

	debouncedReloadChats();
});

socket.on("friendRequestInform", (data) => {
	// Use notifications for general notifications (friend requests)
	const placeholder = generalNotificationBox.querySelector("em");
	if (placeholder) placeholder.remove();

	const div = document.createElement("div");
	div.classList.add("notification");
	div.textContent = data.message;
	if (generalNotificationBox.firstChild) {
		generalNotificationBox.insertBefore(
			div,
			generalNotificationBox.firstChild
		);
	} else {
		generalNotificationBox.appendChild(div);
	}

	notificationCount++;
	bellBtn.setAttribute("data-count", notificationCount);
});

socket.on("friendRequestAccept", (data) => {
	addNotification(data.message);
});

// =============================
// 📤 MESSAGE SEND
// =============================
sendBtn.addEventListener("click", async () => {
	const content = input.value.trim();
	if (!content || !currentChatId) return;

	const sendToChatId = currentChatId;

	const res = await fetchWithAutoRefresh(
		`http://localhost:3000/api/v1/messages`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chatId: sendToChatId, content }),
		}
	);

	if (res.ok) {
		input.value = "";
		// Don't appendMessage here
		// Wait for socket event to append
	}
});

// =============================
// 🔔 NOTIFICATION DISPLAY
// =============================
async function initializeNotificationCounter() {
	try {
		// Updated the fetch URL to include page and limit queries
		const page = 1;
		const limit = 5;
		const res = await fetchWithAutoRefresh(
			`${baseURL}/notifications/others?page=${page}&limit=${limit}`,
			{
				credentials: "include",
			}
		);
		if (!res.ok) throw new Error("Failed to fetch notifications");

		const notifications = await res.json();
		notificationCount = notifications.filter(
			(n) => n.is_opened === 0
		).length;
		bellBtn.setAttribute("data-count", notificationCount);
	} catch (error) {
		console.error("Error initializing notification counter:", error);
	}
}

bellBtn.addEventListener("click", async () => {
	const visible = generalNotificationBox.style.display === "block";
	generalNotificationBox.style.display = visible ? "none" : "block";

	if (!visible) {
		try {
			// Mark all notifications as opened
			const res = await fetchWithAutoRefresh(
				`${baseURL}/notifications/others`,
				{
					method: "PATCH",
					credentials: "include",
				}
			);
			if (!res.ok)
				throw new Error("Failed to mark notifications as opened");

			// Reset the counter
			notificationCount = 0;
			bellBtn.setAttribute("data-count", "0");
		} catch (error) {
			console.error("Error marking notifications as opened:", error);
		}
	}

	let page = 1;
	const limit = 5;
	// Updated the fetch URL to include page and limit queries
	const notificationListRes = await fetchWithAutoRefresh(
		`${baseURL}/notifications/others?page=${page}&limit=${limit}`,
		{
			credentials: "include",
		}
	);
	if (!notificationListRes.ok) {
		return;
	}

	const notificationListData = await notificationListRes.json();
	renderNotificationList(generalNotificationBox, notificationListData);
});

// Function to handle mailbox notifications
async function initializeMailboxNotificationCounter() {
	const page = 1;
	const limit = 5;
	try {
		const res = await fetchWithAutoRefresh(
			`${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
			{
				credentials: "include",
			}
		);
		if (!res.ok) throw new Error("Failed to fetch mailbox notifications");

		const notifications = await res.json();
		mailboxNotificationCount = notifications.filter(
			(n) => n.is_read === 0
		).length;
		mailboxBtn.setAttribute("data-count", mailboxNotificationCount);
	} catch (error) {
		console.error(
			"Error initializing mailbox notification counter:",
			error
		);
	}
}

mailboxBtn.addEventListener("click", async () => {
	const visible = messageNotificationBox.style.display === "block";
	messageNotificationBox.style.display = visible ? "none" : "block";

	if (!visible) {
		try {
			// Mark all mailbox notifications as opened
			const res = await fetchWithAutoRefresh(
				`${baseURL}/notifications/messages`,
				{
					method: "PATCH",
					credentials: "include",
				}
			);
			if (!res.ok)
				throw new Error(
					"Failed to mark mailbox notifications as opened"
				);
		} catch (error) {
			console.error(
				"Error marking mailbox notifications as opened:",
				error
			);
		}
	}

	const page = 1;
	const limit = 5;
	const mailboxNotificationListRes = await fetchWithAutoRefresh(
		`${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
		{
			credentials: "include",
		}
	);
	if (!mailboxNotificationListRes.ok) {
		return;
	}

	const mailboxNotificationListData = await mailboxNotificationListRes.json();
	renderNotificationList(messageNotificationBox, mailboxNotificationListData);
});

// =============================
// RENDER NOTIFICATION LIST
// =============================
function renderNotificationList(listEl, data) {
	listEl.innerHTML = "";
	if (data.length === 0) {
		const li = document.createElement("li");
		li.textContent = "No notifications.";
		listEl.appendChild(li);
		return;
	}

	data.forEach((item) => {
		const li = document.createElement("li");
		li.textContent = item.message;
		li.style.backgroundColor = item.is_read ? "white" : "lightblue";
		li.style.display = "block";
		li.style.width = "100%";
		li.style.padding = "0.75rem 1rem";
		li.style.marginBottom = "0.5rem";
		li.style.border = "1px solid #ccc";
		li.style.borderRadius = "0.5rem";
		li.style.cursor = "pointer";
		li.style.transition = "background-color 0.3s ease";

		li.addEventListener("click", async () => {
			// Updated to redirect user to the chat if the notification is of type 'message'
			if (item.type === "message" && item.chat_id) {
				// Send PATCH request to mark as read
				await fetchWithAutoRefresh(
					`${baseURL}/notifications/messages/by-chat/${item.chat_id}`,
					{
						method: "PATCH",
						credentials: "include",
					}
				);

				// Refetch message notifications to update the counter
				const page = 1;
				const limit = 5;
				const mailboxNotificationListRes = await fetchWithAutoRefresh(
					`${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
					{
						credentials: "include",
					}
				);
				if (mailboxNotificationListRes.ok) {
					const mailboxNotificationListData =
						await mailboxNotificationListRes.json();
					renderNotificationList(
						messageNotificationBox,
						mailboxNotificationListData
					);

					console.log("sjadhjashdjsahdjashdj");
					// Update the mailbox notification counter
					mailboxNotificationCount =
						mailboxNotificationListData.filter(
							(n) => n.is_read === 0
						).length;
					mailboxBtn.setAttribute(
						"data-count",
						mailboxNotificationCount
					);
				}

				// Redirect to the chat
				console.log("Redirecting to chat:", item.chat_id);
				window.location.href = `chat.html?chatId=${item.chat_id}`;
				return; // Prevent further execution after redirection
			}

			if (item.is_read) return; // Already read, do nothing

			try {
				// Send PATCH request to mark as read
				await fetchWithAutoRefresh(
					`${baseURL}/notifications/others/${item.id}`,
					{
						method: "PATCH",
						credentials: "include",
					}
				);

				// Update UI to reflect the change
				li.style.backgroundColor = "white";
				item.is_read = true;
			} catch (error) {
				console.error("Error marking notification as read:", error);
			}
		});

		li.addEventListener("mouseover", () => {
			li.style.backgroundColor = item.is_read ? "#f5f5f5" : "#add8e6"; // light gray or stay light blue
		});

		li.addEventListener("mouseout", () => {
			li.style.backgroundColor = item.is_read ? "white" : "lightblue";
		});

		listEl.appendChild(li);
	});
}

// Initialize notification counter on page load
initializeNotificationCounter();
initializeMailboxNotificationCounter();

// =============================
// 🚪 LEAVE ROOM ON PAGE EXIT
// =============================
window.addEventListener("beforeunload", () => {
	if (currentChatId !== null) {
		socket.emit("leaveRoom", currentChatId);
	}
});

// =============================
// 🚦 AUTH UTILITY
// =============================
async function checkAuthentication() {
	const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
	return res.ok; // Returns true if authenticated, false otherwise
}

// Run authentication check when page loads
checkAuthentication().then(async (isAuthenticated) => {
	if (!isAuthenticated) {
		// Not authenticated, redirect to login page
		window.location.href = "index.html";
		return;
	}

	// Show the body (dashboard content) if authenticated
	document.body.style.visibility = "visible";
	document.body.style.opacity = "1";

	// Wait for socket connection before proceeding
	if (!socket.connected) {
		await new Promise((resolve) => socket.once("connect", resolve));
	}

	// We DO NOT call loadChats() here since it's already called by the socket.on('connect') event
	// We also don't check for chatId parameter here anymore - it's handled in the socket.on('connect') event
});

// Add logout functionality
if (logoutBtn) {
	logoutBtn.addEventListener("click", async () => {
		const deviceId = localStorage.getItem("deviceId");
		if (!deviceId) return alert("Missing deviceId");

		const res = await fetchWithAutoRefresh(`${baseURL}/auth/logout`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ deviceId }),
		});

		if (res.ok) {
			window.location.href = "index.html";
		} else {
			alert("Logout failed ❌");
		}
	});
}
