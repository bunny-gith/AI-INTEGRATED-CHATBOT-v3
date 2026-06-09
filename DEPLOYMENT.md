# Healthcare Bot Deployment Guide

This guide covers deploying the WhatsApp Healthcare Bot to various cloud platforms.

## Prerequisites

- Node.js 18+
- Docker (for containerized deployment)
- API Keys for:
  - OpenAI (ChatGPT)
  - Google Gemini
  - Twilio (WhatsApp)
  - Government APIs (optional)

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev

# Test the bot
curl "http://localhost:3000/test-message?message=hi"
```

## Docker Deployment

### Build and Run Locally

```bash
# Build Docker image
docker build -t healthcare-bot .

# Run container
docker run -p 3000:3000 --env-file .env healthcare-bot
```

## Cloud Deployments

### AWS (ECS Fargate)

1. **Create ECR Repository**
```bash
aws ecr create-repository --repository-name healthcare-bot --region us-east-1
```

2. **Build and Push Docker Image**
```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag and push image
docker tag healthcare-bot:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/healthcare-bot:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/healthcare-bot:latest
```

3. **Create Secrets in AWS Secrets Manager**
```bash
aws secretsmanager create-secret \
  --name healthcare-bot/openai \
  --secret-string '{"OPENAI_API_KEY":"your_openai_key"}'

aws secretsmanager create-secret \
  --name healthcare-bot/gemini \
  --secret-string '{"GEMINI_API_KEY":"your_gemini_key"}'

aws secretsmanager create-secret \
  --name healthcare-bot/twilio-sid \
  --secret-string '{"TWILIO_ACCOUNT_SID":"your_twilio_sid"}'

aws secretsmanager create-secret \
  --name healthcare-bot/twilio-token \
  --secret-string '{"TWILIO_AUTH_TOKEN":"your_twilio_token"}'

aws secretsmanager create-secret \
  --name healthcare-bot/twilio-number \
  --secret-string '{"TWILIO_PHONE_NUMBER":"whatsapp:+1234567890"}'
```

4. **Deploy to ECS**
- Update `deploy/aws/task-definition.json` with your account details
- Create ECS cluster, task definition, and service
- Configure load balancer and security groups

### Google Cloud Platform (App Engine)

1. **Initialize GCP Project**
```bash
gcloud init
gcloud config set project YOUR_PROJECT_ID
```

2. **Enable Required APIs**
```bash
gcloud services enable appengine.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

3. **Create Secrets**
```bash
echo -n "your_openai_key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your_gemini_key" | gcloud secrets create gemini-api-key --data-file=-
echo -n "your_twilio_sid" | gcloud secrets create twilio-account-sid --data-file=-
echo -n "your_twilio_token" | gcloud secrets create twilio-auth-token --data-file=-
echo -n "whatsapp:+1234567890" | gcloud secrets create twilio-phone-number --data-file=-
```

4. **Deploy**
```bash
gcloud app deploy deploy/gcp/app.yaml
```

### Microsoft Azure (App Service)

1. **Create Azure Resources**
```bash
az group create --name healthcare-bot-rg --location eastus
az appservice plan create --name healthcare-bot-plan --resource-group healthcare-bot-rg --sku B1 --is-linux
az webapp create --resource-group healthcare-bot-rg --plan healthcare-bot-plan --name healthcare-bot --runtime "NODE|18-lts"
```

2. **Configure Environment Variables**
```bash
az webapp config appsettings set --name healthcare-bot --resource-group healthcare-bot-rg \
  --setting OPENAI_API_KEY="your_openai_key" \
  GEMINI_API_KEY="your_gemini_key" \
  TWILIO_ACCOUNT_SID="your_twilio_sid" \
  TWILIO_AUTH_TOKEN="your_twilio_token" \
  TWILIO_PHONE_NUMBER="whatsapp:+1234567890"
```

3. **Deploy**
```bash
az webapp up --name healthcare-bot --resource-group healthcare-bot-rg --runtime "NODE|18-lts"
```

## Environment Variables

### Required Variables
```env
# AI Services
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# WhatsApp/Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+1234567890

# Database
DB_PATH=./healthcare_bot.db

# Government APIs (Optional)
MOHFW_API_URL=https://api.mohfw.gov.in/outbreaks
WHO_API_URL=https://www.who.int/feeds/entity/csr/don/en/rss.xml
IDSP_API_URL=https://idsp.nic.in/api/outbreaks
IDSP_API_KEY=your_idsp_api_key
NVBDCP_API_URL=https://nvbdcp.gov.in/api/dengue-alerts
COWIN_API_URL=https://cdn-api.co-vin.in/api
COWIN_API_KEY=your_cowin_api_key
```

## Testing Deployment

### Health Check
```bash
curl https://your-domain.com/health
```

### Bot Testing
```bash
curl "https://your-domain.com/test-message?message=hi"
```

### Accuracy Testing
```bash
# Run comprehensive accuracy tests
curl -X POST https://your-domain.com/api/test-accuracy
```

## Monitoring and Maintenance

### Logs
- **AWS**: CloudWatch Logs
- **GCP**: Cloud Logging
- **Azure**: App Service Logs

### Scaling
- **AWS ECS**: Adjust desired count in service
- **GCP App Engine**: Automatic scaling configured in app.yaml
- **Azure**: Scale up/down in App Service

### Backups
- Database files should be backed up regularly
- Use cloud-native backup solutions

## Security Considerations

1. **API Keys**: Store in cloud secret managers, never in code
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: Validate all user inputs
5. **Database Security**: Use encrypted connections

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check API keys are set correctly
   - Verify Twilio webhook URL
   - Check application logs

2. **Database connection errors**
   - Verify database file permissions
   - Check database path in environment variables

3. **API timeouts**
   - Increase timeout values in service configurations
   - Check network connectivity to external APIs

### Support
- Check application logs for detailed error messages
- Test individual services using the admin panel
- Verify all environment variables are set correctly