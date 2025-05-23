// DOM Elements
const logoutBtn = document.getElementById("logoutBtn");

// Authentication check
async function checkAuthentication() {
	const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);
	if (res.ok) {
		const userData = await res.json();
		window.chatMessages.setCurrentUserId(userData.user.user.id);
	}
	return res.ok;
}

// Logout handling
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

// Initialize authentication
document.addEventListener("DOMContentLoaded", async () => {
	const isAuthenticated = await checkAuthentication();
	if (!isAuthenticated) {
		window.location.href = "index.html";
		return;
	}

	document.body.style.visibility = "visible";
	document.body.style.opacity = "1";

	// Initialize notifications after authentication
	window.chatNotifications.initialize();

	// Wait for socket connection before proceeding
	if (!chatSocket.connected) {
		await new Promise((resolve) => chatSocket.once("connect", resolve));
	}
});
