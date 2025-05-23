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

// DOM Elements
const userSearchInput = document.getElementById("userSearch");
const userSearchResults = document.getElementById("userSearchResults");
const logoutBtn = document.getElementById("logoutBtn");
const showUserBtn = document.getElementById("showUserBtn");
const bellBtn = document.getElementById("bellBtn");
const mailboxBtn = document.getElementById("mailboxBtn");
const generalNotificationBox = document.getElementById("generalNotifications");
const messageNotificationBox = document.getElementById("messageNotifications");
const incomingList = document.getElementById("incomingRequests");
const outgoingList = document.getElementById("outgoingRequests");
const friendsList = document.getElementById("friendsList");

const deviceId = localStorage.getItem("deviceId");

// Notification state
let notificationCount = 0;
let mailboxNotificationCount = 0;

// Socket connection
console.log("Trying to connect to:", window.location.hostname);
const socket = io("http://localhost:3000", {
	withCredentials: true,
});

function addNotification(message, type = "general") {
	const box =
		type === "message" ? messageNotificationBox : generalNotificationBox;
	const placeholder = box.querySelector("em");
	if (placeholder) placeholder.remove();

	const div = document.createElement("div");
	div.classList.add("notification");
	div.textContent = message;
	if (box.firstChild) {
		box.insertBefore(div, box.firstChild);
	} else {
		box.appendChild(div);
	}

	if (type === "message") {
		mailboxNotificationCount++;
		mailboxBtn.setAttribute("data-count", mailboxNotificationCount);
	} else {
		notificationCount++;
		bellBtn.setAttribute("data-count", notificationCount);
	}
}

// Socket event listeners
socket.on("messageReceivedInform", async (data) => {
	// Add to queue using the directly provided username and message content
	toastQueue.push({
		username: data.username,
		message: data.message.slice(0, 100), // Only show first 100 chars in toast
	});

	// Try to show next toast
	showNextToast();

	// Add to notification box and update counter
	addNotification(data.message, "message");

	// Update mailbox counter with latest count
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
});

socket.on("friendRequestInform", (data) => {
	addNotification(data.message, "general");
	loadFriendData();
});

socket.on("friendRequestAccept", (data) => {
	addNotification(data.message, "general");
	loadFriendData();
});

