async function checkAuthentication() {
	const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
	return res.ok; // Returns true if authenticated, false otherwise
}

document.addEventListener("DOMContentLoaded", () => {
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
	});

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

	const socket = io("http://localhost:3000", {
		withCredentials: true,
	});

	function addNotification(message) {
		const placeholder = notificationBox.querySelector("em");
		if (placeholder) placeholder.remove();

		const div = document.createElement("div");
		div.classList.add("notification");
		div.textContent = message;
		notificationBox.appendChild(div);

		notificationCount++;
		bellBtn.setAttribute("data-count", notificationCount);
	}

	bellBtn.addEventListener("click", () => {
		const visible = notificationBox.style.display === "block";
		notificationBox.style.display = visible ? "none" : "block";
		if (!visible) {
			notificationCount = 0;
			bellBtn.setAttribute("data-count", "0");
		}
	});

	// Socket listeners
	socket.on("friendRequestInform", (data) => {
		addNotification(data.message);
		loadFriendData();
	});

	socket.on("friendRequestAccept", (data) => {
		addNotification(data.message);
		loadFriendData();
	});

	// Friend request handlers
	sendBtn.addEventListener("click", async () => {
		const email = emailInput.value.trim();
		if (!email) return alert("Enter an email.");

		const res = await fetchWithAutoRefresh(`${baseURL}/friendships`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ email }),
		});

		if (res.ok) {
			alert("Request sent ✅");
			emailInput.value = "";
			loadFriendData();
		} else {
			const err = await res.text();
			alert("Failed to send request ❌\n" + err);
		}
	});

	// Side views
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
		const friendListRes = await fetchWithAutoRefresh(
			`${baseURL}/friendships`,
			{
				credentials: "include",
			}
		);
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

	// Logout handler
	if (logoutBtn) {
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
	}

	// Show current user
	if (showUserBtn) {
		showUserBtn.addEventListener("click", async () => {
			const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
			if (res.ok) {
				const json = await res.json();
				alert(`User Info:\n${JSON.stringify(json, null, 2)}`);
			} else {
				alert("Failed to fetch user");
			}
		});
	}

	loadFriendData();
});
