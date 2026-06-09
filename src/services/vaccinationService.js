const database = require('../config/database');
const axios = require('axios');

class VaccinationService {
  constructor() {
    this.cowinApiUrl = process.env.COWIN_API_URL || 'https://cdn-api.co-vin.in/api';
    this.translations = {
      en: {
        babyDetails: '👶 *Baby Details*\n',
        name: 'Name: {name}\n',
        mother: 'Mother: {mother_name}\n',
        dob: 'DOB: {dob}\n',
        age: 'Age: {age_in_days} days\n',
        overdue: '\n🚨 *Overdue*\n',
        overdueItem: '❗ {vaccine_name} ({description}) - *Please get this done immediately!*\n',
        upcoming: '\n📅 *Next Vaccine*\n',
        upcomingItem: '➡️ {vaccine_name} ({description})\n*Due in {days_until_due} days* (around {due_date})\n',
        completed: '\n✅ *Completed Vaccines*\n',
        completedItem: '✓ {vaccine_name}\n',
        contact: '\n📞 For more info, contact your health worker or call 104',
        noPending: '\n✅ *All vaccinations are up to date!*\n'
      },
      hi: {
        babyDetails: '👶 *बच्चे का विवरण*\n',
        name: 'नाम: {name}\n',
        mother: 'माता: {mother_name}\n',
        dob: 'जन्मतिथि: {dob}\n',
        age: 'आयु: {age_in_days} दिन\n',
        overdue: '\n🚨 *देर हो चुकी है*\n',
        overdueItem: '❗ {vaccine_name} ({description}) - *कृपया इसे तुरंत लगवाएं!*\n',
        upcoming: '\n📅 *अगला टीका*\n',
        upcomingItem: '➡️ {vaccine_name} ({description})\n*{days_until_due} दिनों में* ({due_date} के आसपास)\n',
        completed: '\n✅ *लग चुके टीके*\n',
        completedItem: '✓ {vaccine_name}\n',
        contact: '\n📞 अधिक जानकारी के लिए, अपने स्वास्थ्य कार्यकर्ता से संपर्क करें या 104 पर कॉल करें',
        noPending: '\n✅ *सभी टीके समय पर लगे हैं!*\n'
      },
      te: {
        babyDetails: '👶 *బిడ్డ వివరాలు*\n',
        name: 'పేరు: {name}\n',
        mother: 'తల్లి: {mother_name}\n',
        dob: 'జననం: {dob}\n',
        age: 'వయస్సు: {age_in_days} రోజులు\n',
        overdue: '\n🚨 *గడువు మించినవి*\n',
        overdueItem: '❗ {vaccine_name} ({description}) - *దయచేసి వెంటనే వేయించండి!*\n',
        upcoming: '\n📅 *తదుపరి టీకా*\n',
        upcomingItem: '➡️ {vaccine_name} ({description})\n*{days_until_due} రోజుల్లో గడువు* ({due_date} తేదీన)\n',
        completed: '\n✅ *పూర్తయిన టీకాలు*\n',
        completedItem: '✓ {vaccine_name}\n',
        contact: '\n📞 మరిన్ని వివరాల కోసం, మీ ఆరోగ్య కార్యకర్తను సంప్రదించండి లేదా 104కు కాల్ చేయండి',
        noPending: '\n✅ *అన్ని టీకాలు తాజాగా ఉన్నాయి!*\n'
      },
      or: {
        babyDetails: '👶 *ବାଳକ ବିବରଣୀ*\n',
        name: 'ନାମ: {name}\n',
        mother: 'ମାତା: {mother_name}\n',
        dob: 'ଜନ୍ମତାରିଖ: {dob}\n',
        age: 'ବୟସ: {age_in_days} ଦିନ\n',
        overdue: '\n🚨 *ବାକି ଅଛି*\n',
        overdueItem: '❗ {vaccine_name} ({description}) - *ଦୟାକରି ଏହାକୁ ତୁରନ୍ତ କରନ୍ତୁ!*\n',
        upcoming: '\n📅 *ପରବର୍ତ୍ତୀ ଟୀକା*\n',
        upcomingItem: '➡️ {vaccine_name} ({description})\n*{days_until_due} ଦିନରେ* ({due_date} ତାରିଖରେ)\n',
        completed: '\n✅ *ସମ୍ପୂର୍ଣ୍ଣ ଟୀକା*\n',
        completedItem: '✓ {vaccine_name}\n',
        contact: '\n📞 ଅଧିକ ସୂଚନା ପାଇଁ, ଆପଣଙ୍କ ସ୍ଵାସ୍ଥ୍ୟ କର୍ମୀଙ୍କୁ ଯୋଗାଯୋଗ କରନ୍ତୁ କିମ୍ବା 104ରେ କଲ୍ କରନ୍ତୁ',
        noPending: '\n✅ *ସମସ୍ତ ଟୀକା ସମୟ ଅନୁସାରେ ଅଛି!*\n'
      }
    };
    // Comprehensive vaccination schedule for India
    this.vaccinationSchedule = [
      // At Birth
      { name: 'BCG', ageInDays: 0, description: 'Tuberculosis - Birth dose' },
      { name: 'Hepatitis B 1', ageInDays: 0, description: 'Hepatitis B - Birth dose' },
      { name: 'OPV 0', ageInDays: 0, description: 'Polio - Birth dose' },

      // 6 Weeks
      { name: 'DPT 1', ageInDays: 42, description: 'Diphtheria, Pertussis, Tetanus - 6 weeks' },
      { name: 'Pentavalent 1', ageInDays: 42, description: 'DPT + Hepatitis B + Hib - 6 weeks' },
      { name: 'Hepatitis B 2', ageInDays: 42, description: 'Hepatitis B - 6 weeks' },
      { name: 'OPV 1', ageInDays: 42, description: 'Polio - 6 weeks' },
      { name: 'Rotavirus 1', ageInDays: 42, description: 'Rotavirus - 6 weeks' },
      { name: 'PCV 1', ageInDays: 42, description: 'Pneumococcal - 6 weeks' },

      // 10 Weeks
      { name: 'DPT 2', ageInDays: 70, description: 'Diphtheria, Pertussis, Tetanus - 10 weeks' },
      { name: 'Pentavalent 2', ageInDays: 70, description: 'DPT + Hepatitis B + Hib - 10 weeks' },
      { name: 'OPV 2', ageInDays: 70, description: 'Polio - 10 weeks' },
      { name: 'Rotavirus 2', ageInDays: 70, description: 'Rotavirus - 10 weeks' },
      { name: 'PCV 2', ageInDays: 70, description: 'Pneumococcal - 10 weeks' },

      // 14 Weeks
      { name: 'DPT 3', ageInDays: 98, description: 'Diphtheria, Pertussis, Tetanus - 14 weeks' },
      { name: 'Pentavalent 3', ageInDays: 98, description: 'DPT + Hepatitis B + Hib - 14 weeks' },
      { name: 'OPV 3', ageInDays: 98, description: 'Polio - 14 weeks' },
      { name: 'Rotavirus 3', ageInDays: 98, description: 'Rotavirus - 14 weeks' },
      { name: 'PCV 3', ageInDays: 98, description: 'Pneumococcal - 14 weeks' },
      { name: 'IPV', ageInDays: 98, description: 'Inactivated Polio Vaccine - 14 weeks' },

      // 6 Months
      { name: 'Hepatitis B 3', ageInDays: 180, description: 'Hepatitis B - 6 months' },

      // 9 Months
      { name: 'Measles 1', ageInDays: 270, description: 'Measles - 9 months' },
      { name: 'MR 1', ageInDays: 270, description: 'Measles-Rubella - 9 months' },
      { name: 'JE 1', ageInDays: 270, description: 'Japanese Encephalitis - 9 months' },

      // 12-15 Months
      { name: 'MMR 1', ageInDays: 450, description: 'Measles, Mumps, Rubella - 15 months' },
      { name: 'Varicella 1', ageInDays: 450, description: 'Chickenpox - 15 months' },
      { name: 'Hepatitis A 1', ageInDays: 450, description: 'Hepatitis A - 15 months' },

      // 15-18 Months
      { name: 'DPT Booster', ageInDays: 540, description: 'Diphtheria, Pertussis, Tetanus - 18 months' },
      { name: 'Pentavalent Booster', ageInDays: 540, description: 'DPT + Hepatitis B + Hib - 18 months' },
      { name: 'PCV Booster', ageInDays: 540, description: 'Pneumococcal - 18 months' },
      { name: 'OPV Booster', ageInDays: 540, description: 'Polio - 18 months' },

      // 18-24 Months
      { name: 'Hepatitis A 2', ageInDays: 720, description: 'Hepatitis A - 24 months' },

      // 4-6 Years
      { name: 'DPT Booster 2', ageInDays: 1825, description: 'Diphtheria, Pertussis, Tetanus - 5 years' },
      { name: 'Td Booster', ageInDays: 1825, description: 'Tetanus, Diphtheria - 5 years' },
      { name: 'OPV Booster 2', ageInDays: 1825, description: 'Polio - 5 years' },
      { name: 'MMR 2', ageInDays: 1825, description: 'Measles, Mumps, Rubella - 5 years' },
      { name: 'Varicella 2', ageInDays: 1825, description: 'Chickenpox - 5 years' },
      { name: 'Measles 2', ageInDays: 1825, description: 'Measles - 5 years' }
    ];
  }

