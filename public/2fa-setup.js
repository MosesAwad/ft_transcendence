document.addEventListener("DOMContentLoaded", async () => {
	const qrCode = document.getElementById("qrCode");
	const verifyForm = document.getElementById("verifyForm");
	const error = document.getElementById("error");
	const success = document.getElementById("success");
	const doneBtn = document.getElementById("doneBtn");

	// First, check authentication
	try {
		const authCheck = await fetchWithAutoRefresh(
			`${baseURL}/users/showUser`
		);
		if (!authCheck.ok) {
			window.location.href = "login.html";
			return;
		}
	} catch (err) {
		window.location.href = "login.html";
		return;
	}

	// Initialize 2FA setup and get QR code
	try {
		const setupResponse = await fetchWithAutoRefresh(
			`${baseURL}/auth/2fa/setup`,
			{
				method: "POST",
				credentials: "include",
			}
		);

		if (!setupResponse.ok) {
			throw new Error("Failed to initialize 2FA setup");
		}

		const { qrCode: qrCodeData } = await setupResponse.json();
		qrCode.src = qrCodeData;
	} catch (err) {
		error.textContent = "Failed to initialize 2FA setup. Please try again.";
		error.style.display = "block";
		return;
	}

	// Handle verification
	verifyForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const code = document.getElementById("verificationCode").value;

		try {
			const verifyResponse = await fetchWithAutoRefresh(
				`${baseURL}/auth/2fa/verify`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({ token: code }),
				}
			);

			if (!verifyResponse.ok) {
				throw new Error("Invalid verification code");
			}

			// Show success message and done button
			success.textContent = "2FA has been successfully enabled!";
			success.style.display = "block";
			error.style.display = "none";
			verifyForm.style.display = "none";
			doneBtn.style.display = "block";
		} catch (err) {
			error.textContent = "Invalid verification code. Please try again.";
			error.style.display = "block";
			success.style.display = "none";
		}
	});
});
