const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const axios = require('axios');

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').notEmpty(),
  body('role').isIn(['patient', 'doctor'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone, role, ...additionalData } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      role
    });
    await user.save();

    // Create role-specific profile in respective microservice
    let profileId = null;
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    try {
      if (role === 'patient') {
        // Call Patients Service to create profile
        const patientResponse = await axios.post(
          `${process.env.PATIENTS_SERVICE_URL}/api/patients/profile`,
          {
            userId: user._id,
            cpf: additionalData.cpf,
            dateOfBirth: additionalData.dateOfBirth,
            bloodType: additionalData.bloodType || 'Unknown'
          },
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        profileId = patientResponse.data.patient._id;
      } else if (role === 'doctor') {
        // Call Doctors Service to create profile
        const doctorResponse = await axios.post(
          `${process.env.DOCTORS_SERVICE_URL}/api/doctors/profile`,
          {
            userId: user._id,
            crm: additionalData.crm,
            specialties: additionalData.specialties,
            consultationPrice: additionalData.consultationPrice || 150,
            consultationDuration: additionalData.consultationDuration || 30
          },
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        profileId = doctorResponse.data.doctor._id;
      }
    } catch (profileError) {
      // If profile creation fails, rollback user creation
      await User.findByIdAndDelete(user._id);
      throw new Error('Failed to create profile: ' + profileError.message);
    }

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileId: profileId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Get profile ID from respective service
    let profileId = null;
    try {
      if (user.role === 'patient') {
        const patientResponse = await axios.get(
          `${process.env.PATIENTS_SERVICE_URL}/api/patients/profile/user/${user._id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        profileId = patientResponse.data.patient?._id || null;
      } else if (user.role === 'doctor') {
        const doctorResponse = await axios.get(
          `${process.env.DOCTORS_SERVICE_URL}/api/doctors/profile/user/${user._id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        profileId = doctorResponse.data.doctor?._id || null;
      }
    } catch (error) {
      console.error('Error fetching profile ID:', error.message);
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileId: profileId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update password
router.put('/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify token endpoint (for inter-service authentication)
router.get('/verify', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
