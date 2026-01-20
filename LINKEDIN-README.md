# 🔗 LinkedIn Profile Scraper

A powerful LinkedIn profile scraper that extracts comprehensive profile data including expanded "See more" sections. Built on the same reliable Cloudflare bypass technology as the Upwork scraper.

## ✨ Features

- ✅ **Automatic "See more" Expansion** - Clicks all "See more" buttons to get full content
- ✅ **Comprehensive Data Extraction** - Gets all profile sections
- ✅ **Batch Processing** - Scrape multiple profiles in one run
- ✅ **REST API Available** - Easy integration with automation tools
- ✅ **Excel & JSON Export** - Get results in both formats
- ✅ **Cloudflare Bypass** - Uses Puppeteer Real Browser

## 📊 Data Extracted

### Profile Information:
- Name, headline, location
- Profile picture URL
- **Full About section** (expanded)

### Experience:
- Job titles
- Company names
- Duration and location
- **Full job descriptions** (expanded)

### Education:
- School names
- Degrees and fields of study
- Dates
- **Full descriptions** (expanded)

### Additional Data:
- Skills list
- Certifications
- Languages with proficiency
- Contact information (if available)

## 🚀 Quick Start

### Option 1: Batch Scraping (Recommended)

1. **Configure your profile URLs** in `linkedin-scrape-batch.js`:
```javascript
const profileUrls = [
    'https://www.linkedin.com/in/profile-1/',
    'https://www.linkedin.com/in/profile-2/',
    'https://www.linkedin.com/in/profile-3/',
];

const headlessMode = false; // Set to false to see browser
```

2. **Run the scraper:**
```powershell
node linkedin-scrape-batch.js
```

3. **Get your results:**
   - `linkedin-profiles-[timestamp].json` - Complete data
   - `linkedin-profiles-[timestamp].csv` - Excel-compatible spreadsheet

### Option 2: Test Single Profile

```powershell
node linkedin-test.js
```

Edit `linkedin-test.js` to test with your own profile URLs.

## 🌐 API Server (For n8n/Zapier)

### Start the Server

```powershell
node linkedin-server.js
```

API available at `http://localhost:3001`

### API Endpoints

**POST Endpoint:**
```bash
POST http://localhost:3001/scrape

Body:
{
  "urls": [
    "https://www.linkedin.com/in/profile-1/",
    "https://www.linkedin.com/in/profile-2/"
  ],
  "headless": true
}
```

**GET Endpoint (for webhooks):**
```bash
GET http://localhost:3001/scrape?urls=https://linkedin.com/in/profile1,https://linkedin.com/in/profile2
```

### Response Format

```json
{
  "success": true,
  "totalProfiles": 2,
  "successfullyScraped": 2,
  "failed": 0,
  "profiles": [
    {
      "success": true,
      "url": "https://linkedin.com/in/profile1/",
      "name": "John Doe",
      "headline": "Senior Developer at Company",
      "location": "San Francisco, CA",
      "about": "Full about section text...",
      "experience": [
        {
          "title": "Senior Developer",
          "company": "Tech Company",
          "duration": "Jan 2020 - Present",
          "location": "San Francisco, CA",
          "description": "Full job description..."
        }
      ],
      "education": [...],
      "skills": ["JavaScript", "Python", "React"],
      "certifications": [...],
      "languages": [...]
    }
  ]
}
```

## ⚠️ Important Notes

### LinkedIn Authentication

LinkedIn requires you to be logged in to view profiles.

**✨ SESSION PERSISTENCE - Log in once, use forever!**

The scraper automatically saves your login session in a `linkedin-session/` folder. This means:
- **First time**: You'll need to log in manually in the browser
- **Future runs**: Your session is preserved - no login needed!
- **Session location**: `linkedin-session/` folder (don't delete this)

**How to log in:**
1. Set `headless: false` in your script
2. Browser will open - click "Sign in"
3. **RECOMMENDED**: Use "Sign in with email" (not OAuth buttons)
4. Enter your LinkedIn credentials
5. Complete 2FA if prompted
6. Wait for feed to load
7. Session is now saved for all future runs!

**If OAuth popup closes automatically:**
- Click "Sign in with email" at the bottom instead
- Or manually refresh the page after OAuth completes

### Rate Limiting

- Add delays between profiles (default: 3 seconds)
- Don't scrape too many profiles in quick succession
- LinkedIn may detect and block automated access

### Legal Considerations

- Review LinkedIn's Terms of Service
- Only scrape publicly available information
- Use responsibly and ethically
- Consider LinkedIn's official API for commercial use

## 🔧 Customization

### Modify Selectors

If LinkedIn updates their UI, update selectors in `linkedin-scraper.js`:

```javascript
// Find the section in extractProfileData() function
data.name = getText('h1') || getText('.text-heading-xlarge');
```

### Add More Sections

To extract additional sections:

```javascript
// Add to extractProfileData() function
data.newSection = [];
const newSection = document.querySelector('#new-section-id');
// ... extraction logic
```

## 🐛 Troubleshooting

**"Login required" error:**
- Set `headless: false` and log in manually
- Or implement cookie-based authentication

**"See more" buttons not clicked:**
- Check if selectors in `expandAllSections()` are current
- LinkedIn may have updated their button classes

**Missing data:**
- Some profiles have privacy settings that hide sections
- Script will extract what's publicly available

**Slow scraping:**
- Each profile takes 10-15 seconds (scrolling + expanding + extraction)
- This is normal and ensures complete data extraction

## 📝 Files

- `linkedin-scraper.js` - Core scraping logic
- `linkedin-scrape-batch.js` - Batch processing script
- `linkedin-server.js` - API server
- `linkedin-test.js` - Test script
- `LINKEDIN-README.md` - This file

## 💡 Tips

1. **First run**: Use `headless: false` to see what's happening
2. **Testing**: Start with 1-2 profiles to verify it works
3. **Production**: Use `headless: true` for faster, unattended scraping
4. **Delays**: Increase delays if you hit rate limits
5. **Verify data**: Check the JSON output to ensure all sections were captured

## 🔗 Integration with n8n

1. Start the API server: `node linkedin-server.js`
2. Use ngrok to expose: `ngrok http 3001`
3. In n8n, use HTTP Request node:
   - Method: POST
   - URL: `https://your-ngrok-url.ngrok.io/scrape`
   - Body: JSON with `urls` array

## 📄 Example Output Structure

```json
{
  "success": true,
  "url": "https://linkedin.com/in/example/",
  "name": "Jane Smith",
  "headline": "Product Manager | Tech Enthusiast",
  "location": "New York, NY",
  "profilePicture": "https://...",
  "about": "Passionate product manager with 10+ years...",
  "experience": [
    {
      "title": "Senior Product Manager",
      "company": "Tech Corp",
      "duration": "2020 - Present",
      "location": "New York, NY",
      "description": "Leading product strategy..."
    }
  ],
  "education": [
    {
      "school": "University Name",
      "degree": "Bachelor of Science",
      "dates": "2010 - 2014",
      "description": "Computer Science major..."
    }
  ],
  "skills": ["Product Management", "Agile", "Python"],
  "certifications": [
    {
      "name": "Certified Scrum Product Owner",
      "issuer": "Scrum Alliance",
      "date": "Issued Jan 2020"
    }
  ],
  "languages": [
    {
      "name": "English",
      "proficiency": "Native or bilingual proficiency"
    }
  ],
  "scrapedAt": "2025-12-08T10:30:00.000Z"
}
```

---

**Need help?** Check the console output for detailed logging of what's being scraped!
