const geminiService = require('./chatgptService'); // Still using chatgptService for the file name, but it's Gemini

class MedicineService {
  constructor() {
    this.translations = {
      en: {
        error: `❌ *Unable to fetch medicine information*\n\n🏥 *Please:*\n• Consult your doctor\n• Visit nearest pharmacy\n• Contact health worker\n• Call medicine helpline: 1800-180-1234\n\n⚠️ Always get professional medical advice for medicines!`,
        neverTake: `⚠️ *Remember:* Never take unknown medicines without proper guidance!`,
      },
      hi: {
        error: `❌ *दवा की जानकारी लाने में असमर्थ*\n\n🏥 *कृपया:*\n• अपने डॉक्टर से सलाह लें\n• निकटतम फार्मेसी पर जाएँ\n• स्वास्थ्य कार्यकर्ता से संपर्क करें\n• दवा हेल्पलाइन पर कॉल करें: 1800-180-1234\n\n⚠️ दवाओं के लिए हमेशा पेशेवर चिकित्सा सलाह लें!`,
        neverTake: `⚠️ *याद रखें:* बिना उचित मार्गदर्शन के कभी भी अज्ञात दवाएं न लें!`,
      },
      te: {
        error: `❌ *మందుల సమాచారం తీసుకురావడం సాధ్యం కాలేదు*\n\n🏥 *దయచేసి:*\n• మీ డాక్టర్ను సంప్రదించండి\n• సమీప ఫార్మసీని సందర్శించండి\n• ఆరోగ్య కార్యకర్తను సంప్రదించండి\n• మందుల హెల్ప్‌లైన్: 1800-180-1234\n\n⚠️ మందుల కోసం ఎల్లప్పుడూ వృత్తిపరమైన వైద్య సలహా తీసుకోండి!`,
        neverTake: `⚠️ *గుర్తుంచుకోండి:* సరైన మార్గదర్శకత్వం లేకుండా తెలియని మందులను ఎప్పుడూ తీసుకోకండి!`,
      },
      or: {
        error: `❌ *ଔଷଧ ସୂଚନା ଆଣିବାରେ ଅସମର୍ଥ*\n\n🏥 *ଦୟାକରି:*\n• ଆପଣଙ୍କ ଡାକ୍ତରଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ\n• ନିକଟସ୍ଥ ଫାର୍ମେସୀରେ ଯାଆନ୍ତୁ\n• ସ୍ଵାସ୍ଥ୍ୟ କର୍ମୀଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ\n• ଔଷଧ ହେଲ୍ପଲାଇନ୍ 1800-180-1234ରେ କଲ୍ କରନ୍ତୁ\n\n⚠️ ଔଷଧ ପାଇଁ ସର୍ବଦା ବୃତ୍ତିଗତ ଚିକିତ୍ସକ ପରାମର୍ଶ ନିଅନ୍ତୁ!`,
        neverTake: `⚠️ *ମନେ ରଖନ୍ତୁ:* ସଠିକ୍ ମାର୍ଗଦର୍ଶନ ବିନା କଦାପି ଅଜ୍ଞାତ ଔଷଧ ନିଅନ୍ତୁ!`,
      }
    };
  }

  async searchMedicine(medicineName, lang = 'en') {
    const t = this.translations[lang];
    try {
      // Directly use AI to search for medicine information
      console.log(`Searching for medicine "${medicineName}" using AI...`);
      const aiResponse = await this.searchMedicineWithAI(medicineName, lang);
      return aiResponse;

    } catch (error) {
      console.error('Error in medicine search:', error);
      return this.getErrorResponse(lang);
    }
  }

  async searchMedicineWithAI(medicineName, lang = 'en') {
    const t = this.translations[lang];
    // Prompt for Gemini AI to get medicine information
    const prompt = `Provide detailed information for the medicine "${medicineName}". 
    Include its uses, recommended dosage, important precautions, and possible side effects. 
    Format the response clearly with headings. Keep it concise and in ${lang}. 
    Crucially, add a strong disclaimer at the end that this is not medical advice and a doctor should be consulted.`;

    try {
      // *** THE CRITICAL CHANGE IS HERE: Pass both the prompt and the language ***
      const aiAnalysis = await geminiService.getAIResponse(prompt, this.getLanguageName(lang));

      // Handle both object and string responses from AI service
      const medicineInfo = typeof aiAnalysis === 'object' ? aiAnalysis.text : aiAnalysis;

      // Return AI-generated medicine information
      return medicineInfo + '\n\n' + t.neverTake;
    } catch (error) {
      console.error('Error with AI medicine search:', error);
      // Fallback to basic guidance if AI also fails
      return this.getBasicMedicineGuidance(medicineName, lang);
    }
  }



  getErrorResponse(lang = 'en') {
    return this.translations[lang].error;
  }

  getLanguageName(langCode) {
    switch (langCode) {
      case 'en': return 'English';
      case 'hi': return 'Hindi';
      case 'te': return 'Telugu';
      case 'or': return 'Odia';
      default: return 'English';
    }
  }

  getBasicMedicineGuidance(medicineName, lang = 'en') {
    const t = this.translations[lang];
    return `${t.error}\n\n💊 *Basic guidance for "${medicineName}":*\n• Always consult a healthcare professional before taking any medicine\n• Check for allergies and interactions\n• Follow prescribed dosage only\n• Store medicines properly\n• Never share prescription medicines\n\n${t.neverTake}`;
  }

}

module.exports = new MedicineService();