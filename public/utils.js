const baseURL = "http://localhost:3000/api/v1";

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
			res = await fetch(url, {
				...options,
				credentials: "include",
			});
		}
	}
	return res;
}
