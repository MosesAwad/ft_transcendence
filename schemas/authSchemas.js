const responseSchema = {
	200: {
		type: "object",
		properties: {
			user: {
				type: "object",
				properties: {
					id: { type: "integer" },
					username: { type: "string" },
				},
				required: ["id", "username"],
			},
		},
		required: ["user"],
	},
};

const registerOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				username: { type: "string", minLength: 3, maxLength: 50 },
				email: { type: "string", format: "email" },
				password: { type: "string", minLength: 6 },
			},
			required: ["username", "email", "password"],
		},
		response: responseSchema,
	},
};

const loginOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				email: { type: "string" },
				password: { type: "string" },
				deviceId: {
					type: "string",
					pattern:
						"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
				},
			},
			required: ["email", "password", "deviceId"],
		},
		headers: {
			type: "object",
			properties: {
			  "user-agent": { type: "string" },
			},
			required: ["user-agent"]
		  },
		response: responseSchema,
	},
};

const logoutOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				deviceId: {
					type: "string",
					pattern:
						"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
				},
			},
			required: ["deviceId"],
		},
	},
};

const refreshOpts = {

}

module.exports = {
	registerOpts,
	loginOpts,
	logoutOpts,
};
