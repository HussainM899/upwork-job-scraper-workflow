# 🚀 Upwork Job Scraper API

A free, unlimited Upwork job scraper API that bypasses Cloudflare detection using Puppeteer Real Browser. Perfect for automating job searches, filtering opportunities with AI, and building your own job alert system.

## ✨ Features

- ✅ **Cloudflare Bypass** - Uses Puppeteer Real Browser to bypass bot detection
- ✅ **Free & Unlimited** - No subscription fees or API limits
- ✅ **REST API** - Easy to integrate with n8n, Zapier, or any automation tool
- ✅ **Detailed Job Data** - Extracts title, description, budget, skills, client info, and more
- ✅ **Headless Mode** - Run invisibly in production for better performance
- ✅ **Public URL Support** - Use with ngrok to make it accessible online

## 📋 Prerequisites

- Node.js (v14 or higher) - [Download here](https://nodejs.org/)
- npm (comes with Node.js)

## 🛠️ Installation

1. **Install dependencies:**
```powershell
npm install express
```

2. **Configure environment (optional):**
```powershell
copy .env.example .env
```

## 🎯 Usage

### Start the Server

```powershell
npm start
```

The API will be available at `http://localhost:3000`

### Test Locally with Visible Browser

Create a test file or use Postman to send a POST request:

**Endpoint:** `POST http://localhost:3000/scrape`

**Option 1: Using Keywords (Recommended for n8n)**
```json
{
  "keywords": "nodejs developer",
  "maxJobs": 100,
  "headless": false
}
```

**Option 2: Using Full URL**
```json
{
  "url": "https://www.upwork.com/nx/search/jobs/?q=nodejs&sort=recency",
  "maxJobs": 50,
  "headless": false
}
```

**Option 3: Using GET method (Perfect for n8n Webhooks)**
```
GET http://localhost:3000/scrape?keywords=nodejs+developer&maxJobs=100&headless=true
```

**Response:**
```json
{
  "success": true,
  "count": 100,
  "maxJobs": 100,
  "timestamp": "2025-12-03T10:30:00.000Z",
  "search": "nodejs developer",
  "jobs": [
    {
      "title": "Node.js Developer Needed",
      "jobId": "1234567890abcdef",
      "link": "https://www.upwork.com/jobs/~1234567890abcdef",
      "shortDescription": "Looking for an experienced Node.js developer...",
      "fullDescription": "[Complete job description with all details from the job page]",
      "budget": "$500-$1000",
      "skills": ["Node.js", "Express", "MongoDB"],
      "postedTime": "Posted 5 minutes ago",
      "clientLocation": "United States",
      "clientName": "John Doe",
      "paymentVerified": true,
      "clientRating": "5.00 of 5",
      "clientSpent": "$10K+ spent",
      "proposals": "5 to 10",
      "jobDetails": "[Additional job details]"
    }
  ]
}
```

### Production Mode (Headless)

For production, set `headless: true` to run the browser invisibly:

```json
{
  "keywords": "nodejs",
  "maxJobs": 100,
  "headless": true
}
```

**Parameters:**
- `keywords` or `url` - **(required)** Search keywords or full Upwork URL
- `maxJobs` - **(optional)** Number of jobs to scrape (default: 100)
- `headless` - **(optional)** Run browser invisibly (default: true)

## 🌐 Make It Accessible Online with ngrok

To use this API with n8n or other online automation tools, expose it using ngrok:

1. **Install ngrok:** [https://ngrok.com/download](https://ngrok.com/download)

2. **Authenticate ngrok:**
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

3. **Expose your API:**
```powershell
ngrok http 3000
```

4. **Copy the public URL** (e.g., `https://abc123.ngrok.io`) and use it in your automation workflows!

## 🤖 Integration with n8n

### Method 1: Using n8n Form Trigger + HTTP Request (Recommended)

**Step 1: Create a Form Trigger**
1. Add a **Form Trigger** node
2. Add a field:
   - **Field Type:** Text
   - **Field Label:** Job Keywords
   - **Field Name:** `keywords`
   - **Placeholder:** e.g., "nodejs developer"
3. Add another field:
   - **Field Type:** Number
   - **Field Label:** Maximum Jobs
   - **Field Name:** `maxJobs`
   - **Default Value:** 100
4. Save and get your form URL

**Step 2: Add HTTP Request Node**
1. Add an **HTTP Request** node after the form
2. **Method:** POST
3. **URL:** `https://your-ngrok-url.ngrok.io/scrape`
4. **Body Content Type:** JSON
5. **Body:**
   ```json
   {
     "keywords": "{{ $json.keywords }}",
     "maxJobs": "{{ $json.maxJobs }}",
     "headless": true
   }
   ```
6. The scraped jobs will be available in `{{ $json.jobs }}`

### Method 2: Using Webhook + GET Request

1. Add a **Webhook** node (set to GET method)
2. Add an **HTTP Request** node
3. **Method:** GET
4. **URL:** Build URL with query parameters:
   ```
   https://your-ngrok-url.ngrok.io/scrape?keywords={{ $json.query.keywords }}&maxJobs=100&headless=true
   ```
5. Test with: `https://your-webhook-url?keywords=nodejs+developer`

### Method 3: Schedule Trigger (Automated)

1. Add a **Schedule Trigger** (e.g., every 90 minutes)
2. Add a **Set** node to define keywords:
   ```json
   {
     "keywords": "nodejs developer",
     "maxJobs": 100
   }
   ```
3. Add **HTTP Request** node with the scraper API
4. Jobs are scraped automatically on schedule!

## 📊 Example Workflow

```
┌─────────────────┐
│  Schedule Trigger│  (Every 90 minutes)
└────────┬────────┘
         │
┌────────▼────────┐
│ HTTP Request    │  (Call scraper API)
└────────┬────────┘
         │
┌────────▼────────┐
│ Google Sheets   │  (Get existing jobs)
└────────┬────────┘
         │
┌────────▼────────┐
│ Filter          │  (Remove duplicates)
└────────┬────────┘
         │
┌────────▼────────┐
│ AI Agent        │  (Filter & generate proposals)
└────────┬────────┘
         │
┌────────▼────────┐
│ Google Sheets   │  (Save new jobs)
└────────┬────────┘
         │
┌────────▼────────┐
│ Telegram        │  (Send notification)
└─────────────────┘
```

## 🎨 Extracted Data Fields

Each job object contains:

| Field | Description |
|-------|-------------|
| `title` | Job title |
| `jobId` | Unique job identifier |
| `link` | Direct link to job posting |
| `shortDescription` | Brief description from search results |
| `fullDescription` | **Complete job description** (fetched by clicking into each job) |
| `budget` | Budget or hourly rate |
| `skills` | Array of required skills |
| `postedTime` | When the job was posted |
| `clientLocation` | Client's country |
| `clientName` | Client's name |
| `paymentVerified` | Payment verification status |
| `clientRating` | Client's rating |
| `clientSpent` | Total amount spent by client |
| `proposals` | Number of proposals submitted |
| `jobDetails` | Additional job details from detail page |

**Note:** The scraper automatically clicks on each job to fetch the full description and additional details!

## 🔧 Troubleshooting

### Browser doesn't open in headless mode
- Set `"headless": false` in your request to see what's happening
- Check console logs for error messages

### Cloudflare not bypassed
- Wait longer - sometimes it takes 10-20 seconds
- Try different Upwork URLs
- Check your internet connection

### Jobs not found
- Verify the Upwork URL is valid
- Make sure you're using a search results page URL
- Try adding `&sort=recency` to get newest jobs first

## 🚀 Advanced Features

### Using with Login Cookies (For More Data)

When logged in, you get access to:
- Client hiring history
- More detailed client information
- Enhanced filtering capabilities

This feature requires cookie handling and will be covered in a separate tutorial.

## 💡 Tips

1. **Sort by recency** - Add `&sort=recency` to your Upwork URL to get the newest jobs first
2. **Use specific searches** - More specific searches = better results
3. **Schedule wisely** - Run every 60-90 minutes to catch new jobs early
4. **Filter with AI** - Use ChatGPT or Gemini to filter jobs that match your skills

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## ⚠️ Disclaimer

This tool is for educational purposes. Make sure to comply with Upwork's Terms of Service when using automated tools. Use responsibly and ethically.

## 🔗 Resources

- [Puppeteer Real Browser](https://www.npmjs.com/package/puppeteer-real-browser)
- [n8n Automation](https://n8n.io/)
- [ngrok](https://ngrok.com/)
- [Node.js](https://nodejs.org/)

---

Built with ❤️ for freelancers who want to stay ahead of the competition
