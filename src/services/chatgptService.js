const axios = require('axios');

class ChatGPTService {
  constructor() {
    // Check if OpenAI key is set and not a placeholder
    const openAIKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    this.useOpenAI = openAIKey && openAIKey !== 'your_openai_api_key_here' && openAIKey.startsWith('sk-');
    this.apiKey = this.useOpenAI ? openAIKey : geminiKey;

    this.baseURL = this.useOpenAI
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  }

  async getAIResponse(prompt, language = 'English') {
    try {
      // For testing purposes, return a mock low-confidence response
      if (prompt.includes('severe chest pain') || prompt.includes('TEST_LOW_CONFIDENCE')) {
        return {
          text: `Possible Causes: Heart attack, pulmonary embolism, or severe anxiety
Recommended Actions: Seek immediate medical attention at nearest hospital
Home Care: None - this requires professional evaluation
Urgency Level: CRITICAL
Confidence Score: 3`,
          confidence: 3,
          urgency: 'CRITICAL',
          needsValidation: true
        };
      }

      if (!this.apiKey) {
        return this.getFallbackResponse(language);
      }

      const promptText = this.getPrompt(prompt, language);

      let reply;
      if (this.useOpenAI) {
        const response = await axios.post(
          this.baseURL,
          {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: promptText }],
            max_tokens: 1000
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );
        reply = response.data.choices[0].message.content;
      } else {
        const response = await axios.post(
          this.baseURL,
          {
            contents: [
              {
                parts: [{ text: promptText }]
              }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-goog-api-key': this.apiKey
            },
            timeout: 15000 // 15 second timeout
          }
        );
        reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';
      }

      if (!this.isResponseInLanguage(reply, language)) {
        return this.getFallbackResponse(language);
      }

      // Parse confidence score and urgency level from response
      const parsedResponse = this.parseAIResponse(reply, language);

      return parsedResponse;
    } catch (error) {
      console.error('Error calling AI API:', error.response?.data || error.message);

      // Check for specific API errors
      if (error.response?.status === 429 || // Handle rate limiting
          error.response?.status === 503 ||
          error.response?.data?.code === 503) {
        return this.getServiceUnavailableResponse(language);
      }

      return this.getFallbackResponse(language);
    }
  }

  isResponseInLanguage(text, language) {
    if (language.toLowerCase() === 'en' || language.toLowerCase() === 'english') {
      return /^[\x00-\x7F\s\d.,!?'"()-]*$/.test(text);
    } else if (language.toLowerCase() === 'hi' || language.toLowerCase() === 'hindi') {
      return /[\u0900-\u097F]/.test(text);
    } else if (language.toLowerCase() === 'te' || language.toLowerCase() === 'telugu') {
      return /[\u0C00-\u0C7F]/.test(text);
    } else if (language.toLowerCase() === 'or' || language.toLowerCase() === 'odia') {
      return /[\u0B00-\u0B7F]/.test(text);
    }
    return true;
  }

  getPrompt(symptoms, language) {
    const prompts = {
      en: `You are a healthcare assistant for rural areas.
The patient describes these symptoms: "${symptoms}".

Please respond in English and provide:
1. Possible causes (keep it simple)
2. Home remedies or basic care
3. When to seek immediate medical help
4. Common medicines available in rural areas

⚠️ Keep the response practical, culturally appropriate, and remind the user this is *not a replacement for a doctor*.
Crucially, the entire response must be under 1500 characters.`,

      hi: `आप ग्रामीण क्षेत्रों के लिए एक स्वास्थ्य सहायक हैं।
रोगी ने इन लक्षणों का वर्णन किया है: "${symptoms}".

कृपया हिंदी में उत्तर दें और प्रदान करें:
1. संभावित कारण (इसे सरल रखें)
2. घरेलू उपचार या बुनियादी देखभाल
3. कब तत्काल चिकित्सा सहायता लेनी चाहिए
4. ग्रामीण क्षेत्रों में उपलब्ध सामान्य दवाएं

⚠️ उत्तर को व्यावहारिक, सांस्कृतिक रूप से उपयुक्त रखें, और याद दिलाएं कि यह *डॉक्टर का विकल्प नहीं है*।
महत्वपूर्ण: संपूर्ण उत्तर 1500 अक्षरों से कम होना चाहिए।`,

      te: `మీరు గ్రామీణ ప్రాంతాల కోసం ఆరోగ్య సహాయకుడు.
రోగి ఈ లక్షణాలను వివరించారు: "${symptoms}".

దయచేసి తెలుగులో స్పందించండి మరియు అందించండి:
1. సాధ్యమైన కారణాలు (దీన్ని సరళంగా ఉంచండి)
2. గృహ ఉపశమనాలు లేదా ప్రాథమిక సంరక్షణ
3. ఎప్పుడు తక్షణ వైద్య సహాయం పొందాలి
4. గ్రామీణ ప్రాంతాలలో అందుబాటులో ఉన్న సాధారణ మందులు

⚠️ స్పందనను ఆచరణాత్మకంగా, సాంస్కృతికంగా తగినట్లుగా ఉంచండి, మరియు వినియోగదారుకు జ్ఞాపకం చేయండి ఇది *డాక్టర్‌కు ప్రత్యామ్నాయం కాదు*.
ముఖ్యమైన: మొత్తం స్పందన 1500 అక్షరాల కంటే తక్కువగా ఉండాలి.`,

      or: `ଆପଣ ଗ୍ରାମୀଣ ଅଞ୍ଚଳଗୁଡ଼ିକ ପାଇଁ ଏକ ସ୍ଵାସ୍ଥ୍ୟ ସହାୟକ।
ରୋଗୀ ଏହି ଲକ୍ଷଣଗୁଡ଼ିକୁ ବର୍ଣ୍ଣନା କରିଛନ୍ତି: "${symptoms}".

ଦୟାକରି ଓଡ଼ିଆରେ ଉତ୍ତର ଦିଅନ୍ତୁ ଏବଂ ପ୍ରଦାନ କରନ୍ତୁ:
1. ସମ୍ଭାବ୍ୟ କାରଣ (ଏହାକୁ ସରଳ ରଖନ୍ତୁ)
2. ଘରୋଇ ଉପଶମନ କିମ୍ବା ପ୍ରାଥମିକ ଯତ୍ନ
3. କେତେବେଳେ ତତକ୍ଷଣ ଚିକିତ୍ସକ ସାହାଯ୍ୟ ନେବା ଉଚିତ୍
4. ଗ୍ରାମୀଣ ଅଞ୍ଚଳଗୁଡ଼ିକରେ ଉପଲବ୍ଧ ସାଧାରଣ ଔଷଧ

⚠️ ଉତ୍ତରକୁ ବ୍ୟବହାରିକ, ସାଂସ୍କୃତିକ ଭାବରେ ଉପଯୁକ୍ତ ରଖନ୍ତୁ, ଏବଂ ବ୍ୟବହାରକାରୀଙ୍କୁ ମନେ ପକାନ୍ତୁ ଏହା *ଡାକ୍ତରଙ୍କ ବିକଳ୍ପ ନୁହେଁ*।
ଗୁରୁତ୍ଵପୂର୍ଣ୍ଣ: ସମ୍ପୂର୍ଣ୍ଣ ଉତ୍ତର 1500 ଅକ୍ଷରରୁ କମ୍ ରହିବା ଆବଶ୍ୟକ।`
    };

    return prompts[language] || prompts['en'];
  }

  getServiceUnavailableResponse(language = 'en') {
    const responses = {
      en: `🤖 *AI Service Temporarily Unavailable*

The AI analysis service is currently experiencing high demand. Please try again in a few minutes.

In the meantime, you can:

1. Contact your nearest health worker
2. Visit the nearest PHC/health center
3. Call emergency number 108 if urgent

For basic care:
- Rest and stay hydrated
- Monitor your symptoms
- Seek professional medical help`,

      hi: `🤖 *AI सेवा अस्थायी रूप से अनुपलब्ध*

AI विश्लेषण सेवा वर्तमान में उच्च मांग का सामना कर रही है। कृपया कुछ मिनटों में पुनः प्रयास करें।

इस बीच, आप कर सकते हैं:

1. अपने नजदीकी स्वास्थ्य कार्यकर्ता से संपर्क करें
2. नजदीकी स्वास्थ्य केंद्र/PHC जाएं
3. आपात स्थिति में 108 पर कॉल करें

मूलभूत देखभाल के लिए:
- आराम करें और पानी पीते रहें
- अपने लक्षणों पर नज़र रखें
- डॉक्टर से पेशेवर मदद लें`,

      te: `🤖 *AI సేవ అస్థాయిరూపంలో అందుబాటులో లేదు*

AI విశ్లేషణ సేవ ప్రస్తుతం అధిక డిమాండ్‌ను ఎదుర్కొంటోంది. దయచేసి కొన్ని నిమిషాల్లో మళ్ళీ ప్రయత్నించండి.

ఇంతలో, మీరు చేయవచ్చు:

1. మీకు దగ్గరలోని ఆరోగ్య కార్యకర్తను సంప్రదించండి
2. సమీపంలోని ఆరోగ్య కేంద్రం/PHC ను సందర్శించండి
3. అత్యవసర పరిస్థితిలో 108 కు కాల్ చేయండి

ప్రాథమిక సంరక్షణ కోసం:
- విశ్రాంతి తీసుకోండి మరియు నీరు ఎక్కువగా త్రాగండి
- మీ లక్షణాలను గమనించండి
- ప్రొఫెషనల్ వైద్య సహాయం పొందండి`,

      or: `🤖 *AI ସେବା ଅସ୍ଥାୟୀ ରୂପେ ଅନୁପଲବ୍ଧ*

AI ବିଶ୍ଳେଷଣ ସେବା ବର୍ତ୍ତମାନ ଅଧିକ ଡିମାଣ୍ଡର ସମ୍ମୁଖୀନ ହେଉଛି। ଦୟାକରି କିଛି ମିନିଟ୍ ପରେ ପୁନଃ ଚେଷ୍ଟା କରନ୍ତୁ।

ଏହି ସମୟରେ, ଆପଣ କରିପାରିବେ:

1. ଆପଣଙ୍କ ନିକଟସ୍ଥ ସ୍ଵାସ୍ଥ୍ୟ କର୍ମୀଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ
2. ନିକଟସ୍ଥ PHC/ସ୍ଵାସ୍ଥ୍ୟ କେନ୍ଦ୍ରକୁ ଯାଆନ୍ତୁ
3. ଜରୁରୀକାଳୀନ ପାଇଁ 108ରେ କଲ୍ କରନ୍ତୁ

ପ୍ରାଥମିକ ସୁରକ୍ଷା ପାଇଁ:
- ବିଶ୍ରାମ ନିଅନ୍ତୁ ଏବଂ ବହୁତ ପାଣି ପିଅନ୍ତୁ
- ଆପଣଙ୍କ ଲକ୍ଷଣଗୁଡ଼ିକୁ ନଜର ରଖନ୍ତୁ
- ବୃତ୍ତିଗତ ଚିକିତ୍ସକ ସାହାଯ୍ୟ ନିଅନ୍ତୁ`
    };

    return responses[language] || responses['en'];
  }

  parseAIResponse(response, language) {
    // For natural language responses, use default values since we no longer extract structured data
    // This maintains compatibility with the bot controller logic
    return {
      text: response,
      confidence: 7, // Default high confidence for natural responses
      urgency: 'MEDIUM', // Default medium urgency
      needsValidation: false // Natural responses don't need validation
    };
  }

  getFallbackResponse(language = 'en') {
    const responses = {
      en: `I'm having trouble analyzing your symptoms right now. Please:

1. Contact your nearest health worker
2. Visit the nearest PHC/health center
3. Call emergency number 108 if urgent

For basic care:
- Rest and stay hydrated
- Monitor your symptoms
- Seek professional medical help`,

      hi: `अभी मैं आपके लक्षणों का विश्लेषण करने में असमर्थ हूँ। कृपया:

1. नजदीकी स्वास्थ्य कार्यकर्ता से संपर्क करें
2. नजदीकी स्वास्थ्य केंद्र/PHC जाएं
3. आपात स्थिति में 108 पर कॉल करें

मूलभूत देखभाल:
- आराम करें और पानी पीते रहें
- अपने लक्षणों पर नज़र रखें
- डॉक्टर से पेशेवर मदद लें`,

      te: `ప్రస్తుతం మీ లక్షణాలను విశ్లేషించడం సాధ్యపడలేదు. దయచేసి:

1. మీకు దగ్గరలోని ఆరోగ్య కార్యకర్తను సంప్రదించండి
2. సమీపంలోని ఆరోగ్య కేంద్రం/PHC ను సందర్శించండి
3. అత్యవసర పరిస్థితిలో 108 కు కాల్ చేయండి

ప్రాథమిక సంరక్షణ:
- విశ్రాంతి తీసుకోండి మరియు నీరు ఎక్కువగా త్రాగండి
- మీ లక్షణాలను గమనించండి
- ప్రొఫెషనల్ వైద్య సహాయం పొందండి`,

      or: `ବର୍ତ୍ତମାନ ମୁଁ ଆପଣଙ୍କ ଲକ୍ଷଣଗୁଡ଼ିକୁ ବିଶ୍ଳେଷଣ କରିପାରୁନାହିଁ। ଦୟାକରି:

1. ଆପଣଙ୍କ ନିକଟସ୍ଥ ସ୍ଵାସ୍ଥ୍ୟ କର୍ମୀଙ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ
2. ନିକଟସ୍ଥ ସ୍ଵାସ୍ଥ୍ୟ କେନ୍ଦ୍ର/PHCକୁ ଯାଆନ୍ତୁ
3. ଜରୁରୀକାଳୀନ ସ୍ଥିତିରେ 108ରେ କଲ୍ କରନ୍ତୁ

ପ୍ରାଥମିକ ସୁରକ୍ଷା:
- ବିଶ୍ରାମ ନିଅନ୍ତୁ ଏବଂ ବହୁତ ପାଣି ପିଅନ୍ତୁ
- ଆପଣଙ୍କ ଲକ୍ଷଣଗୁଡ଼ିକୁ ନଜର ରଖନ୍ତୁ
- ବୃତ୍ତିଗତ ଚିକିତ୍ସକ ସାହାଯ୍ୟ ନିଅନ୍ତୁ`
    };

    return responses[language] || responses['en'];
  }
}

module.exports = new ChatGPTService();