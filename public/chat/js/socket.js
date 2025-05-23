// Socket initialization and management
const socket = io("http://localhost:3000", {
	withCredentials: true,
});

// Export socket instance for other modules
window.chatSocket = socket;
