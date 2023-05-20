const { Router } = require('express');
const { model } = require('mongoose');
const { validateEvent, validateRsvp } = require('../util/validators');
const requireAuth = require('../middleware/requireAuth');
const Event = model('Event');
const User = model('User');
const router = Router();

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
		phone: user.phone,
		headcount: req?.body?.headcount,
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

module.exports = router;
