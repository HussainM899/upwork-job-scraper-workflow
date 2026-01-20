const { connect } = require('puppeteer-real-browser');

/**
 * Delay helper function
 * @param {number} ms - Milliseconds to wait
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if Cloudflare has been bypassed
 * @param {Object} page - Puppeteer page object
 */
async function checkCloudflareBypass(page) {
    try {
        // Check for any of these elements that indicate page loaded successfully
        const selectors = [
            'article',
            'section',
            '.jobs-list',
            '[data-test]',
            'h3',
            'h4',
            'input[placeholder*="Search"]'
        ];
        
        // Wait for any selector to appear (longer timeout for headless)
        await Promise.race(
            selectors.map(selector => 
                page.waitForSelector(selector, { timeout: 15000 })
            )
        );
        
        // Additional check: make sure we're not on a Cloudflare page
        const isCloudflare = await page.evaluate(() => {
            const text = document.body.textContent || '';
            return text.includes('Checking your browser') || 
                   text.includes('Just a moment') ||
                   text.includes('Cloudflare');
        });
        
        return !isCloudflare;
    } catch (error) {
        return false;
    }
}

/**
 * Navigate to page and wait for Cloudflare bypass
 * @param {Object} page - Puppeteer page object
 * @param {string} url - URL to navigate to
 */
async function navigateAndWaitForBypass(page, url) {
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    console.log('Page loaded, checking for Cloudflare...');
    
    // Wait longer for page to settle (especially in headless mode)
    await delay(4000);
    
    // Check if Cloudflare was bypassed
    let attempts = 0;
    const maxAttempts = 8;
    
    while (attempts < maxAttempts) {
        const bypassed = await checkCloudflareBypass(page);
        if (bypassed) {
            console.log('✓ Page loaded successfully!');
            // Extra wait for dynamic content to fully load
            await delay(3000);
            return true;
        }
        
        console.log(`  Waiting for page to load... Attempt ${attempts + 1}/${maxAttempts}`);
        await delay(2000);
        attempts++;
    }
    
    // Even if checks fail, try to continue - page might be loaded
    console.log('⚠ Continuing anyway, page might be loaded...');
    await delay(3000);
    return true;
}

/**
 * Scroll to load more jobs
 * @param {Object} page - Puppeteer page object
 */
async function scrollToLoadMore(page) {
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });
    await delay(2000);
}

/**
 * Click "Load More" button if available
 * @param {Object} page - Puppeteer page object
 */
