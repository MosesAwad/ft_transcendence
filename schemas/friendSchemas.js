const sendRequestOpts = {
    schema: {
        body: {
            type: 'object',
            required: ['friendId'],
            properties: {
                friendId: { type: 'number' }
            }
        }
    }
};

const acceptRequestOpts = {
    schema: {
        body: {
            type: 'object',
            properties: {
                friendId: { type: 'number' }
            },
            required: ['friendId']
        }
    }
};

module.exports = { sendRequestOpts, acceptRequestOpts };