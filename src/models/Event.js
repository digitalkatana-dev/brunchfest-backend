const { Schema, model } = require('mongoose');

const eventSchema = new Schema(
	{
		type: {
			type: String,
			required: true,
		},
		date: {
			type: String,
			required: true,
		},
		time: {
			type: String,
			required: true,
		},
		location: {
			type: String,
			required: true,
		},
		label: {
			type: String,
			required: true,
		},
		invitedGuests: [
			{
				type: Object,
			},
		],
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Author is required'],
		},
		attendees: [
			{
				type: Object,
			},
		],
		pics: [
			{
				type: String,
			},
		],
	},
	{
		toJSON: {
			virtuals: true,
		},
		toObject: {
			virtuals: true,
		},
		timestamps: true,
	}
);

model('Event', eventSchema);
