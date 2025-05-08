let deviceId = null;

document.addEventListener("DOMContentLoaded", () => {
	const loginForm = document.getElementById("loginForm");
	if (!loginForm) return;
	const googleBtn = document.getElementById("googleLoginBtn");


	loginForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const email = document.getElementById("email").value;
		const password = document.getElementById("password").value;

		deviceId = localStorage.getItem("deviceId");
		if (!deviceId) {
			deviceId = generateDeviceId();
			localStorage.setItem("deviceId", deviceId);
		}

		const res = await fetch(`${baseURL}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			// credentials: "include", // NO NEED FOR THIS, IT'S THE LOGIN ROUTE, WHY SEND CREDENTIALS?
			body: JSON.stringify({ email, password, deviceId }),
		});

		if (res.ok) {
			window.location.href = "dashboard.html";
		} else {
			const err = await res.text();
			alert(`Login failed ❌\n${err}`);
		}
	});

	googleBtn.addEventListener("click", () => {
		let deviceId = localStorage.getItem("deviceId");
		if (!deviceId) {
			deviceId = generateDeviceId();
			localStorage.setItem("deviceId", deviceId);
		}

		// Generate a state string containing the deviceId (for security, consider encoding it)
		const state = encodeURIComponent(JSON.stringify({ deviceId }));

		// Send the state parameter along with the redirect to Google OAuth
		window.location.href = `http://localhost:3000/api/v1/auth/google/login?state=${state}`;
	});
});
