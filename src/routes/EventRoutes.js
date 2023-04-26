const { Router } = require('express');
const { model } = require('mongoose');
const { validateEvent } = require('../util/validators');
const requireAuth = require('../middleware/requireAuth');
const Event = model('Event');
const router = Router();

// Add
router.post('/events', requireAuth, async (req, res) => {
	let eventData;

	const { valid, errors } = validateEvent(req?.body);

	if (!valid) return res.status(400).json(errors);

	try {
		const event = new Event(req?.body);
		await event?.save();
		res.json(event);
	} catch (err) {
		errors.event = 'Error creating event!';
		return res.status(400).json(errors);
	}
});

// Get All
router.get('/events', requireAuth, async (req, res) => {
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

		res.json({ message: 'Event updated successfully!' });
	} catch (err) {
		errors.event = 'Error updating event!';
		return res.status(400).json(errors);
	}
});

// Add Attendee
router.put('/events/add-attendee', requireAuth, async (req, res) => {
	let errors = {};
	const targetEvent = await Event.findById(req?.body?.eventId);
	const alreadyAttending = targetEvent?.attendees?.find(
		(user) => user?.toString() === req?.user?._id.toString()
	);

	if (alreadyAttending) {
		errors.event = 'You are already attending this event!';
		return res.status(400).json(errors);
	}

	try {
		await Event.findByIdAndUpdate(
			req?.body?.eventId,
			{
				$push: {
					attentdees: req?.user?._id,
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		res.json({ message: 'You are now attending this event!' });
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
		(user) => user?.toString() === req?.user?._id.toString()
	);

	if (!alreadyAttending) {
		errors.event = 'You are not currently attending this event!';
		return res.status(400).json(errors);
	}

	try {
		await Event.findByIdAndUpdate(
			req?.body?.eventId,
			{
				$pull: {
					attendees: req?.user?._id,
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		res.json({ message: 'You are no longer attending this event!' });
	} catch (err) {
		errors.event = 'Error removing attendee!';
		return res.status(400).json(errors);
	}
});

// Delete
router.delete('events/:id', requireAuth, async (req, res) => {
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
