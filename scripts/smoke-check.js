require('dotenv').config();
const assert = require('assert');
const database = require('../src/config/database');
const botController = require('../src/controllers/botController');
const outbreakService = require('../src/services/outbreakService');
const vaccinationService = require('../src/services/vaccinationService');

async function run() {
  await database.connect();

  try {
    const odiaResponse = await botController.handleIncomingMessage({
      from: 'whatsapp:+917700000001',
      message: '4',
      timestamp: new Date()
    });
    assert(odiaResponse.includes('ଓଡ଼ିଆ'), 'expected Odia onboarding to work on first input');

    const voiceUser = '+917700000002';
    botController.userSessions.set(voiceUser, {
      state: 'main_menu',
      data: { language: 'en' },
      lastActivity: Date.now(),
      userId: voiceUser
    });
    await botController.handleIncomingMessage({
      from: `whatsapp:${voiceUser}`,
      message: '6',
      timestamp: new Date()
    });
    const voiceFollowUp = await botController.handleIncomingMessage({
      from: `whatsapp:${voiceUser}`,
      message: 'I have fever',
      timestamp: new Date()
    });
    assert(!voiceFollowUp.includes('Welcome to HealthCare Bot'), 'voice assistant follow-up should not drop back to main menu');

    const vaccinationStatus = await vaccinationService.getVaccinationStatus('VZG002');
    assert(vaccinationStatus.overdue.length > 0, 'expected overdue vaccinations for VZG002');

    const outbreaks = await outbreakService.getOutbreaksByLocation();
    assert(Array.isArray(outbreaks), 'expected outbreak lookup without filters to return an array');

    console.log('Smoke checks passed');
  } finally {
    database.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
