const baseURL = "http://localhost:3000/api/v1";

function generateDeviceId() {
	return crypto.randomUUID();
}

async function fetchWithAutoRefresh(url, options = {}) {
	const deviceId = localStorage.getItem("deviceId");
	if (!deviceId) {
		throw new Error("Missing deviceId in localStorage. Ensure it's set during login.");
	}

	const addDeviceIdToBody = (opts) => {
		const headers = { ...opts.headers, "Content-Type": "application/json" };
		const originalBody = opts.body ? JSON.parse(opts.body) : {};
		const body = JSON.stringify({ ...originalBody, deviceId });
		return { ...opts, headers, body };
	};

	let finalOptions = { ...options, credentials: "include" };
	if (finalOptions.method && finalOptions.method.toUpperCase() !== "GET") {
		finalOptions = addDeviceIdToBody(finalOptions);
	}

	let res = await fetch(url, finalOptions);

	if (res.status === 401) {
		const refreshRes = await fetch(`${baseURL}/auth/refresh`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ deviceId }),
		});

		if (refreshRes.ok) {
			let retryOptions = { ...options, credentials: "include" };
			if (retryOptions.method && retryOptions.method.toUpperCase() !== "GET") {
				retryOptions = addDeviceIdToBody(retryOptions);
			}
			res = await fetch(url, retryOptions);
		}
	}

	return res;
}
