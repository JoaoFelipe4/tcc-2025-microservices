const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Doctor = require('../models/Doctor');
const { authenticate, authorize } = require('../middleware/auth');
const axios = require('axios');

// Create doctor profile (called by Auth Service)
router.post('/profile', authenticate, async (req, res) => {
  try {
    const { userId, crm, specialties, consultationPrice, consultationDuration } = req.body;

    const doctor = new Doctor({
      user: userId,
      crm,
      specialties,
      consultationPrice,
      consultationDuration
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      doctor
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get doctor profile by user ID (called by Auth Service)
router.get('/profile/user/:userId', authenticate, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.params.userId });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    res.json({ success: true, doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const { specialty, isAcceptingPatients, page = 1, limit = 10 } = req.query;

    const query = {};
    if (specialty) query.specialties = { $in: [specialty] };
    if (isAcceptingPatients !== undefined) query.isAcceptingPatients = isAcceptingPatients === 'true';

    const doctors = await Doctor.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Doctor.countDocuments(query);

    // Fetch user details from Auth Service for each doctor
    const doctorsWithUserInfo = await Promise.all(
      doctors.map(async (doctor) => {
        try {
          const userResponse = await axios.get(
            `${process.env.AUTH_SERVICE_URL}/api/auth/user/${doctor.user}`,
            { timeout: 5000 }
          );
          const doctorObj = doctor.toObject();
          // Replace user ObjectId with full user data
          doctorObj.user = userResponse.data.user;
          return doctorObj;
        } catch (error) {
          return {
            ...doctor.toObject(),
            user: null
          };
        }
      })
    );

    res.json({
      success: true,
      doctors: doctorsWithUserInfo,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Fetch user details from Auth Service
    try {
      const userResponse = await axios.get(
        `${process.env.AUTH_SERVICE_URL}/api/auth/user/${doctor.user}`,
        { timeout: 5000 }
      );
      const doctorObj = doctor.toObject();
      // Replace user ObjectId with full user data
      doctorObj.user = userResponse.data.user;
      res.json({
        success: true,
        doctor: doctorObj
      });
    } catch (error) {
      res.json({
        success: true,
        doctor: {
          ...doctor.toObject(),
          user: null
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update doctor profile
router.put('/:id', authenticate, authorize('doctor', 'admin'), async (req, res) => {
  try {
    const updates = req.body;
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Check if the doctor is updating their own profile
    if (req.user.role === 'doctor' && doctor.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    Object.keys(updates).forEach(key => {
      if (key !== 'user' && key !== '_id') {
        doctor[key] = updates[key];
      }
    });

    await doctor.save();
    res.json({ success: true, doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get doctor availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { date } = req.query;
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Get appointments for the specified date from Patients Service
    let appointments = [];
    try {
      const appointmentsResponse = await axios.get(
        `${process.env.PATIENTS_SERVICE_URL}/api/appointments/doctor/${req.params.id}?date=${date}`,
        { timeout: 5000 }
      );
      appointments = appointmentsResponse.data.appointments || [];
    } catch (error) {
      console.error('Error fetching appointments:', error.message);
    }

    // Calculate available slots based on doctor's schedule
    const dayOfWeek = new Date(date).getDay();
    const dayAvailability = doctor.availability.find(a => a.dayOfWeek === dayOfWeek);

    if (!dayAvailability) {
      return res.json({ success: true, availableSlots: [] });
    }

    // Generate time slots
    const availableSlots = [];
    const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
    const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);

    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    const slotDuration = doctor.consultationDuration;
    const currentSlot = new Date(startTime);

    while (currentSlot < endTime) {
      const slotEnd = new Date(currentSlot.getTime() + slotDuration * 60000);

      // Check if slot is available
      const isBooked = appointments.some(apt => {
        const aptStart = new Date(apt.dateTime);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        return (currentSlot >= aptStart && currentSlot < aptEnd) ||
               (slotEnd > aptStart && slotEnd <= aptEnd);
      });

      if (!isBooked && currentSlot > new Date()) {
        availableSlots.push({
          start: currentSlot.toISOString(),
          end: slotEnd.toISOString()
        });
      }

      currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration);
    }

    res.json({ success: true, availableSlots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;