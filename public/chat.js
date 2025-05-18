const socket = io("http://localhost:3000", {
	withCredentials: true,
});

const chatId = 1; // Replace with actual chat ID
const messageBox = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

function appendMessage(msg) {
	const div = document.createElement("div");
	div.textContent = `${msg.sender_id}: ${msg.content}`;
	messageBox.appendChild(div);
    console.log(div.textContent);
	messageBox.scrollTop = messageBox.scrollHeight;
}

socket.on("connect", async () => {
	console.log("Connected to socket");

	socket.emit("joinRoom", chatId);

	const res = await fetchWithAutoRefresh(`http://localhost:3000/api/v1/chats/${chatId}/messages`);
	const messages = await res.json();
	messages.forEach(appendMessage);
});

socket.on("newMessage", (message) => {
	appendMessage(message);
});

sendBtn.addEventListener("click", async () => {
	const content = input.value.trim();
	if (!content) return;

	const res = await fetchWithAutoRefresh(`http://localhost:3000/api/v1/messages`, {
		method: "POST",
		body: JSON.stringify({ chatId, content }),
	});
	if (res.ok) input.value = "";
});
