const bcrypt = require("bcryptjs");
const CustomError = require("../errors");

class User {
	constructor(db) {
		this.db = db;
	}

	async createUser({ username, email, password }) {
		const user = await this.db("users")
			.where({ email, google_id: null })
			.first();
		if (user) {
			throw new CustomError.BadRequestError("Email already in use!");
		}
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const [{ id }] = await this.db("users")
			.insert({
				username,
				email,
				password: hashedPassword,
			})
			.returning("id"); // SQLite returns id automatically
		return { id, username, email };
	}

	async createGoogleUser({ googleId, email, username }) {
		const [{ id }] = await this.db("users")
			.insert({
				username,
				email,
				google_id: googleId,
			})
			.returning("id"); // SQLite returns id automatically
		return { id, username, email };
	}

	async findByEmail(email, googleId = null) {
		const user = await this.db("users")
			.where({ email, google_id: googleId })
			.first();
		return user;
	}

	async comparePassword(candidatePassword, userPassword) {
		const isMatch = await bcrypt.compare(candidatePassword, userPassword);
		return isMatch;
	}

	async listUsers(search, page, limit, userId) {
		const baseQuery = this.db("users")
			.where("username", "like", `%${search}%`) // `%` is for partial matching
			.limit(limit)
			.offset((page - 1) * limit);

		let users = [];
		if (search) {
			// Exclude the userId if search is provided
			users = await baseQuery.whereNot("id", userId);
		}

		return users;
	}

	async listSingleUser(userId) {
		const user = await this.db("users")
			.select("id", "username", "email")
			.where({ id: userId })
			.first();
		if (!user) {
			throw new CustomError.NotFoundError(
				`User with id of ${userId} not found!`
			);
		}

		return user;
	}

	async listAllBlocks(userId) {
		const blocks = await this.db("blocks")
			.join("users", "blocks.blocked_id", "users.id")
			.select(
				"blocks.id",
				"blocks.blocked_id as userId",
				"users.username"
			)
			.where({ blocker_id: userId });

		return blocks;
	}

	async blockUser(userId, blockRecipientId) {
		if (userId === blockRecipientId) {
			throw new CustomError.BadRequestError(
				"Users are unable to block themselves!"
			);
		}
		const blockedRecipient = await this.db("users")
			.where({ id: blockRecipientId })
			.first();
		if (!blockedRecipient) {
			throw new CustomError.NotFoundError(
				"Invalid block recipient id, unable to proceed with block request"
			);
		}

		const block = await this.db("blocks")
			.insert({
				blocker_id: userId,
				blocked_id: blockRecipientId,
			})
			.returning("*");

		return block;
	}

	async unblockUser(userId, blockId) {
		const block = await this.db("blocks").where({ id: blockId }).first();
		if (!block) {
			throw new CustomError.NotFoundError(
				`Block with id of ${blockId} not found!`
			);
		}
		if (block.blocker_id !== userId) {
			throw new CustomError.UnauthorizedError(
				"You are not authorized to perform this unblock procedure!"
			);
		}

		const unblockedUser = block.blocked_id;
		await this.db("blocks").where({ id: blockId }).del();

		return unblockedUser;
	}
}

module.exports = User;
