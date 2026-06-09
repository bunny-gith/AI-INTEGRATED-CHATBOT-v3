const database = require('../config/database');

class HealthWorkerService {
  constructor() {
    this.translations = {
      en: {
        workersInPincode: '🏥 *Health Workers in {pincode}*\n\n',
        workerDetails: '👨‍⚕️ *{name}*\n{designation}\n📞 {phone_number}\n🏥 {facility_name} ({facility_type})\n📍 {address}\n\n',
        noWorkersFound: '❌ *No health workers found for pincode {pincode}*\n\n',
        nearbyWorkers: '🔍 *Nearby Health Workers:*\n\n',
        nearbyWorkerDetails: '👨‍⚕️ *{name}*\n{designation}\n📞 {phone_number}\n🏥 {facility_name}\n📮 Pincode: {pincode}\n\n',
        tips: '💡 *Tips:*\n• Call during working hours (9 AM - 5 PM)\n• Keep your health card ready\n• Mention your symptoms clearly\n',
        suggestion: '💡 *Suggestion:* Contact district health office for exact details in your area.',
        alternativeOptions: `🏥 *Alternative Options:*\n• Contact District Health Office\n• Visit nearest PHC/CHC\n• Call State Health Helpline\n• Emergency: 108 / 102\n\n`,
        helplines: `💡 *Government Health Helplines:*\n• National Health Helpline: 1800-180-1104\n• Ayushman Bharat: 14555\n• Emergency Services: 108`,
        error: `❌ *Unable to fetch health worker information*\n\n🏥 *Emergency Contacts:*\n• Emergency: 108\n• Police: 100\n• Fire: 101\n• Health Helpline: 104\n\n💡 Try again later or contact local health authorities.`,
      },
      hi: {
        workersInPincode: '🏥 *{pincode} में स्वास्थ्य कार्यकर्ता*\n\n',
        workerDetails: '👨‍⚕️ *{name}*\n{designation}\n📞 {phone_number}\n🏥 {facility_name} ({facility_type})\n📍 {address}\n\n',
        noWorkersFound: '❌ *पिनकोड {pincode} के लिए कोई स्वास्थ्य कार्यकर्ता नहीं मिला*\n\n',
        nearbyWorkers: '🔍 *निकटवर्ती स्वास्थ्य कार्यकर्ता:*\n\n',
        nearbyWorkerDetails: '👨‍⚕️ *{name}*\n{designation}\n📞 {phone_number}\n🏥 {facility_name}\n📮 पिनकोड: {pincode}\n\n',
        tips: '💡 *सुझाव:*\n• काम के घंटों के दौरान कॉल करें (सुबह 9 बजे - शाम 5 बजे)\n• अपना हेल्थ कार्ड तैयार रखें\n• अपने लक्षणों का स्पष्ट रूप से उल्लेख करें\n',
        suggestion: '💡 *सुझाव:* अपने क्षेत्र में सटीक विवरण के लिए जिला स्वास्थ्य कार्यालय से संपर्क करें।',
        alternativeOptions: `🏥 *वैकल्पिक विकल्प:*\n• जिला स्वास्थ्य कार्यालय से संपर्क करें\n• निकटतम पीएचसी/सीएचसी पर जाएँ\n• राज्य स्वास्थ्य हेल्पलाइन पर कॉल करें\n• आपातकालीन: 108 / 102\n\n`,
        helplines: `💡 *सरकारी स्वास्थ्य हेल्पलाइन:*\n• राष्ट्रीय स्वास्थ्य हेल्पलाइन: 1800-180-1104\n• आयुष्मान भारत: 14555\n• आपातकालीन सेवाएं: 108`,
        error: `❌ *स्वास्थ्य कार्यकर्ता की जानकारी लाने में असमर्थ*\n\n🏥 *आपातकालीन संपर्क:*\n• आपातकालीन: 108\n• पुलिस: 100\n• अग्निशमन: 101\n• स्वास्थ्य हेल्पलाइन: 104\n\n💡 बाद में फिर से प्रयास करें या स्थानीय स्वास्थ्य अधिकारियों से संपर्क करें।`,
      },
      te: {
        workersInPincode: '🏥 *{pincode}లో ఆరోగ్య కార్యకర్తలు*\n\n',
        workerDetails: '👨‍⚕️ *{name}*\n{designation}\n📞 {phone_number}\n🏥 {facility_name} ({facility_type})\n📍 {address}\n\n',
        noWorkersFound: '❌ *పిన్‌కోడ్ {pincode} కోసం ఆరోగ్య కార్యకర్తలు కనుగొనబడలేదు*\n\n',
        nearbyWorkers: '🔍 *సమీప ఆరోగ్య కార్యకర్తలు:*\n\n',
        nearbyWorkerDetails: '👨‍⚕️ *{name}*\n{designation}\n📞 {phone_number}\n🏥 {facility_name}\n📮 పిన్‌కోడ్: {pincode}\n\n',
        tips: '💡 *చిట్కాలు:*\n• పనివేళలలో కాల్ చేయండి (ఉదయం 9 - సాయంత్రం 5)\n• మీ హెల్త్ కార్డును సిద్ధంగా ఉంచుకోండి\n• మీ లక్షణాలను స్పష్టంగా పేర్కొనండి\n',
        suggestion: '💡 *సూచన:* మీ ప్రాంతంలో ఖచ్చితమైన వివరాల కోసం జిల్లా ఆరోగ్య కార్యాలయాన్ని సంప్రదించండి.',
        alternativeOptions: `🏥 *ప్రత్యామ్నాయ ఎంపికలు:*\n• జిల్లా ఆరోగ్య కార్యాలయాన్ని సంప్రదించండి\n• సమీప PHC/CHCని సందర్శించండి\n• రాష్ట్ర ఆరోగ్య హెల్ప్‌లైన్‌కు కాల్ చేయండి\n• అత్యవసర: 108 / 102\n\n`,
        helplines: `💡 *ప్రభుత్వ ఆరోగ్య హెల్ప్‌లైన్‌లు:*\n• జాతీయ ఆరోగ్య హెల్ప్‌లైన్: 1800-180-1104\n• ఆయుష్మాన్ భారత్: 14555\n• అత్యవసర సేవలు: 108`,
        error: `❌ *ఆరోగ్య కార్యకర్త సమాచారాన్ని తీసుకురావడం సాధ్యం కాలేదు*\n\n🏥 *అత్యవసర పరిచయాలు:*\n• అత్యవసర: 108\n• పోలీస్: 100\n• అగ్నిమాపక: 101\n• ఆరోగ్య హెల్ప్‌లైన్: 104\n\n💡 తర్వాత మళ్ళీ ప్రయత్నించండి లేదా స్థానిక ఆరోగ్య అధికారులను సంప్రదించండి.`,
      }
    };
  }