async function clickLoadMoreIfExists(page) {
    try {
        const loadMoreButton = await page.$('button[data-ev-label="load_more_search_results"]');
        if (loadMoreButton) {
            console.log('Clicking "Load More" button...');
            await loadMoreButton.click();
            await delay(3000);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Navigate to next page using pagination
 * @param {Object} page - Puppeteer page object
 * @param {number} currentPage - Current page number
 */
async function goToNextPage(page, currentPage) {
    try {
        console.log(`\n📄 Navigating to page ${currentPage + 1}...`);
        
        // Try to find and click the next page button
        // Look for pagination with aria-label="Go to next page" or similar
        const nextPageSelectors = [
            'button[aria-label*="next" i]',
            'a[aria-label*="next" i]',
            'button[data-test="pagination-next"]',
            'a[data-test="pagination-next"]',
            `button:has-text("${currentPage + 1}")`,
            `a[href*="page=${currentPage + 1}"]`,
            'nav[role="navigation"] button[aria-label*="Go to page"]',
            'nav button:not([disabled]):last-of-type' // Last enabled button in nav
        ];
        
        for (const selector of nextPageSelectors) {
            try {
                const nextButton = await page.$(selector);
                if (nextButton) {
                    // Check if it's not disabled
                    const isDisabled = await nextButton.evaluate(el => 
                        el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled')
                    );
                    
                    if (!isDisabled) {
                        await nextButton.click();
                        console.log('  ✓ Clicked next page button');
                        await delay(3000); // Wait for page to load
                        return true;
                    }
                }
            } catch (err) {
                // Try next selector
                continue;
            }
        }
        
        // Alternative: Try to build the URL with page parameter
        const currentUrl = page.url();
        let nextPageUrl;
        
        if (currentUrl.includes('&page=') || currentUrl.includes('?page=')) {
            // Replace existing page number
            nextPageUrl = currentUrl.replace(/([?&])page=\d+/, `$1page=${currentPage + 1}`);
        } else {
            // Add page parameter
            const separator = currentUrl.includes('?') ? '&' : '?';
            nextPageUrl = `${currentUrl}${separator}page=${currentPage + 1}`;
        }
        
        console.log(`  Trying URL navigation: ${nextPageUrl}`);
        await page.goto(nextPageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(2000);
        
        return true;
        
    } catch (error) {
        console.error(`  ⚠ Could not navigate to next page: ${error.message}`);
        return false;
    }
}

/**
 * Find all job tile articles on the page
 * @param {Object} page - Puppeteer page object
 */
async function findJobElements(page) {
    // First, let's debug what's actually on the page
    const pageStructure = await page.evaluate(() => {
        const articles = document.querySelectorAll('article');
        const sections = document.querySelectorAll('section');
        const divs = document.querySelectorAll('div[class*="job"]');
        
        return {
            articleCount: articles.length,
            sectionCount: sections.length,
            jobDivCount: divs.length,
            firstArticleClasses: articles[0]?.className || '',
            firstArticleText: articles[0]?.textContent?.substring(0, 100) || '',
            pageTitle: document.title,
            bodyText: document.body.textContent?.substring(0, 200) || ''
        };
    });
    
    console.log('Page structure:', pageStructure);
    
    // Check if we're on an error or blocked page
    if (pageStructure.pageTitle.includes('Access denied') || 
        pageStructure.bodyText.includes('Access denied') ||
        pageStructure.bodyText.includes('blocked')) {
        console.log('⚠️ WARNING: Page may be blocked or access denied!');
        console.log('Page title:', pageStructure.pageTitle);
    }
    
    // Try multiple selectors based on actual Upwork structure
    const selectors = [
        'article',  // Most generic - try this first
        'section[class*="job"]',
        'div[class*="job-tile"]',
        'article[data-ev-label="search_result_impression"]',
        'section.job-tile',
        '.air3-card'
    ];
    
    let jobElements = [];
    for (const selector of selectors) {
        jobElements = await page.$$(selector);
        if (jobElements.length > 0) {
            console.log(`✓ Found ${jobElements.length} job listings using selector: ${selector}`);
            break;
        }
    }
    
    if (jobElements.length === 0) {
        console.log('⚠ No jobs found with any selector. Saving page HTML for debugging...');
        const html = await page.content();
        const timestamp = Date.now();
        require('fs').writeFileSync(`debug-page-${timestamp}.html`, html);
        console.log(`Saved page HTML to debug-page-${timestamp}.html`);
        
        // Take a screenshot if possible
        try {
            await page.screenshot({ path: `debug-screenshot-${timestamp}.png`, fullPage: true });
            console.log(`Saved screenshot to debug-screenshot-${timestamp}.png`);
        } catch (e) {
            console.log('Could not save screenshot');
        }
    }
    
    return jobElements;
}

/**
 * Extract basic job info from listing (title, link, etc)
 * @param {Object} jobElement - Job element
 */
async function extractBasicJobInfo(jobElement) {
    try {
        const jobData = await jobElement.evaluate(el => {
            const data = {};
            
            // Try multiple selectors for title - cast to broader search
            let titleElement = el.querySelector('h2 a, h3 a, h4 a, h5 a');
            
            // If no heading link found, find ANY link that goes to a job
            if (!titleElement) {
                const links = el.querySelectorAll('a');
                for (const link of links) {
                    if (link.href && (link.href.includes('/jobs/~') || link.href.includes('/job/'))) {
                        titleElement = link;
                        break;
                    }
                }
            }
            
            // Still no link? Just grab the first link in the element
            if (!titleElement) {
                titleElement = el.querySelector('a[href]');
            }
            
            data.title = titleElement ? titleElement.textContent.trim() : '';
            data.link = titleElement ? titleElement.href : '';
            
            // If still no title, try to get any heading text
            if (!data.title) {
                const heading = el.querySelector('h2, h3, h4, h5');
                data.title = heading ? heading.textContent.trim() : 'No title found';
            }
            
            // Extract job ID from link
            if (data.link) {
                // Match patterns like ~021996291161362477231 or just numbers
                const jobIdMatch = data.link.match(/[~_](\d{21,})/);
                data.jobId = jobIdMatch ? jobIdMatch[1] : '';
            }
            
            // Short description - try to get any paragraph text
            const descElement = el.querySelector('p, div[class*="description"], div[class*="desc"]');
            data.shortDescription = descElement ? descElement.textContent.trim() : '';
            
            // Budget/Price - look for dollar signs or "Hourly"
            const allText = el.textContent;
            const budgetMatch = allText.match(/\$[\d,]+-?\$?[\d,]*|\d+\.\d+\/hr|Hourly|Fixed-price/i);
            data.budget = budgetMatch ? budgetMatch[0] : '';
            
            // Skills - look for span or badge elements
            const skillsElements = el.querySelectorAll('span[class*="token"], span[class*="badge"], span[class*="skill"]');
            data.skills = Array.from(skillsElements).map(skill => skill.textContent.trim()).filter(s => s && s.length < 50);
            
            // Posted time - look for time-related text
            const timeMatch = allText.match(/Posted \w+ \w+ ago|Posted \d+ \w+ ago|\d+ (minute|hour|day)s? ago/i);
            data.postedTime = timeMatch ? timeMatch[0] : '';
            
            return data;
        });
        
        return jobData;
    } catch (error) {
        console.error('Error extracting basic job info:', error.message);
        return null;
    }
}

/**
 * Click on job and extract full description
 * @param {Object} page - Puppeteer page object
 * @param {string} jobLink - Job detail page link
 */
async function getJobFullDescription(page, jobLink) {
    try {
        console.log(`  Opening job details...`);
        
        // Open in new page to avoid losing the main list
        const newPage = await page.browser().newPage();
        await newPage.goto(jobLink, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await delay(1500);
        
        // Extract full details with multiple fallback selectors
        const fullDetails = await newPage.evaluate(() => {
            const details = {};
            
            // Full description - try multiple selectors
            let descText = '';
            const descSelectors = [
                '[data-test="Description"]',
                '.job-description',
                'section[class*="description"]',
                'div[class*="description"]',
                'p'
            ];
            
            for (const selector of descSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent && element.textContent.length > 50) {
                    descText = element.textContent.trim();
                    break;
                }
            }
            
            details.fullDescription = descText;
            
            // Client info - use broad text extraction
            const allText = document.body.textContent;
            
            // Try to extract budget/rate info
            const budgetMatch = allText.match(/(\$\d+[\d,]*(?:-\$\d+[\d,]*)?(?:\/hr)?)/);
            if (budgetMatch) details.budget = budgetMatch[1];
            
            // Try to extract client location
            const locationMatch = allText.match(/([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*)\s+\d{1,2}:\d{2}\s+[AP]M/);
            if (locationMatch) details.clientLocation = locationMatch[1];
            
            // Try to extract proposals count
            const proposalsMatch = allText.match(/(\d+ to \d+|Less than \d+)\s+proposals?/i);
            if (proposalsMatch) details.proposals = proposalsMatch[0];
            
            // Payment verification
            details.paymentVerified = allText.includes('Payment verified') || allText.includes('Payment method verified');
            
            return details;
        });
        
        await newPage.close();
        return fullDetails;
        
    } catch (error) {
        console.error(`  ⚠ Could not load job details: ${error.message}`);
        return { fullDescription: '', error: error.message };
    }
}

/**
 * Main scraping function
 * @param {string} upworkUrl - Upwork search URL or keywords
 * @param {boolean} headless - Run browser in headless mode
 * @param {number} maxJobs - Maximum number of jobs to scrape (default: 100)
 */
async function scrapeJobs(upworkUrl, headless = true, maxJobs = 100) {
    let browser;
    let page;
    
    try {
        console.log('Launching browser...');
        
        // Connect to Puppeteer Real Browser
        const { browser: browserInstance, page: pageInstance } = await connect({
            headless: headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ],
            turnstile: true,
            disableXvfb: false,
            ignoreAllFlags: false,
            customConfig: {},
        });
        
        browser = browserInstance;
        page = pageInstance;
        
        console.log('Browser launched successfully');
        
        // If upworkUrl doesn't look like a full URL, treat it as keywords
        let searchUrl = upworkUrl;
        if (!upworkUrl.startsWith('http')) {
            searchUrl = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(upworkUrl)}&sort=recency`;
            console.log(`Using keywords to build URL: ${searchUrl}`);
        }
        
        // Navigate and wait for Cloudflare bypass
        await navigateAndWaitForBypass(page, searchUrl);
        
        // Wait a bit more for all content to load
        await delay(3000);
        
        const allJobs = [];
        const seenJobIds = new Set();
        let currentPage = 1;
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 2;
        let consecutivePagesWithNoDuplicates = 0;
        const maxConsecutiveNoDuplicates = 3; // Stop if 3 pages in a row have only duplicates
        
        console.log(`Target: ${maxJobs} jobs\n`);
        
        // Loop through pages until we hit maxJobs or no more available
        while (allJobs.length < maxJobs && consecutiveFailures < maxConsecutiveFailures && consecutivePagesWithNoDuplicates < maxConsecutiveNoDuplicates) {
            
            // Find all current job elements
            const jobElements = await findJobElements(page);
            
            if (jobElements.length === 0) {
                console.log('⚠ No job elements found');
                consecutiveFailures++;
                
                // Try next page anyway
                if (consecutiveFailures < maxConsecutiveFailures) {
                    const navigated = await goToNextPage(page, currentPage);
                    if (navigated) {
                        currentPage++;
                        continue;
                    }
                }
                break;
            }
            
            // Reset failure counter since we found jobs
            consecutiveFailures = 0;
            
            let newJobsOnThisPage = 0;
            let duplicatesOnThisPage = 0;
            
            console.log(`\n📄 Page ${currentPage} - Found ${jobElements.length} job elements (${allJobs.length} total scraped)\n`);
            
            // Extract basic info from all visible jobs
            for (let i = 0; i < jobElements.length && allJobs.length < maxJobs; i++) {
                try {
                    const basicInfo = await extractBasicJobInfo(jobElements[i]);
                    
                    // Skip if no basic info extracted
                    if (!basicInfo) {
                        continue;
                    }
                    
                    // Generate a jobId if missing
                    if (!basicInfo.jobId && basicInfo.link) {
                        const match = basicInfo.link.match(/[~_](\d{21,})/);
                        basicInfo.jobId = match ? match[1] : `job-${Date.now()}-${i}`;
                    }
                    
                    if (!basicInfo.jobId) {
                        basicInfo.jobId = `temp-${Date.now()}-${i}`;
                    }
                    
                    // Skip if we already processed this job
                    if (!seenJobIds.has(basicInfo.jobId)) {
                        seenJobIds.add(basicInfo.jobId);
                        newJobsOnThisPage++;
                        
                        console.log(`[${allJobs.length + 1}/${maxJobs}] ${basicInfo.title || 'Untitled'}`);
                        
                        // Only get full description if we have a valid link
                        if (basicInfo.link && basicInfo.link.includes('upwork.com')) {
                            const fullDetails = await getJobFullDescription(page, basicInfo.link);
                            
                            // Combine basic and full details
                            const completeJob = {
                                ...basicInfo,
                                ...fullDetails
                            };
                            
                            allJobs.push(completeJob);
                            console.log(`  ✓ Scraped successfully`);
                        } else {
                            // Add without full details if no valid link
                            allJobs.push(basicInfo);
                        }
                    } else {
                        duplicatesOnThisPage++;
                    }
                } catch (error) {
                    console.error(`  Error processing job ${i + 1}: ${error.message}`);
                }
            }
                        // Show summary for this page
            if (duplicatesOnThisPage > 0) {
                console.log(`\n📄 Page ${currentPage} summary: ${newJobsOnThisPage} new jobs, ${duplicatesOnThisPage} duplicates`);
            }
                        // If we've hit our target, stop
            if (allJobs.length >= maxJobs) {
                console.log(`\n✅ Reached target of ${maxJobs} jobs`);
                break;
            }
            
            // If we didn't find any new jobs on this page, increment counters
            if (newJobsOnThisPage === 0) {
                consecutiveFailures++;
                consecutivePagesWithNoDuplicates++;
                console.log(`\n⚠ No new jobs on page ${currentPage} (${consecutivePagesWithNoDuplicates} consecutive pages with duplicates)`);
                
                // If we've seen too many pages with only duplicates, stop
                if (consecutivePagesWithNoDuplicates >= maxConsecutiveNoDuplicates) {
                    console.log(`\n❌ Stopped: Found only duplicate jobs on ${maxConsecutiveNoDuplicates} consecutive pages`);
                    break;
                }
            } else {
                // Reset the counter when we find new jobs
                consecutivePagesWithNoDuplicates = 0;
            }
            
            // Try to navigate to next page
            console.log(`\n📑 Progress: ${allJobs.length}/${maxJobs} jobs scraped`);
            const navigated = await goToNextPage(page, currentPage);
            
            if (!navigated) {
                console.log('⚠ Could not navigate to next page, stopping');
                break;
            }
            
            currentPage++;
            await delay(2000); // Wait between pages
        }
        
        console.log(`\n✅ Successfully scraped ${allJobs.length} jobs`);
        
        return allJobs;
        
    } catch (error) {
        console.error('Error during scraping:', error.message);
        throw error;
    } finally {
        // Close browser
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}

module.exports = { scrapeJobs };
