const axios = require('axios');
const geminiService = require('../services/chatgptService');
const { OpenAI } = require('openai');
const fs = require('fs');
const FormData = require('form-data');
const medicineService = require('../services/medicineService');
const vaccinationService = require('../services/vaccinationService');
const healthWorkerService = require('../services/healthWorkerService');
const outbreakService = require('../services/outbreakService');
const whatsappService = require('../services/whatsappService');
const database = require('../config/database'); // Import database

class BotController {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    this.userSessions = new Map();
    this.translations = {
      en: {
        welcome: `🏥 *Welcome to HealthCare Bot*\nYour rural health assistant\n\nPlease select an option:`,
        menu: `1️⃣ Symptom Checker\n2️⃣ Medicine Information\n3️⃣ Vaccination Schedule\n4️⃣ Find Health Worker\n5️⃣ Emergency Contacts\n6️⃣ Voice Assistant\n7️⃣ Disease Outbreaks\n8️⃣ Request a Callback\n9️⃣ Change Language\n\nSimply type the number (1-9) of your choice.`,
        symptomCheckerPrompt: `🩺 *Symptom Checker*\n\nPlease describe your symptoms in detail.\nFor example: "I have fever and headache for 2 days"\n\nI'll provide basic guidance, but remember:\n⚠️ This is not a replacement for professional medical advice\n\nType your symptoms or "back" to return to main menu.`,
        medicineInfoPrompt: `💊 *Medicine Information*\n\nPlease enter the name of the medicine you want to know about.\nFor example: "Paracetamol" or "Crocin"\n\nI'll provide information about:\n• Uses and purpose\n• Dosage instructions\n• Precautions\n• Side effects\n\nType medicine name or "back" to return to main menu.`,
        vaccinationPrompt: `💉 *Vaccination Schedule*\n\nPlease enter your child's Beneficiary ID to check vaccination status.\n\nExample: BEN001\n\nI'll show you:\n• Completed vaccinations\n• Next vaccination due\n• Overdue vaccinations (if any)\n\nType Beneficiary ID or "back" to return to main menu.`,
        healthWorkerPrompt: `👨‍⚕️ *Find Health Worker*\n\nPlease enter your 6-digit pincode to find nearby government health workers.\n\nExample: 110001\n\nI'll provide:\n• Doctor/nurse contact details\n• Health facility information\n• Working hours\n\nType your pincode or "back" to return to main menu.`,
        emergencyResponse: `🚨 *EMERGENCY CONTACTS*\n\n📞 *Medical Emergency:*\n🏥 108 - Ambulance Service\n🏥 102 - Health Helpline\n\n📞 *Other Emergency Services:*\n👮 100 - Police\n🚒 101 - Fire Service\n\n📞 *Health Helplines:*\n🏥 104 - National Health Helpline\n🏥 14555 - Ayushman Bharat\n\n⚡ *For immediate emergency, call 108*`,
        voiceAssistantPrompt: `🎤 *Voice Assistant*\n\nSend me a voice message describing what you need help with.\n\nI can help with:\n• Symptoms and health concerns\n• Medicine information\n• Vaccination queries\n• Finding health workers\n• Emergency situations\n\nJust record a voice message and send it to me!\n\nType "back" to return to the main menu.`,
        callbackPrompt: `📞 *Request a Callback*\n\nPlease select your preferred language for the callback from a health counselor:\n1. English\n2. हिंदी (Hindi)\n3. తెలుగు (Telugu)\n4. ଓଡ଼ିଆ (Odia)\n\nType "back" to return to the main menu.`,
        callbackConfirmation: `✅ Thank you!\n\nWe have received your request. A health counselor will contact you soon.\n\n`,
        feedbackRequest: (counselor) => `📞 Our health counselor ${counselor} has contacted you.\n\nHow did they assist you? Please rate their service (1-5) or provide feedback:\n\n1. Very Poor\n2. Poor\n3. Average\n4. Good\n5. Excellent\n\nOr type your feedback directly.\n\nType "back" to return to main menu.`,
        feedbackThankYou: `🙏 Thank you for your feedback!\n\nYour input helps us improve our services.`,
        returnToMenu: `Type "hi" to return to the main menu.`,
        back: 'back',
        error: 'Sorry, I encountered an error while processing your request. Please try again or type "hi" to return to the main menu.'
      },
      hi: {
        welcome: `🏥 *हेल्थकेयर बॉट में आपका स्वागत है*\nआपके ग्रामीण स्वास्थ्य सहायक\n\nकृपया एक विकल्प चुनें:`,
        menu: `1️⃣ लक्षण जांच\n2️⃣ दवा की जानकारी\n3️⃣ टीकाकरण अनुसूची\n4️⃣ स्वास्थ्य कार्यकर्ता खोजें\n5️⃣ आपातकालीन संपर्क\n6️⃣ वॉइस असिस्टेंट\n7️⃣ रोग प्रकोप\n8️⃣ कॉलबैक का अनुरोध करें\n9️⃣ भाषा बदलें\n\nअपना विकल्प (1-9) टाइप करें।`,
        symptomCheckerPrompt: `🩺 *लक्षण जांच*\n\nकृपया अपने लक्षणों का विस्तार से वर्णन करें।\nउदाहरण के लिए: "मुझे 2 दिनों से बुखार और सिरदर्द है"\n\nमैं बुनियादी मार्गदर्शन प्रदान करूंगा, लेकिन याद रखें:\n⚠️ यह पेशेवर चिकित्सा सलाह का विकल्प नहीं है\n\nअपने लक्षण टाइप करें या मुख्य मेनू पर लौटने के लिए "back" टाइप करें।`,
        medicineInfoPrompt: `💊 *दवा की जानकारी*\n\nकृपया उस दवा का नाम दर्ज करें जिसके बारे में आप जानना चाहते हैं।\nउदाहरण के लिए: "Paracetamol" या "Crocin"\n\nमैं इसके बारे में जानकारी प्रदान करूंगा:\n• उपयोग और उद्देश्य\n• खुराक निर्देश\n• सावधानियाँ\n• दुष्प्रभाव\n\nदवा का नाम टाइप करें या मुख्य मेनू पर लौटने के लिए "back" टाइप करें।`,
        vaccinationPrompt: `💉 *टीकाकरण अनुसूची*\n\nटीकाकरण की स्थिति की जांच करने के लिए कृपया अपने बच्चे की लाभार्थी आईडी दर्ज करें।\n\nउदाहरण: BEN001\n\nमैं आपको दिखाऊंगा:\n• पूर्ण टीकाकरण\n• अगला टीकाकरण देय\n• अतिदेय टीकाकरण (यदि कोई हो)\n\nलाभार्थी आईडी टाइप करें या मुख्य मेनू पर लौटने के लिए "back" टाइप करें।`,
        healthWorkerPrompt: `👨‍⚕️ *स्वास्थ्य कार्यकर्ता खोजें*\n\nनिकटतम सरकारी स्वास्थ्य कार्यकर्ताओं को खोजने के लिए कृपया अपना 6-अंकीय पिनकोड दर्ज करें।\n\nउदाहरण: 110001\n\nमैं प्रदान करूंगा:\n• डॉक्टर/नर्स संपर्क विवरण\n• स्वास्थ्य सुविधा की जानकारी\n• काम के घंटे\n\nअपना पिनकोड टाइप करें या मुख्य मेनू पर लौटने के लिए "back" टाइप करें।`,
        emergencyResponse: `🚨 *आपातकालीन संपर्क*\n\n📞 *चिकित्सा आपातकाल:*\n🏥 108 - एम्बुलेंस सेवा\n🏥 102 - स्वास्थ्य हेल्पलाइन\n\n📞 *अन्य आपातकालीन सेवाएं:*\n👮 100 - पुलिस\n🚒 101 - अग्निशमन सेवा\n\n📞 *स्वास्थ्य हेल्पलाइन:*\n🏥 104 - राष्ट्रीय स्वास्थ्य हेल्पलाइन\n🏥 14555 - आयुष्मान भारत\n\n⚡ *तत्काल आपातकाल के लिए, 108 पर कॉल करें*`,
        voiceAssistantPrompt: `🎤 *वॉइस असिस्टेंट*\n\nमुझे एक वॉइस मैसेज भेजें जिसमें बताएं कि आप किस प्रकार की मदद चाहते हैं।\n\nमैं इन चीजों में मदद कर सकता हूं:\n• लक्षण और स्वास्थ्य संबंधी चिंताएं\n• दवा की जानकारी\n• टीकाकरण संबंधी प्रश्न\n• स्वास्थ्य कार्यकर्ता खोजना\n• आपातकालीन स्थितियां\n\nबस एक वॉइस मैसेज रिकॉर्ड करके मुझे भेजें!\n\nमुख्य मेनू पर लौटने के लिए "back" टाइप करें।`,
        callbackPrompt: `📞 *कॉलबैक का अनुरोध करें*\n\nकृपया स्वास्थ्य परामर्शदाता से कॉलबैक के लिए अपनी पसंदीदा भाषा चुनें:\n1. English\n2. हिंदी (Hindi)\n3. తెలుగు (Telugu)\n4. ଓଡ଼ିଆ (Odia)\n\nमुख्य मेनू पर लौटने के लिए "back" टाइप करें।`,
        callbackConfirmation: `✅ धन्यवाद!\n\nहमें आपका अनुरोध मिल गया है। एक स्वास्थ्य परामर्शदाता जल्द ही आपसे संपर्क करेगा।\n\n`,
        feedbackRequest: (counselor) => `📞 हमारा स्वास्थ्य परामर्शदाता ${counselor} ने आपसे संपर्क किया है।\n\nउन्होंने आपकी कैसे मदद की? कृपया उनकी सेवा को रेट करें (1-5) या प्रतिक्रिया दें:\n\n1. बहुत खराब\n2. खराब\n3. औसत\n4. अच्छा\n5. बहुत अच्छा\n\nया सीधे अपनी प्रतिक्रिया टाइप करें।\n\nमुख्य मेनू पर लौटने के लिए "back" टाइप करें।`,
        feedbackThankYou: `🙏 अपनी प्रतिक्रिया के लिए धन्यवाद!\n\nआपका इनपुट हमारी सेवाओं को बेहतर बनाने में मदद करता है।`,
        returnToMenu: `मुख्य मेनू पर लौटने के लिए "hi" टाइप करें।`,
        back: 'back',
        error: 'क्षमा करें, आपके अनुरोध को संसाधित करते समय एक त्रुटि हुई। कृपया पुन: प्रयास करें या सहायता के लिए संपर्क करें।'
      },
      te: {
        welcome: `🏥 *హెల్త్‌కేర్ బోట్‌కి స్వాగతం*\nమీ గ్రామీణ ఆరోగ్య సహాయకుడు\n\nదయచేసి ఒక ఎంపికను ఎంచుకోండి:`,
        menu: `1️⃣ లక్షణాల చెకర్\n2️⃣ మందుల సమాచారం\n3️⃣ టీకా షెడ్యూల్\n4️⃣ ఆరోగ్య కార్యకర్తను కనుగొనండి\n5️⃣ అత్యవసర పరిచయాలు\n6️⃣ వాయిస్ అసిస్టెంట్\n7️⃣ వ్యాధి వ్యాప్తులు\n8️⃣ కాల్‌బ్యాక్ అభ్యర్థించండి\n9️⃣ భాష మార్చు\n\nమీ ఎంపిక (1-9) టైప్ చేయండి.`,
        symptomCheckerPrompt: `🩺 *లక్షణాల చెకర్*\n\nదయచేసి మీ లక్షణాలను వివరంగా వివరించండి.\nఉదాహరణకు: "నాకు 2 రోజులుగా జ్వరం మరియు తలనొప్పి ఉంది"\n\nనేను ప్రాథమిక మార్గదర్శకత్వం అందిస్తాను, కానీ గుర్తుంచుకోండి:\n⚠️ ఇది వృత్తిపరమైన వైద్య సలహాకు ప్రత్యామ్నాయం కాదు\n\nమీ లక్షణాలను టైప్ చేయండి లేదా ప్రధాన మెనూకి తిరిగి వెళ్లడానికి "back" అని టైప్ చేయండి.`,
        medicineInfoPrompt: `💊 *మందుల సమాచారం*\n\nమీరు తెలుసుకోవాలనుకుంటున్న మందు పేరును దయచేసి నమోదు చేయండి.\nఉదాహరణకు: "Paracetamol" లేదా "Crocin"\n\nనేను దీని గురించి సమాచారం అందిస్తాను:\n• ఉపయోగాలు మరియు ఉద్దేశ్యం\n• మోతాదు సూచనలు\n• జాగ్రత్తలు\n• దుష్ప్రభావాలు\n\nమందు పేరు టైప్ చేయండి లేదా ప్రధాన మెనూకి తిరిగి వెళ్లడానికి "back" అని టైప్ చేయండి.`,
        vaccinationPrompt: `💉 *టీకా షెడ్యూల్*\n\nటీకా స్థితిని తనిఖీ చేయడానికి దయచేసి మీ బిడ్డ యొక్క లబ్ధిదారు ఐడిని నమోదు చేయండి.\n\nఉదాహరణ: BEN001\n\nనేను మీకు చూపిస్తాను:\n• పూర్తయిన టీకాలు\n• తదుపరి టీకా గడువు\n• అతిదేయ టీకాలు (ఏవైనా ఉంటే)\n\nలబ్ధిదారు ఐడి టైప్ చేయండి లేదా ప్రధాన మెనూకి తిరిగి వెళ్లడానికి "back" అని టైప్ చేయండి.`,
        healthWorkerPrompt: `👨‍⚕️ *ఆరోగ్య కార్యకర్తను కనుగొనండి*\n\nసమీపంలోని ప్రభుత్వ ఆరోగ్య కార్యకర్తలను కనుగొనడానికి దయచేసి మీ 6-అంకెల పిన్‌కోడ్‌ను నమోదు చేయండి.\n\nఉదాహరణ: 110001\n\nనేను అందిస్తాను:\n• డాక్టర్/నర్సు సంప్రదింపు వివరాలు\n• ఆరోగ్య సదుపాయం సమాచారం\n• పనివేళలు\n\nమీ పిన్‌కోడ్ టైప్ చేయండి లేదా ప్రధాన మెనూకి తిరిగి వెళ్లడానికి "back" అని టైప్ చేయండి.`,
        emergencyResponse: `🚨 *అత్యవసర పరిచయాలు*\n\n📞 *వైద్య అత్యవసరం:*\n🏥 108 - అంబులెన్స్ సేవ\n🏥 102 - ఆరోగ్య హెల్ప్‌లైన్\n\n📞 *ఇతర అత్యవసర సేవలు:*\n👮 100 - పోలీస్\n🚒 101 - అగ్నిమాపక సేవ\n\n📞 *ఆరోగ్య హెల్ప్‌లైన్‌లు:*\n🏥 104 - జాతీయ ఆరోగ్య హెల్ప్‌లైన్\n🏥 14555 - ఆయుష్మాన్ భారత్\n\n⚡ *తక్షణ అత్యవసరం కోసం, 108కు కాల్ చేయండి*`,
        voiceAssistantPrompt: `🎤 *వాయిస్ అసిస్టెంట్*\n\nమీకు ఏమి సహాయం కావాలో వివరించి నాకు వాయిస్ మెసేజ్ పంపండి.\n\nనేను ఈ విషయాలలో సహాయం చేయగలను:\n• లక్షణాలు మరియు ఆరోగ్య సమస్యలు\n• మందుల సమాచారం\n• టీకా సంబంధిత ప్రశ్నలు\n• ఆరోగ్య కార్యకర్తలను కనుగొనడం\n• అత్యవసర పరిస్థితులు\n\nకేవలం వాయిస్ మెసేజ్ రికార్డ్ చేసి నాకు పంపండి!\n\nప్రధాన మెనూకు తిరిగి వెళ్లడానికి "back" అని టైప్ చేయండి.`,
        callbackPrompt: `📞 *కాల్‌బ్యాక్ అభ్యర్థించండి*\n\nదయచేసి ఆరోగ్య సలహాదారు నుండి కాల్‌బ్యాక్ కోసం మీకు ఇష్టమైన భాషను ఎంచుకోండి:\n1. English\n2. हिंदी (Hindi)\n3. తెలుగు (Telugu)\n4. ଓଡ଼ିଆ (Odia)\n\nప్రధాన మెనూకు తిరిగి వెళ్లడానికి "back" అని టైప్ చేయండి.`,
        callbackConfirmation: `✅ ధన్యవాదాలు!\n\nమేము మీ అభ్యర్థనను స్వీకరించాము. ఆరోగ్య సలహాదారు త్వరలో మిమ్మల్ని సంప్రదిస్తారు.\n\n`,
        feedbackRequest: (counselor) => `📞 మా ఆరోగ్య సలహాదారు ${counselor} మిమ్మల్ని సంప్రదించారు.\n\nవారు మీకు ఎలా సహాయం చేశారు? దయచేసి వారి సేవను రేట్ చేయండి (1-5) లేదా అభిప్రాయం ఇవ్వండి:\n\n1. చాలా చెడు\n2. చెడు\n3. సగటు\n4. మంచి\n5. చాలా మంచి\n\nలేదా నేరుగా మీ అభిప్రాయాన్ని టైప్ చేయండి.\n\nప్రధాన మెనూకి తిరిగి వెళ్లడానికి "back" అని టైప్ చేయండి.`,
        feedbackThankYou: `🙏 మీ అభిప్రాయం కోసం ధన్యవాదాలు!\n\nమీ ఇన్‌పుట్ మా సేవలను మెరుగుపరచడంలో సహాయపడుతుంది.`,
        returnToMenu: `ప్రధాన మెనూకు తిరిగి వెళ్లడానికి "hi" అని టైప్ చేయండి.`,
        back: 'back',
        error: 'క్షమించండి, మీ అభ్యర్థనను ప్రాసెస్ చేస్తున్నప్పుడు ఒక లోపం సంభవించింది. దయచేసి మళ్ళీ ప్రయత్నించండి లేదా సహాయం కోసం సంప్రదించండి.'
      },
      or: {
        welcome: `🏥 *ସ୍ଵାଗତମ୍ ହେଲ୍ଥକେୟାର୍ ବଟ୍*\nଆପଣଙ୍କ ଗ୍ରାମୀଣ ସ୍ଵାସ୍ଥ୍ୟ ସହାୟକ\n\nଦୟାକରି ଏକ ପସନ୍ଦ ବାଛନ୍ତୁ:`,
        menu: `1️⃣ ଲକ୍ଷଣ ଯାଞ୍ଚ\n2️⃣ ଔଷଧ ସୂଚନା\n3️⃣ ଟୀକା ସୂଚୀ\n4️⃣ ସ୍ଵାସ୍ଥ୍ୟ କର୍ମୀ ଖୋଜନ୍ତୁ\n5️⃣ ଜରୁରୀକାଳୀନ ସଂପର୍କ\n6️⃣ ଭଏସ୍ ଆସିଷ୍ଟାଣ୍ଟ\n7️⃣ ରୋଗ ପ୍ରକୋପ\n8️⃣ କଲ୍‌ବ୍ୟାକ୍ ଅନୁରୋଧ କରନ୍ତୁ\n9️⃣ ଭାଷା ବଦଳାନ୍ତୁ\n\nଆପଣଙ୍କ ପସନ୍ଦ (1-9) ଟାଇପ୍ କରନ୍ତୁ।`,
        symptomCheckerPrompt: `🩺 *ଲକ୍ଷଣ ଯାଞ୍ଚ*\n\nଦୟାକରି ଆପଣଙ୍କ ଲକ୍ଷଣଗୁଡ଼ିକୁ ବିସ୍ତୃତ ଭାବରେ ବର୍ଣ୍ଣନା କରନ୍ତୁ।\nଉଦାହରଣ ସ୍ଵରୂପ: "ମୋତେ 2 ଦିନ ହେଲା ଜ୍ଵର ଏବଂ ମୁଣ୍ଡବିନ୍ଧା ଅଛି"\n\nମୁଁ ପ୍ରାଥମିକ ମାର୍ଗଦର୍ଶନ ଦେବି, କିନ୍ତୁ ମନେ ରଖନ୍ତୁ:\n⚠️ ଏହା ବୃତ୍ତିଗତ ଚିକିତ୍ସକ ପରାମର୍ଶର ବିକଳ୍ପ ନୁହେଁ\n\nଆପଣଙ୍କ ଲକ୍ଷଣ ଟାଇପ୍ କରନ୍ତୁ କିମ୍ବା ମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ "back" ଟାଇପ୍ କରନ୍ତୁ।`,
        medicineInfoPrompt: `💊 *ଔଷଧ ସୂଚନା*\n\nଦୟାକରି ଆପଣ ଜାଣିବାକୁ ଚାହୁଁଥିବା ଔଷଧର ନାମ ଦାଖଲ କରନ୍ତୁ।\nଉଦାହରଣ ସ୍ଵରୂପ: "Paracetamol" କିମ୍ବା "Crocin"\n\nମୁଁ ଏହା ବିଷୟରେ ସୂଚନା ଦେବି:\n• ବ୍ୟବହାର ଏବଂ ଉଦ୍ଦେଶ୍ୟ\n• ମାତ୍ରା ନିର୍ଦ୍ଦେଶ\n• ସାବଧାନତା\n• ପାର୍ଶ୍ୱ ପ୍ରଭାବ\n\nଔଷଧ ନାମ ଟାଇପ୍ କରନ୍ତୁ କିମ୍ବା ମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ "back" ଟାଇପ୍ କରନ୍ତୁ।`,
        vaccinationPrompt: `💉 *ଟୀକା ସୂଚୀ*\n\nଟୀକା ସ୍ଥିତି ଯାଞ୍ଚ କରିବାକୁ ଦୟାକରି ଆପଣଙ୍କ ପିଲାର ଲାଭାର୍ଥୀ ID ଦାଖଲ କରନ୍ତୁ।\n\nଉଦାହରଣ: BEN001\n\nମୁଁ ଆପଣଙ୍କୁ ଦେଖାଇବି:\n• ସମ୍ପୂର୍ଣ୍ଣ ଟୀକାକରଣ\n• ପରବର୍ତ୍ତୀ ଟୀକା ଦେୟ\n• ବାକି ଥିବା ଟୀକା (ଯଦି କୌଣସି)\n\nଲାଭାର୍ଥୀ ID ଟାଇପ୍ କରନ୍ତୁ କିମ୍ବା ମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ "back" ଟାଇପ୍ କରନ୍ତୁ।`,
        healthWorkerPrompt: `👨‍⚕️ *ସ୍ଵାସ୍ଥ୍ୟ କର୍ମୀ ଖୋଜନ୍ତୁ*\n\nନିକଟସ୍ଥ ସରକାରୀ ସ୍ଵାସ୍ଥ୍ୟ କର୍ମୀମାନଙ୍କୁ ଖୋଜିବାକୁ ଦୟାକରି ଆପଣଙ୍କ 6-ଅଙ୍କର ପିନକୋଡ୍ ଦାଖଲ କରନ୍ତୁ।\n\nଉଦାହରଣ: 110001\n\nମୁଁ ପ୍ରଦାନ କରିବି:\n• ଡାକ୍ତର/ନର୍ସ ସଂପର୍କ ବିବରଣୀ\n• ସ୍ଵାସ୍ଥ୍ୟ ସୁବିଧା ସୂଚନା\n• କାର୍ଯ୍ୟ ସମୟ\n\nଆପଣଙ୍କ ପିନକୋଡ୍ ଟାଇପ୍ କରନ୍ତୁ କିମ୍ବା ମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ "back" ଟାଇପ୍ କରନ୍ତୁ।`,
        emergencyResponse: `🚨 *ଜରୁରୀକାଳୀନ ସଂପର୍କ*\n\n📞 *ଚିକିତ୍ସକ ଜରୁରୀକାଳୀନ:*\n🏥 108 - ଆମ୍ବୁଲାନ୍ସ ସେବା\n🏥 102 - ସ୍ଵାସ୍ଥ୍ୟ ହେଲ୍ପଲାଇନ୍\n\n📞 *ଅନ୍ୟାନ୍ୟ ଜରୁରୀକାଳୀନ ସେବା:*\n👮 100 - ପୋଲିସ୍\n🚒 101 - ଅଗ୍ନିଶାମନ\n\n📞 *ସ୍ଵାସ୍ଥ୍ୟ ହେଲ୍ପଲାଇନ୍:*\n🏥 104 - ଜାତୀୟ ସ୍ଵାସ୍ଥ୍ୟ ହେଲ୍ପଲାଇନ୍\n🏥 14555 - ଆୟୁଷ୍ମାନ୍ ଭାରତ\n\n⚡ *ତତକ୍ଷଣାତ୍ ଜରୁରୀକାଳୀନ ପାଇଁ 108 କୁ କଲ୍ କରନ୍ତୁ*`,
        voiceAssistantPrompt: `🎤 *ଭଏସ୍ ଆସିଷ୍ଟାଣ୍ଟ*\n\nଆପଣ କ'ଣ ସାହାଯ୍ୟ ଚାହୁଁଛନ୍ତି ତାହା ବର୍ଣ୍ଣନା କରି ମୋତେ ଏକ ଭଏସ୍ ମେସେଜ୍ ପଠାନ୍ତୁ।\n\nମୁଁ ଏହି ବିଷୟଗୁଡ଼ିକରେ ସାହାଯ୍ୟ କରିପାରିବି:\n• ଲକ୍ଷଣ ଏବଂ ସ୍ଵାସ୍ଥ୍ୟ ସମସ୍ୟା\n• ଔଷଧ ସୂଚନା\n• ଟୀକାକରଣ ପ୍ରଶ୍ନ\n• ସ୍ଵାସ୍ଥ୍ୟ କର୍ମୀ ଖୋଜା\n• ଜରୁରୀକାଳୀନ ପରିସ୍ଥିତି\n\nକେବଳ ଏକ ଭଏସ୍ ମେସେଜ୍ ରେକର୍ଡ କରି ମୋତେ ପଠାନ୍ତୁ!\n\nମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ "back" ଟାଇପ୍ କରନ୍ତୁ।`,
        callbackPrompt: `📞 *କଲ୍‌ବ୍ୟାକ୍ ଅନୁରୋଧ କରନ୍ତୁ*\n\nସ୍ଵାସ୍ଥ୍ୟ ପରାମର୍ଶଦାତାଙ୍କଠାରୁ କଲ୍‌ବ୍ୟାକ୍ ପାଇଁ ଆପଣଙ୍କ ପସନ୍ଦିତ ଭାଷା ବାଛନ୍ତୁ:\n1. English\n2. हिंदी (Hindi)\n3. తెలుగు (Telugu)\n4. ଓଡ଼ିଆ (Odia)\n\nମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ "back" ଟାଇପ୍ କରନ୍ତୁ।`,
        callbackConfirmation: `✅ ଧନ୍ୟବାଦ!\n\nଆମେ ଆପଣଙ୍କ ଅନୁରୋଧ ଗ୍ରହଣ କରିଅଛୁ। ଏକ ସ୍ଵାସ୍ଥ୍ୟ ପରାମର୍ଶଦାତା ଶୀଘ୍ର ଆପଣଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରିବେ।\n\n`,
        feedbackRequest: (counselor) => `📞 ଆମର ସ୍ଵାସ୍ଥ୍ୟ ପରାମର୍ଶଦାତା ${counselor} ଆପଣଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରିଅଛନ୍ତି।\n\nସେ ଆପଣଙ୍କୁ କେମିତି ସାହାଯ୍ୟ କରିଲେ? ଦୟାକରି ସେମାନଙ୍କ ସେବାକୁ ରେଟ୍ କରନ୍ତୁ (1-5) କିମ୍ବା ମତାମତ ଦିଅନ୍ତୁ:\n\n1. ବହୁତ ଖରାପ\n2. ଖରାପ\n3. ମଧ୍ୟମ\n4. ଭଲ\n5. ବହୁତ ଭଲ\n\nକିମ୍ବା ସିଧାସଳଖ ଆପଣଙ୍କ ମତାମତ ଟାଇପ୍ କରନ୍ତୁ।\n\nମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ "back" ଟାଇପ୍ କରନ୍ତୁ।`,
        feedbackThankYou: `🙏 ଆପଣଙ୍କ ମତାମତ ପାଇଁ ଧନ୍ୟବାଦ!\n\nଆପଣଙ୍କ ଇନପୁଟ୍ ଆମର ସେବାଗୁଡ଼ିକୁ ଉନ୍ନତ କରିବାରେ ସାହାଯ୍ୟ କରେ।`,
        returnToMenu: `ମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ "hi" ଟାଇପ୍ କରନ୍ତୁ।`,
        back: 'back',
        error: 'କ୍ଷମା କରନ୍ତୁ, ଆପଣଙ୍କ ଅନୁରୋଧକୁ ପ୍ରକ୍ରିୟାକରଣ କରିବା ସମୟରେ ଏକ ତ୍ରୁଟି ଘଟିଲା। ଦୟାକରି ପୁନଃ ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ସାହାଯ୍ୟ ପାଇଁ ଯୋଗାଯୋଗ କରନ୍ତୁ।'
      }
    };
  }

  normalizeLanguage(language = 'en') {
    const value = String(language || '').toLowerCase().trim();

    if (['en', 'english'].includes(value)) return 'en';
    if (['hi', 'hindi'].includes(value)) return 'hi';
    if (['te', 'telugu'].includes(value)) return 'te';
    if (['or', 'odia', 'od'].includes(value)) return 'or';

    return 'en';
  }

  async handleIncomingMessage(messageData) {
    let response = '';
    const { from, message } = messageData;
    const userId = from.replace('whatsapp:', '');

    // Get or create user session
    let session = this.userSessions.get(userId) || {
      state: 'main_menu',
      data: {
        language: null // No default language, will trigger language selection
      }
    };
    session.userId = userId;
    if (session.data.language) {
      session.data.language = this.normalizeLanguage(session.data.language);
    }

    const lowerCaseMessage = message.toLowerCase().trim();

    // Global handler for 'hi' to return to main menu
    if (lowerCaseMessage === 'hi' && session.state !== 'main_menu') {
      session.state = 'main_menu';
      session.lastActivity = Date.now();
      this.userSessions.set(userId, session);
      return this.getMainMenuResponse(session.data.language);
    }

    // If no language selected, check if it's a direct language selection
    if (!session.data.language) {
      const input = message.toLowerCase().trim();
      if (['1', '2', '3', '4', 'en', 'english', 'hi', 'hindi', 'te', 'telugu', 'or', 'odia'].includes(input)) {
        // Direct language selection
        session.state = 'language_selection';
        response = await this.handleLanguageSelection(message, session);
      } else {
        // Show language selection prompt
        session.state = 'language_selection';
        response = this.getLanguageSelectionPrompt();
      }
    } else {
      const input = message.toLowerCase().trim();

      // Special handling for test voice messages
      if (input === 'voice_test') {
        return await this.handleVoiceMessage({ from, mediaUrl: 'test', mediaType: 'audio/ogg' });
      }

      // Handle based on current session state
      switch (session.state) {
        case 'main_menu':
          response = await this.handleMainMenu(message, session);
          break;
        case 'symptom_checker':
          response = await this.handleSymptomChecker(message, session);
          break;
        case 'medicine_info':
          response = await this.handleMedicineInfo(message, session);
          break;
        case 'vaccination_lookup':
          response = await this.handleVaccinationLookup(message, session);
          break;
        case 'health_worker_lookup':
          response = await this.handleHealthWorkerLookup(message, session);
          break;
        case 'emergency':
          response = await this.handleEmergency(message, session);
          break;
        case 'language_selection':
          response = await this.handleLanguageSelection(message, session);
          break;
        case 'voice_assistant':
          response = await this.handleVoiceAssistant(message, session);
          break;
        case 'request_callback':
          response = await this.handleCallbackRequest(message, session, userId);
          break;
        case 'feedback':
          response = await this.handleFeedback(message, session, userId);
          break;
        case 'outbreak_info':
          response = await this.handleOutbreakInfo(message, session, userId);
          break;
        default:
          response = this.getMainMenuResponse(session.data.language);
          session.state = 'main_menu';
      }
    }

    // Debug logging for incoming message and bot reply
    console.log("Incoming message:", messageData);
    console.log("Bot reply:", response);

    // Update session
    session.lastActivity = Date.now();
    this.userSessions.set(userId, session);

    // Return the response string
    return response;
  }

  async handleLanguageSelection(message, session) {
    const input = message.toLowerCase().trim();
    switch (input) {
      case '1':
      case 'en':
      case 'english':
        session.data.language = 'en';
        session.state = 'main_menu';
        return `Language set to English. ` + this.getMainMenuResponse(session.data.language);
      case '2':
      case 'hi':
      case 'hindi':
        session.data.language = 'hi';
        session.state = 'main_menu';
        return `भाषा हिंदी में बदल दी गई है। ` + this.getMainMenuResponse(session.data.language);
      case '3':
      case 'te':
      case 'telugu':
        session.data.language = 'te';
        session.state = 'main_menu';
        return `భాష తెలుగుకి మార్చబడింది. ` + this.getMainMenuResponse(session.data.language);
      case '4':
      case 'or':
      case 'odia':
        session.data.language = 'or';
        session.state = 'main_menu';
        return `ଭାଷା ଓଡ଼ିଆକୁ ବଦଳିଯାଇଛି। ` + this.getMainMenuResponse(session.data.language);
      default:
        return `Invalid selection. Please choose a valid option:\n` + this.getLanguageSelectionPrompt();
    }
  }

  async handleMainMenu(message, session) {
    const input = message.toLowerCase().trim();
    const lang = session.data.language || 'en';

    switch (input) {
      case '1':
        session.state = 'symptom_checker';
        return this.getSymptomCheckerPrompt(lang);
      
      case '2':
        session.state = 'medicine_info';
        return this.getMedicineInfoPrompt(lang);
      
      case '3':
        session.state = 'vaccination_lookup';
        return this.getVaccinationPrompt(lang);
      
      case '4':
        session.state = 'health_worker_lookup';
        return this.getHealthWorkerPrompt(lang);
      
      case '5':
        session.state = 'emergency';
        return this.getEmergencyResponse(lang);

      case '6':
        session.state = 'voice_assistant';
        return this.getVoiceAssistantPrompt(lang);

      case '7':
        session.state = 'outbreak_info';
        return this.getOutbreakPrompt(lang);

      case '8':
        session.state = 'request_callback';
        return this.translations[lang].callbackPrompt;

      case '9':
        session.state = 'language_selection';
        return this.getLanguageSelectionPrompt();

      default:
        return this.getMainMenuResponse(lang);
    }
  }

  async handleSymptomChecker(message, session) {
    const input = message.toLowerCase().trim();
    const lang = session.data.language || 'en';

    if (input === this.translations[lang].back || input === '0') {
      session.state = 'main_menu';
      return this.getMainMenuResponse(lang);
    }

    try {
      const analysis = await geminiService.getAIResponse(message, lang);

      // Handle structured AI response with confidence scoring
      if (typeof analysis === 'object' && analysis.text) {
        const { text, confidence, urgency, needsValidation } = analysis;

        // Only use conservative response for critical urgency cases
        if (urgency === 'CRITICAL') {
          await this.createValidationRequest(message, analysis, session);
          return this.getConservativeResponse(lang, urgency) + '\n\n' + this.getReturnToMenuMessage(lang);
        }

        // Return AI response directly without confidence indicator
        session.state = 'main_menu';
        return text + '\n\n' + this.getReturnToMenuMessage(lang);
      }

      // Fallback for old string responses
      session.state = 'main_menu';
      return analysis + '\n\n' + this.getReturnToMenuMessage(lang);
    } catch (error) {
      session.state = 'main_menu';
      return this.translations[lang].error + '\n\n' +
             this.getReturnToMenuMessage(lang);
    }
  }

  async handleMedicineInfo(message, session) {
    const input = message.toLowerCase().trim();
    const lang = session.data.language || 'en';

    if (input === this.translations[lang].back || input === '0') {
      session.state = 'main_menu';
      return this.getMainMenuResponse(lang);
    }

    try {
      const medicineInfo = await medicineService.searchMedicine(message, lang);
      session.state = 'main_menu';
      return medicineInfo + '\n\n' + this.getReturnToMenuMessage(lang);
    } catch (error) {
      session.state = 'main_menu';
      return this.translations[lang].error + '\n\n' + this.getReturnToMenuMessage(lang);
    }
  }

  async handleVaccinationLookup(message, session) {
    const input = message.toLowerCase().trim();
    const lang = session.data.language || 'en';

    if (input === this.translations[lang].back || input === '0') {
      session.state = 'main_menu';
      return this.getMainMenuResponse(lang);
    }

    try {
      const vaccinationStatus = await vaccinationService.getEnhancedVaccinationStatus(input);
      session.state = 'main_menu';

      if (vaccinationStatus) {
        return vaccinationService.formatVaccinationStatus(vaccinationStatus, lang) + 
               '\n\n' + this.getReturnToMenuMessage(lang);
      } else {
        const beneficiaryNotFoundError = (lang) => {
          if (lang === 'hi') {
            return `❌ लाभार्थी आईडी "${input}" नहीं मिला।\n\nकृपया आईडी जांचें और फिर से प्रयास करें।\nसहायता के लिए अपने स्वास्थ्य कार्यकर्ता से संपर्क करें।`;
          } else if (lang === 'te') {
            return `❌ లబ్ధిదారు ఐడి "${input}" కనుగొనబడలేదు.\n\nదయచేసి ఐడిని తనిఖీ చేసి, మళ్ళీ ప్రయత్నించండి.\nసహాయం కోసం మీ ఆరోగ్య కార్యకర్తను సంప్రదించండి.`;
          } else {
            return `❌ Beneficiary ID "${input}" not found.\n\nPlease check the ID and try again.\nContact your health worker for assistance.`;
          }
        };
        return beneficiaryNotFoundError(lang) + '\n\n' + this.getReturnToMenuMessage(lang);
      }
    } catch (error) {
      session.state = 'main_menu';
      return this.translations[lang].error + '\n\n' + this.getReturnToMenuMessage(lang);
    }
  }

  async handleHealthWorkerLookup(message, session) {
    const input = message.toLowerCase().trim();
    const lang = session.data.language || 'en';

    if (input === this.translations[lang].back || input === '0') {
      session.state = 'main_menu';
      return this.getMainMenuResponse(lang);
    }

    // Validate pincode (6 digits)
    if (!/^\d{6}$/.test(input)) {
      const pincodeError = (lang) => {
        if (lang === 'hi') {
          return `❌ कृपया 6-अंकीय वैध पिनकोड दर्ज करें।\n\nउदाहरण: 110001\n\nया मुख्य मेनू पर लौटने के लिए "back" टाइप करें।`;
        } else if (lang === 'te') {
          return `❌ దయచేసి 6-అంకెల సరైన పిన్‌కోడ్‌ను నమోదు చేయండి.\n\nఉదాహరణ: 110001\n\nలేదా ప్రధాన మెనూకి తిరిగి వెళ్లడానికి "back" అని టైప్ చేయండి.`;
        } else {
          return `❌ Please enter a valid 6-digit pincode.\n\nExample: 110001\n\nOr type "back" to return to main menu.`;
        }
      };
      return pincodeError(lang);
    }

    try {
      const healthWorkers = await healthWorkerService.findHealthWorkers(input, lang);
      session.state = 'main_menu';
      return healthWorkers + '\n\n' + this.getReturnToMenuMessage(lang);
    } catch (error) {
      session.state = 'main_menu';
      return this.translations[lang].error + '\n\n' + this.getReturnToMenuMessage(lang);
    }
  }

  async handleEmergency(message, session) {
    session.state = 'main_menu';
    const lang = session.data.language || 'en';
    return this.getEmergencyResponse(lang) + '\n\n' + this.getReturnToMenuMessage(lang);
  }

  async handleOutbreakInfo(message, session, userId) {
    const input = message.toLowerCase().trim();
    const lang = session.data.language || 'en';

    if (input === this.translations[lang].back || input === '0') {
      session.state = 'main_menu';
      return this.getMainMenuResponse(lang);
    }

    try {
      const userLocation = await database.get('SELECT * FROM user_locations WHERE phone_number = ?', [userId]);

      let pincode = null;
      let district = null;
      let state = null;

      if (input && /^\d{6}$/.test(input)) {
        // User provided pincode
        pincode = input;
        await outbreakService.updateUserLocation(userId, { pincode });
      } else if (userLocation) {
        pincode = userLocation.pincode;
        district = userLocation.district;
        state = userLocation.state;
      } else {
        return this.getOutbreakPrompt(lang);
      }

      const outbreakInfo = await outbreakService.getOutbreakInfoForUser(pincode, district, state, lang);
      session.state = 'main_menu';
      return outbreakInfo + '\n\n' + this.getReturnToMenuMessage(lang);
    } catch (error) {
      console.error('Error fetching outbreak info:', error);
      session.state = 'main_menu';
      return this.translations[lang].error + '\n\n' + this.getReturnToMenuMessage(lang);
    }
  }
  
  async handleCallbackRequest(message, session, userId) {
    const input = message.toLowerCase().trim();
    const lang = session.data.language || 'en';

    if (input === this.translations[lang].back || input === '0') {
        session.state = 'main_menu';
        return this.getMainMenuResponse(lang);
    }

    let selectedLang = '';

    switch (input) {
        case '1':
        case 'english':
            selectedLang = 'English';
            break;
        case '2':
        case 'hindi':
            selectedLang = 'Hindi';
            break;
        case '3':
        case 'telugu':
            selectedLang = 'Telugu';
            break;
        case '4':
        case 'odia':
            selectedLang = 'Odia';
            break;
        default:
            return `Invalid selection. Please choose a valid option:\n` + this.translations[lang].callbackPrompt;
    }

    try {
        // Log the callback request to the database
        await database.run(
            'INSERT INTO callback_requests (phone_number, language) VALUES (?, ?)',
            [userId, selectedLang]
        );
        session.state = 'main_menu';
        return this.translations[lang].callbackConfirmation + '\n\n' + this.getReturnToMenuMessage(lang);
    } catch (error) {
        console.error('Error logging callback request:', error);
        session.state = 'main_menu';
        return this.translations[lang].error + '\n\n' + this.getReturnToMenuMessage(lang);
    }
  }

  async markCallbackCompleted(phoneNumber, counselorName = 'Health Counselor') {
    try {
      // Update the callback request as completed
      await database.run(
        'UPDATE callback_requests SET status = ?, completed_at = CURRENT_TIMESTAMP, counselor_name = ? WHERE phone_number = ? AND status = ?',
        ['completed', counselorName, phoneNumber, 'pending']
      );

      // Get user's language preference
      const callbackRequest = await database.get(
        'SELECT language FROM callback_requests WHERE phone_number = ? AND status = ? ORDER BY created_at DESC LIMIT 1',
        [phoneNumber, 'completed']
      );

      const lang = this.normalizeLanguage(callbackRequest ? callbackRequest.language : 'en');

      const session = this.userSessions.get(phoneNumber) || {
        state: 'main_menu',
        data: { language: lang }
      };
      session.state = 'feedback';
      session.data.language = lang;
      session.lastActivity = Date.now();
      session.userId = phoneNumber;
      this.userSessions.set(phoneNumber, session);

      // Send feedback request message
      const feedbackMessage = this.getFeedbackRequestMessage(lang, counselorName);
      await whatsappService.sendMessage(phoneNumber, feedbackMessage);

      console.log(`Callback marked as completed for ${phoneNumber}, feedback request sent`);
      return true;
    } catch (error) {
      console.error('Error marking callback as completed:', error);
      return false;
    }
  }

  async handleFeedback(message, session, userId) {
    const input = message.toLowerCase().trim();
    const lang = session.data.language || 'en';

    if (input === this.translations[lang].back || input === '0') {
      session.state = 'main_menu';
      return this.getMainMenuResponse(lang);
    }

    // Handle feedback rating (1-5) or text feedback
    let rating = null;
    let feedbackText = '';

    if (['1', '2', '3', '4', '5'].includes(input)) {
      rating = parseInt(input);
      feedbackText = `Rating: ${rating}/5`;
    } else {
      feedbackText = message;
    }

    try {
      // Update the latest completed callback with feedback
      await database.run(
        'UPDATE callback_requests SET feedback_rating = ?, feedback_text = ?, feedback_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM callback_requests WHERE phone_number = ? AND status = ? ORDER BY completed_at DESC LIMIT 1)',
        [rating, feedbackText, userId, 'completed']
      );

      session.state = 'main_menu';
      return this.getFeedbackThankYouMessage(lang) + '\n\n' + this.getReturnToMenuMessage(lang);
    } catch (error) {
      console.error('Error saving feedback:', error);
      session.state = 'main_menu';
      return this.translations[lang].error + '\n\n' + this.getReturnToMenuMessage(lang);
    }
  }

  getLanguageSelectionPrompt() {
    return `🌍 Please select your preferred language / कृपया अपनी पसंदीदा भाषा चुनें / దయచేసి మీకు ఇష్టమైన భాషను ఎంచుకోండి / ଦୟାକରି ଆପଣଙ୍କ ପସନ୍ଦିତ ଭାଷା ବାଛନ୍ତୁ:\n\n1. English\n2. हिंदी (Hindi)\n3. తెలుగు (Telugu)\n4. ଓଡ଼ିଆ (Odia)`;
  }

  getMainMenuResponse(lang = 'en') {
    const normalizedLang = this.normalizeLanguage(lang);
    return `${this.translations[normalizedLang].welcome}\n\n${this.translations[normalizedLang].menu}`;
  }

  getSymptomCheckerPrompt(lang = 'en') {
    return this.translations[this.normalizeLanguage(lang)].symptomCheckerPrompt;
  }

  getMedicineInfoPrompt(lang = 'en') {
    return this.translations[this.normalizeLanguage(lang)].medicineInfoPrompt;
  }

  getVaccinationPrompt(lang = 'en') {
    return this.translations[this.normalizeLanguage(lang)].vaccinationPrompt;
  }

  getHealthWorkerPrompt(lang = 'en') {
    return this.translations[this.normalizeLanguage(lang)].healthWorkerPrompt;
  }

  getEmergencyResponse(lang = 'en') {
    return this.translations[this.normalizeLanguage(lang)].emergencyResponse;
  }

  async handleVoiceAssistant(message, session) {
    const input = message.toLowerCase().trim();
    const lang = session.data.language || 'en';

    if (input === this.translations[lang].back || input === '0') {
      session.state = 'main_menu';
      return this.getMainMenuResponse(lang);
    }

    // If they send text instead of voice, process it
    if (input) {
      // Analyze the text to determine intent
      const intent = this.analyzeIntent(input);

      switch (intent) {
        case 'symptoms':
        case 'medicine':
          // Use Gemini AI
          const analysis = await geminiService.getAIResponse(input, lang);
          const analysisText = typeof analysis === 'object' ? analysis.text : analysis;
          session.state = 'main_menu';
          return analysisText + '\n\n' + this.getReturnToMenuMessage(lang);

        case 'vaccination':
          session.state = 'vaccination_lookup';
          return this.getVaccinationPrompt(lang);

        case 'health_worker':
          session.state = 'health_worker_lookup';
          return this.getHealthWorkerPrompt(lang);

        case 'emergency':
          session.state = 'emergency';
          return this.getEmergencyResponse(lang);

        default:
          // For unknown text intents in voice mode, guide user back to main menu
          session.state = 'main_menu';
          return this.getMainMenuResponse(lang);
      }
    }

    // If no text, remind them to send voice
    return this.getVoiceAssistantPrompt(lang);
  }

  analyzeIntent(text) {
    const lowerText = text.toLowerCase();

    // Check for symptoms keywords
    const symptomKeywords = ['fever', 'headache', 'pain', 'cough', 'cold', 'nausea', 'vomiting', 'diarrhea', 'fever', 'ज्वर', 'सिरदर्द', 'दर्द', 'खांसी', 'जुकाम', 'जी मिचलाना', 'उल्टी', 'दस्त', 'జ్వరం', 'తలనొప్పి', 'నొప్పి', 'దగ్గు', 'జలుబు', 'వాంతి', 'అతిసారం'];
    if (symptomKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'symptoms';
    }

    // Check for medicine keywords
    const medicineKeywords = ['medicine', 'drug', 'tablet', 'capsule', 'syrup', 'injection', 'दवा', 'गोली', 'कैप्सूल', 'शराब', 'इंजेक्शन', 'మందు', 'టాబ్లెట్', 'క్యాప్సూల్', 'సిరప్', 'ఇంజెక్షన్'];
    if (medicineKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'medicine';
    }

    // Check for vaccination keywords
    const vaccinationKeywords = ['vaccination', 'vaccine', 'immunization', 'टीका', 'टीकाकरण', 'टीका', 'టీకా', 'టీకాకరణ'];
    if (vaccinationKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'vaccination';
    }

    // Check for health worker keywords
    const healthWorkerKeywords = ['doctor', 'nurse', 'health worker', 'hospital', 'clinic', 'डॉक्टर', 'नर्स', 'स्वास्थ्य कार्यकर्ता', 'अस्पताल', 'क्लिनिक', 'డాక్టర్', 'నర్స్', 'ఆరోగ్య కార్యకర్త', 'ఆస్పత్రి', 'క్లినిక్'];
    if (healthWorkerKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'health_worker';
    }

    // Check for emergency keywords
    const emergencyKeywords = ['emergency', 'urgent', 'help', 'accident', 'आपातकाल', 'तत्काल', 'मदद', 'दुर्घटना', 'అత్యవసరం', 'త్వరిత', 'సహాయం', 'దుర్ఘటన'];
    if (emergencyKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'emergency';
    }

    return 'unknown';
  }

  getVoiceAssistantPrompt(lang = 'en') {
    return this.translations[this.normalizeLanguage(lang)].voiceAssistantPrompt;
  }

  getOutbreakPrompt(lang = 'en') {
    const prompts = {
      en: `🦟 *Disease Outbreaks*\n\nPlease enter your 6-digit pincode to check active disease outbreaks in your area.\n\nExample: 530001\n\nType "back" to return to the main menu.`,
      hi: `🦟 *रोग प्रकोप जानकारी*\n\nअपने क्षेत्र में सक्रिय रोग प्रकोप देखने के लिए कृपया अपना 6-अंकीय पिनकोड दर्ज करें।\n\nउदाहरण: 530001\n\nमुख्य मेनू पर लौटने के लिए "back" टाइप करें।`,
      te: `🦟 *వ్యాధి వ్యాప్తి సమాచారం*\n\nమీ ప్రాంతంలోని సక్రియ వ్యాధి వ్యాప్తులను చూడటానికి దయచేసి మీ 6-అంకెల పిన్‌కోడ్‌ను నమోదు చేయండి.\n\nఉదాహరణ: 530001\n\nప్రధాన మెనూకు తిరిగి వెళ్లడానికి "back" అని టైప్ చేయండి.`,
      or: `🦟 *ରୋଗ ପ୍ରକୋପ ସୂଚନା*\n\nଆପଣଙ୍କ ଅଞ୍ଚଳରେ ସକ୍ରିୟ ରୋଗ ପ୍ରକୋପ ଦେଖିବା ପାଇଁ ଦୟାକରି ଆପଣଙ୍କ 6-ଅଙ୍କର ପିନକୋଡ୍ ଦାଖଲ କରନ୍ତୁ।\n\nଉଦାହରଣ: 530001\n\nମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ "back" ଟାଇପ୍ କରନ୍ତୁ।`
    };

    return prompts[this.normalizeLanguage(lang)];
  }

  getReturnToMenuMessage(lang = 'en') {
    return this.translations[this.normalizeLanguage(lang)].returnToMenu;
  }

  getFeedbackRequestMessage(lang = 'en', counselor = 'Health Counselor') {
    return this.translations[this.normalizeLanguage(lang)].feedbackRequest(counselor);
  }

  getFeedbackThankYouMessage(lang = 'en') {
    return this.translations[this.normalizeLanguage(lang)].feedbackThankYou;
  }

  async handleVoiceMessage(messageData) {
    const { from, mediaUrl, mediaType } = messageData;
    const userId = from.replace('whatsapp:', '');

    console.log('Processing voice message from:', userId, 'Media URL:', mediaUrl);

    try {
      // Get user session to determine language
      let session = this.userSessions.get(userId) || {
        state: 'main_menu',
        data: { language: 'en' }
      };

      session.userId = userId;
      const lang = this.normalizeLanguage(session.data.language || 'en');
      session.data.language = lang;
      console.log('User language:', lang);

      // Download and process the audio file
      console.log('Downloading audio from:', mediaUrl);
      const response = await axios.get(mediaUrl, {
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN
        },
        responseType: 'arraybuffer'
      });

      console.log('Audio downloaded, size:', response.data.length);
      const audioBuffer = Buffer.from(response.data);

      // Convert speech to text (mock implementation)
      console.log('Converting speech to text...');
      const transcript = await this.speechToText(audioBuffer, mediaType);
      console.log('Transcript:', transcript);

      if (!transcript) {
        return `🎤 I couldn't understand your voice message. Please try again or send a text message.\n\nType "hi" to return to the main menu.`;
      }

      // Process the transcript using the voice assistant logic
      const intent = this.analyzeIntent(transcript);
      console.log('Detected intent:', intent);

      let botResponse;
      switch (intent) {
        case 'symptoms':
        case 'medicine':
          // Use Gemini AI
          console.log('Using Gemini AI for analysis');
          botResponse = await geminiService.getAIResponse(transcript, lang);
          botResponse = typeof botResponse === 'object' ? botResponse.text : botResponse;
          session.state = 'main_menu';
          break;

        case 'vaccination':
          session.state = 'vaccination_lookup';
          botResponse = this.getVaccinationPrompt(lang);
          break;

        case 'health_worker':
          session.state = 'health_worker_lookup';
          botResponse = this.getHealthWorkerPrompt(lang);
          break;

        case 'emergency':
          session.state = 'emergency';
          botResponse = this.getEmergencyResponse(lang);
          break;

        default:
          // Use AI for unknown intents
          console.log('Using Gemini AI for unknown intent');
          botResponse = await geminiService.getAIResponse(transcript, lang);
          botResponse = typeof botResponse === 'object' ? botResponse.text : botResponse;
          session.state = 'main_menu';
      }

      // Update session
      session.lastActivity = Date.now();
      this.userSessions.set(userId, session);

      const finalResponse = `🎤 Voice processed: "${transcript}"\n\n${botResponse}\n\nType "hi" to return to the main menu.`;
      console.log('Sending response:', finalResponse.substring(0, 100) + '...');
      return finalResponse;

    } catch (error) {
      console.error('Error processing voice message:', error);
      return 'Sorry, I couldn\'t process your voice message. Please try sending text.';
    }
  }

  async speechToText(audioBuffer, mediaType) {
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.error('Gemini API key not configured. Cannot process voice message.');
        return 'Voice processing is not configured.';
      }

      // Convert audio buffer to base64
      const base64Audio = audioBuffer.toString('base64');

      // Determine MIME type
      const mimeType = mediaType || 'audio/ogg';

      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        {
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Audio
                  }
                },
                {
                  text: 'Transcribe this audio message accurately. Return only the transcription text without any additional commentary.'
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': geminiApiKey
          }
        }
      );

      const transcription = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return transcription.trim();

    } catch (error) {
      console.error('Speech-to-text error:', error.response?.data || error.message);
      return null;
    }
  }

  async handleImageMessage(messageData) {
    const { from, mediaUrl, mediaType } = messageData;
    const userId = from.replace('whatsapp:', '');

    try {
      // For demo, return a placeholder response
      // In production, implement image analysis
      const response = `📸 Image received! I'm analyzing your photo...\n\nFor now, please describe your symptoms in text. Image analysis will be available soon!`;
      return response;
    } catch (error) {
      console.error('Error processing image message:', error);
      return 'Sorry, I couldn\'t process your image. Please try sending text.';
    }
  }

  // Clear old sessions periodically
  clearOldSessions() {
    // Clear sessions older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [userId, session] of this.userSessions) {
      if (!session.lastActivity || session.lastActivity < oneHourAgo) {
        this.userSessions.delete(userId);
      }
    }
  }

  // Create validation request for human review
  async createValidationRequest(userQuery, aiResponse, session) {
    try {
      const userId = session.userId || 'unknown';
      await database.run(
        'INSERT INTO validation_requests (phone_number, user_query, ai_response, confidence_score, urgency_level, validation_reason) VALUES (?, ?, ?, ?, ?, ?)',
        [
          userId,
          userQuery,
          aiResponse.text,
          aiResponse.confidence,
          aiResponse.urgency,
          `Low confidence (${aiResponse.confidence}/10) or high urgency (${aiResponse.urgency})`
        ]
      );
      console.log(`Validation request created for user ${userId} - confidence: ${aiResponse.confidence}, urgency: ${aiResponse.urgency}`);
    } catch (error) {
      console.error('Error creating validation request:', error);
    }
  }

  // Get confidence indicator message
  getConfidenceIndicator(lang, confidence) {
    const indicators = {
      en: {
        high: '🟢 High Confidence Analysis',
        medium: '🟡 Medium Confidence Analysis',
        low: '🔴 Low Confidence Analysis - Please consult a doctor'
      },
      hi: {
        high: '🟢 उच्च विश्वास विश्लेषण',
        medium: '🟡 मध्यम विश्वास विश्लेषण',
        low: '🔴 निम्न विश्वास विश्लेषण - कृपया डॉक्टर से सलाह लें'
      },
      te: {
        high: '🟢 అధిక విశ్వాస విశ్లేషణ',
        medium: '🟡 మధ్యస్థ విశ్వాస విశ్లేషణ',
        low: '🔴 తక్కువ విశ్వాస విశ్లేషణ - దయచేసి డాక్టర్‌ను సంప్రదించండి'
      },
      or: {
        high: '🟢 ଉଚ୍ଚ ବିଶ୍ଵାସ ବିଶ୍ଳେଷଣ',
        medium: '🟡 ମଧ୍ୟମ ବିଶ୍ଵାସ ବିଶ୍ଳେଷଣ',
        low: '🔴 ନିମ୍ନ ବିଶ୍ଵାସ ବିଶ୍ଳେଷଣ - ଦୟାକରି ଡାକ୍ତରଙ୍କୁ ଯୋଗାଯୋଗ କରନ୍ତୁ'
      }
    };

    const langIndicators = indicators[lang] || indicators['en'];
    if (confidence >= 8) return langIndicators.high;
    if (confidence >= 6) return langIndicators.medium;
    return langIndicators.low;
  }

  // Get conservative response for high-risk queries
  getConservativeResponse(lang, urgency) {
    const responses = {
      en: {
        high: `🚨 **URGENT MEDICAL ATTENTION REQUIRED**\n\nYour symptoms may indicate a serious condition. Please seek immediate medical help:\n\n🏥 Go to nearest hospital/clinic NOW\n📞 Call emergency: 108\n👨‍⚕️ Contact health worker immediately\n\n⚠️ Do not delay - get professional medical evaluation right away.`,
        critical: `🚨 **EMERGENCY - SEEK IMMEDIATE CARE**\n\nYour symptoms are concerning and require urgent medical attention:\n\n🏥 Go to emergency room NOW\n📞 Call ambulance: 108\n👨‍⚕️ Get immediate medical help\n\n⚠️ This could be a medical emergency - do not wait!`
      },
      hi: {
        high: `🚨 **तत्काल चिकित्सा ध्यान आवश्यक**\n\nआपके लक्षण गंभीर स्थिति का संकेत दे सकते हैं। कृपया तत्काल चिकित्सा सहायता लें:\n\n🏥 निकटतम अस्पताल/क्लिनिक जाएं अभी\n📞 आपातकालीन कॉल: 108\n👨‍⚕️ स्वास्थ्य कार्यकर्ता से संपर्क करें तत्काल\n\n⚠️ देरी न करें - पेशेवर चिकित्सा मूल्यांकन प्राप्त करें अभी।`,
        critical: `🚨 **आपातकाल - तत्काल देखभाल प्राप्त करें**\n\nआपके लक्षण चिंताजनक हैं और तत्काल चिकित्सा ध्यान की आवश्यकता है:\n\n🏥 आपातकालीन कक्ष जाएं अभी\n📞 एम्बुलेंस कॉल: 108\n👨‍⚕️ तत्काल चिकित्सा सहायता प्राप्त करें\n\n⚠️ यह चिकित्सा आपातकाल हो सकता है - प्रतीक्षा न करें!`
      },
      te: {
        high: `🚨 **తక్షణ వైద్య సహాయం అవసరం**\n\nమీ లక్షణాలు తీవ్ర పరిస్థితిని సూచించవచ్చు. దయచేసి వెంటనే వైద్య సహాయం పొందండి:\n\n🏥 సమీప ఆస్పత్రి/క్లినిక్‌కి వెళ్లండి ఇప్పుడే\n📞 అత్యవసరం: 108\n👨‍⚕️ ఆరోగ్య కార్యకర్తను సంప్రదించండి వెంటనే\n\n⚠️ వాయిదా వేయకండి - వృత్తిపరమైన వైద్య మూల్యాంకనం పొందండి వెంటనే.`,
        critical: `🚨 **అత్యవసరం - వెంటనే సంరక్షణ పొందండి**\n\nమీ లక్షణాలు ఆందోళనకరంగా ఉన్నాయి మరియు తక్షణ వైద్య శ్రద్ధ అవసరం:\n\n🏥 అత్యవసర కక్షకు వెళ్లండి ఇప్పుడే\n📞 అంబులెన్స్: 108\n👨‍⚕️ వెంటనే వైద్య సహాయం పొందండి\n\n⚠️ ఇది వైద్య అత్యవసరం కావచ్చు - వేచి ఉండకండి!`
      },
      or: {
        high: `🚨 **ତତକ୍ଷଣ ଚିକିତ୍ସକ ଧ୍ୟାନ ଆବଶ୍ୟକ**\n\nଆପଣଙ୍କ ଲକ୍ଷଣଗୁଡ଼ିକ ଗମ୍ଭୀର ସ୍ଥିତିର ସୂଚନା ଦେଇପାରେ। ଦୟାକରି ତତକ୍ଷଣ ଚିକିତ୍ସକ ସାହାଯ୍ୟ ନିଅନ୍ତୁ:\n\n🏥 ନିକଟସ୍ଥ ଆସ୍ପତାଲ/କ୍ଲିନିକ୍ ଯାଆନ୍ତୁ ବର୍ତ୍ତମାନ\n📞 ଜରୁରୀକାଳୀନ: 108\n👨‍⚕️ ସ୍ଵାସ୍ଥ୍ୟ କର୍ମୀଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ ତତକ୍ଷଣ\n\n⚠️ ବିଳମ୍ବ କରନ୍ତୁ ନାହିଁ - ବୃତ୍ତିଗତ ଚିକିତ୍ସକ ମୂଲ୍ୟାଙ୍କନ ପ୍ରାପ୍ତ କରନ୍ତୁ ତତକ୍ଷଣ।`,
        critical: `🚨 **ଜରୁରୀକାଳୀନ - ତତକ୍ଷଣ ଯତ୍ନ ନିଅନ୍ତୁ**\n\nଆପଣଙ୍କ ଲକ୍ଷଣଗୁଡ଼ିକ ଚିନ୍ତାଜନକ ଏବଂ ତତକ୍ଷଣ ଚିକିତ୍ସକ ଧ୍ୟାନ ଆବଶ୍ୟକ:\n\n🏥 ଜରୁରୀକାଳୀନ କୋଠରୀକୁ ଯାଆନ୍ତୁ ବର୍ତ୍ତମାନ\n📞 ଆମ୍ବୁଲାନ୍ସ: 108\n👨‍⚕️ ତତକ୍ଷଣ ଚିକିତ୍ସକ ସାହାଯ୍ୟ ନିଅନ୍ତୁ\n\n⚠️ ଏହା ଚିକିତ୍ସକ ଜରୁରୀକାଳୀନ ହୋଇପାରେ - ଅପେକ୍ଷା କରନ୍ତୁ ନାହିଁ!`
      }
    };

    const langResponses = responses[lang] || responses['en'];
    if (urgency === 'CRITICAL') return langResponses.critical;
    return langResponses.high;
  }
}

module.exports = new BotController();
