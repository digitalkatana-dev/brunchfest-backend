const { Router } = require('express');
const { model } = require('mongoose');
const { sign } = require('jsonwebtoken');
const { genSalt, hash } = require('bcrypt');
const { createHash } = require('crypto');
const { config } = require('dotenv');
const {
	validateRegistration,
	validateLogin,
	validateForgot,
	validateReset,
} = require('../util/validators');
const requireAuth = require('../middleware/requireAuth');
// const sgMail = require('@sendgrid/mail');

const User = model('User');
const router = Router();
config();

// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Register
router.post('/users/register', async (req, res) => {
	let userData;

	const { valid, errors } = validateRegistration(req?.body);

	if (!valid) return res.status(400).json(errors);

	try {
		const user = new User(req?.body);
		await user?.save();
		const token = sign({ userId: user?._id }, process.env.DB_SECRET_KEY, {
			expiresIn: '10d',
		});

		userData = {
			_id: user?._id,
			firstName: user?.firstName,
			lastName: user?.lastName,
			email: user?.email,
			phone: user?.phone,
			isAdmin: user?.isAdmin,
			myEvents: user?.myEvents,
			emailConsent: user?.emailConsent,
			textConsent: user?.textConsent,
		};

		res.json({ userData, token });
	} catch (err) {
		if (err.code === 11000) {
			if (err.keyValue.email) errors.auth = 'Email already in use!';
			if (err.keyValue.phone) errors.auth = 'Phone number already in use!';
		} else {
			errors.auth = 'Error registering user!';
		}
		return res.status(422).json(errors);
	}
});

// Login
router.post('/users/login', async (req, res) => {
	const { email, password } = req?.body;
	let userData;

	const { valid, errors } = validateLogin(req?.body);

	if (!valid) return res.status(400).json(errors);

	const user = await User.findOne({ email });
	if (!user) {
		errors.user = 'Error, user not found!';
		return res.status(404).json(errors);
	}

	try {
		await user?.comparePassword(password);
		const token = sign({ userId: user?._id }, process.env.DB_SECRET_KEY, {
			expiresIn: '10d',
		});

		userData = {
			_id: user?._id,
			firstName: user?.firstName,
			lastName: user?.lastName,
			email: user?.email,
			phone: user?.phone,
			isAdmin: user?.isAdmin,
			myEvents: user?.myEvents,
			emailConsent: user?.emailConsent,
			textConsent: user?.textConsent,
		};

		res.json({ userData, token });
	} catch (err) {
		errors.auth = 'Invalid email or password!';
		return res.status(400).json(errors);
	}
});

// // Generate Password Reset Token
// router.post('/users/password-token', async (req, res) => {
// 	const { email } = req?.body;

// 	const { valid, errors } = validateForgot(req?.body);

// 	if (!valid) return res.status(400).json(errors);

// 	const user = await User.findOne({ email });

// 	if (!user) {
// 		errors.user = 'Error, user not found!';
// 		return res.status(404).json(errors);
// 	}

// 	try {
// 		const resetToken = user?.createPasswordResetToken();
// 		await user?.save();

// 		const resetUrl = `<h3>We've received a request to reset your password!</h3> \n Hi ${email}, we received a password reset request from your account. To complete the reset, please <a href='http://localhost:3000/reset-password/${resetToken}'>click here.</a> The link is valid for 10 minutes. \n If this was not intended or you have questions about your account, please contact an admin right away.`;
// 		const msg = {
// 			to: email,
// 			from: process.env.SG_BASE_EMAIL,
// 			subject: 'Reset Your Password',
// 			html: resetUrl,
// 		};

// 		await sgMail.send(msg);
// 		res.json({
// 			message: `A password reset link has been sent to ${user?.email}. The link is valid for 10 minutes.`,
// 		});
// 	} catch (err) {
// 		errors.auth = 'Error generating token';
// 		return res.status(400).json(errors);
// 	}
// });

// // Password Reset
// router.post('/users/reset-password', async (req, res) => {
// 	const { password, token } = req?.body;

