const bcrypt = require("bcryptjs");
const CustomError = require("../errors");

class User {
	constructor(db) {
		this.db = db;
	}

	async createUser({ username, email, password }) {
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const [{ id }] = await this.db("users")
			.insert({
				username,
				email,
				password: hashedPassword,
			})
			.returning("id"); // SQLite returns id automatically
		return { id, username, email, hashedPassword };
	}

	async findByEmail(email) {
		const user = await this.db("users").where("email", email).first();
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
}

module.exports = User;
