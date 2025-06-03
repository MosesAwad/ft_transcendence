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

		// Update UI elements
		document.getElementById("username").textContent = userData.username;
		document.getElementById("email").textContent = userData.email;
		document.getElementById("profileImage").src =
			userData.profile_picture || "/uploads/default.png";

		// Show/hide profile actions based on ownership
		const currentUser = await fetchWithAutoRefresh(
			`${baseURL}/users/showUser`
		);
		const currentUserData = await currentUser.json();
		const profileActions = document.getElementById("profileActions");
		const securitySection = document.querySelector(".security-section");
		const setupTwoFactorBtn = document.getElementById("setupTwoFactorBtn");
		const disableTwoFactorBtn = document.getElementById(
			"disableTwoFactorBtn"
		);
		const twoFactorStatus = document.getElementById("twoFactorStatus");
		const qrSetup = document.getElementById("qrSetup");

		if (currentUserData.user.user.id === parseInt(userId)) {
			profileActions.style.display = "flex";
			setupProfilePictureHandlers();
			securitySection.style.display = "block";

			// Update 2FA status and show appropriate controls
			if (userData.two_factor_enabled) {
				twoFactorStatus.textContent = "Enabled";
				twoFactorStatus.className = "status-badge status-enabled";
				setupTwoFactorBtn.style.display = "none";
				disableTwoFactorBtn.style.display = "block";
				qrSetup.style.display = "none";
			} else {
				twoFactorStatus.textContent = "Disabled";
				twoFactorStatus.className = "status-badge status-disabled";
				setupTwoFactorBtn.style.display = "block";
				disableTwoFactorBtn.style.display = "none";
				qrSetup.style.display = "none";
			}

			// Setup 2FA button click handler
			setupTwoFactorBtn.addEventListener("click", async () => {
				try {
					const setupRes = await fetchWithAutoRefresh(
						`${baseURL}/auth/2fa/setup`,
						{
							method: "POST",
							credentials: "include",
						}
					);

					if (!setupRes.ok)
						throw new Error("Failed to start 2FA setup");

					const { qrCode } = await setupRes.json();
					document.getElementById("qrCode").src = qrCode;
					qrSetup.style.display = "block";
					setupTwoFactorBtn.style.display = "none";
				} catch (err) {
					console.error("Error setting up 2FA:", err);
					document.getElementById("setupError").textContent =
						"Failed to start 2FA setup. Please try again.";
					document.getElementById("setupError").style.display =
						"block";
				}
			});

			// Verification code submit handler
			document
				.getElementById("verifyCodeBtn")
				.addEventListener("click", async () => {
					const code =
						document.getElementById("verificationCode").value;
					const setupError = document.getElementById("setupError");
					const setupSuccess =
						document.getElementById("setupSuccess");

					try {
						const verifyRes = await fetchWithAutoRefresh(
							`${baseURL}/auth/2fa/verify`,
							{
								method: "POST",
								headers: { "Content-Type": "application/json" },
								credentials: "include",
								body: JSON.stringify({ token: code }),
							}
						);

						if (!verifyRes.ok) {
							throw new Error("Invalid verification code");
						}

						setupSuccess.textContent =
							"2FA has been successfully enabled!";
						setupSuccess.style.display = "block";
						setupError.style.display = "none";

						// Reload profile data to update UI
						setTimeout(() => {
							loadProfileData(userId);
						}, 1500);
					} catch (err) {
						setupError.textContent =
							"Invalid verification code. Please try again.";
						setupError.style.display = "block";
						setupSuccess.style.display = "none";
					}
				});

			// Disable 2FA button click handler
			disableTwoFactorBtn.addEventListener("click", async () => {
				try {
					const res = await fetchWithAutoRefresh(
						`${baseURL}/auth/2fa/disable`,
						{
							method: "POST",
							credentials: "include",
						}
					);

					if (!res.ok) throw new Error("Failed to disable 2FA");

					// Reload profile to update UI
					loadProfileData(userId);
				} catch (err) {
					console.error("Error disabling 2FA:", err);
					alert("Failed to disable 2FA. Please try again.");
				}
			});
		} else {
			profileActions.style.display = "none";
			securitySection.style.display = "none";
		}

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

		// Check if user is blocked
		const blockedUsersRes = await fetchWithAutoRefresh(
			`${baseURL}/users/blocks`,
			{ credentials: "include" }
		);
		if (!blockedUsersRes.ok)
			throw new Error("Failed to fetch blocked users");
		const blockedUsers = await blockedUsersRes.json();

		updateFriendButton(
			userId,
			friendships,
			pendingRequests,
			incomingRequests,
			blockedUsers,
			currentUserData
		);
	} catch (err) {
		console.error("Error loading profile:", err);
	}
}

