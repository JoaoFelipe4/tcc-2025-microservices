const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const { authenticate } = require('../middleware/auth');
const axios = require('axios');

// Get appointments for a specific doctor (called by Doctors Service)
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const { date } = req.query;
    const query = { doctor: req.params.doctorId };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.dateTime = { $gte: startDate, $lte: endDate };
      query.status = { $in: ['scheduled', 'confirmed'] };
    }

    const appointments = await Appointment.find(query);

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create appointment
router.post('/', authenticate, [
  body('doctorId').notEmpty(),
  body('dateTime').isISO8601(),
  body('type').isIn(['consultation', 'follow-up', 'emergency', 'checkup', 'procedure']),
  body('reason').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { doctorId, dateTime, type, reason } = req.body;

    // Find patient
    let patientId;
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient profile not found' });
      }
      patientId = patient._id;
    } else {
      patientId = req.body.patientId;
      if (!patientId) {
        return res.status(400).json({ success: false, message: 'Patient ID required' });
      }
    }

    // Verify doctor exists and get consultation duration
    let consultationDuration = 30;
    try {
      const doctorResponse = await axios.get(
        `${process.env.DOCTORS_SERVICE_URL}/api/doctors/${doctorId}`,
        { timeout: 5000 }
      );
      if (!doctorResponse.data.success) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      consultationDuration = doctorResponse.data.doctor.consultationDuration || 30;
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error verifying doctor' });
    }

    // Check if slot is available
    const appointmentDate = new Date(dateTime);
    const endTime = new Date(appointmentDate.getTime() + consultationDuration * 60000);

    const conflictingAppointment = await Appointment.findOne({
      doctor: doctorId,
      status: { $in: ['scheduled', 'confirmed'] },
      $or: [
        {
          dateTime: { $gte: appointmentDate, $lt: endTime }
        },
        {
          $and: [
            { dateTime: { $lte: appointmentDate } },
            {
              $expr: {
                $gt: [
                  { $add: ['$dateTime', { $multiply: ['$duration', 60000] }] },
                  appointmentDate
                ]
              }
            }
          ]
        }
      ]
    });

    if (conflictingAppointment) {
      return res.status(400).json({ success: false, message: 'Time slot not available' });
    }

    // Create appointment
    const appointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      dateTime: appointmentDate,
      duration: consultationDuration,
      type,
      reason,
      status: 'scheduled'
    });

    await appointment.save();

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get appointments
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = {};

    // Filter based on user role
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      if (patient) {
        query.patient = patient._id;
      }
    } else if (req.user.role === 'doctor') {
      // Doctor would need to get their doctor ID from Doctors Service
      // For now, we'll allow admin to see all
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    if (status) query.status = status;
    if (startDate && endDate) {
      query.dateTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const appointments = await Appointment.find(query)
      .populate('patient')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ dateTime: -1 });

    const count = await Appointment.countDocuments(query);

    res.json({
      success: true,
      appointments,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get appointment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Check authorization
    const isAuthorized = await checkAppointmentAuthorization(req.user, appointment);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update appointment status
router.patch('/:id/status', authenticate, [
  body('status').isIn(['confirmed', 'cancelled', 'completed', 'no-show'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Check authorization
    const isAuthorized = await checkAppointmentAuthorization(req.user, appointment);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { status } = req.body;
    appointment.status = status;

    if (status === 'cancelled') {
      appointment.cancelledBy = req.user.id;
      appointment.cancelledReason = req.body.reason || 'No reason provided';
    }

    await appointment.save();

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update appointment (doctor only - add notes, prescription, etc.)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Only doctors can update appointment details
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can update appointment details' });
    }

    const { notes, prescription, diagnosis, followUpRequired, followUpDate } = req.body;

    if (notes) appointment.notes = notes;
    if (prescription) appointment.prescription = prescription;
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (followUpRequired !== undefined) appointment.followUpRequired = followUpRequired;
    if (followUpDate) appointment.followUpDate = followUpDate;

    await appointment.save();

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to check appointment authorization
async function checkAppointmentAuthorization(user, appointment) {
  if (user.role === 'admin') return true;

  if (user.role === 'patient') {
    const patient = await Patient.findOne({ user: user.id });
    return patient && appointment.patient._id.toString() === patient._id.toString();
  }

  if (user.role === 'doctor') {
    // Would need to verify doctor ID from Doctors Service
    return true; // Simplified for now
  }

  return false;
}

module.exports = router;
