const baseURL = "http://localhost:3000/api/v1";
const output = document.getElementById("output");

let deviceId = null;

function generateDeviceId() {
	return crypto.randomUUID();
}

async function fetchWithAutoRefresh(url, options = {}) {
	let res = await fetch(url, {
		...options,
		credentials: "include",
	});

	if (res.status === 401) {
		const refreshRes = await fetch(`${baseURL}/auth/refresh`, {
			method: "POST",
			credentials: "include",
		});

		if (refreshRes.ok) {
			// Try again
			res = await fetch(url, {
				...options,
				credentials: "include",
			});
		}
	}

	return res;
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
	e.preventDefault();

	const email = document.getElementById("email").value;
	const password = document.getElementById("password").value;
	deviceId = generateDeviceId();

	const res = await fetch(`${baseURL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ email, password, deviceId }),
	});

	if (res.ok) {
		output.textContent = "Login successful ✅";
	} else {
		const err = await res.text();
		output.textContent = `Login failed ❌\n${err}`;
	}
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
	if (!deviceId) {
		output.textContent = "No deviceId set. Please log in first.";
		return;
	}

	const res = await fetch(`${baseURL}/auth/logout`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ deviceId }),
	});

	if (res.ok) {
		output.textContent = "Logged out ✅";
		deviceId = null; // clear it after logout
	} else {
		output.textContent = "Logout failed ❌";
	}
});

document.getElementById("showUserBtn").addEventListener("click", async () => {
	const res = await fetchWithAutoRefresh(`${baseURL}/users/showUser`);

	if (res.ok) {
		const json = await res.json();
		output.textContent = `User Info:\n${JSON.stringify(json, null, 2)}`;
	} else {
		const err = await res.text();
		output.textContent = `Failed to fetch user ❌\n${err}`;
	}
});
