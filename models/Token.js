class Token {
	constructor(db) {
		this.db = db;
	}

	async findByUserIdAndDeviceId(userId, deviceId) {
		const refreshToken = await this.db("tokens")
			.where({ user_id: userId, device_id: deviceId, is_valid: 1 })
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

	async invalidateRefreshToken(refreshTokenId) {
		await this.db("tokens")
			.where("refresh_token_id", refreshTokenId)
			.update({ is_valid: 0 });
	}

	async deleteRefreshToken(userId, deviceId) {
		const deletedCount = await this.db("tokens")
			.where({ user_id: userId, device_id: deviceId })
			.del();
		return deletedCount;
	}

	// Note 1
	async deleteExpiredTokens(overstayDate) {
		return await this.db("tokens")
			.where("updated_at", "<", overstayDate)
			.del();
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

/*
	NOTES 

	Note 1

		If a user closes his session in incognito mode and doesn't hit the logout button, then there is no way to retrieve his refreshToken 
		cookie again and it is now bloating the tokens table in the database. So this method is called by a cron job to run at a schedule 
		where any tokens that have not been updated in a while (the 'while' must be longer than the expiry date obviously, otherwise you would 
		have to also add a column in the tokens table which includes the expiry date) get deleted automatically after the overstayDate.
*/
