const crypto = require('crypto');

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  const base64Credentials = authHeader.slice('Basic '.length);
  const decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');

  if (separatorIndex === -1) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1)
  };
}

function adminAuth(req, res, next) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error('Admin credentials are not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env.');
    return res.status(503).json({
      success: false,
      error: 'Admin access is not configured'
    });
  }

  const credentials = parseBasicAuth(req.headers.authorization);
  if (!credentials) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Healthcare Bot Admin"');
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const usernameMatches = safeEqual(credentials.username, adminUsername);
  const passwordMatches = safeEqual(credentials.password, adminPassword);

  if (!usernameMatches || !passwordMatches) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Healthcare Bot Admin"');
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  return next();
}

module.exports = adminAuth;