// Initialize notification counters
async function initializeNotificationCounter() {
	try {
		const page = 1;
		const limit = 5;
		const res = await fetchWithAutoRefresh(
			`${baseURL}/notifications/others?page=${page}&limit=${limit}`,
			{ credentials: "include" }
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

async function initializeMailboxNotificationCounter() {
	try {
		const page = 1;
		const limit = 5;
		const res = await fetchWithAutoRefresh(
			`${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
			{ credentials: "include" }
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

// Notification click handlers
bellBtn.addEventListener("click", async () => {
	const visible = generalNotificationBox.style.display === "block";
	generalNotificationBox.style.display = visible ? "none" : "block";
	messageNotificationBox.style.display = "none"; // Hide other box

	if (!visible) {
		try {
			const res = await fetchWithAutoRefresh(
				`${baseURL}/notifications/others`,
				{
					method: "PATCH",
					credentials: "include",
				}
			);
			if (!res.ok)
				throw new Error("Failed to mark notifications as opened");
			notificationCount = 0;
			bellBtn.setAttribute("data-count", "0");
		} catch (error) {
			console.error("Error marking notifications as opened:", error);
		}
	}

	const page = 1;
	const limit = 5;
	const notificationListRes = await fetchWithAutoRefresh(
		`${baseURL}/notifications/others?page=${page}&limit=${limit}`,
		{ credentials: "include" }
	);
	if (!notificationListRes.ok) return;

	const notificationListData = await notificationListRes.json();
	renderNotificationList(generalNotificationBox, notificationListData);
});

mailboxBtn.addEventListener("click", async () => {
	const visible = messageNotificationBox.style.display === "block";
	messageNotificationBox.style.display = visible ? "none" : "block";
	generalNotificationBox.style.display = "none"; // Hide other box

	const page = 1;
	const limit = 5;
	const mailboxNotificationListRes = await fetchWithAutoRefresh(
		`${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
		{ credentials: "include" }
	);
	if (!mailboxNotificationListRes.ok) return;

	const mailboxNotificationListData = await mailboxNotificationListRes.json();
	renderNotificationList(messageNotificationBox, mailboxNotificationListData);
});

// Helper function to render notification lists
function renderNotificationList(listEl, data) {
	listEl.innerHTML = "";
	if (data.length === 0) {
		const li = document.createElement("li");
		li.textContent =
			listEl.id === "messageNotifications"
				? "No new messages."
				: "No notifications.";
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
			if (item.type === "message" && item.chat_id) {
				await fetchWithAutoRefresh(
					`${baseURL}/notifications/messages/by-chat/${item.chat_id}`,
					{
						method: "PATCH",
						credentials: "include",
					}
				);

				window.location.href = `chat/chat.html?chatId=${item.chat_id}`;
				return;
			}

			if (item.is_read) return;

			try {
				await fetchWithAutoRefresh(
					`${baseURL}/notifications/others/${item.id}`,
					{
						method: "PATCH",
						credentials: "include",
					}
				);
				li.style.backgroundColor = "white";
				item.is_read = true;
			} catch (error) {
				console.error("Error marking notification as read:", error);
			}
		});

		li.addEventListener("mouseover", () => {
			li.style.backgroundColor = item.is_read ? "#f5f5f5" : "#add8e6";
		});

		li.addEventListener("mouseout", () => {
			li.style.backgroundColor = item.is_read ? "white" : "lightblue";
		});

		listEl.appendChild(li);
	});
}

// AUTH

async function checkAuthentication() {
	const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
	return res.ok; // Returns true if authenticated, false otherwise
}

/* UTILS */

function renderList(listEl, data, itemRenderer) {
	listEl.innerHTML = "";
	if (data.length === 0) {
		const li = document.createElement("li");
		li.textContent = "No items.";
		listEl.appendChild(li);
		return;
	}
	data.forEach((item) => {
		const li = itemRenderer(item);
		listEl.appendChild(li);
	});
}

function makeButton(text, onClick) {
	const btn = document.createElement("button");
	btn.textContent = text;
	btn.style.marginTop = "0.25rem";
	btn.addEventListener("click", onClick);
	return btn;
}

const sendFriendRequest = async (userId) => {
	const res = await fetchWithAutoRefresh(`${baseURL}/friendships`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ friendId: userId }),
	});

	if (res.ok) {
		alert("Request sent ✅");
		loadFriendData();
	} else {
		const err = await res.text();
		alert("Failed to send request ❌\n" + err);
	}
};

/* DISPLAY */

// ========= Real-time Search Section =========
const renderSearchResults = (data) => {
	userSearchResults.innerHTML = "";
	if (data.length === 0) {
		userSearchResults.style.display = "none";
		return;
	}

	data.forEach((user) => {
		const li = document.createElement("li");
		li.textContent = user.username;
		li.addEventListener("click", () => {
			sendFriendRequest(user.id); // Send friend request when user clicks on a result
			userSearchInput.value = ""; // Clear search input
			userSearchResults.style.display = "none"; // Hide dropdown after selection
		});
		userSearchResults.appendChild(li);
	});

	userSearchResults.style.display = "block"; // Show dropdown menu
};

/* INITIALIZERS */

