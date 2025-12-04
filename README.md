# FREE Upwork Job Scraper

A free, unlimited Upwork job scraper that bypasses Cloudflare detection using Puppeteer Real Browser. Scrape multiple keywords at once and get results in Excel/CSV and JSON formats.

## Features

- ✅ **Cloudflare Bypass** - Uses Puppeteer Real Browser to bypass bot detection
- ✅ **Free & Unlimited** - No subscription fees or API limits
- ✅ **Multi-Keyword Scraping** - Search multiple keywords in one run
- ✅ **Detailed Job Data** - Extracts full job descriptions by clicking into each job
- ✅ **Excel & JSON Export** - Get results in both CSV (Excel-compatible) and JSON formats
- ✅ **Pagination Support** - Automatically scrapes across multiple pages
- ✅ **REST API Available** - Easy to integrate with n8n, Zapier, or any automation tool (optional)

## Prerequisites

- Node.js (v14 or higher) - [Download here](https://nodejs.org/)
- npm (comes with Node.js)

## Installation

1. **Install dependencies:**
```powershell
npm install
```

## Quick Start - Local Scraping (Recommended)

### Option 1: Multi-Keyword Scraper (Best for bulk scraping)

1. **Configure your keywords** in `scrape-multiple.js`:
```javascript
const keywords = [
    'AI Automations',
    'automation workflows',
    'n8n',
    'AI Agents',
    'voice ai',
    'chatbots'
];

const jobsPerKeyword = 30; // Number of jobs per keyword
const headlessMode = false; // Set to false to see browser
```

2. **Run the scraper:**
```powershell
node scrape-multiple.js
```

3. **Get your results:**
   - `upwork-results-[timestamp].csv` - Excel-compatible spreadsheet
   - `upwork-results-[timestamp].json` - Complete data in JSON format

**Output includes:**
- Search Keyword
- Job ID
- Title
- Link
- Budget
- Posted Time
- Skills
- Proposals
- Client Location
- **Full Description** (complete job details)

### Option 2: Single Keyword Test

For testing or single searches, use `test.js`:

```javascript
const keywords = 'nodejs developer';
const headless = false;
const maxJobs = 30;
```

Run it:
```powershell
node test.js
```

## API Server (Optional - For n8n/Zapier Integration)

If you want to use this as an API with automation tools:

### Start the Server

```powershell
npm start
```

The API will be available at `http://localhost:3000`

### API Endpoints

**Endpoint:** `POST http://localhost:3000/scrape`

**Request:**
```json
{
  "keywords": "nodejs developer",
  "maxJobs": 100,
  "headless": false
}
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
      "paymentVerified": true
    }
  ]
}
```

**Parameters:**
- `keywords` or `url` - **(required)** Search keywords or full Upwork URL
- `maxJobs` - **(optional)** Number of jobs to scrape (default: 100)
- `headless` - **(optional)** Run browser invisibly (default: true, recommended: false for reliability)

## Make It Accessible Online with ngrok

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

## Integration with n8n

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

## Example Workflow

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

## Extracted Data Fields

Each job object contains:

| Field | Description |
|-------|-------------|
| `searchKeyword` | The keyword used to find this job |
| `title` | Job title |
| `jobId` | Unique job identifier (21-digit number) |
| `link` | Direct link to job posting |
| `shortDescription` | Brief description from search results |
| `fullDescription` | **Complete job description** (fetched by clicking into each job) |
| `budget` | Budget or hourly rate |
| `skills` | Array of required skills |
| `postedTime` | When the job was posted |
| `proposals` | Number of proposals submitted |
| `clientLocation` | Client's country |
| `paymentVerified` | Payment verification status |

**Note:** The scraper automatically clicks on each job to fetch the full description and additional details!

## Output Files

### CSV File (`upwork-results-[timestamp].csv`)
- Opens directly in Excel or Google Sheets
- Columns: Search Keyword, Job ID, Title, Link, Budget, Posted Time, Skills, Proposals, Client Location, Full Description
- Perfect for filtering and analyzing jobs

### JSON File (`upwork-results-[timestamp].json`)
- Complete structured data
- Organized by keyword with job counts
- Ideal for developers and API integrations
- Example structure:
```json
[
  {
    "keyword": "AI Automations",
    "jobCount": 30,
    "jobs": [...]
  },
  {
    "keyword": "n8n",
    "jobCount": 30,
    "jobs": [...]
  }
]
```

## Troubleshooting

### Cloudflare blocking / "Just a moment..." page
- **Solution:** Set `headlessMode = false` to run with visible browser
- Cloudflare is more likely to block headless browsers
- The scraper includes Cloudflare detection and automatic waiting

### Not getting full descriptions
- The script clicks into each job to fetch full descriptions
- This takes time - be patient
- If fullDescription is empty, the job may have been removed or access was blocked

### Jobs not found
- Check that your keywords match actual Upwork jobs
- Try more specific or popular keywords
- The scraper automatically sorts by recency (newest jobs first)

### Script crashes or hangs
- Check your internet connection
- Try reducing `jobsPerKeyword` to a smaller number (e.g., 10)
- Close other programs using Chrome/Chromium

### CSV file not opening correctly in Excel
- The file uses proper CSV escaping for special characters
- If descriptions have line breaks, Excel should handle them correctly
- Try opening with "Import Data" feature in Excel for best results

## How It Works

1. **Launches Chrome** - Opens a real Chrome browser using Puppeteer
2. **Bypasses Cloudflare** - Uses `puppeteer-real-browser` to avoid bot detection
3. **Searches keywords** - Goes to Upwork search page for each keyword
4. **Collects job listings** - Extracts job data from search results
5. **Clicks into each job** - Opens job detail page to get full description
6. **Handles pagination** - Automatically goes to next page if more jobs needed
7. **Exports results** - Saves to CSV (Excel) and JSON files with timestamps

The entire process is automated - you just configure your keywords and run the script!

## Tips & Best Practices

1. **Start with visible browser** - Set `headlessMode = false` to see what's happening and ensure Cloudflare bypass works
2. **Use specific keywords** - More specific searches = better quality results
3. **Scrape 30-50 jobs per keyword** - Good balance between speed and data quantity
4. **Run during off-peak hours** - Less likely to trigger rate limits
5. **Wait between runs** - The script includes automatic 5-second delays between keywords
6. **Open CSV in Excel** - Full descriptions are properly formatted for spreadsheet viewing
7. **Filter with AI** - Import the JSON file into ChatGPT or Claude to filter jobs matching your skills
8. **Customize keywords** - Edit the `keywords` array in `scrape-multiple.js` to match your niche

## Use Cases

- **Freelancers:** Find the latest jobs matching your skills across multiple keywords
- **Agencies:** Monitor client acquisition opportunities in bulk
- **Researchers:** Analyze job market trends and pricing
- **Automation:** Integrate with n8n/Zapier to auto-apply or get notifications
- **AI Filtering:** Feed scraped jobs to ChatGPT/Claude to find perfect matches

## 📝 License

ISC

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## Disclaimer

This tool is for educational purposes. Make sure to comply with Upwork's Terms of Service when using automated tools. Use responsibly and ethically.

## Resources

- [Puppeteer Real Browser](https://www.npmjs.com/package/puppeteer-real-browser)
- [n8n Automation](https://n8n.io/)
- [ngrok](https://ngrok.com/)
- [Node.js](https://nodejs.org/)

---

Built with ❤️ for freelancers who want to stay ahead of the competition
