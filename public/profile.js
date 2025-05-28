const socket = io("http://localhost:3000", {
	withCredentials: true,
});

async function checkAuthAndLoadProfile() {
	const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
	if (!res.ok) {
		window.location.href = "index.html";
		return;
	}

	document.body.style.visibility = "visible";
	document.body.style.opacity = "1";

	const urlParams = new URLSearchParams(window.location.search);
	const userId = urlParams.get("userId");

	if (!userId) {
		window.location.href = "dashboard.html";
		return;
	}

	loadProfileData(userId);
}

async function loadProfileData(userId) {
	try {
		// Get profile user data
		const userRes = await fetchWithAutoRefresh(
			`${baseURL}/users/${userId}`
		);
		if (!userRes.ok) throw new Error("Failed to fetch user data");
		const userData = await userRes.json();

		// Update UI
		document.getElementById("username").textContent = userData.username;
		document.getElementById("email").textContent = userData.email;
		document.querySelector(".profile-avatar").textContent =
			userData.username[0].toUpperCase();

		// Check friendship status
		const friendshipsRes = await fetchWithAutoRefresh(
			`${baseURL}/friendships`
		);
		if (!friendshipsRes.ok) throw new Error("Failed to fetch friendships");
		const friendships = await friendshipsRes.json();

		// Check for outgoing pending requests
		const pendingRes = await fetchWithAutoRefresh(
			`${baseURL}/friendships?status=pending&direction=sent`
		);
		if (!pendingRes.ok) throw new Error("Failed to fetch pending requests");
		const pendingRequests = await pendingRes.json();

		// Check for incoming pending requests
		const incomingReqRes = await fetchWithAutoRefresh(
			`${baseURL}/friendships?status=pending&direction=received`
		);
		if (!incomingReqRes.ok)
			throw new Error("Failed to fetch incoming requests");
		const incomingRequests = await incomingReqRes.json();

		updateFriendButton(
			userId,
			friendships,
			pendingRequests,
			incomingRequests
		);
	} catch (error) {
		console.error("Error:", error);
	}
}

function updateFriendButton(
	userId,
	friendships,
	pendingRequests,
	incomingRequests
) {
	const btnContainer = document.querySelector(".button-container"); // Change this line
	btnContainer.innerHTML = ""; // Clear existing buttons

	// Check if there's an incoming request from this user
	const incomingRequest = incomingRequests.find(
		(r) => r.senderId === parseInt(userId)
	);
	if (incomingRequest) {
		const acceptBtn = document.createElement("button");
		acceptBtn.textContent = "Accept Request";
		acceptBtn.className = "accept-request";
		acceptBtn.addEventListener("click", async () => {
			await fetchWithAutoRefresh(
				`${baseURL}/friendships/${incomingRequest.friendshipId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ action: "accept" }),
				}
			);
			loadProfileData(userId);
		});

		const rejectBtn = document.createElement("button");
		rejectBtn.textContent = "Reject Request";
		rejectBtn.className = "reject-request";
		rejectBtn.addEventListener("click", async () => {
			await fetchWithAutoRefresh(
				`${baseURL}/friendships/${incomingRequest.friendshipId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ action: "reject" }),
				}
			);
			loadProfileData(userId);
		});

		btnContainer.appendChild(acceptBtn);
		btnContainer.appendChild(rejectBtn);
		return;
	}

	const btn = document.createElement("button");
	btn.id = "friendActionBtn";

	const friendship = friendships.find((f) => f.userId === parseInt(userId));
	if (friendship) {
		btn.textContent = "Remove Friend";
		btn.className = "remove-friend";
		btn.dataset.friendshipId = friendship.friendshipId;
	} else {
		const pendingRequest = pendingRequests.find(
			(r) => r.recipientId === parseInt(userId)
		);
		if (pendingRequest) {
			btn.textContent = "Request Sent";
			btn.className = "request-sent";
			btn.disabled = true;
		} else {
			btn.textContent = "Send Friend Request";
			btn.className = "";
		}
	}

	btn.addEventListener("click", async (e) => {
		const isFriend = e.target.classList.contains("remove-friend");
		try {
			if (isFriend) {
				await fetchWithAutoRefresh(
					`${baseURL}/friendships/${e.target.dataset.friendshipId}`,
					{
						method: "DELETE",
						credentials: "include",
					}
				);
			} else {
				await fetchWithAutoRefresh(`${baseURL}/friendships`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ friendId: userId }),
				});
			}
			loadProfileData(userId);
		} catch (error) {
			console.error("Error:", error);
		}
	});

	btnContainer.appendChild(btn);
}

socket.on("friendRequestInform", () => {
	const userId = new URLSearchParams(window.location.search).get("userId");
	loadProfileData(userId);
});

socket.on("friendRequestAccept", () => {
	const userId = new URLSearchParams(window.location.search).get("userId");
	loadProfileData(userId);
});

// Initialize
checkAuthAndLoadProfile();
