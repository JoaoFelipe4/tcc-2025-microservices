const axios = require('axios');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    // Verify token with Auth Service
    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.data.success) {
      throw new Error();
    }

    req.user = response.data.user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Please authenticate' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
