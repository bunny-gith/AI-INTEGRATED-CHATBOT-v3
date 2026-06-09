# WhatsApp Healthcare Bot for Rural Areas

A comprehensive WhatsApp bot designed to provide healthcare services for rural and semi-urban communities, featuring AI-powered symptom checking, vaccination tracking, medicine information, emergency contacts, voice assistance, disease outbreak alerts, and multi-language support.

## 🏥 Features

### 1. AI-Powered Symptom Checker
- **Dual AI Integration**: Advanced symptom analysis using OpenAI's GPT and Google Gemini
- **Rural-Focused**: Tailored responses for rural healthcare scenarios
- **Risk Assessment**: Identifies when to seek immediate medical attention with confidence scoring
- **Home Remedies**: Provides basic care instructions and common medicine suggestions
- **Human Validation**: Escalates uncertain cases for professional review

### 2. Medicine Information System
- **AI-Driven Search**: Intelligent information retrieval for medicines
- **Comprehensive Database**: Detailed information about common medicines
- **Usage Instructions**: Proper dosage and administration guidelines
- **Safety Information**: Precautions, side effects, and contraindications
- **Smart Search**: Handles both brand names and generic names

### 3. Vaccination Tracking for Newborns
- **Beneficiary ID System**: Secure tracking using unique identifiers
- **Complete Schedule**: Full vaccination calendar as per Indian guidelines (birth to 5 years)
- **COWIN Integration**: Syncs with official government vaccination records
- **Status Tracking**: Monitor completed, pending, and overdue vaccinations
- **Automated Reminders**: Next vaccination dates and alerts

### 4. Health Worker Directory
- **Location-Based Search**: Find nearby health workers by pincode
- **Government Integration**: PHC, CHC, and Sub-Centre contacts
- **Multiple Categories**: Doctors, nurses, ANMs, and health consultants
- **Facility Information**: Contact details and working hours
- **Regional Data**: Pre-loaded with Andhra Pradesh health facilities

### 5. Emergency Services
- **Quick Access**: Immediate access to emergency numbers
- **Multiple Services**: Medical (108), Police (100), Fire (101)
- **Health Helplines**: National (104) and state-specific health support numbers
- **Ayushman Bharat**: Direct access to government health schemes

### 6. Voice Assistant
- **Speech-to-Text**: Process voice messages using Google Gemini AI
- **Multi-modal Input**: Supports both text and voice interactions
- **Intent Recognition**: Automatically detects user needs from voice input
- **Accessibility**: Helps users with limited literacy or typing skills

### 7. Disease Outbreak Alerts
- **Real-time Monitoring**: Tracks disease outbreaks in local areas
- **Location-Based Alerts**: Targeted notifications based on user pincode
- **Government Integration**: Connects with IDSP and NVBDCP APIs
- **Preventive Information**: Provides symptoms, prevention measures, and safety guidelines

### 8. Callback & Support System
- **Health Counselor Access**: Request callbacks from qualified health professionals
- **Multi-language Support**: Callbacks available in English, Hindi, Telugu, Odia
- **Feedback Collection**: Rate and provide feedback on counselor interactions
- **Quality Assurance**: Tracks counselor performance and user satisfaction

### 9. Multi-Language Support
- **Four Languages**: English, हिंदी (Hindi), తెలుగు (Telugu), ଓଡ଼ିଆ (Odia)
- **Cultural Adaptation**: Region-specific health information and terminology
- **Dynamic Language Switching**: Users can change language preferences anytime

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- WhatsApp Business Account
- Twilio Account (for WhatsApp API)
- OpenAI API Key (optional)
- Google Gemini API Key (optional - at least one AI service required)

### Installation

1. **Clone and Install**
```bash
git clone <repository-url>
cd whatsapp-healthcare-bot
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# AI Configuration
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# WhatsApp/Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# Government API Configuration (Optional)
COWIN_API_KEY=your_cowin_api_key
IDSP_API_KEY=your_idsp_api_key

# Server Configuration
PORT=3000
NODE_ENV=development
DB_PATH=./healthcare_bot.db
```

