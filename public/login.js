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

	googleBtn.addEventListener("click", (e) => {
		e.preventDefault(); // VERY IMPORTANT! Note 1

		// Disable the button immediately to prevent double-clicks
		googleBtn.disabled = true;

		// Get or generate deviceId
		let deviceId = localStorage.getItem("deviceId");
		if (!deviceId) {
			deviceId = generateDeviceId();
			localStorage.setItem("deviceId", deviceId);
		}

		// Create JSON and base64 encode it
		const state = encodeURIComponent(btoa(JSON.stringify({ deviceId })));

		window.location.href = `${baseURL}/auth/google/login?state=${state}`;
	});
});

/*
	NOTES

		Note 1

		DO NOT FORGET, otherwise, two requests would be made:
			1.	One from the actual HTML (since it was an <a href> tag) to "http://localhost:3000/api/v1/auth/google/login without 
				the state query string, that's bad, we need deviceId to be sent!!
			2.	Another one which is the redirect you set with this line window.location.href = `${baseURL}/auth/google/login?state=${state}`; 
				and that is the only one we want.

		Since we only want the second request, we use e.preventDefault().
*/
