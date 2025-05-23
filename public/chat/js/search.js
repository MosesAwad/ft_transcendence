// DOM Elements
const userSearchInput = document.getElementById("userSearchInput");
const userSearchResults = document.getElementById("userSearchResults");

// Search functionality
userSearchInput.addEventListener("input", async () => {
	const query = userSearchInput.value.trim();
	if (!query) {
		userSearchResults.style.display = "none";
		return;
	}

	const res = await fetchWithAutoRefresh(
		`${baseURL}/users?search=${query}&page=1&limit=5`,
		{ credentials: "include" }
	);

	if (res.ok) {
		const users = await res.json();
		renderSearchResults(users);
	} else {
		userSearchResults.style.display = "none";
	}
});

function renderSearchResults(users) {
	userSearchResults.innerHTML = "";

	users.forEach((user) => {
		const div = document.createElement("div");
		div.classList.add("searchResult");
		div.textContent = user.username;
		div.addEventListener("click", () => {
			handleUserClick(user.id);
			userSearchResults.style.display = "none";
			userSearchInput.value = "";
		});
		userSearchResults.appendChild(div);
	});

	userSearchResults.style.display = "block";
}

async function handleUserClick(userId) {
	try {
		let chatId;

		// Check if chat exists
		const res = await fetchWithAutoRefresh(
			`${baseURL}/chats/between/${userId}`,
			{ credentials: "include" }
		);

		if (res.ok) {
			const data = await res.json();
			chatId = data.chat_id;
		} else if (res.status === 404) {
			// Create new chat
			const createRes = await fetchWithAutoRefresh(`${baseURL}/chats`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ user2Id: userId }),
			});

			if (!createRes.ok) throw new Error("Failed to create chat");
			const newChat = await createRes.json();
			chatId = newChat.chat_id;

			await window.chatUI.loadChats();
		}

		window.chatMessages.joinRoom(chatId);
	} catch (err) {
		console.error("Error starting chat:", err);
	}
}

// Export search functionality
window.chatSearch = {
	renderSearchResults,
};
