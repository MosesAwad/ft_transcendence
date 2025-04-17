class Friend {
    constructor(db) {
        this.db = db;
    }

    async sendRequest(senderId, receiverId) {
        return this.db('friend_requests').insert({ sender_id: senderId, receiver_id: receiverId });
    }

    async acceptRequest(userId, friendId) {
        await this.db.transaction(async (trx) => {
            await trx('friendships').insert([
                { user_id: userId, friend_id: friendId, status: 'accepted' },
                { user_id: friendId, friend_id: userId, status: 'accepted' } // Bidirectional
            ]);
            await trx('friend_requests')
                .where({ sender_id: friendId, receiver_id: userId })
                .del();
        });
    }

    async listFriends(userId) {
        return this.db('friendships')
            .where('user_id', userId)
            .andWhere('status', 'accepted')
            .join('users', 'friendships.friend_id', 'users.id')
            .select('users.id', 'users.username');
    }
}

module.exports = Friend;