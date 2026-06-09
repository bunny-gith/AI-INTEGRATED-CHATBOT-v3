require('dotenv').config();
const express = require('express');
const path = require('path');
const database = require('./src/config/database');
const webhookRoutes = require('./src/routes/webhook');
const adminRoutes = require('./src/routes/admin');
const adminAuth = require('./src/middleware/adminAuth');
const botController = require('./src/controllers/botController');
const outbreakService = require('./src/services/outbreakService');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);
// Middleware
app.use(express.json({ limit: '10mb' })); // Increased limit for voice data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/webhook', webhookRoutes);
console.log('Webhook route mounted at /webhook');
app.use('/api', adminAuth, adminRoutes);
app.use('/admin', adminAuth, express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Healthcare Bot'
  });
});

// Test endpoint for development
app.get('/test-message', async (req, res) => {
  try {
    const testMessage = {
      from: 'whatsapp:+919876543210',
      message: req.query.message || 'hi',
      timestamp: new Date()
    };

    // Set language if provided
    if (req.query.lang) {
      const userId = testMessage.from.replace('whatsapp:', '');
      let session = botController.userSessions.get(userId) || {
        state: 'main_menu',
        data: { language: req.query.lang }
      };
      session.data.language = req.query.lang;
      botController.userSessions.set(userId, session);
    }

    // The botController's handleIncomingMessage is now modified to return the response string
    const botResponse = await botController.handleIncomingMessage(testMessage);

    res.json({ success: true, message: 'Test message processed', response: botResponse });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Healthcare Bot API',
    endpoints: {
      webhook: '/webhook',
      admin: '/api',
      health: '/health',
      test: '/test-message?message=hi'
    },
    features: [
      'Symptom Checker with AI',
      'Medicine Information',
      'Vaccination Tracking',
      'Health Worker Directory',
      'Emergency Contacts',
      'Disease Outbreak Alerts'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await database.connect();
    console.log('Database connected successfully');

    // Clean up old bot sessions every hour
    setInterval(() => {
      botController.clearOldSessions();
    }, 60 * 60 * 1000);

    // Update outbreak data every 6 hours
    setInterval(() => {
      outbreakService.scheduledUpdate();
    }, 6 * 60 * 60 * 1000);

    // Initial outbreak data update
    setTimeout(() => {
      outbreakService.scheduledUpdate();
    }, 5000); // Start 5 seconds after server start

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 WhatsApp Healthcare Bot server running on port ${PORT} (accessible from all interfaces)`);
      console.log(`📱 Webhook URL: http://0.0.0.0:${PORT}/webhook`);
      console.log(`🏥 Admin Panel: http://0.0.0.0:${PORT}/admin`);
      console.log(`🧪 Test URL: http://0.0.0.0:${PORT}/test-message?message=hi`);
      console.log(`🌐 Network Access: Find your IP address and use http://[YOUR_IP]:${PORT}/admin`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  database.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  database.close();
  process.exit(0);
});

startServer();
