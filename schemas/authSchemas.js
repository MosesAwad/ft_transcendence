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
				username: {
					type: "string",
					minLength: 3,
					maxLength: 50,
					pattern: "^[\\S]+$", // No whitespace allowed
				},
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
			required: ["user-agent"],
		},
		response: {
			200: {
				type: "object",
				oneOf: [
					{
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
					{
						type: "object",
						properties: {
							requiresTwoFactor: { type: "boolean" },
							tempToken: { type: "string" },
						},
						required: ["requiresTwoFactor", "tempToken"],
					},
				],
			},
		},
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
};

const setupTwoFactorOpts = {
	schema: {
		response: {
			200: {
				type: "object",
				properties: {
					qrCode: { type: "string" },
				},
				required: ["qrCode"],
			},
		},
	},
};

const verifyTwoFactorOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				token: { type: "string", minLength: 6, maxLength: 6 },
			},
			required: ["token"],
		},
	},
};

const validateTwoFactorOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				token: { type: "string", minLength: 6, maxLength: 6 },
				tempToken: { type: "string" },
				deviceId: {
					type: "string",
					pattern:
						"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
				},
			},
			required: ["token", "tempToken", "deviceId"],
		},
	},
};

module.exports = {
	registerOpts,
	loginOpts,
	logoutOpts,
	refreshOpts,
	setupTwoFactorOpts,
	verifyTwoFactorOpts,
	validateTwoFactorOpts,
};
