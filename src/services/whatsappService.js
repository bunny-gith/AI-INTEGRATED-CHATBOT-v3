const twilio = require('twilio');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER;

class WhatsAppService {
  constructor() {
    if (!ACCOUNT_SID || !AUTH_TOKEN) {
      console.error('Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) are not set in .env file.');
      this.client = null;
    } else {
      this.client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    }
  }

  async sendMessage(to, message) {
    if (!this.client) {
      console.error('Twilio client not initialized. Cannot send message.');
      return;
    }

    try {
      // Format numbers for WhatsApp (ensure whatsapp: prefix)
      const fromNumber = TWILIO_NUMBER.startsWith('whatsapp:') ? TWILIO_NUMBER : `whatsapp:${TWILIO_NUMBER}`;
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      console.log(`Sending WhatsApp message from ${fromNumber} to ${toNumber}: "${message}"`);
      await this.client.messages.create({
        from: fromNumber,
        to: toNumber,
        body: message,
      });
    } catch (error) {
      console.error(`[Twilio WhatsAppService] Error sending message to ${to}:`, error.message);
    }
  }

  parseIncomingMessage(body) {
    try {
      // Twilio sends webhook data in a URL-encoded format
      if (body.From) {
        // Check for media (voice/image)
        if (body.MediaUrl0) {
          const mediaType = body.MediaContentType0.startsWith('audio/') ? 'voice' :
                           body.MediaContentType0.startsWith('image/') ? 'image' : 'media';
          return {
            from: body.From,
            type: mediaType,
            mediaUrl: body.MediaUrl0,
            mediaType: body.MediaContentType0,
            message: body.Body || '',
            timestamp: new Date()
          };
        } else if (body.Body) {
          // Text message
          return {
            from: body.From,
            type: 'text',
            message: body.Body,
            timestamp: new Date()
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error parsing incoming Twilio message:', error);
      return null;
    }
  }
}

module.exports = new WhatsAppService();