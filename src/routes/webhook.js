const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const botController = require('../controllers/botController');
const whatsappService = require('../services/whatsappService');

// Middleware to validate Twilio's request signature
const validateTwilioRequest = (req, res, next) => {
  // Pass to the next middleware if validation is disabled
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const token = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'];

  // **THE FIX IS HERE**
  // Manually construct the full URL. 'trust proxy' in server.js allows req.protocol to be 'https'.
  const url = `${req.protocol}://${req.hostname}${req.originalUrl}`;

  const params = req.body;

  try {
    const requestIsValid = twilio.validateRequest(token, signature, url, params);
    if (requestIsValid) {
      return next();
    }
  } catch (e) {
      console.error("Error during Twilio validation:", e);
  }

  console.warn('Invalid Twilio signature received.');
  return res.status(403).send('Forbidden');
};

// Main webhook endpoint to receive messages from Twilio
router.post('/', validateTwilioRequest, async (req, res) => {
  const body = req.body;
  console.log('Received webhook from Twilio:', body);

  try {
    const messageData = whatsappService.parseIncomingMessage(body);

    if (messageData) {
      console.log('Message type:', messageData.type, 'From:', messageData.from);

      // Handle different message types
      if (messageData.type === 'voice') {
        console.log('Processing voice message');
        // Process voice message
        const voiceResponse = await botController.handleVoiceMessage(messageData);
        console.log('Voice response:', voiceResponse ? 'Generated' : 'Null');
        if (voiceResponse) {
          await whatsappService.sendMessage(messageData.from, voiceResponse);
        }
      } else if (messageData.type === 'image') {
        // Process image message
        const imageResponse = await botController.handleImageMessage(messageData);
        if (imageResponse) {
          await whatsappService.sendMessage(messageData.from, imageResponse);
        }
      } else {
        // Handle text message
        const botResponse = await botController.handleIncomingMessage(messageData);
        if (botResponse) {
          await whatsappService.sendMessage(messageData.from, botResponse);
        }
      }
    } else {
      console.log('No message data parsed from webhook');
    }
    
    res.status(200).send('<Response/>');

  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    res.sendStatus(500);
  }
});


router.get('/', (req, res) => {
  res.send('Twilio Webhook is running.');
});

module.exports = router;