  // Improved vaccine name matching to avoid false positives
  isVaccineMatch(recordName, scheduleName) {
    if (!recordName || !scheduleName) return false;

    const record = recordName.toLowerCase().trim();
    const schedule = scheduleName.toLowerCase().trim();

    // Exact match
    if (record === schedule) return true;

    // Handle common variations and abbreviations
    const recordWords = record.split(/\s+/);
    const scheduleWords = schedule.split(/\s+/);

    // Check if all significant words from schedule name are present in record name
    // This handles cases like "DPT 1" matching "DPT" but not "DPT 2" when looking for "DPT 1"
    const significantScheduleWords = scheduleWords.filter(word =>
      !word.match(/^\d+$/) // Exclude pure numbers
    );

    return significantScheduleWords.every(word =>
      recordWords.some(recordWord => recordWord.includes(word) || word.includes(recordWord))
    );
  }

  async getBabyDetails(beneficiaryId) {
    try {
      const baby = await database.get(
        'SELECT * FROM babies WHERE beneficiary_id = ?',
        [beneficiaryId]
      );
      return baby;
    } catch (error) {
      console.error('Error fetching baby details:', error);
      return null;
    }
  }

  async getVaccinationStatus(beneficiaryId) {
    try {
      const baby = await this.getBabyDetails(beneficiaryId);
      if (!baby) {
        return null;
      }

      const vaccinationRecords = await database.all(
        'SELECT * FROM vaccination_records WHERE beneficiary_id = ? ORDER BY vaccination_date',
        [beneficiaryId]
      );

      const birthDate = new Date(baby.dob);
      const today = new Date();
      const ageInDays = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));

