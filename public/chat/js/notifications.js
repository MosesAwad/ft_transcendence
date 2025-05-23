// Notification state and DOM elements
let notificationCount = 0;
let mailboxNotificationCount = 0;

const bellBtn = document.getElementById("bellBtn");
const generalNotificationBox = document.getElementById("generalNotifications");
const mailboxBtn = document.getElementById("mailboxBtn");
const messageNotificationBox = document.getElementById("messageNotifications");

// General notification functions
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
	const page = 1;
	const limit = 5;
	try {
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

// Event listeners for notification bells
bellBtn.addEventListener("click", async () => {
	const visible = generalNotificationBox.style.display === "block";
	generalNotificationBox.style.display = visible ? "none" : "block";

	if (!visible) {
		try {
			await fetchWithAutoRefresh(`${baseURL}/notifications/others`, {
				method: "PATCH",
				credentials: "include",
			});
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
	if (notificationListRes.ok) {
		const notificationListData = await notificationListRes.json();
		renderNotificationList(generalNotificationBox, notificationListData);
	}
});

mailboxBtn.addEventListener("click", async () => {
	const visible = messageNotificationBox.style.display === "block";
	messageNotificationBox.style.display = visible ? "none" : "block";

	if (!visible) {
		try {
			await fetchWithAutoRefresh(`${baseURL}/notifications/messages`, {
				method: "PATCH",
				credentials: "include",
			});
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
		{ credentials: "include" }
	);
	if (mailboxNotificationListRes.ok) {
		const mailboxNotificationListData =
			await mailboxNotificationListRes.json();
		renderNotificationList(
			messageNotificationBox,
			mailboxNotificationListData
		);
	}
});

// Socket event handlers for notifications
chatSocket.on("messageReceivedInform", async (data) => {
	if (currentChatId && currentChatId.toString() === data.chatId.toString())
		return;

	chatToast.addToQueue(data.username, data.message);

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

chatSocket.on("friendRequestInform", (data) => {
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

chatSocket.on("friendRequestAccept", (data) => {
	addNotification(data.message);
});

// Export notification functionality
window.chatNotifications = {
	initialize: () => {
		initializeNotificationCounter();
		initializeMailboxNotificationCounter();
	},
	updateMailboxCount: (count) => {
		mailboxNotificationCount = count;
		mailboxBtn.setAttribute("data-count", count);
	},
};
