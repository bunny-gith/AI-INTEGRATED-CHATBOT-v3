const express = require('express');
const router = express.Router();
const database = require('../config/database');
const healthWorkerService = require('../services/healthWorkerService');
const vaccinationService = require('../services/vaccinationService');
const outbreakService = require('../services/outbreakService');
const botController = require('../controllers/botController');

// --- Babies Routes ---

// Get all babies
router.get('/babies', async (req, res) => {
  try {
    const babies = await database.all('SELECT * FROM babies ORDER BY created_at DESC');
    res.json({ success: true, data: babies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new baby
router.post('/babies', async (req, res) => {
  try {
    const { beneficiary_id, mother_name, baby_name, dob, phone_number, mother_id } = req.body;
    const result = await database.run(
      'INSERT INTO babies (beneficiary_id, mother_name, baby_name, dob, phone_number, mother_id) VALUES (?, ?, ?, ?, ?, ?)',
      [beneficiary_id, mother_name, baby_name, dob, phone_number, mother_id]
    );
    res.json({ success: true, id: result.id });
  } catch (error) {
    let errorMessage = error.message;
    if (error.message.includes('UNIQUE constraint failed: babies.beneficiary_id')) {
      errorMessage = 'Beneficiary ID already exists. Please use a unique ID.';
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Update baby
router.put('/babies/:id', async (req, res) => {
  try {
    const { beneficiary_id, mother_name, baby_name, dob, phone_number, mother_id } = req.body;
    await database.run(
      'UPDATE babies SET beneficiary_id = ?, mother_name = ?, baby_name = ?, dob = ?, phone_number = ?, mother_id = ? WHERE id = ?',
      [beneficiary_id, mother_name, baby_name, dob, phone_number, mother_id, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    let errorMessage = error.message;
    if (error.message.includes('UNIQUE constraint failed: babies.beneficiary_id')) {
      errorMessage = 'Beneficiary ID already exists. Please use a unique ID.';
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Delete baby
router.delete('/babies/:id', async (req, res) => {
  try {
    await database.run('DELETE FROM babies WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// --- Health Workers Routes ---

// Get all health workers
router.get('/health-workers', async (req, res) => {
  try {
    const workers = await database.all('SELECT * FROM health_workers ORDER BY pincode, name');
    res.json({ success: true, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new health worker
router.post('/health-workers', async (req, res) => {
  try {
    const result = await healthWorkerService.addHealthWorker(req.body);
    res.json({ success: true, id: result?.id });
  } catch (error) {
    let errorMessage = error.message;
    if (error.message.includes('UNIQUE constraint failed: health_workers.phone_number')) {
      errorMessage = 'Phone number already exists. Please use a unique phone number.';
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Update health worker
router.put('/health-workers/:id', async (req, res) => {
  try {
    const { name, designation, phone_number, pincode, facility_name, facility_type, address } = req.body;
    await database.run(
      'UPDATE health_workers SET name = ?, designation = ?, phone_number = ?, pincode = ?, facility_name = ?, facility_type = ?, address = ? WHERE id = ?',
      [name, designation, phone_number, pincode, facility_name, facility_type, address, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    let errorMessage = error.message;
    if (error.message.includes('UNIQUE constraint failed: health_workers.phone_number')) {
      errorMessage = 'Phone number already exists. Please use a unique phone number.';
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Delete health worker
router.delete('/health-workers/:id', async (req, res) => {
  try {
    await database.run('DELETE FROM health_workers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// --- Vaccination Routes ---

// Get vaccination status for a baby
router.get('/vaccination/:beneficiaryId', async (req, res) => {
  try {
    const status = await vaccinationService.getVaccinationStatus(req.params.beneficiaryId);
    if (status) {
      res.json({ success: true, data: status });
    } else {
      res.status(404).json({ success: false, error: 'Beneficiary not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark vaccination as complete
router.post('/vaccination/:beneficiaryId/complete', async (req, res) => {
  try {
    const { vaccine_name, vaccination_date } = req.body;
    const result = await vaccinationService.markVaccinationComplete(
      req.params.beneficiaryId,
      vaccine_name,
      vaccination_date
    );
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Voice Processing Route ---

// Process voice message for speech recognition
router.post('/process-voice', async (req, res) => {
    try {
        const { audio, mimeType } = req.body;

        if (!audio) {
            return res.status(400).json({ success: false, error: 'No audio data provided' });
        }

        // For demo purposes, return a placeholder transcript
        // In production, integrate with Google Speech API, Azure Speech, or similar
        const mockTranscripts = [
            "I have fever and headache",
            "What medicine should I take for cough",
            "Check my vaccination status",
            "Find health workers near me",
            "I need emergency help"
        ];

        const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

        res.json({
            success: true,
            transcript: randomTranscript,
            confidence: 0.95
        });

    } catch (error) {
        console.error('Error processing voice:', error);
        res.status(500).json({ success: false, error: 'Failed to process voice message' });
    }
});

// --- Callback Routes ---

// Get all callback requests
router.get('/callbacks', async (req, res) => {
    try {
        const callbacks = await database.all(`
            SELECT
                id,
                phone_number,
                language,
                status,
                created_at,
                completed_at,
                counselor_name,
                feedback_rating,
                feedback_text,
                feedback_at
            FROM callback_requests
            ORDER BY created_at DESC
        `);
        res.json({ success: true, data: callbacks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update callback status
router.put('/callbacks/:id', async (req, res) => {
    try {
        const { status } = req.body;

        // Get callback details before updating
        const callback = await database.get(
            'SELECT phone_number, language FROM callback_requests WHERE id = ?',
            [req.params.id]
        );

        if (!callback) {
            return res.status(404).json({ success: false, error: 'Callback not found' });
        }

        // Update the status
        await database.run(
            'UPDATE callback_requests SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        // If status is completed, send feedback request message
        if (status === 'completed') {
            const counselorName = 'Health Counselor'; // Default counselor name
            const success = await botController.markCallbackCompleted(callback.phone_number, counselorName);
            if (!success) {
                console.error('Failed to send feedback message for callback:', req.params.id);
                // Don't fail the request, just log the error
            }
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Outbreak Routes ---

// Get all outbreaks
router.get('/outbreaks', async (req, res) => {
    try {
        const outbreaks = await database.all('SELECT * FROM outbreaks ORDER BY reported_date DESC');
        res.json({ success: true, data: outbreaks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new outbreak
router.post('/outbreaks', async (req, res) => {
    try {
        const result = await outbreakService.storeOutbreak(req.body);
        res.json({ success: true, id: result.id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update outbreak
router.put('/outbreaks/:id', async (req, res) => {
    try {
        const { disease_name, location, state, district, pincode, severity, description, symptoms, prevention_measures, status } = req.body;
        await database.run(
            'UPDATE outbreaks SET disease_name = ?, location = ?, state = ?, district = ?, pincode = ?, severity = ?, description = ?, symptoms = ?, prevention_measures = ?, status = ?, updated_at = datetime("now") WHERE id = ?',
            [disease_name, location, state, district, pincode, severity, description, symptoms, prevention_measures, status, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete outbreak
router.delete('/outbreaks/:id', async (req, res) => {
    try {
        await database.run('DELETE FROM outbreaks WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Broadcast alerts for an outbreak
router.post('/outbreaks/:id/broadcast', async (req, res) => {
    try {
        const sentCount = await outbreakService.broadcastAlerts(req.params.id);
        res.json({ success: true, alertsSent: sentCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get alert logs
router.get('/alert-logs', async (req, res) => {
    try {
        const logs = await database.all(`
            SELECT al.*, o.disease_name, o.location
            FROM alert_logs al
            LEFT JOIN outbreaks o ON al.outbreak_id = o.id
            ORDER BY al.sent_at DESC LIMIT 100
        `);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user locations
router.get('/user-locations', async (req, res) => {
    try {
        const locations = await database.all('SELECT * FROM user_locations ORDER BY last_updated DESC');
        res.json({ success: true, data: locations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Validation Requests Routes ---

// Get all validation requests
router.get('/validation-requests', async (req, res) => {
    try {
        const requests = await database.all(`
            SELECT
                id,
                phone_number,
                user_query,
                ai_response,
                confidence_score,
                urgency_level,
                validation_reason,
                status,
                validated_by,
                validated_response,
                created_at,
                validated_at
            FROM validation_requests
            ORDER BY created_at DESC
        `);
        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get pending validation requests
router.get('/validation-requests/pending', async (req, res) => {
    try {
        const requests = await database.all(`
            SELECT
                id,
                phone_number,
                user_query,
                ai_response,
                confidence_score,
                urgency_level,
                validation_reason,
                created_at
            FROM validation_requests
            WHERE status = 'pending'
            ORDER BY created_at DESC
        `);
        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Validate a request
router.put('/validation-requests/:id/validate', async (req, res) => {
    try {
        const { validated_response, validator_name } = req.body;

        if (!validated_response || !validator_name) {
            return res.status(400).json({ success: false, error: 'Validated response and validator name are required' });
        }

        await database.run(
            'UPDATE validation_requests SET status = ?, validated_by = ?, validated_response = ?, validated_at = datetime("now") WHERE id = ?',
            ['validated', validator_name, validated_response, req.params.id]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reject a validation request
router.put('/validation-requests/:id/reject', async (req, res) => {
    try {
        const { validator_name, rejection_reason } = req.body;

        await database.run(
            'UPDATE validation_requests SET status = ?, validated_by = ?, validated_response = ?, validated_at = datetime("now") WHERE id = ?',
            ['rejected', validator_name, rejection_reason || 'Rejected by validator', req.params.id]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get validation statistics
router.get('/validation-requests/stats', async (req, res) => {
    try {
        const stats = await database.get(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'validated' THEN 1 ELSE 0 END) as validated,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                AVG(confidence_score) as avg_confidence,
                SUM(CASE WHEN urgency_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
                SUM(CASE WHEN urgency_level = 'HIGH' THEN 1 ELSE 0 END) as high_count
            FROM validation_requests
        `);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;
