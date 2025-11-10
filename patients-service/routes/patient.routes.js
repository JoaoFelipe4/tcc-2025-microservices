const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { authenticate, authorize } = require('../middleware/auth');

// Create patient profile (called by Auth Service)
router.post('/profile', authenticate, async (req, res) => {
  try {
    const { userId, cpf, dateOfBirth, bloodType } = req.body;

    const patient = new Patient({
      user: userId,
      cpf,
      dateOfBirth,
      bloodType
    });

    await patient.save();

    res.status(201).json({
      success: true,
      patient
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get patient profile by user ID (called by Auth Service)
router.get('/profile/user/:userId', authenticate, async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.params.userId });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all patients (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const patients = await Patient.find()
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Patient.countDocuments();

    res.json({
      success: true,
      patients,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get patient by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Check authorization
    if (req.user.role === 'patient' && patient.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update patient profile
router.put('/:id', authenticate, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Check authorization
    if (req.user.role === 'patient' && patient.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (key !== 'user' && key !== '_id' && key !== 'cpf') {
        patient[key] = updates[key];
      }
    });

    await patient.save();
    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get patient's appointments
router.get('/:id/appointments', authenticate, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Check authorization
    if (req.user.role === 'patient' && patient.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { status, upcoming } = req.query;
    const query = { patient: req.params.id };

    if (status) {
      query.status = status;
    }

    if (upcoming === 'true') {
      query.dateTime = { $gte: new Date() };
    }

    const appointments = await Appointment.find(query)
      .sort({ dateTime: upcoming === 'true' ? 1 : -1 });

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add medical history
router.post('/:id/medical-history', authenticate, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Only doctors and the patient themselves can add medical history
    if (req.user.role === 'patient' && patient.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    patient.medicalHistory.push(req.body);
    await patient.save();

    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