async function loadFriendData() {
	// ============= Incoming Requests Section =============
	const incomingReqRes = await fetchWithAutoRefresh(
		`${baseURL}/friendships?status=pending&direction=received`,
		{
			credentials: "include",
		}
	);
	if (!incomingReqRes.ok) {
		return;
	}
	const incomingReqData = await incomingReqRes.json();

	renderList(incomingList, incomingReqData, (item) => {
		const li = document.createElement("li");
		li.textContent = item.senderUsername;

		const acceptBtn = makeButton("Accept", async () => {
			await fetchWithAutoRefresh(
				`${baseURL}/friendships/${item.friendshipId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ action: "accept" }),
				}
			);
			loadFriendData();
		});

		const rejectBtn = makeButton("Reject", async () => {
			await fetchWithAutoRefresh(
				`${baseURL}/friendships/${item.friendshipId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ action: "reject" }),
				}
			);
			loadFriendData();
		});

		li.appendChild(acceptBtn);
		li.appendChild(rejectBtn);
		return li;
	});

	// ============= Outgoing Requests Section =============
	const outgoingReqRes = await fetchWithAutoRefresh(
		`${baseURL}/friendships?status=pending&direction=sent`,
		{
			credentials: "include",
		}
	);
	if (!outgoingReqRes.ok) {
		return;
	}
	const outgoingReqData = await outgoingReqRes.json();
	renderList(outgoingList, outgoingReqData, (item) => {
		const li = document.createElement("li");
		li.textContent = item.senderUsername;

		const cancelBtn = makeButton("Cancel", async () => {
			await fetchWithAutoRefresh(
				`${baseURL}/friendships/${item.friendshipId}`,
				{
					method: "DELETE",
					credentials: "include",
				}
			);
			loadFriendData();
		});

		li.appendChild(cancelBtn);
		return li;
	});

	// ============= Friend List Section =============
	const friendListRes = await fetchWithAutoRefresh(`${baseURL}/friendships`, {
		credentials: "include",
	});
	if (!friendListRes.ok) {
		return;
	}
	const friendListData = await friendListRes.json();

	renderList(friendsList, friendListData, (item) => {
		const li = document.createElement("li");
		li.textContent = item.username;

		console.log("friendship: ", item.friendshipId);
		const removeBtn = makeButton("Remove", async () => {
			await fetchWithAutoRefresh(
				`${baseURL}/friendships/${item.friendshipId}`,
				{
					method: "DELETE",
					credentials: "include",
				}
			);
			loadFriendData();
		});

		li.appendChild(removeBtn);
		return li;
	});
}

/*`EVENT LISTENERS */
userSearchInput.addEventListener("input", async () => {
	const query = userSearchInput.value.trim();

	if (!query) {
		userSearchResults.style.display = "none";
		return;
	}

	let page = 1; // Start from the first page
	const limit = 5; // Max results per page

	const res = await fetchWithAutoRefresh(
		`${baseURL}/users?search=${query}&page=${page}&limit=${limit}`,
		{
			credentials: "include",
		}
	);

	if (res.ok) {
		const data = await res.json();
		renderSearchResults(data);
	} else {
		userSearchResults.style.display = "none";
	}
});

logoutBtn.addEventListener("click", async () => {
	if (!deviceId) return alert("Missing deviceId");
	const res = await fetchWithAutoRefresh(`${baseURL}/auth/logout`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ deviceId }),
	});
	if (res.ok) {
		// localStorage.removeItem("deviceId");
		window.location.href = "index.html";
	} else {
		alert("Logout failed ❌");
	}
});

showUserBtn.addEventListener("click", async () => {
	const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
	if (res.ok) {
		const json = await res.json();
		alert(`User Info:\n${JSON.stringify(json, null, 2)}`);
	} else {
		alert("Failed to fetch user");
	}
});

/* INVOCATIONS */

// Run the authentication check before displaying content
checkAuthentication().then((isAuthenticated) => {
	if (!isAuthenticated) {
		// Not authenticated, redirect to login page
		window.location.href = "index.html";
		return;
	}

	// Show the body (dashboard content) if authenticated
	document.body.style.visibility = "visible";
	document.body.style.opacity = "1";

	initializeNotificationCounter();
	initializeMailboxNotificationCounter();
	loadFriendData();
});
