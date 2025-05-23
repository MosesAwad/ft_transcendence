// Toast notification queue system
const toastQueue = [];
let isShowingToast = false;

function createToastElement(username, message) {
	const toast = document.createElement("div");
	toast.className = "toast-notification";

	const header = document.createElement("div");
	header.className = "header";
	header.textContent = username;

	const messageDiv = document.createElement("div");
	messageDiv.className = "message";
	messageDiv.textContent = message;

	toast.appendChild(header);
	toast.appendChild(messageDiv);
	document.body.appendChild(toast);

	return toast;
}

async function showNextToast() {
	if (isShowingToast || toastQueue.length === 0) return;

	isShowingToast = true;
	const { username, message } = toastQueue.shift();

	const toast = createToastElement(username, message);

	// Trigger reflow to ensure transition works
	void toast.offsetWidth;
	toast.classList.add("show");

	await new Promise((resolve) => setTimeout(resolve, 2000));

	toast.classList.remove("show");
	await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for fade out

	toast.remove();
	isShowingToast = false;
	showNextToast(); // Show next toast if any
}

// Export toast functionality
window.chatToast = {
	addToQueue: (username, message) => {
		toastQueue.push({ username, message });
		showNextToast();
	},
};
