const axios = require('axios');
const database = require('../config/database');
const whatsappService = require('./whatsappService');

class OutbreakService {
  constructor() {
    this.apiEndpoints = {
      mohfw: process.env.MOHFW_API_URL || 'https://api.mohfw.gov.in/outbreaks',
      who: process.env.WHO_API_URL || 'https://www.who.int/feeds/entity/csr/don/en/rss.xml',
      idsp: process.env.IDSP_API_URL || 'https://idsp.nic.in/api/outbreaks',
      nvbdcp: process.env.NVBDCP_API_URL || 'https://nvbdcp.gov.in/api/dengue-alerts'
    };

    this.translations = {
      en: {
        alertMessage: `🚨 *HEALTH ALERT: {disease} Outbreak*\n\n📍 Location: {location}\n⚠️ Severity: {severity}\n\n🩺 Symptoms: {symptoms}\n\n🛡️ Prevention: {prevention}\n\nFor medical help, contact:\n🏥 Nearest health center\n📞 108 - Emergency\n📞 104 - Health Helpline\n\nStay safe and follow health guidelines.`,
        outbreakInfo: `📊 *Disease Outbreak Information*\n\nActive outbreaks in your area:\n\n`,
        noOutbreaks: `✅ *No active disease outbreaks reported in your area.*\n\nStay updated with health advisories.`,
        outbreakItem: `🚨 {disease} in {location}\nSeverity: {severity}\nCases: {cases}\n\n`
      },
      hi: {
        alertMessage: `🚨 *स्वास्थ्य चेतावनी: {disease} का प्रकोप*\n\n📍 स्थान: {location}\n⚠️ गंभीरता: {severity}\n\n🩺 लक्षण: {symptoms}\n\n🛡️ रोकथाम: {prevention}\n\nचिकित्सा सहायता के लिए संपर्क करें:\n🏥 निकटतम स्वास्थ्य केंद्र\n📞 108 - आपातकालीन\n📞 104 - स्वास्थ्य हेल्पलाइन\n\nसुरक्षित रहें और स्वास्थ्य दिशानिर्देशों का पालन करें।`,
        outbreakInfo: `📊 *रोग प्रकोप जानकारी*\n\nआपके क्षेत्र में सक्रिय प्रकोप:\n\n`,
        noOutbreaks: `✅ *आपके क्षेत्र में कोई सक्रिय रोग प्रकोप नहीं बताया गया।*\n\nस्वास्थ्य सलाहों से अपडेट रहें।`,
        outbreakItem: `🚨 {location} में {disease}\nगंभीरता: {severity}\nमामले: {cases}\n\n`
      },
      te: {
        alertMessage: `🚨 *ఆరోగ్య హెచ్చరిక: {disease} వ్యాప్తి*\n\n📍 స్థానం: {location}\n⚠️ తీవ్రత: {severity}\n\n🩺 లక్షణాలు: {symptoms}\n\n🛡️ నివారణ: {prevention}\n\nవైద్య సహాయం కోసం సంప్రదించండి:\n🏥 సమీప ఆరోగ్య కేంద్రం\n📞 108 - అత్యవసరం\n📞 104 - ఆరోగ్య హెల్ప్‌లైన్\n\nసురక్షితంగా ఉండండి మరియు ఆరోగ్య మార్గదర్శకాలను అనుసరించండి.`,
        outbreakInfo: `📊 *వ్యాధి వ్యాప్తి సమాచారం*\n\nమీ ప్రాంతంలో సక్రియ వ్యాప్తులు:\n\n`,
        noOutbreaks: `✅ *మీ ప్రాంతంలో ఎటువంటి సక్రియ వ్యాధి వ్యాప్తులు నివేదించబడలేదు.*\n\nఆరోగ్య సలహాలతో అప్‌డేట్ అవ్వండి.`,
        outbreakItem: `🚨 {location}లో {disease}\nతీవ్రత: {severity}\nకేసులు: {cases}\n\n`
      },
      or: {
        alertMessage: `🚨 *ସ୍ଵାସ୍ଥ୍ୟ ଚେତାବନୀ: {disease} ପ୍ରକୋପ*\n\n📍 ସ୍ଥାନ: {location}\n⚠️ ତୀବ୍ରତା: {severity}\n\n🩺 ଲକ୍ଷଣ: {symptoms}\n\n🛡️ ନିବାରଣ: {prevention}\n\nଚିକିତ୍ସକ ସାହାଯ୍ୟ ପାଇଁ ଯୋଗାଯୋଗ କରନ୍ତୁ:\n🏥 ନିକଟସ୍ଥ ସ୍ଵାସ୍ଥ୍ୟ କେନ୍ଦ୍ର\n📞 108 - ଜରୁରୀକାଳୀନ\n📞 104 - ସ୍ଵାସ୍ଥ୍ୟ ହେଲ୍ପଲାଇନ୍\n\nସୁରକ୍ଷିତ ରୁହନ୍ତୁ ଏବଂ ସ୍ଵାସ୍ଥ୍ୟ ନିର୍ଦ୍ଦେଶାବଳୀ ଅନୁସରଣ କରନ୍ତୁ।`,
        outbreakInfo: `📊 *ରୋଗ ପ୍ରକୋପ ସୂଚନା*\n\nଆପଣଙ୍କ ଅଞ୍ଚଳରେ ସକ୍ରିୟ ପ୍ରକୋପ:\n\n`,
        noOutbreaks: `✅ *ଆପଣଙ୍କ ଅଞ୍ଚଳରେ କୌଣସି ସକ୍ରିୟ ରୋଗ ପ୍ରକୋପ ନିବେଦନ କରାଯାଇନାହିଁ।*\n\nସ୍ଵାସ୍ଥ୍ୟ ପରାମର୍ଶ ସହିତ ଅପଡେଟ୍ ରୁହନ୍ତୁ।`,
        outbreakItem: `🚨 {location}ରେ {disease}\nତୀବ୍ରତା: {severity}\nକେସ: {cases}\n\n`
      }
    };
  }

