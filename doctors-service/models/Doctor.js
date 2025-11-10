const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number, // 0-6 (Sunday-Saturday)
    required: true
  },
  startTime: {
    type: String, // Format: "HH:MM"
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
});

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  crm: {
    type: String,
    required: true,
    unique: true
  },
  specialties: [{
    type: String,
    required: true
  }],
  consultationDuration: {
    type: Number, // in minutes
    default: 30
  },
  availability: [availabilitySchema],
  consultationPrice: {
    type: Number,
    required: true
  },
  education: [{
    degree: String,
    institution: String,
    year: Number
  }],
  experience: {
    type: Number, // years of experience
    default: 0
  },
  bio: {
    type: String,
    maxlength: 1000
  },
  isAcceptingPatients: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Doctor', doctorSchema);
