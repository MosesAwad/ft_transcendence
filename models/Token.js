class Token {
	constructor(db) {
		this.db = db;
	}

	async findByUserIdAndDeviceId(userId, deviceId) {
		const refreshToken = await this.db("tokens")
			.where({ user_id: userId, device_id: deviceId })
			.first();
		return refreshToken;
	}

	async findByUserIdAndRefreshTokenId(userId, refreshTokenId) {
		const refreshToken = await this.db("tokens")
			.where({ user_id: userId, refresh_token_id: refreshTokenId })
			.first();
		return refreshToken;
	}

	async createRefreshToken({
		ip,
		userAgent,
		userId,
		refreshTokenId,
		deviceId,
	}) {
		const [{ id }] = await this.db("tokens")
			.insert({
				ip,
				user_agent: userAgent,
				user_id: userId,
				refresh_token_id: refreshTokenId,
				device_id: deviceId,
			})
			.returning("id"); // SQLite returns id automatically
		return { id, ip, userAgent, userId, refreshTokenId };
	}

	async updateTimestamp(userId, deviceId) {
		const updatedToken = await this.db("tokens")
			.where({ user_id: userId, device_id: deviceId })
			.update({ updated_at: this.db.raw("CURRENT_TIMESTAMP") })
			.returning("*");
		return updatedToken;
	}

	async deleteRefreshToken(userId, deviceId) {
		const deletedCount = await this.db("tokens")
			.where({ user_id: userId, device_id: deviceId })
			.del();
		return deletedCount;
	}
}

module.exports = Token;

/*
    To do:
        * Find by id (user) ✅
        * Find by id (user) AND id (refreshToken)   ✅
        * Create Token (const userToken = { refreshToken, ip, userAgent, user: user._id }; + await Token.create(userToken);) ✅
        * Delete by id (user)  -> when logging out and when updating user ✅
*/