  // Fetch outbreak data from external APIs
  async fetchOutbreaksFromAPIs() {
    // Note: External APIs are currently unavailable or returning errors.
    // Using mock data as primary source until APIs are fixed or replaced.
    console.log('Using mock outbreak data (external APIs disabled due to persistent failures)');
    const outbreaks = await this.getMockOutbreakData();

    // Remove duplicates before returning
    const uniqueOutbreaks = this.deduplicateOutbreaks(outbreaks);
    return uniqueOutbreaks;
  }

  // Deduplicate outbreaks based on disease, location, and date
  deduplicateOutbreaks(outbreaks) {
    const seen = new Set();
    const unique = [];

    for (const outbreak of outbreaks) {
      // Create a unique key based on disease, location, and date
      const key = `${outbreak.disease_name?.toLowerCase().trim()}-${outbreak.location?.toLowerCase().trim()}-${outbreak.reported_date}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(outbreak);
      } else {
        console.log(`Duplicate outbreak removed: ${key}`);
      }
    }

    return unique;
  }

  // Mock data for demonstration - used as fallback
  async getMockOutbreakData() {
    return [
      {
        disease_name: 'Dengue',
        location: 'Delhi',
        state: 'Delhi',
        district: 'New Delhi',
        pincode: '110001',
        severity: 'high',
        description: 'Dengue fever outbreak in urban areas',
        symptoms: 'High fever, severe headache, pain behind eyes, joint pain, rash',
        prevention_measures: 'Use mosquito repellents, wear long sleeves, eliminate standing water',
        reported_date: new Date().toISOString().split('T')[0],
        status: 'active',
        source: 'MoHFW',
        affected_population: 150,
        deaths: 2
      }
    ];
  }

  // Fetch data from Ministry of Health and Family Welfare
  async fetchFromMoHFW() {
    try {
      const response = await axios.get('https://api.mohfw.gov.in/outbreaks', {
        timeout: 10000,
        headers: {
          'User-Agent': 'WhatsApp-Healthcare-Bot/1.0'
        }
      });

      // Process MoHFW data format
      const outbreaks = [];
      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          outbreaks.push({
            disease_name: item.disease || item.disease_name,
            location: item.location || item.city,
            state: item.state,
            district: item.district,
            pincode: item.pincode,
            severity: this.mapSeverity(item.severity),
            description: item.description,
            symptoms: item.symptoms,
            prevention_measures: item.prevention,
            reported_date: item.reported_date || new Date().toISOString().split('T')[0],
            status: item.status || 'active',
            source: 'MoHFW',
            affected_population: item.cases || item.affected,
            deaths: item.deaths || 0
          });
        }
      }
      return outbreaks;
    } catch (error) {
      console.error('MoHFW API error:', error.message);
      throw error;
    }
  }

  // Fetch data from World Health Organization
  async fetchFromWHO() {
    try {
      const response = await axios.get('https://www.who.int/feeds/entity/csr/don/en/rss.xml', {
        timeout: 10000,
        headers: {
          'User-Agent': 'WhatsApp-Healthcare-Bot/1.0'
        }
      });

      // Parse RSS feed
      const outbreaks = [];
      // Note: WHO RSS parsing would require xml2js or similar library
      // For now, return empty array - would need additional dependency
      console.log('WHO RSS feed fetched, parsing not implemented yet');
      return outbreaks;
    } catch (error) {
      console.error('WHO API error:', error.message);
      throw error;
    }
  }

  // Fetch data from Integrated Disease Surveillance Programme
  async fetchFromIDSP() {
    try {
      const response = await axios.get(this.apiEndpoints.idsp, {
        timeout: 10000,
        headers: {
          'User-Agent': 'WhatsApp-Healthcare-Bot/1.0',
          'Authorization': `Bearer ${process.env.IDSP_API_KEY || ''}`
        }
      });

      const outbreaks = [];
      if (response.data && response.data.outbreaks) {
        for (const item of response.data.outbreaks) {
          outbreaks.push({
            disease_name: item.disease,
            location: item.location,
            state: item.state,
            district: item.district,
            pincode: item.pincode,
            severity: this.mapSeverity(item.alert_level),
            description: item.description,
            symptoms: item.symptoms,
            prevention_measures: item.prevention,
            reported_date: item.date_reported,
            status: item.status,
            source: 'IDSP',
            affected_population: item.cases,
            deaths: item.deaths
          });
        }
      }
      return outbreaks;
    } catch (error) {
      console.error('IDSP API error:', error.message);
      throw error;
    }
  }

  // Fetch data from National Vector Borne Disease Control Programme
  async fetchFromNVBDCP() {
    try {
      const response = await axios.get(this.apiEndpoints.nvbdcp, {
        timeout: 10000,
        headers: {
          'User-Agent': 'WhatsApp-Healthcare-Bot/1.0'
        }
      });

      const outbreaks = [];
      if (response.data && response.data.alerts) {
        for (const item of response.data.alerts) {
          outbreaks.push({
            disease_name: item.disease || 'Dengue/Malaria',
            location: item.location,
            state: item.state,
            district: item.district,
            pincode: item.pincode,
            severity: this.mapSeverity(item.severity),
            description: item.description,
            symptoms: item.symptoms,
            prevention_measures: item.prevention_measures,
            reported_date: item.reported_date,
            status: item.status,
            source: 'NVBDCP',
            affected_population: item.cases,
            deaths: item.deaths
          });
        }
      }
      return outbreaks;
    } catch (error) {
      console.error('NVBDCP API error:', error.message);
      throw error;
    }
  }

  // Map different severity levels to standardized format
  mapSeverity(severity) {
    if (!severity) return 'medium';

    const sev = severity.toString().toLowerCase();
    if (sev.includes('critical') || sev.includes('high') || sev === '3') return 'critical';
    if (sev.includes('severe') || sev === '2') return 'high';
    if (sev.includes('moderate') || sev === '1') return 'medium';
    if (sev.includes('low') || sev === '0') return 'low';

    return 'medium'; // default
  }

  // Store outbreak data in database
  async storeOutbreak(outbreakData) {
    try {
      // Normalize data for better duplicate detection
      const normalizedData = {
        disease_name: outbreakData.disease_name?.toLowerCase().trim(),
        location: outbreakData.location?.toLowerCase().trim(),
        state: outbreakData.state?.toLowerCase().trim(),
        district: outbreakData.district?.toLowerCase().trim(),
        reported_date: outbreakData.reported_date,
        source: outbreakData.source?.toLowerCase().trim()
      };

      // Check if outbreak already exists with more comprehensive matching
      const existing = await database.get(
        `SELECT id FROM outbreaks
         WHERE LOWER(TRIM(disease_name)) = ? AND LOWER(TRIM(location)) = ?
         AND reported_date = ? AND LOWER(TRIM(source)) = ?`,
        [
          normalizedData.disease_name,
          normalizedData.location,
          normalizedData.reported_date,
          normalizedData.source
        ]
      );

      if (existing) {
        // Update existing outbreak
        const result = await database.run(
          `UPDATE outbreaks SET
            state = ?, district = ?, pincode = ?, severity = ?, description = ?, symptoms = ?, prevention_measures = ?, status = ?, affected_population = ?, deaths = ?, updated_at = datetime('now')
            WHERE id = ?`,
          [
            outbreakData.state,
            outbreakData.district,
            outbreakData.pincode,
            outbreakData.severity,
            outbreakData.description,
            outbreakData.symptoms,
            outbreakData.prevention_measures,
            outbreakData.status,
            outbreakData.affected_population,
            outbreakData.deaths,
            existing.id
          ]
        );
        console.log(`Updated existing outbreak: ${outbreakData.disease_name} in ${outbreakData.location}`);
        return { id: existing.id, changes: result.changes, isNew: false };
      } else {
        // Insert new outbreak
        const result = await database.run(
          `INSERT INTO outbreaks
            (disease_name, location, state, district, pincode, severity, description, symptoms, prevention_measures, reported_date, status, source, affected_population, deaths, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            outbreakData.disease_name,
            outbreakData.location,
            outbreakData.state,
            outbreakData.district,
            outbreakData.pincode,
            outbreakData.severity,
            outbreakData.description,
            outbreakData.symptoms,
            outbreakData.prevention_measures,
            outbreakData.reported_date,
            outbreakData.status,
            outbreakData.source,
            outbreakData.affected_population,
            outbreakData.deaths
          ]
        );
        console.log(`Inserted new outbreak: ${outbreakData.disease_name} in ${outbreakData.location}`);
        return { id: result.id, changes: result.changes, isNew: true };
      }
    } catch (error) {
      console.error('Error storing outbreak:', error);
      throw error;
    }
  }

  // Get active outbreaks
  async getActiveOutbreaks() {
    try {
      const outbreaks = await database.all(
        'SELECT * FROM outbreaks WHERE status = ? ORDER BY reported_date DESC',
        ['active']
      );
      return outbreaks;
    } catch (error) {
      console.error('Error fetching active outbreaks:', error);
      return [];
    }
  }

  // Get outbreaks by location
  async getOutbreaksByLocation(pincode, district, state) {
    try {
      const filters = [];
      const params = ['active'];

      if (pincode) {
        filters.push('pincode = ?');
        params.push(pincode);
      }

      if (district) {
        filters.push('district = ?');
        params.push(district);
      }

      if (state) {
        filters.push('state = ?');
        params.push(state);
      }

      if (filters.length === 0) {
        return this.getActiveOutbreaks();
      }

      const query = `SELECT * FROM outbreaks WHERE status = ? AND (${filters.join(' OR ')}) ORDER BY severity DESC, reported_date DESC`;
      const outbreaks = await database.all(query, params);
      return outbreaks;
    } catch (error) {
      console.error('Error fetching outbreaks by location:', error);
      return [];
    }
  }

  // Send alert to specific user
  async sendAlertToUser(phoneNumber, outbreak, language = 'en') {
    try {
      const t = this.translations[language];
      const message = t.alertMessage
        .replace('{disease}', outbreak.disease_name)
        .replace('{location}', outbreak.location)
        .replace('{severity}', outbreak.severity)
        .replace('{symptoms}', outbreak.symptoms)
        .replace('{prevention}', outbreak.prevention_measures);

      await whatsappService.sendMessage(phoneNumber, message);

      // Log the alert
      await database.run(
        'INSERT INTO alert_logs (outbreak_id, phone_number, alert_type, message) VALUES (?, ?, ?, ?)',
        [outbreak.id, phoneNumber, 'whatsapp', message]
      );

      return true;
    } catch (error) {
      console.error('Error sending alert to user:', error);
      return false;
    }
  }

  // Broadcast alerts to users in affected areas
  async broadcastAlerts(outbreakId) {
    try {
      const outbreak = await database.get('SELECT * FROM outbreaks WHERE id = ?', [outbreakId]);
      if (!outbreak) return;

      // Get users in affected area
      const affectedUsers = await this.getUsersInAffectedArea(outbreak);

      let sentCount = 0;
      for (const user of affectedUsers) {
        const success = await this.sendAlertToUser(user.phone_number, outbreak, 'en'); // Default to English
        if (success) sentCount++;
      }

      console.log(`Broadcast complete: ${sentCount}/${affectedUsers.length} alerts sent for ${outbreak.disease_name}`);
      return sentCount;
    } catch (error) {
      console.error('Error broadcasting alerts:', error);
      return 0;
    }
  }

  // Get users in affected area
  async getUsersInAffectedArea(outbreak) {
    try {
      const users = await database.all(
        `SELECT ul.*, b.phone_number as baby_phone
         FROM user_locations ul
         LEFT JOIN babies b ON ul.phone_number = b.phone_number
         WHERE ul.pincode = ? OR ul.district = ? OR ul.state = ?`,
        [outbreak.pincode, outbreak.district, outbreak.state]
      );
      return users;
    } catch (error) {
      console.error('Error getting users in affected area:', error);
      return [];
    }
  }

  // Update user location
  async updateUserLocation(phoneNumber, locationData) {
    try {
      await database.run(
        `INSERT OR REPLACE INTO user_locations
         (phone_number, pincode, district, state, latitude, longitude, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          phoneNumber,
          locationData.pincode,
          locationData.district,
          locationData.state,
          locationData.latitude,
          locationData.longitude
        ]
      );
      return true;
    } catch (error) {
      console.error('Error updating user location:', error);
      return false;
    }
  }

  // Get outbreak information for chatbot responses
  async getOutbreakInfoForUser(pincode, district, state, language = 'en') {
    try {
      const outbreaks = this.deduplicateOutbreaks(await this.getOutbreaksByLocation(pincode, district, state));
      const t = this.translations[language];

      if (outbreaks.length === 0) {
        return t.noOutbreaks;
      }

      let message = t.outbreakInfo;
      for (const outbreak of outbreaks.slice(0, 3)) { // Limit to 3 most recent
        message += t.outbreakItem
          .replace('{disease}', outbreak.disease_name)
          .replace('{location}', outbreak.location)
          .replace('{severity}', outbreak.severity)
          .replace('{cases}', outbreak.affected_population || 'Unknown');
      }

      message += '\n' + t.alertMessage.replace('{disease}', 'General').replace('{location}', 'your area').replace('{severity}', 'Varies').replace('{symptoms}', 'Check local health advisories').replace('{prevention}', 'Follow health guidelines, stay informed');

      return message;
    } catch (error) {
      console.error('Error getting outbreak info:', error);
      return this.translations[language].noOutbreaks;
    }
  }

  // Scheduled task to fetch and update outbreak data
  async scheduledUpdate() {
    console.log('Running scheduled outbreak update...');
    try {
      const newOutbreaks = await this.fetchOutbreaksFromAPIs();

      for (const outbreak of newOutbreaks) {
        const storedOutbreak = await this.storeOutbreak(outbreak);
        if (storedOutbreak?.isNew && (outbreak.severity === 'critical' || outbreak.severity === 'high') && storedOutbreak.id) {
          await this.broadcastAlerts(storedOutbreak.id);
        }
      }

      console.log(`Outbreak update complete: ${newOutbreaks.length} new outbreaks processed`);
    } catch (error) {
      console.error('Error in scheduled outbreak update:', error);
    }
  }
}

module.exports = new OutbreakService();
