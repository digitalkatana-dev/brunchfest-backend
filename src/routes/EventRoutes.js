const { Router } = require('express');
const { model } = require('mongoose');
const { config } = require('dotenv');
const { validateEvent, validateRsvp } = require('../util/validators');
const requireAuth = require('../middleware/requireAuth');
const cloudinary = require('cloudinary').v2;
// const sgMail = require('@sendgrid/mail');
const Event = model('Event');
const User = model('User');
const router = Router();
config();

// const twilioClient = require('twilio')(
// 	process.env.TWILIO_ACCOUNT_SID,
// 	process.env.TWILIO_AUTH_TOKEN
// );
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);
cloudinary.config({
	cloud_name: 'dk9gbz4ag',
	api_key: '462595943588927',
	api_secret: 'SSKI22R31wZt0-zPEp7yXUTEETY',
});

// Add
router.post('/events', requireAuth, async (req, res) => {
	const { _id } = req?.user;
	let eventData = {};

	const { valid, errors } = validateEvent(req?.body);

	if (!valid) return res.status(400).json(errors);

	try {
		eventData = {
			...req?.body,
			createdBy: _id,
		};
		const event = new Event(eventData);
		await event?.save();
		res.json(event);
	} catch (err) {
		errors.event = 'Error creating event!';
		console.log(err);
		return res.status(400).json(errors);
	}
});

// Get All
router.get('/events', async (req, res) => {
	let errors = {};

	try {
		const events = await Event.find({});
		res.json(events);
	} catch (err) {
		errors.events = 'Error getting events';
		return res.status(400).json(errors);
	}
});

// Get 1
router.get('/events/:id', requireAuth, async (req, res) => {
	let errors = {};
	const { id } = req?.params;

	try {
		const event = await Event.findById(id);

		if (!event) {
			errors.event = 'Error, event not found!';
			return res.status(404).json(errors);
		}

		res.json(event);
	} catch (err) {
		errors.event = 'Error getting event';
		return res.status(400).json(errors);
	}
});

// Update
router.put('/events/update/:id', requireAuth, async (req, res) => {
	const { id } = req?.params;

	const event = await Event.findById(id);

	if (!event) {
		errors.event = 'Error, event not found!';
		return res.status(404).json(errors);
	}

	try {
		await Event.findByIdAndUpdate(
			id,
			{
				$set: req?.body,
			},
			{
				new: true,
				runValidators: true,
			}
		);

		const updatedAll = await Event.find({});
		const updatedEvent = await Event.findById(id);

		res.json({
			updatedAll,
			updatedEvent,
			success: { message: 'Event updated successfully!' },
		});
	} catch (err) {
		errors.event = 'Error updating event!';
		return res.status(400).json(errors);
	}
});