      const status = {
        baby: baby,
        ageInDays: ageInDays,
        completed: [],
        pending: [],
        overdue: [],
        upcoming: []
      };

      // Check each vaccination in the schedule
      for (const vaccine of this.vaccinationSchedule) {
        const record = vaccinationRecords.find(r =>
          this.isVaccineMatch(r.vaccine_name, vaccine.name)
        );

        if (record && record.status === 'completed') {
          // Explicitly marked as completed in database
          status.completed.push({
            ...vaccine,
            vaccinationDate: record.vaccination_date
          });
        } else if (record && record.status === 'pending') {
          // Explicitly marked as pending - treat as overdue if past due date
          if (ageInDays >= vaccine.ageInDays) {
            const daysPastDue = ageInDays - vaccine.ageInDays;
            status.overdue.push({
              ...vaccine,
              daysPastDue: daysPastDue
            });
          } else {
            // Still upcoming
            const daysUntilDue = vaccine.ageInDays - ageInDays;
            const dueDate = new Date(birthDate);
            dueDate.setDate(dueDate.getDate() + vaccine.ageInDays);

            status.upcoming.push({
              ...vaccine,
              daysUntilDue: daysUntilDue,
              dueDate: dueDate
            });
          }
        } else {
          // No record in database - age-eligible vaccines should be marked overdue
          if (ageInDays >= vaccine.ageInDays) {
            const daysPastDue = ageInDays - vaccine.ageInDays;
            status.overdue.push({
              ...vaccine,
              daysPastDue: daysPastDue
            });
          } else {
            // Still upcoming
            const daysUntilDue = vaccine.ageInDays - ageInDays;
            const dueDate = new Date(birthDate);
            dueDate.setDate(dueDate.getDate() + vaccine.ageInDays);

            status.upcoming.push({
              ...vaccine,
              daysUntilDue: daysUntilDue,
              dueDate: dueDate
            });
          }
        }
      }

