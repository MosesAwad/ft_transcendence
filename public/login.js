let deviceId = null;
let tempToken = null;

document.addEventListener("DOMContentLoaded", () => {
	const loginForm = document.getElementById("loginForm");
	const twoFactorForm = document.getElementById("twoFactorForm");
	const googleBtn = document.getElementById("googleLoginBtn");
	const error2FA = document.getElementById("error2FA");

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

		try {
			const res = await fetch(`${baseURL}/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, deviceId }),
			});

			if (!res.ok) {
				const err = await res.text();
				throw new Error(err);
			}

			const data = await res.json();

			if (data.requiresTwoFactor) {
				// Show 2FA form and store temporary token
				tempToken = data.tempToken;
				loginForm.style.display = "none";
				twoFactorForm.style.display = "block";
				googleBtn.style.display = "none";
			} else {
				// Regular login success
				window.location.href = "dashboard.html";
			}
		} catch (err) {
			alert(`Login failed ❌\n${err.message}`);
		}
	});

	twoFactorForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const totpCode = document.getElementById("totpCode").value;

		try {
			const res = await fetch(`${baseURL}/auth/2fa/validate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: totpCode,
					tempToken,
					deviceId,
				}),
			});

			if (!res.ok) {
				const err = await res.text();
				error2FA.textContent = "Invalid code. Please try again.";
				error2FA.style.display = "block";
				throw new Error(err);
			}

			// 2FA validation successful
			window.location.href = "dashboard.html";
		} catch (err) {
			console.error("2FA validation failed:", err);
		}
	});

	googleBtn.addEventListener("click", (e) => {
		e.preventDefault();

		// Disable the button immediately to prevent double-clicks
		googleBtn.disabled = true;

		// Get or generate deviceId
		deviceId = localStorage.getItem("deviceId");
		if (!deviceId) {
			deviceId = generateDeviceId();
			localStorage.setItem("deviceId", deviceId);
		}

		// Create JSON and base64 encode it with both deviceId and redirectUrl
		const state = encodeURIComponent(
			btoa(
				JSON.stringify({
					deviceId,
					redirectUrl: "dashboard.html",
				})
			)
		);

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