3. **Start the Server**
```bash
npm start
```

4. **Test the Bot**
Visit: `http://localhost:3000/test-message?message=hi`

## 📱 WhatsApp Integration

### Setting up Twilio WhatsApp Sandbox
1. Create a [Twilio Account](https://www.twilio.com)
2. Go to Console → Messaging → Try WhatsApp
3. Follow sandbox setup instructions
4. Configure webhook URL: `https://your-domain.com/webhook`

### Production Setup
1. Apply for WhatsApp Business API approval
2. Configure webhook endpoints
3. Set up message templates for notifications

## 🗄️ Database Schema

### Tables Structure

**Babies Table**
- `beneficiary_id`: Unique identifier
- `mother_name`: Mother's full name
- `baby_name`: Baby's name (optional)
- `dob`: Date of birth
- `phone_number`: Contact number
- `mother_id`: Mother's ID document

**Vaccination Records**
- `beneficiary_id`: Links to babies table
- `vaccine_name`: Name of vaccine
- `vaccination_date`: Date administered
- `next_due_date`: Next vaccination due
- `status`: Completed/Pending/Overdue
- `source`: Data source (manual/COWIN)

**Health Workers**
- `name`: Health worker's name
- `designation`: Role (Doctor, ANM, etc.)
- `phone_number`: Contact number
- `pincode`: Service area
- `facility_name`: Health center name
- `facility_type`: PHC/CHC/Sub-Centre/UHC/MC

**Callback Requests**
- `phone_number`: User's phone number
- `language`: Preferred language for callback
- `status`: Pending/Completed
- `counselor_name`: Assigned health counselor
- `feedback_rating`: User satisfaction rating
- `feedback_text`: Detailed feedback

**Disease Outbreaks**
- `disease_name`: Name of the disease
- `location`: Affected area
- `severity`: Low/Moderate/High/Critical
- `symptoms`: Common symptoms
- `prevention_measures`: Preventive actions
- `status`: Active/Resolved/Monitoring

**User Locations**
- `phone_number`: User's phone number
- `pincode`: User's location pincode
- `district`: District name
- `state`: State name
- `coordinates`: GPS coordinates (optional)

**Validation Requests**
- `user_query`: Original user symptom query
- `ai_response`: AI-generated response
- `confidence_score`: AI confidence level
- `urgency_level`: Risk assessment
- `validation_status`: Pending/Validated/Rejected

## 🎯 Bot Usage Flow

### Main Menu Options
```
1️⃣ Symptom Checker
2️⃣ Medicine Information
3️⃣ Vaccination Schedule
4️⃣ Find Health Worker
5️⃣ Emergency Contacts
6️⃣ Voice Assistant
7️⃣ Disease Outbreaks
8️⃣ Request a Callback
9️⃣ Change Language
```

### Example Interactions

**Symptom Checker:**
```
User: "1"
Bot: "Please describe your symptoms..."
User: "I have fever and headache for 2 days"
Bot: [AI-generated analysis with recommendations]
```

**Vaccination Lookup:**
```
User: "3"
Bot: "Please enter Beneficiary ID..."
User: "BEN001"
Bot: [Complete vaccination status and next due dates]
```

## 🛡️ Security & Privacy

### Data Protection
- **Local Database**: SQLite for secure local storage
- **No Personal Data Sharing**: Information stays within the system
- **Encrypted Communication**: HTTPS/TLS for all API calls
- **Session Management**: Temporary session storage with automatic cleanup

### API Security
- **Environment Variables**: Sensitive data in environment files
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Sanitizes all user inputs
- **Error Handling**: Graceful error responses without data leakage

## 🏥 Healthcare Guidelines

### Medical Disclaimers
- All AI responses include medical disclaimers
- Emergency situations are prioritized with immediate doctor consultation advice
- Medicine information is educational only
- Vaccination schedules follow official government guidelines

### Rural Optimization
- Simple language and clear instructions
- Offline-capable database design
- Low bandwidth message formats
- Multi-language ready architecture

### Regional Focus
- **Andhra Pradesh Integration**: Pre-loaded with Vizag/Visakhapatnam health facilities
- **Local Health Challenges**: Addresses regional disease patterns (dengue, malaria, etc.)
- **Government Schemes**: Ayushman Bharat and state health program integration
- **Cultural Adaptation**: Region-specific health practices and terminology

## 📊 Admin Panel

Access the admin panel at: `http://localhost:3000/admin`

### Features
- **Dashboard Overview**: Statistics, system status, and analytics
- **Database Management**: View, add, edit, and manage all records
- **Bot Testing**: Test bot responses directly with message simulation
- **Data Import/Export**: Bulk operations for health worker and medicine data
- **Validation Queue**: Review and approve AI responses requiring human validation
- **Callback Management**: Monitor counselor callbacks and user feedback
- **Outbreak Monitoring**: Track and manage disease outbreak alerts
- **User Management**: View user interactions and session data

### Adding New Data

**Add Health Worker:**
```javascript
POST /api/health-workers
{
  "name": "Dr. Sarah Johnson",
  "designation": "Medical Officer",
  "phone_number": "+919876543210",
  "pincode": "110001",
  "facility_name": "Primary Health Centre",
  "facility_type": "PHC",
  "address": "Main Road, Delhi"
}
```

**Add Medicine:**
```javascript
POST /api/medicines  
{
  "name": "Paracetamol",
  "generic_name": "Acetaminophen",
  "uses": "Fever, Pain relief",
  "dosage": "500mg every 4-6 hours",
  "precautions": "Do not exceed 4g daily",
  "side_effects": "Nausea, skin rash (rare)"
}
```

## 🚀 Deployment

### Local Development
```bash
npm run dev  # Using nodemon for auto-reload
```

### Production Deployment
```bash
# Build and start
npm start

# Using PM2 for production
npm install -g pm2
pm2 start server.js --name healthcare-bot
```

### Cloud Deployment Options
- **AWS ECS Fargate**: Containerized deployment with auto-scaling
- **Google Cloud Platform**: App Engine with managed services
- **Microsoft Azure**: App Service with integrated monitoring

### Environment-Specific Configuration
- **Development**: Mock responses for testing
- **Production**: Full API integration with error handling
- **Staging**: Sandbox mode with test data

## 🔧 Customization

### Adding New Languages
1. Create translation files in `/locales`
2. Update bot responses to use translation functions
3. Configure language detection from user preferences

### Custom Vaccination Schedules
1. Modify `vaccinationService.js`
2. Update the `vaccinationSchedule` array
3. Adjust age calculations for different regions

### Integration with Government Systems
1. Add APIs for COWIN integration
2. Connect with HMIS databases
3. Implement Aadhaar-based verification

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`
5. Create Pull Request

### Code Standards
- **Modular Architecture**: Separate files for different functionalities
- **Error Handling**: Comprehensive try-catch blocks
- **Documentation**: Inline comments and README updates
- **Testing**: Unit tests for core functions

## 📞 Support & Contact

### Technical Support
- **Issues**: Create GitHub issues for bugs and feature requests
- **Documentation**: Check README and inline code comments
- **Community**: Join discussions in project forums

### Healthcare Support
- **Emergency**: Always call 108 for medical emergencies
- **Health Helpline**: 104 for general health queries
- **Local Support**: Contact your nearest PHC/CHC

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Ministry of Health and Family Welfare, India** for vaccination guidelines
- **WHO** for healthcare best practices
- **OpenAI** for ChatGPT API
- **Google** for Gemini AI API
- **Twilio** for WhatsApp Business API
- **Government of Andhra Pradesh** for regional health data
- **IDSP & NVBDCP** for disease surveillance data
- **COWIN** for vaccination record integration
- **Rural Healthcare Community** for feedback and requirements

---

**⚠️ Important:** This bot is designed to supplement, not replace, professional medical care. Always consult qualified healthcare providers for serious medical conditions.