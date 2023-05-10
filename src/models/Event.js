const { Schema, model } = require('mongoose');

const eventSchema = new Schema(
	{
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
