const userSearchInput = document.getElementById("userSearch");
const userSearchResults = document.getElementById("userSearchResults");
const logoutBtn = document.getElementById("logoutBtn");
const showUserBtn = document.getElementById("showUserBtn");
const bellBtn = document.getElementById("bellBtn");
const notificationBox = document.getElementById("notifications");
const sendBtn = document.getElementById("sendFriendRequestBtn");
const emailInput = document.getElementById("friendEmail");
const incomingList = document.getElementById("incomingRequests");
const outgoingList = document.getElementById("outgoingRequests");
const friendsList = document.getElementById("friendsList");

const deviceId = localStorage.getItem("deviceId");

let notificationCount = 0;

/* NOTIFICATION SECTION */

console.log('Trying to connect to:', window.location.hostname);
const socket = io("http://localhost:3000", {
	withCredentials: true,
});

function addNotification(message) {
	const placeholder = notificationBox.querySelector("em");
	if (placeholder) placeholder.remove();

	const div = document.createElement("div");
	div.classList.add("notification");
	div.textContent = message;
	if (notificationBox.firstChild) {
		notificationBox.insertBefore(div, notificationBox.firstChild);
	} else {
		notificationBox.appendChild(div);
	}

	notificationCount++;
	bellBtn.setAttribute("data-count", notificationCount);
}

socket.on("friendRequestInform", (data) => {
	addNotification(data.message);
	loadFriendData();
});

socket.on("friendRequestAccept", (data) => {
	addNotification(data.message);
	loadFriendData();
});

/* AUTH */

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
bellBtn.addEventListener("click", async () => {
	const visible = notificationBox.style.display === "block";
	notificationBox.style.display = visible ? "none" : "block";

	let page = 1;
	const limit = 5;
	const notificationListRes = await fetchWithAutoRefresh(
		`${baseURL}/notifications?page=${page}&limit=${limit}`,
		{
			credentials: "include",
		}
	);
	if (!notificationListRes.ok) {
		return;
	}
	const notificationListData = await notificationListRes.json();
	renderList(notificationBox, notificationListData, (item) => {
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
			if (item.is_read) return; // Already read, do nothing
		
			// Send PATCH request
			await fetchWithAutoRefresh(
				`${baseURL}/notifications/${item.id}`,
				{
					method: "PATCH",
					credentials: "include",
				}
			);
		
			// Update UI to fix it live without the user having to close the notification box and re-open
			li.style.backgroundColor = "white";
			item.is_read = 1;
		});
		li.addEventListener("mouseover", () => {
			li.style.backgroundColor = item.is_read ? "#f5f5f5" : "#add8e6"; // light gray or stay light blue
		});
		li.addEventListener("mouseout", () => {
			li.style.backgroundColor = item.is_read ? "white" : "lightblue";
		});
		
		return li;
	});

	if (!visible) {
		notificationCount = 0;
		bellBtn.setAttribute("data-count", "0");
	}
});

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
		localStorage.removeItem("deviceId");
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

	loadFriendData();
});
