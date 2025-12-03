# Upwork Scraper API - Quick Start Guide

## ✅ What's Working:
- ✓ Bypasses Cloudflare detection
- ✓ Scrapes job titles from Upwork
- ✓ Clicks into each job to get full descriptions
- ✓ Supports keywords or full URLs
- ✓ Scrapes up to 100+ jobs (configurable)
- ✓ Works with n8n via form input or webhooks
- ✓ Both POST and GET API endpoints

## 🚀 Quick Test:

```powershell
npm start
```

Then test with:
```
POST http://localhost:3000/scrape
{
  "keywords": "nodejs developer",
  "maxJobs": 20,
  "headless": true
}
```

## 🔗 For n8n Integration:

### Option 1: Form Trigger (Easiest)
1. Create Form with field named `keywords`
2. HTTP Request node:
   - URL: `http://your-ngrok-url/scrape`
   - Method: POST
   - Body: `{"keywords": "{{ $json.keywords }}", "maxJobs": 100, "headless": true}`

### Option 2: GET Request (Webhook)
```
GET http://your-ngrok-url/scrape?keywords=nodejs+developer&maxJobs=100
```

## 📊 Response Format:

```json
{
  "success": true,
  "count": 100,
  "jobs": [
    {
      "title": "Job Title",
      "jobId": "021996291161362477231",
      "link": "https://www.upwork.com/jobs/...",
      "shortDescription": "Brief description...",
      "fullDescription": "Complete job description from detail page",
      "budget": "$500-$1000 or Hourly",
      "skills": ["Node.js", "React"],
      "postedTime": "Posted 5 minutes ago",
      "proposals": "5 to 10",
      "paymentVerified": true
    }
  ]
}
```

## 🌐 Make It Public with ngrok:

```powershell
ngrok http 3000
```

Use the generated URL in your n8n workflow!

## 💡 Tips:

1. **First run**: Set `headless: false` to see the browser
2. **Production**: Set `headless: true` for faster performance
3. **Speed up**: Reduce `maxJobs` to 20-50 for faster results
4. **Automation**: Schedule in n8n to run every 60-90 minutes

## 🐛 Troubleshooting:

- **No jobs scraped?** - Check your keywords or URL
- **Slow scraping?** - Each job click takes 2-3 seconds (20 jobs = ~1 minute)
- **Timeout errors?** - Some job pages load slowly, this is normal
- **Different structure?** - Upwork updates its UI occasionally, selectors may need updating

## 📝 Files:
- `scraper.js` - Core scraping logic
- `server.js` - API server
- `test.js` - Test script
- `n8n-workflow-example.json` - Complete n8n workflow template
