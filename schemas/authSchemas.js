const responseSchema = {
	200: {
	  type: 'object',
	  properties: {
		user: {
		  type: 'object',
		  properties: {
			id: {type: 'integer'},
			username: { type: 'string' }
		  },
		  required: ['id', 'username']
		}
	  },
	  required: ['user']
	}
}

const registerOpts =  {
	schema: {
		body: {
			type: 'object',
			properties: {
				username: { type: 'string', minLength: 3, maxLength: 50 },
				email: { type: 'string', format: 'email' },
				password: { type: 'string', minLength: 6 }
			},
			required: ['username', 'email', 'password']
		},
		response: responseSchema
	}
}
  
const loginOpts = {
	schema: {
		body: {
			type: 'object',
			properties: {
			'email': { type: 'string', },
			'password': { type: 'string' }
			},
			required: ["email", "password"]
		},
		response: responseSchema
	}
}

module.exports = {
	registerOpts,
	loginOpts
};