      return status;
    } catch (error) {
      console.error('Error getting vaccination status:', error);
      return null;
    }
  }

  async upsertVaccinationRecord(beneficiaryId, vaccineName, vaccinationDate, extraFields = {}) {
    const existingRecord = await database.get(
      'SELECT id FROM vaccination_records WHERE beneficiary_id = ? AND vaccine_name = ?',
      [beneficiaryId, vaccineName]
    );

    if (existingRecord) {
      await database.run(
        `UPDATE vaccination_records
         SET vaccination_date = ?, status = ?, next_due_date = ?, dose = ?, source = ?
         WHERE id = ?`,
        [
          vaccinationDate,
          extraFields.status || 'completed',
          extraFields.nextDueDate || null,
          extraFields.dose || null,
          extraFields.source || null,
          existingRecord.id
        ]
      );

      return { id: existingRecord.id };
    }

    const result = await database.run(
      `INSERT INTO vaccination_records
       (beneficiary_id, vaccine_name, vaccination_date, next_due_date, status, dose, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        beneficiaryId,
        vaccineName,
        vaccinationDate,
        extraFields.nextDueDate || null,
        extraFields.status || 'completed',
        extraFields.dose || null,
        extraFields.source || null
      ]
    );

    return result;
  }

  async markVaccinationComplete(beneficiaryId, vaccineName, vaccinationDate) {
    try {
      const result = await this.upsertVaccinationRecord(
        beneficiaryId,
        vaccineName,
        vaccinationDate,
        { status: 'completed' }
      );
      return result;
    } catch (error) {
      console.error('Error marking vaccination complete:', error);
      return null;
    }
  }

  formatVaccinationStatus(status, lang = 'en') {
    const t = this.translations[lang];
    let message = t.babyDetails;
    message += t.name.replace('{name}', status.baby.baby_name || 'Baby ' + status.baby.mother_name);
    message += t.mother.replace('{mother_name}', status.baby.mother_name);
    message += t.dob.replace('{dob}', status.baby.dob);
    message += t.age.replace('{age_in_days}', status.ageInDays);

    // --- NEW SIMPLIFIED MESSAGE FORMAT ---

    // 1. Show Overdue vaccines first (if any)
    if (status.overdue.length > 0) {
      message += t.overdue;
      for (const vaccine of status.overdue) {
        message += t.overdueItem.replace('{vaccine_name}', vaccine.name)
                                .replace('{description}', vaccine.description);
      }
    }

    // 2. Show the single next upcoming vaccine
    if (status.upcoming.length > 0) {
      const nextVaccine = status.upcoming[0];
      message += t.upcoming;
      message += t.upcomingItem.replace('{vaccine_name}', nextVaccine.name)
                               .replace('{description}', nextVaccine.description)
                               .replace('{days_until_due}', nextVaccine.daysUntilDue)
                               .replace('{due_date}', nextVaccine.dueDate.toDateString());
    }

    // 3. If no overdue or upcoming, show a confirmation message
    if (status.overdue.length === 0 && status.upcoming.length === 0) {
        message += t.noPending;
    }

    // 4. Show a simple list of completed vaccines
    if (status.completed.length > 0) {
      message += t.completed;
      // Create a simple, comma-separated list of vaccine names
      const completedNames = status.completed.map(v => v.name).join(', ');
      message += completedNames;
    }

    message += t.contact;
    return message;
  }

  // COWIN API Integration Methods

  // Fetch vaccination certificate by beneficiary ID
  async getCOWINCertificate(beneficiaryId) {
    try {
      const response = await axios.get(`${this.cowinApiUrl}/v2/registration/certificate/public/find`, {
        params: {
          beneficiary_reference_id: beneficiaryId
        },
        headers: {
          'User-Agent': 'WhatsApp-Healthcare-Bot/1.0'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('COWIN Certificate API error:', error.message);
      return null;
    }
  }

  // Fetch vaccination history by mobile number (requires OTP verification)
  async getCOWINHistoryByMobile(mobileNumber) {
    try {
      // First, generate OTP
      const otpResponse = await axios.post(`${this.cowinApiUrl}/v2/auth/public/generateOTP`, {
        mobile: mobileNumber
      }, {
        headers: {
          'User-Agent': 'WhatsApp-Healthcare-Bot/1.0'
        },
        timeout: 5000
      });

      if (otpResponse.data && otpResponse.data.txnId) {
        return {
          txnId: otpResponse.data.txnId,
          message: 'OTP sent to mobile number. Please provide OTP to continue.'
        };
      }

      return null;
    } catch (error) {
      console.error('COWIN OTP generation error:', error.message);
      return null;
    }
  }

  // Verify OTP and get vaccination details
  async verifyCOWINOTP(txnId, otp) {
    try {
      const response = await axios.post(`${this.cowinApiUrl}/v2/auth/public/confirmOTP`, {
        txnId: txnId,
        otp: otp
      }, {
        headers: {
          'User-Agent': 'WhatsApp-Healthcare-Bot/1.0'
        },
        timeout: 5000
      });

      if (response.data && response.data.token) {
        // Use token to fetch beneficiary details
        const beneficiaryResponse = await axios.get(`${this.cowinApiUrl}/v2/registration/certificate/public/download`, {
          headers: {
            'Authorization': `Bearer ${response.data.token}`,
            'User-Agent': 'WhatsApp-Healthcare-Bot/1.0'
          },
          timeout: 10000
        });

        return beneficiaryResponse.data;
      }

      return null;
    } catch (error) {
      console.error('COWIN OTP verification error:', error.message);
      return null;
    }
  }

  // Sync COWIN data with local database
  async syncWithCOWIN(beneficiaryId) {
    try {
      const cowinData = await this.getCOWINCertificate(beneficiaryId);

      if (cowinData && cowinData.beneficiaries) {
        for (const beneficiary of cowinData.beneficiaries) {
          // Update local database with COWIN data
          for (const vaccination of beneficiary.vaccinations) {
            await this.upsertVaccinationRecord(
              beneficiaryId,
              vaccination.vaccine,
              vaccination.date,
              {
                dose: vaccination.dose,
                status: 'completed',
                source: 'COWIN'
              }
            );
          }
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('COWIN sync error:', error.message);
      return false;
    }
  }

  // Enhanced vaccination status with COWIN integration
  async getEnhancedVaccinationStatus(beneficiaryId, lang = 'en') {
    try {
      // First try to sync with COWIN
      await this.syncWithCOWIN(beneficiaryId);

      // Then get the standard status
      return await this.getVaccinationStatus(beneficiaryId);
    } catch (error) {
      console.error('Enhanced vaccination status error:', error.message);
      // Fallback to local data only
      return await this.getVaccinationStatus(beneficiaryId);
    }
  }

  // Get vaccination centers by pincode
  async getVaccinationCenters(pincode, date) {
    try {
      const response = await axios.get(`${this.cowinApiUrl}/v2/appointment/sessions/public/findByPin`, {
        params: {
          pincode: pincode,
          date: date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').reverse().join('-')
        },
        headers: {
          'User-Agent': 'WhatsApp-Healthcare-Bot/1.0'
        },
        timeout: 10000
      });

      return response.data.sessions || [];
    } catch (error) {
      console.error('COWIN centers API error:', error.message);
      return [];
    }
  }
}

module.exports = new VaccinationService();
