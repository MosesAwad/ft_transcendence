// Common utility functions
function renderNotificationList(listEl, data) {
	listEl.innerHTML = "";
	if (data.length === 0) {
		const li = document.createElement("li");
		li.textContent = "No notifications.";
		listEl.appendChild(li);
		return;
	}

	data.forEach((item) => {
		const li = document.createElement("li");
		li.textContent = item.message;
		li.style.backgroundColor = item.is_read ? "white" : "lightblue";
		li.style.display = "block";
		li.style.width = "100%";
		li.style.padding = "0.75rem 1rem";
		li.style.marginBottom = "0.5rem";
		li.style.border = "1px solid #ccc";
		li.style.borderRadius = "0.5rem";
		li.style.cursor = "pointer";
		li.style.transition = "background-color 0.3s ease";

		li.addEventListener("click", async () => {
			if (item.type === "message" && item.chat_id) {
				await fetchWithAutoRefresh(
					`${baseURL}/notifications/messages/by-chat/${item.chat_id}`,
					{
						method: "PATCH",
						credentials: "include",
					}
				);

				const page = 1;
				const limit = 5;
				const mailboxNotificationListRes = await fetchWithAutoRefresh(
					`${baseURL}/notifications/messages?page=${page}&limit=${limit}`,
					{ credentials: "include" }
				);

				if (mailboxNotificationListRes.ok) {
					const mailboxNotificationListData =
						await mailboxNotificationListRes.json();
					renderNotificationList(
						messageNotificationBox,
						mailboxNotificationListData
					);

					const unreadCount = mailboxNotificationListData.filter(
						(n) => n.is_read === 0
					).length;
					window.chatNotifications.updateMailboxCount(unreadCount);
				}

				window.location.href = `chat.html?chatId=${item.chat_id}`;
				return;
			}

			if (item.is_read) return;

			try {
				await fetchWithAutoRefresh(
					`${baseURL}/notifications/others/${item.id}`,
					{
						method: "PATCH",
						credentials: "include",
					}
				);

				li.style.backgroundColor = "white";
				item.is_read = true;
			} catch (error) {
				console.error("Error marking notification as read:", error);
			}
		});

		li.addEventListener("mouseover", () => {
			li.style.backgroundColor = item.is_read ? "#f5f5f5" : "#add8e6";
		});

		li.addEventListener("mouseout", () => {
			li.style.backgroundColor = item.is_read ? "white" : "lightblue";
		});

		listEl.appendChild(li);
	});
}

// Make renderNotificationList available globally for other modules
window.renderNotificationList = renderNotificationList;

// Global variables
window.baseURL = "http://localhost:3000/api/v1";
