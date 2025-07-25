const bcrypt = require("bcryptjs");
const CustomError = require("../errors");
const fs = require("fs");
const path = require("path");
const util = require("util");
const { pipeline } = require("stream");

class User {
	constructor(db) {
		this.db = db;
	}

	async createUser({ username, email, password }) {
		const userEmailExists = await this.db("users")
			.where({ email, google_id: null })
			.first();
		if (userEmailExists) {
			throw new CustomError.BadRequestError("Email already in use!");
		}

		const userUsernameExists = await this.db("users")
			.where({ username })
			.first();
		if (userUsernameExists) {
			throw new CustomError.BadRequestError("Username already in use!");
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
		// Replace spaces with underscores
		let sanitizedUsername = username.replace(/\s+/g, "_");

		// Check if username exists and append number if needed
		let userExists = true;
		let counter = 1;
		let finalUsername = sanitizedUsername;

		while (userExists) {
			const existingUser = await this.db("users")
				.where({ username: finalUsername })
				.first();

			if (!existingUser) {
				userExists = false;
			} else {
				finalUsername = `${sanitizedUsername}${counter}`;
				counter++;
			}
		}

		const [{ id }] = await this.db("users")
			.insert({
				username: finalUsername,
				email,
				google_id: googleId,
			})
			.returning("id"); // SQLite returns id automatically
		return { id, username: finalUsername, email };
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
			.select("*")
			.where({ id: userId })
			.first();
		if (!user) {
			throw new CustomError.NotFoundError(
				`User with id of ${userId} not found!`
			);
		}

		return user;
	}

	async updateProfilePicture(userId, fileData) {
		if (!fileData) {
			throw new CustomError.BadRequestError("No file uploaded");
		}

		if (!fileData.mimetype.startsWith("image/")) {
			throw new CustomError.BadRequestError("File must be an image");
		}

		// Get current user to check for existing profile picture
		const user = await this.db("users").where("id", userId).first();

		// If user has an existing profile picture, delete it
		if (user.profile_picture) {
			const oldFilepath = path.join(
				__dirname,
				"..",
				"public",
				user.profile_picture
			);
			try {
				await fs.promises.unlink(oldFilepath);
			} catch (error) {
				if (error.code !== "ENOENT") {
					// Ignore error if file doesn't exist
					throw error;
				}
			}
		}

		// Create uploads directory if it doesn't exist
		const uploadsDir = path.join(__dirname, "..", "public", "uploads");
		if (!fs.existsSync(uploadsDir)) {
			fs.mkdirSync(uploadsDir, { recursive: true });
		}

		// Generate unique filename
		const fileExt = path.extname(fileData.filename);
		const uniqueFilename = `${userId}_${Date.now()}${fileExt}`;
		const filepath = path.join(uploadsDir, uniqueFilename);

		// Save the file
		await util.promisify(pipeline)(
			fileData.file,
			fs.createWriteStream(filepath)
		);

		// Update database with new profile picture URL
		const fileUrl = `/uploads/${uniqueFilename}`;
		await this.db("users")
			.where("id", userId)
			.update({ profile_picture: fileUrl });

		return { fileUrl };
	}

	async deleteProfilePicture(userId) {
		const user = await this.db("users").where("id", userId).first();

		if (!user.profile_picture) {
			throw new CustomError.BadRequestError(
				"No profile picture to delete"
			);
		}

		// Remove the file
		const filepath = path.join(
			__dirname,
			"..",
			"public",
			user.profile_picture
		);
		try {
			await fs.promises.unlink(filepath);
		} catch (error) {
			if (error.code !== "ENOENT") {
				// Ignore error if file doesn't exist
				throw error;
			}
		}

		// Update database to remove profile picture reference
		await this.db("users")
			.where("id", userId)
			.update({ profile_picture: null });
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

		const [block] = await this.db("blocks")
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

	async storeSecret(userId, secret) {
		await this.db("users").where({ id: userId }).update({
			two_factor_secret: secret,
			two_factor_enabled: false,
			two_factor_verified: false,
		});
	}

	async enableTwoFactor(userId) {
		await this.db("users").where({ id: userId }).update({
			two_factor_enabled: true,
			two_factor_verified: true,
		});
	}

	async disableTwoFactor(userId) {
		await this.db("users").where({ id: userId }).update({
			two_factor_enabled: false,
			two_factor_verified: false,
			two_factor_secret: null,
		});
	}

	async findByUsername(username) {
		const user = await this.db("users").where({ username }).first();
		return user;
	}

	async updateProfile(
		userId,
		{ username, email, newPassword, currentPassword }
	) {
		// Get current user data to check current values
		const currentUser = await this.findById(userId);
		if (!currentUser) {
			throw new CustomError.NotFoundError(
				`User with id ${userId} not found`
			);
		}

		// Track what fields are being updated for the response message
		const updatedFields = [];
		const updateData = {};

		// If changing password, verify current password
		if (newPassword) {
			if (!currentPassword) {
				throw new CustomError.BadRequestError(
					"Current password is required to set a new password"
				);
			}

			const isPasswordValid = await this.comparePassword(
				currentPassword,
				currentUser.password
			);
			if (!isPasswordValid) {
				throw new CustomError.UnauthorizedError(
					"Current password is incorrect"
				);
			}

			const salt = await bcrypt.genSalt(10);
			updateData.password = await bcrypt.hash(newPassword, salt);
			updatedFields.push("password");
		}

		// Check if username is being updated and validate
		if (username && username !== currentUser.username) {
			const existingUser = await this.findByUsername(username);
			if (existingUser && existingUser.id !== userId) {
				throw new CustomError.BadRequestError(
					"Username is already taken"
				);
			}
			updateData.username = username;
			updatedFields.push("username");
		}

		// Handle email updates
		if (email && email !== currentUser.email) {
			// Prevent Google OAuth users from changing their email
			if (currentUser.google_id) {
				throw new CustomError.BadRequestError(
					"Users who signed in with Google cannot change their email address"
				);
			}

			// Check if email is taken by a non-Google user
			const existingUser = await this.db("users")
				.where({ email, google_id: null })
				.first();

			if (existingUser && existingUser.id !== userId) {
				throw new CustomError.BadRequestError("Email is already taken");
			}

			updateData.email = email;
			updatedFields.push("email");
		}

		// If no fields to update, return error
		if (Object.keys(updateData).length === 0) {
			throw new CustomError.BadRequestError("No fields to update");
		}

		const [updatedUser] = await this.db("users")
			.where({ id: userId })
			.update(updateData)
			.returning(["id", "username", "email"]);

		return { updatedUser, updatedFields };
	}

	async findById(userId) {
		const user = await this.db("users").where({ id: userId }).first();
		return user;
	}
}

module.exports = User;

/*
	Note 1
	
		The pipeline function is a utility from Node.js streams that helps safely pipe data
		from a readable stream to a writable stream. In our file upload context:

		fileData.file (Readable Stream) -> fs.createWriteStream(filepath) (Writable Stream)

		Why use pipeline instead of pipe()?
			1. Better error handling: Pipeline automatically destroys streams on errors
			2. Memory efficient: Prevents memory leaks by proper cleanup
			3. Promise-based: When used with util.promisify, it returns a Promise that resolves
				when the transfer is complete or rejects if there's an error

		Example flow:
			1. User uploads image -> creates a readable stream (fileData.file)
			2. Pipeline transfers data in chunks to the writable stream (fs.createWriteStream)
			3. File gets saved to disk piece by piece, not all at once

		This is especially important for larger files as it prevents loading the entire file into 
		memory at once. 

		The pipeline approach is also more efficient than using temporary files, as we did when we 
		were using clouidnary in our Express project. Essentially, it's a safer way to handle file 
		uploads by streaming the data rather than loading everything into memory at once. Streaming 
		here just refers to processesing the file piece by piece, rather than all at once. Without 
		streaming, you would tupically need to write the whole file. Without streaming, you would 
		have to wait for the entire file to be fully uploaded and stored in the server's memory (RAM). 
		Then, you would write the complete file to disk all at once. 

		Key advantages of using pipeline:
			1. Memory Efficient: Data flows in small chunks rather than loading the entire file into memory
			2. No Disk Operations: Avoids the extra steps of writing/deleting temporary files
			3. Faster: Single operation instead of multiple file system operations
			4. Safer: Automatic cleanup of resources if something fails during transfer

		If you were to integrate Cloudinary with this approach, you could even pipe the stream directly to Cloudinary's upload API without saving to disk at all:

		await pipeline(
			fileData.file,
			cloudinary.uploader.upload_stream()
		);

		This would be even more efficient than both approaches!
*/