// Add Attendee
router.put('/events/add-attendee', requireAuth, async (req, res) => {
	const targetEvent = await Event.findById(req?.body?.eventId);
	const alreadyAttending = targetEvent?.attendees?.find(
		(user) => user?._id.toString() === req?.user?._id.toString()
	);

	const { valid, errors } = validateRsvp(req?.body);

	if (!valid) return res.status(400).json(errors);

	if (alreadyAttending) {
		errors.event = 'You are already attending this event!';
		return res.status(400).json(errors);
	}

	const user = await User.findById(req?.user?._id);

	const attendee = {
		_id: user._id,
		name: user.firstName + ' ' + user.lastName,
		...(user.notify === 'sms' && { phone: user.phone }),
		...(user.notify === 'email' && { email: user.email }),
		headcount: req?.body?.headcount,
		notify: req?.user?.notify,
	};

	try {
		await Event.findByIdAndUpdate(
			req?.body?.eventId,
			{
				$push: {
					attendees: attendee,
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		await User.findByIdAndUpdate(
			req?.user?._id,
			{
				$push: {
					myEvents: req?.body?.eventId,
				},
			},
			{
				new: true,
			}
		);

		// if (user.notify === 'sms') {
		// 	await twilioClient.messages.create({
		// 		body: `Your RSVP has been received!`,
		// 		from: process.env.TWILIO_NUMBER,
		// 		to: `+1${user.phone}`,
		// 	});
		// } else if (user.notify === 'email') {
		// 	const msg = {
		// 		to: user.email,
		// 		from: process.env.SG_BASE_EMAIL,
		// 		subject: 'RSVP Accepted!',
		// 		text: "You have successfully RSVP'd for brunch",
		// 		html: '<strong>See you there!</strong>',
		// 	};

		// 	await sgMail.send(msg);
		// }

		const updatedAll = await Event.find({});
		const updatedEvent = await Event.findById(req?.body?.eventId);
		const updatedUser = await User.findById(req?.user?._id);
		const updatedMyEvents = updatedUser?.myEvents;

		res.json({
			updatedAll,
			updatedEvent,
			updatedMyEvents,
			success: { message: 'You are now attending this event!' },
		});
	} catch (err) {
		errors.event = 'Error adding attendee!';
		return res.status(400).json(errors);
	}
});

// Remove Attendee
router.put('/events/remove-attendee', requireAuth, async (req, res) => {
	let errors = {};
	const targetEvent = await Event.findById(req?.body?.eventId);
	const alreadyAttending = targetEvent?.attendees?.find(
		(user) => user?._id.toString() === req?.user?._id.toString()
	);

	if (!alreadyAttending) {
		errors.event = 'You are not currently attending this event!';
		return res.status(400).json(errors);
	}

	const user = await User.findById(req?.user?._id);

	const attendee = {
		_id: user._id,
		name: user.firstName + ' ' + user.lastName,
		headcount: req?.body?.headcount,
	};

	try {
		await Event.findByIdAndUpdate(
			req?.body?.eventId,
			{
				$pull: {
					attendees: attendee,
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		await User.findByIdAndUpdate(
			req?.user?._id,
			{
				$pull: {
					myEvents: req?.body?.eventId,
				},
			},
			{
				new: true,
			}
		);

		// if (user.notify === 'sms') {
		// 	await twilioClient.messages.create({
		// 		body: `Your RSVP has been canceled!`,
		// 		from: process.env.TWILIO_NUMBER,
		// 		to: `+1${user.phone}`,
		// 	});
		// } else if (user.notify === 'email') {
		// 	const msg = {
		// 		to: user.email,
		// 		from: process.env.SG_BASE_EMAIL,
		// 		subject: 'RSVP Canceled!',
		// 		text: 'You have successfully canceled your RSVP for brunch',
		// 		html: '<strong>Maybe next month!</strong>',
		// 	};

		// 	await sgMail.send(msg);
		// }

		const updatedAll = await Event.find({});
		const updatedEvent = await Event.findById(req?.body?.eventId);
		const updatedUser = await User.findById(req?.user?._id);
		const updatedMyEvents = updatedUser?.myEvents;

		res.json({
			updatedAll,
			updatedEvent,
			updatedMyEvents,
			success: { message: 'You are no longer attending this event!' },
		});
	} catch (err) {
		errors.event = 'Error removing attendee!';
		return res.status(400).json(errors);
	}
});

// Send Reminders
router.post('/events/reminders', requireAuth, async (req, res) => {
	let errors = {};
	const targetEvent = await Event.findById(req?.body?.eventId);

	try {
		// targetEvent.attendees.forEach(async (guest) => {
		// 	if (guest.notify === 'sms') {
		// 		await twilioClient.messages.create({
		// 			body: 'You are only 1 week away from brunch!',
		// 			from: process.env.TWILIO_NUMBER,
		// 			to: `+1${guest.phone}`,
		// 		});
		// 	} else if (guest.notify === 'email') {
		// 		const msg = {
		// 			to: guest.email,
		// 			from: process.env.SG_BASE_EMAIL,
		// 			subject: 'Almost There...',
		// 			text: 'You are only 1 week away from brunch!',
		// 			html: '<strong>So close!</strong>',
		// 		};

		// 		await sgMail.send(msg);
		// 	}
		// });

		res.json({ message: 'Reminders sent successfully!' });
	} catch (err) {
		errors.reminders = 'Error sending reminders!';
		return res.status(400).json(errors);
	}
});

// Delete
router.delete('/events/:id', requireAuth, async (req, res) => {
	const errors = {};
	const { id } = req?.params;

	const event = await Event.findById(id);

	if (!event) {
		errors.event = 'Error, event not found!';
		return res.status(404).json(errors);
	}

	try {
		await Event.findByIdAndDelete(id);
		res.json({ message: 'Event deleted successfully!' });
	} catch (err) {
		errors.event = 'Error deleting event!';
		return res.status(400).json(errors);
	}
});

router.post('/photo/upload', async (req, res) => {
	try {
		await cloudinary.uploader.upload(
			'https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg',
			{ public_id: 'olympic_flag' }
		);
		const url = cloudinary.url('olympic_flag', {
			width: 100,
			height: 150,
			Crop: 'fill',
		});

		res.json(url);
	} catch (err) {
		console.log(err);
	}
});

module.exports = router;
