let deviceId = null;

document.addEventListener("DOMContentLoaded", () => {
	const loginForm = document.getElementById("loginForm");

	if (!loginForm) return;

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
			credentials: "include",
			body: JSON.stringify({ email, password, deviceId }),
		});

		if (res.ok) {
			window.location.href = "dashboard.html";
		} else {
			const err = await res.text();
			alert(`Login failed ❌\n${err}`);
		}
	});
});