function setupProfilePictureHandlers() {
	const uploadBtn = document.getElementById("uploadBtn");
	const removeBtn = document.getElementById("removeBtn");
	const profilePicture = document.getElementById("profilePicture");

	uploadBtn.addEventListener("click", () => {
		profilePicture.click();
	});

	profilePicture.addEventListener("change", async (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("file", file);

		try {
			const res = await fetchWithAutoRefresh(
				`${baseURL}/users/uploads/profile-picture`,
				{
					method: "POST",
					credentials: "include",
					body: formData,
				}
			);

			if (!res.ok) throw new Error("Failed to upload profile picture");

			const data = await res.json();
			document.getElementById("profileImage").src = data.url;
		} catch (err) {
			console.error("Error uploading profile picture:", err);
			alert("Failed to upload profile picture");
		}
	});

	removeBtn.addEventListener("click", async () => {
		try {
			const res = await fetchWithAutoRefresh(
				`${baseURL}/users/uploads/profile-picture`,
				{
					method: "DELETE",
					credentials: "include",
				}
			);

			if (!res.ok) throw new Error("Failed to remove profile picture");

			document.getElementById("profileImage").src =
				"/uploads/default.png";
		} catch (err) {
			console.error("Error removing profile picture:", err);
			alert("Failed to remove profile picture");
		}
	});
}

async function updateFriendButton(
	userId,
	friendships,
	pendingRequests,
	incomingRequests,
	blockedUsers,
	currentUserData
) {
	const btnContainer = document.querySelector(".button-container");
	btnContainer.innerHTML = "";

	// If viewing own profile, don't show any friend or block buttons
	if (currentUserData.user.user.id === parseInt(userId)) {
		return;
	}

	// First handle friend-related buttons
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

	const outgoingRequest = pendingRequests.find(
		(r) => r.receiverId === parseInt(userId)
	);
	if (outgoingRequest) {
		const cancelBtn = document.createElement("button");
		cancelBtn.textContent = "Cancel Request";
		cancelBtn.className = "reject-request";
		cancelBtn.addEventListener("click", async () => {
			await fetchWithAutoRefresh(
				`${baseURL}/friendships/${outgoingRequest.friendshipId}`,
				{
					method: "DELETE",
					credentials: "include",
				}
			);
			loadProfileData(userId);
		});
		btnContainer.appendChild(cancelBtn);
		return;
	}

	const friendship = friendships.find((f) => f.id === parseInt(userId));
	if (friendship) {
		const removeFriendBtn = document.createElement("button");
		removeFriendBtn.textContent = "Remove Friend";
		removeFriendBtn.className = "reject-request";
		removeFriendBtn.addEventListener("click", async () => {
			await fetchWithAutoRefresh(
				`${baseURL}/friendships/${friendship.friendshipId}`,
				{
					method: "DELETE",
					credentials: "include",
				}
			);
			loadProfileData(userId);
		});
		btnContainer.appendChild(removeFriendBtn);
	} else {
		const addFriendBtn = document.createElement("button");
		addFriendBtn.textContent = "Add Friend";
		addFriendBtn.className = "send-request";
		addFriendBtn.addEventListener("click", async () => {
			await fetchWithAutoRefresh(`${baseURL}/friendships`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ receiverId: userId }),
			});
			loadProfileData(userId);
		});
		btnContainer.appendChild(addFriendBtn);
	}

	// Then handle block button
	const isBlocked = blockedUsers.some(
		(block) => block.userId === parseInt(userId)
	);
	const blockBtn = document.createElement("button");
	if (isBlocked) {
		blockBtn.textContent = "Unblock User";
		blockBtn.className = "unblock-user";
		blockBtn.addEventListener("click", async () => {
			const block = blockedUsers.find(
				(b) => b.userId === parseInt(userId)
			);
			await fetchWithAutoRefresh(`${baseURL}/users/blocks/${block.id}`, {
				method: "DELETE",
				credentials: "include",
			});
			loadProfileData(userId);
		});
	} else {
		blockBtn.textContent = "Block User";
		blockBtn.className = "block-user";
		blockBtn.addEventListener("click", async () => {
			await fetchWithAutoRefresh(`${baseURL}/users/blocks`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ blockedId: userId }),
			});
			loadProfileData(userId);
		});
	}
	btnContainer.appendChild(blockBtn);
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