// 	const { valid, errors } = validateReset(req?.body);

// 	if (!valid) return res.status(400).json(errors);

// 	const hashedToken = createHash('sha256').update(token).digest('hex');
// 	const user = await User.findOne({
// 		passwordResetToken: hashedToken,
// 		passwordResetTokenExpires: { $gt: new Date() },
// 	});

// 	if (!user) {
// 		errors.token = 'Token expired, try again later.';
// 		return res.status(400).json(errors);
// 	}

// 	try {
// 		user.password = password;
// 		user.passwordResetToken = undefined;
// 		user.passwordResetTokenExpires = undefined;
// 		await user?.save();

// 		const successMessage = `<h3>Password Change Notification</h3> <p>This e-mail confirms that the password has been changed for your account.</p> <p>If you did not intend to change your password, please contact an admin right away.</p> `;
// 		const msg = {
// 			to: user?.email,
// 			from: process.env.SG_BASE_EMAIL,
// 			subject: 'Your Password Has Been Updated',
// 			html: successMessage,
// 		};

// 		await sgMail.send(msg);
// 		res.json({ message: 'Password Upated Successfully!' });
// 	} catch (err) {
// 		errors.token = 'Error verifing token.';
// 		return res.status(400).json(errors);
// 	}
// });

// Get All
router.get('/users', requireAuth, async (req, res) => {
	let errors = {};
	let userData = [];

	try {
		const users = await User.find({});
		users.forEach((user) => {
			userData.push({
				_id: user?._id,
				firstName: user?.firstName,
				lastName: user?.lastName,
				email: user?.email,
				phone: user?.phone,
				isAdmin: user?.isAdmin,
				myEvents: user?.myEvents,
				emailConsent: user?.emailConsent,
				textConsent: user?.textConsent,
				createdAt: user?.createdAt,
				updatedAt: user?.updatedAt,
				id: user?.id,
			});
		});

		res.json(userData);
	} catch (err) {
		errors.user = 'Error getting users';
		return res.status(400).json(errors);
	}
});

// Get 1
router.get('/users/:id', requireAuth, async (req, res) => {
	let errors = {};
	const { id } = req?.params;

	try {
		const user = await User.findById(id);

		if (!user) {
			errors.user = 'Error, user not found!';
			return res.status(404).json(errors);
		}

		const userData = {
			_id: user?._id,
			firstName: user?.firstName,
			lastName: user?.lastName,
			email: user?.email,
			phone: user?.phone,
			isAdmin: user?.isAdmin,
			myEvents: user?.myEvents,
			emailConsent: user?.emailConsent,
			textConsent: user?.textConsent,
			createdAt: user?.createdAt,
			updatedAt: user?.updatedAt,
			id: user?.id,
		};

		res.json(userData);
	} catch (err) {
		errors.user = 'Error getting user';
		return res.status(400).json(errors);
	}
});

// Update
router.put('/users/update/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;

	const user = await User.findById(id);

	if (!user) {
		errors.user = 'Error, user not found!';
		return res.status(404).json(errors);
	}

	try {
		if (req?.body?.password) {
			const salt = await genSalt(10);
			req.body.password = await hash(req?.body?.password, salt);
		}

		await User.findByIdAndUpdate(
			id,
			{
				$set: req?.body,
			},
			{
				new: true,
				runValidators: true,
			}
		);

		res.json({ message: 'User updated successfully!' });
	} catch (err) {
		errors.user = 'Error updating user!';
		return res.status(400).json(errors);
	}
});

// Delete User
router.delete('/users/:id', requireAuth, async (req, res) => {
	const errors = {};
	const { id } = req?.params;

	const user = await User.findById(id);

	if (!user) {
		errors.user = 'Error, user not found!';
		return res.status(404).json(errors);
	}

	try {
		await User.findByIdAndDelete(id);
		res.json({ message: 'User deleted successfully!' });
	} catch (err) {
		errors.user = 'Error deleting user!';
		return res.status(400).json(errors);
	}
});

module.exports = router;