  async findHealthWorkers(pincode, lang = 'en') {
    const t = this.translations[lang];
    try {
      const workers = await database.all(
        `SELECT * FROM health_workers WHERE pincode = ? ORDER BY facility_type`,
        [pincode]
      );

      if (workers.length > 0) {
        return this.formatHealthWorkersList(workers, pincode, lang);
      }

      // If no workers found for exact pincode, try nearby areas
      const nearbyWorkers = await this.findNearbyHealthWorkers(pincode);
      if (nearbyWorkers.length > 0) {
        return this.formatNearbyHealthWorkersList(nearbyWorkers, pincode, lang);
      }

      return this.getNoWorkersFoundMessage(pincode, lang);
    } catch (error) {
      console.error('Error finding health workers:', error);
      return this.getErrorResponse(lang);
    }
  }

  async findNearbyHealthWorkers(pincode) {
    try {
      // Simple logic to find nearby pincodes (first 3 digits match)
      const areaCode = pincode.substring(0, 3);
      const workers = await database.all(
        `SELECT * FROM health_workers WHERE pincode LIKE ? AND pincode != ? ORDER BY facility_type LIMIT 5`,
        [`${areaCode}%`, pincode]
      );
      return workers;
    } catch (error) {
      console.error('Error finding nearby health workers:', error);
      return [];
    }
  }

  formatHealthWorkersList(workers, pincode, lang = 'en') {
    const t = this.translations[lang];
    let message = t.workersInPincode.replace('{pincode}', pincode);

    for (const worker of workers) {
      message += t.workerDetails.replace('{name}', worker.name)
                                .replace('{designation}', worker.designation)
                                .replace('{phone_number}', worker.phone_number)
                                .replace('{facility_name}', worker.facility_name)
                                .replace('{facility_type}', worker.facility_type)
                                .replace('{address}', worker.address || '');
    }

    message += t.tips;
    
    return message;
  }

  formatNearbyHealthWorkersList(workers, pincode, lang = 'en') {
    const t = this.translations[lang];
    let message = t.noWorkersFound.replace('{pincode}', pincode);
    message += t.nearbyWorkers;

    for (const worker of workers.slice(0, 3)) {
      message += t.nearbyWorkerDetails.replace('{name}', worker.name)
                                      .replace('{designation}', worker.designation)
                                      .replace('{phone_number}', worker.phone_number)
                                      .replace('{facility_name}', worker.facility_name)
                                      .replace('{pincode}', worker.pincode);
    }

    message += t.suggestion;
    return message;
  }

  getNoWorkersFoundMessage(pincode, lang = 'en') {
    const t = this.translations[lang];
    return t.noWorkersFound.replace('{pincode}', pincode) + '\n' +
           t.alternativeOptions + '\n' +
           t.helplines;
  }

  getErrorResponse(lang = 'en') {
    return this.translations[lang].error;
  }

  async addHealthWorker(workerData) {
    try {
      const result = await database.run(
        `INSERT INTO health_workers (name, designation, phone_number, pincode, facility_name, facility_type, address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          workerData.name,
          workerData.designation,
          workerData.phone_number,
          workerData.pincode,
          workerData.facility_name,
          workerData.facility_type,
          workerData.address
        ]
      );
      return result;
    } catch (error) {
      console.error('Error adding health worker:', error);
      throw error;
    }
  }
}

module.exports = new HealthWorkerService();