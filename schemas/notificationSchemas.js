const listNotificationOpts = {
	schema: {
		query: {
			type: "object",
			properties: {
				page: {
					type: "number",
					minimum: 1,
				},
				limit: {
					type: "number",
					minimum: 1,
				},
			},
			required: ["page", "limit"],
		},
	},
};

const updateNotificationByIdOpts = {
	body: {
		type: "object",
		properties: {
			isRead: { type: "boolean" },
			isOpened: { type: "boolean" },
		},
		oneOf: [{ required: ["isRead"] }, { required: ["isOpened"] }],
		additionalProperties: false,
	},
};

module.exports = {
	listNotificationOpts,
	updateNotificationByIdOpts,
};
