document.addEventListener("DOMContentLoaded", () => {
	const logoutBtn = document.getElementById("logoutBtn");
	const showUserBtn = document.getElementById("showUserBtn");
	const notificationBox = document.getElementById("notifications");
	const deviceId = localStorage.getItem("deviceId");

	// Socket connection
	const socket = io("http://localhost:3000", {
		withCredentials: true,
	});

	socket.on("friendRequestInform", (data) => {
		// Remove placeholder if it's still there
		const placeholder = notificationBox.querySelector("em");
		if (placeholder) {
			notificationBox.removeChild(placeholder);
		}

		const div = document.createElement("div");
		div.textContent = data.message;
		notificationBox.appendChild(div);
	});

    socket.on("friendRequestAccept", (data) => {
        console.log(data);

		// Remove placeholder if it's still there
		const placeholder = notificationBox.querySelector("em");
		if (placeholder) {
			notificationBox.removeChild(placeholder);
		}

		const div = document.createElement("div");
		div.textContent = data.message;
		notificationBox.appendChild(div);
	});

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
});
