const { connect } = require('puppeteer-real-browser');

/**
 * Delay helper function
 * @param {number} ms - Milliseconds to wait
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Click all "See more" buttons in a section
 * @param {Object} page - Puppeteer page object
 */
async function expandAllSections(page) {
    try {
        console.log('  Expanding all sections...');
        
        // Comprehensive selectors for "See more" buttons on LinkedIn
        const seeMoreSelectors = [
            'button[aria-label*="more" i]',
            'button.inline-show-more-text__button',
            'button.lt-line-clamp__more',
            'button[data-control-name*="see_more"]',
            '.inline-show-more-text__button',
            '.lt-line-clamp__more',
            'button.artdeco-button--tertiary[aria-expanded="false"]',
            'button[aria-label*="Show all" i]',
            'button[aria-label*="Show more" i]',
            'button.pv-profile-section__see-more-inline',
            'button[data-test-link-to-see-more]'
        ];
        
        let totalClicks = 0;
        let previousClicks = -1;
        let attempts = 0;
        const maxAttempts = 3;
        
        // Keep trying until no new buttons are found (some appear after expanding others)
        while (totalClicks !== previousClicks && attempts < maxAttempts) {
            previousClicks = totalClicks;
            attempts++;
            
            // Try each selector
            for (const selector of seeMoreSelectors) {
                try {
                    // Find all matching buttons using evaluate for better reliability
                    const clickedCount = await page.evaluate((sel) => {
                        let clicked = 0;
                        const buttons = document.querySelectorAll(sel);
                        
                        buttons.forEach(button => {
                            try {
                                const rect = button.getBoundingClientRect();
                                const style = window.getComputedStyle(button);
                                
                                // Check if button is visible and in viewport
                                if (style.display !== 'none' && 
                                    style.visibility !== 'hidden' && 
                                    style.opacity !== '0' &&
                                    rect.width > 0 && rect.height > 0) {
                                    
                                    // Check if button text contains "more" or "all"
                                    const buttonText = button.textContent.toLowerCase();
                                    if (buttonText.includes('more') || 
                                        buttonText.includes('all') ||
                                        button.getAttribute('aria-label')?.toLowerCase().includes('more')) {
                                        button.click();
                                        clicked++;
                                    }
                                }
                            } catch (err) {
                                // Continue with next button
                            }
                        });
                        
                        return clicked;
                    }, selector);
                    
                    if (clickedCount > 0) {
                        totalClicks += clickedCount;
                        await delay(500); // Wait for content to expand
                    }
                } catch (err) {
                    // Selector not found, try next one
                    continue;
                }
            }
            
            // Scroll a bit to trigger any lazy-loaded expand buttons
            await page.evaluate(() => window.scrollBy(0, 300));
            await delay(300);
        }
        
        console.log(`  ✓ Clicked ${totalClicks} "See more" buttons`);
        
        // Final wait for all content to load
        await delay(1500);
        
    } catch (error) {
        console.log(`  ⚠ Error expanding sections: ${error.message}`);
    }
}

/**
 * Extract profile data from LinkedIn page
 * @param {Object} page - Puppeteer page object
 */
async function extractProfileData(page) {
    try {
        // Add timeout to prevent hanging
        const profileData = await page.evaluate(() => {
            const data = {};
            
            // First, verify we're on a profile page
            const url = window.location.href;
            if (!url.includes('/in/')) {
                throw new Error('Not on a profile page: ' + url);
            }
            
            // Helper function to get text content
            const getText = (selector) => {
                const element = document.querySelector(selector);
                return element ? element.textContent.trim() : '';
            };
            
            const getAllText = (selector) => {
                const elements = document.querySelectorAll(selector);
                return Array.from(elements).map(el => el.textContent.trim());
            };
            
            // === BASIC INFO ===
            data.name = getText('h1') || getText('.text-heading-xlarge');
            
            data.headline = getText('.text-body-medium') || 
                          getText('.pv-text-details__left-panel h2') ||
                          getText('[class*="headline"]');
            
            data.location = getText('.text-body-small.inline.t-black--light.break-words') ||
                          getText('[class*="location"]');
            
            // Profile picture
            const imgElement = document.querySelector('img.pv-top-card-profile-picture__image');
            data.profilePicture = imgElement ? imgElement.src : '';
            
            // === ABOUT SECTION ===
            const aboutSection = document.querySelector('#about') || 
                               document.querySelector('[data-section="summary"]');
            
            if (aboutSection) {
                // Get the parent section to capture all text
                const aboutContainer = aboutSection.closest('section') || aboutSection;
                const aboutText = aboutContainer.querySelector('.inline-show-more-text') ||
                                aboutContainer.querySelector('.pv-shared-text-with-see-more') ||
                                aboutContainer.querySelector('.pv-about-section') ||
                                aboutContainer.querySelector('div[class*="about"]');
                
                data.about = aboutText ? aboutText.textContent.trim() : '';
                
                // Fallback: get all paragraph text in about section
                if (!data.about) {
                    const paragraphs = aboutContainer.querySelectorAll('p, span[aria-hidden="true"]');
                    data.about = Array.from(paragraphs)
                        .map(p => p.textContent.trim())
                        .filter(text => text.length > 0)
                        .join(' ');
                }
            }
            
            // === EXPERIENCE SECTION ===
            data.experience = [];
            const experienceSection = document.querySelector('#experience') ||
                                    document.querySelector('[data-section="experience"]');
            
            if (experienceSection) {
                const experienceContainer = experienceSection.closest('section');
                const experienceItems = experienceContainer.querySelectorAll('li.artdeco-list__item, li.pvs-list__paged-list-item') ||
                                      experienceContainer.querySelectorAll('[data-view-name*="profile-component-entity"]');
                
                experienceItems.forEach(item => {
                    const exp = {};
                    
                    // Job title - multiple selectors for different layouts
                    exp.title = item.querySelector('.mr1.t-bold span')?.textContent.trim() ||
                              item.querySelector('div[class*="entity-result__title"] span[aria-hidden="true"]')?.textContent.trim() ||
                              item.querySelector('[class*="profile-section-card__title"]')?.textContent.trim() ||
                              item.querySelector('h3')?.textContent.trim() ||
                              '';
                    
                    // Company name
                    exp.company = item.querySelector('.t-14.t-normal span')?.textContent.trim() ||
                                item.querySelector('[class*="profile-section-card__subtitle"]')?.textContent.trim() ||
                                item.querySelector('span[class*="entity-result__subtitle"]')?.textContent.trim() ||
                                item.querySelector('.t-14 span[aria-hidden="true"]')?.textContent.trim() ||
                                '';
                    
                    // Date range
                    const dateElement = item.querySelector('.t-14.t-normal.t-black--light span') ||
                                      item.querySelector('[class*="date-range"]');
                    exp.duration = dateElement ? dateElement.textContent.trim() : '';
                    
                    // Location
                    const locationElement = item.querySelector('.t-14.t-normal.t-black--light:not(:has(span))');
                    exp.location = locationElement ? locationElement.textContent.trim() : '';
                    
                    // Description (after expanding "See more")
                    const descElement = item.querySelector('.inline-show-more-text') ||
                                      item.querySelector('.pv-shared-text-with-see-more') ||
                                      item.querySelector('[class*="description"]') ||
                                      item.querySelector('div[class*="show-more-less-text"]');
                    exp.description = descElement ? descElement.textContent.trim() : '';
                    
                    // Fallback: get all span text if no description found
                    if (!exp.description) {
                        const spans = item.querySelectorAll('span[aria-hidden="true"]');
                        const texts = Array.from(spans).map(s => s.textContent.trim()).filter(t => t.length > 50);
                        exp.description = texts.length > 0 ? texts.join(' ') : '';
                    }
                    
                    if (exp.title || exp.company) {
                        data.experience.push(exp);
                    }
                });
            }
            
            // === EDUCATION SECTION ===
            data.education = [];
            const educationSection = document.querySelector('#education');
            
            if (educationSection) {
                const educationContainer = educationSection.closest('section');
                const educationItems = educationContainer.querySelectorAll('li.artdeco-list__item');
                
                educationItems.forEach(item => {
                    const edu = {};
                    
                    edu.school = item.querySelector('.mr1.t-bold span')?.textContent.trim() ||
                               item.querySelector('h3')?.textContent.trim() ||
                               '';
                    
                    edu.degree = item.querySelector('.t-14.t-normal span')?.textContent.trim() || '';
                    
                    const dateElement = item.querySelector('.t-14.t-normal.t-black--light span');
                    edu.dates = dateElement ? dateElement.textContent.trim() : '';
                    
                    const descElement = item.querySelector('.inline-show-more-text');
                    edu.description = descElement ? descElement.textContent.trim() : '';
                    
                    if (edu.school) {
                        data.education.push(edu);
                    }
                });
            }
            
            // === SKILLS SECTION ===
            data.skills = [];
            const skillsSection = document.querySelector('#skills');
            
            if (skillsSection) {
                const skillsContainer = skillsSection.closest('section');
                const skillElements = skillsContainer.querySelectorAll('[class*="skill"] span[aria-hidden="true"]') ||
                                    skillsContainer.querySelectorAll('.mr1.t-bold span');
                
                skillElements.forEach(skill => {
                    const skillText = skill.textContent.trim();
                    if (skillText && skillText.length < 100) {
                        data.skills.push(skillText);
                    }
                });
            }
            
            // === CERTIFICATIONS ===
            data.certifications = [];
            const certsSection = document.querySelector('#licenses_and_certifications');
            
            if (certsSection) {
                const certsContainer = certsSection.closest('section');
                const certItems = certsContainer.querySelectorAll('li.artdeco-list__item');
                
                certItems.forEach(item => {
                    const cert = {};
                    
                    cert.name = item.querySelector('.mr1.t-bold span')?.textContent.trim() || '';
                    cert.issuer = item.querySelector('.t-14.t-normal span')?.textContent.trim() || '';
                    
                    const dateElement = item.querySelector('.t-14.t-normal.t-black--light span');
                    cert.date = dateElement ? dateElement.textContent.trim() : '';
                    
                    if (cert.name) {
                        data.certifications.push(cert);
                    }
                });
            }
            
            // === LANGUAGES ===
            data.languages = [];
            const languagesSection = document.querySelector('#languages');
            
            if (languagesSection) {
                const languagesContainer = languagesSection.closest('section');
                const langElements = languagesContainer.querySelectorAll('li.artdeco-list__item');
                
                langElements.forEach(item => {
                    const lang = {};
                    lang.name = item.querySelector('.mr1.t-bold span')?.textContent.trim() || '';
                    lang.proficiency = item.querySelector('.t-14.t-normal.t-black--light span')?.textContent.trim() || '';
                    
                    if (lang.name) {
                        data.languages.push(lang);
                    }
                });
            }
            
            // === CONTACT INFO (if available) ===
            data.contactInfo = {
                email: getText('[href^="mailto:"]')?.replace('mailto:', '') || '',
                phone: getText('[href^="tel:"]')?.replace('tel:', '') || '',
                website: ''
            };
            
            const websiteLink = document.querySelector('a[data-field="website_url"]');
            if (websiteLink) {
                data.contactInfo.website = websiteLink.href;
            }
            
            return data;
        });
        
        return profileData;
        
    } catch (error) {
        console.error('  Error extracting profile data:', error.message);
        return null;
    }
}

/**
 * Wait for user to manually log in to LinkedIn
 * @param {Object} page - Puppeteer page object
 */
async function waitForManualLogin(page) {
    console.log('\n');
    console.log('━'.repeat(70));
    console.log('🔐 LOGIN REQUIRED - PLEASE LOG IN TO LINKEDIN');
    console.log('━'.repeat(70));
    console.log('');
    console.log('  ✨ GOOD NEWS: You only need to do this ONCE!');
    console.log('     Your session will be saved for future scraping runs.');
    console.log('');
    console.log('  👉 Look at the browser window that just opened');
    console.log('  👉 Click "Sign in" button');
    console.log('');
    console.log('  ⚠️  IMPORTANT: If using Google/Microsoft OAuth:');
    console.log('     - The popup might close automatically');
    console.log('     - Instead, click "Sign in with email" at the bottom');
    console.log('     - Or refresh the page after OAuth completes');
    console.log('');
    console.log('  👉 Enter your LinkedIn email and password directly');
    console.log('  👉 Complete any 2FA/verification if prompted');
    console.log('  👉 Wait until you see your LinkedIn feed (home page)');
    console.log('');
    console.log('  ⏱️  Waiting for you to complete login (5 minute timeout)...');
    console.log('━'.repeat(70));
    console.log('');
    
    const startTime = Date.now();
    let lastCheck = Date.now();
    
    // Wait for navigation away from login/authwall page or modal to close
    try {
        // Check every 3 seconds with detailed feedback
        let attempts = 0;
        const maxAttempts = 100; // 5 minutes = 100 attempts at 3 seconds each
        
        while (attempts < maxAttempts) {
            attempts++;
            const elapsed = Math.round(attempts * 3);
            
            // Check login status with detailed debugging
            const loginStatus = await page.evaluate(() => {
                const url = window.location.href;
                const bodyText = document.body.textContent || '';
                
                // Check for auth indicators
                const onLoginPage = url.includes('/login') || url.includes('/authwall') || url.includes('/checkpoint');
                const hasSignInText = bodyText.includes('Sign in');
                const hasBrowseAnonymously = bodyText.includes('Browse anonymously');
                const hasJoinNow = bodyText.includes('Join now');
                
                // Check for logged-in indicators (multiple methods)
                const hasUserMenu = document.querySelector('[data-control-name="identity_welcome_message"]') !== null ||
                                  document.querySelector('.global-nav__me') !== null ||
                                  document.querySelector('[id*="ember"]') !== null;
                const hasNavigation = document.querySelector('nav') !== null;
                const hasMessaging = document.querySelector('[href*="/messaging"]') !== null;
                const hasNetworking = document.querySelector('[href*="/mynetwork"]') !== null;
                const hasFeedElements = document.querySelector('[class*="feed"]') !== null ||
                                      document.querySelector('[data-test-app-aware-link]') !== null;
                const hasProfilePic = document.querySelector('img[class*="global-nav"]') !== null;
                
                // On feed page
                const onFeed = url.includes('/feed');
                
                // More lenient: if we see ANY logged-in indicator and NOT on login page
                const hasAnyLoggedInIndicator = hasUserMenu || hasMessaging || hasNetworking || 
                                               hasFeedElements || hasProfilePic;
                
                // Determine if logged in
                const loggedIn = !onLoginPage && 
                               !hasBrowseAnonymously &&
                               !hasJoinNow &&
                               (hasAnyLoggedInIndicator || (onFeed && hasNavigation));
                
                return {
                    loggedIn,
                    onLoginPage,
                    hasBrowseAnonymously,
                    hasJoinNow,
                    hasUserMenu,
                    hasMessaging,
                    hasNetworking,
                    hasFeedElements,
                    hasNavigation,
                    hasProfilePic,
                    onFeed,
                    url: url,
                    pageTitle: document.title
                };
            });
            
            // Provide detailed feedback every 15 seconds
            if (attempts % 5 === 0) {
                console.log(`  ⏳ ${elapsed}s - ${loginStatus.pageTitle}`);
                if (loginStatus.onLoginPage) {
                    console.log(`     → On login page - please sign in`);
                } else if (loginStatus.onFeed) {
                    console.log(`     → On feed page - checking indicators...`);
                } else {
                    console.log(`     → URL: ...${loginStatus.url.substring(20, 60)}...`);
                }
                
                // Show what we're detecting
                const indicators = [];
                if (loginStatus.hasUserMenu) indicators.push('userMenu');
                if (loginStatus.hasMessaging) indicators.push('messaging');
                if (loginStatus.hasNetworking) indicators.push('network');
                if (loginStatus.hasFeedElements) indicators.push('feed');
                if (loginStatus.hasNavigation) indicators.push('nav');
                if (loginStatus.hasProfilePic) indicators.push('pic');
                
                if (indicators.length > 0) {
                    console.log(`     ✓ Found: ${indicators.join(', ')}`);
                } else if (!loginStatus.onLoginPage) {
                    console.log(`     ⚠ No indicators found yet...`);
                }
                
                // Show blockers
                if (loginStatus.hasBrowseAnonymously) {
                    console.log(`     ❌ Blocked by: auth modal`);
                }
                if (loginStatus.hasJoinNow) {
                    console.log(`     ❌ Blocked by: join prompt`);
                }
            }
            
            // Check if logged in
            if (loginStatus.loggedIn) {
                console.log(`\n  ✅ Login detected!`);
                console.log(`     Page: ${loginStatus.pageTitle}`);
                break;
            }
            
            await delay(3000);
        }
        
        if (attempts >= maxAttempts) {
            throw new Error('Timeout waiting for login');
        }
        
        const elapsedTime = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n✅ Login successful! (took ${elapsedTime} seconds)`);
        console.log('   Continuing with scraping...\n');
        await delay(5000); // Wait longer for page to fully settle after login
        return true;
        
    } catch (error) {
        console.log('\n❌ Login timeout after 5 minutes.');
        console.log('   Please restart the script and log in more quickly.\n');
        return false;
    }
}

/**
 * Check if page requires login
 * @param {Object} page - Puppeteer page object
 */
async function requiresLogin(page) {
    const currentUrl = page.url();
    
    // Check URL for login indicators
    if (currentUrl.includes('/login') || 
        currentUrl.includes('/authwall') || 
        currentUrl.includes('/checkpoint')) {
        console.log('  ⚠️  Detected login URL redirect');
        return true;
    }
    
    // Wait a bit more for modal to appear
    await delay(2000);
    
    // Check page content for login prompts and modals
    const loginInfo = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        const hasJoinNow = bodyText.includes('Join now');
        const hasBrowseAnonymously = bodyText.includes('Browse anonymously');
        const hasContinueWithGoogle = bodyText.includes('Continue with Google');
        const hasSignInForm = document.querySelector('form[data-id="sign-in-form"]') !== null;
        const hasAuthWall = document.querySelector('.authwall') !== null;
        const hasRegisterNow = bodyText.includes('Register now');
        
        // Check for auth-specific modals (not just any dialog)
        const modals = document.querySelectorAll('[role="dialog"]');
        let hasAuthModal = false;
        modals.forEach(modal => {
            const modalText = modal.textContent || '';
            if (modalText.includes('Sign in') && modalText.includes('Browse anonymously') ||
                modalText.includes('Join now') ||
                modalText.includes('Welcome back')) {
                hasAuthModal = true;
            }
        });
        
        // Look for logged-in indicators
        const hasUserMenu = document.querySelector('[data-control-name="identity_welcome_message"]') !== null ||
                          document.querySelector('.global-nav__me') !== null ||
                          document.querySelector('[aria-label*="Me"]') !== null;
        const hasMessaging = document.querySelector('[href*="/messaging"]') !== null;
        const hasNotifications = document.querySelector('[aria-label*="Notifications"]') !== null;
        const hasNavBar = document.querySelector('nav.global-nav') !== null;
        
        return {
            hasJoinNow,
            hasBrowseAnonymously,
            hasContinueWithGoogle,
            hasAuthModal,
            hasSignInForm,
            hasAuthWall,
            hasRegisterNow,
            // Logged-in indicators
            hasUserMenu,
            hasMessaging,
            hasNotifications,
            hasNavBar,
            bodyTextSample: bodyText.substring(0, 300)
        };
    });
    
    console.log('  Login detection details:', {
        url: currentUrl,
        hasAuthModal: loginInfo.hasAuthModal,
        hasBrowseAnonymously: loginInfo.hasBrowseAnonymously,
        hasUserMenu: loginInfo.hasUserMenu,
        hasMessaging: loginInfo.hasMessaging
    });
    
    // If we see logged-in indicators, we're authenticated
    const hasLoggedInIndicators = loginInfo.hasUserMenu || loginInfo.hasMessaging || loginInfo.hasNotifications;
    
    if (hasLoggedInIndicators) {
        console.log('  ✓ Detected logged-in session');
        return false; // No login required
    }
    
    // Determine if login is required based on auth-specific elements
    const requiresAuth = loginInfo.hasAuthModal || 
                        loginInfo.hasSignInForm || 
                        loginInfo.hasAuthWall ||
                        (loginInfo.hasBrowseAnonymously && loginInfo.hasContinueWithGoogle) ||
                        (loginInfo.hasJoinNow && loginInfo.hasBrowseAnonymously);
    
    return requiresAuth;
}

/**
 * Scrape a single LinkedIn profile
 * @param {Object} page - Puppeteer page object
 * @param {string} profileUrl - LinkedIn profile URL
 * @param {boolean} isFirstProfile - Is this the first profile being scraped
 */
async function scrapeSingleProfile(page, profileUrl, isFirstProfile = false) {
    try {
        console.log(`\n📄 Navigating to: ${profileUrl}`);
        
        // Navigate with shorter timeout and better error handling
        try {
            await page.goto(profileUrl, { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });
        } catch (navError) {
            // If navigation times out, check if page partially loaded
            console.log(`  ⚠️  Navigation warning: ${navError.message}`);
            console.log('  Attempting to continue anyway...');
        }
        
        // Wait for page to settle
        console.log('  Waiting for page to load...');
        await delay(4000);
        
        // Quick check if we were redirected to auth page
        const currentUrl = await page.url();
        
        if (currentUrl.includes('/authwall') || currentUrl.includes('/login')) {
            console.log('⚠️  Redirected to login page - session expired.');
            return {
                url: profileUrl,
                error: 'Session expired - Please restart and log in again',
                success: false
            };
        }
        
        // Check if we're actually on a profile page
        if (!currentUrl.includes('/in/')) {
            console.log('  ⚠️  Not on expected profile page');
            console.log(`  Current URL: ${currentUrl}`);
            return {
                url: profileUrl,
                error: `Navigation failed - ended up on: ${currentUrl}`,
                success: false
            };
        }
        
        // Extract username from current URL and verify it matches
        const expectedUsername = profileUrl.match(/\/in\/([^\/\?]+)/)?.[1];
        const actualUsername = currentUrl.match(/\/in\/([^\/\?]+)/)?.[1];
        
        if (expectedUsername && actualUsername && expectedUsername !== actualUsername) {
            console.log(`  ⚠️  Username mismatch!`);
            console.log(`  Expected: ${expectedUsername}`);
            console.log(`  Got: ${actualUsername}`);
        }
        
        // Check if profile is restricted or not found
        const pageStatus = await page.evaluate(() => {
            const bodyText = document.body.textContent || '';
            
            // Check for error states
            const isNotFound = bodyText.includes('This profile is not available') ||
                             bodyText.includes('This content is no longer available') ||
                             bodyText.includes('Page not found') ||
                             document.querySelector('.profile-unavailable') !== null;
            
            // Check for profile elements
            const hasProfileContent = document.querySelector('h1') !== null ||
                                    document.querySelector('[class*="profile"]') !== null ||
                                    document.querySelector('main') !== null;
            
            return {
                isNotFound,
                hasProfileContent,
                bodyPreview: bodyText.substring(0, 200)
            };
        });
        
        if (pageStatus.isNotFound) {
            console.log('  ⚠️  Profile not available or restricted');
            return {
                url: profileUrl,
                error: 'Profile not available, restricted, or does not exist',
                success: false
            };
        }
        
        if (!pageStatus.hasProfileContent) {
            console.log('  ⚠️  Page loaded but no profile content detected');
            console.log(`  Preview: ${pageStatus.bodyPreview.substring(0, 100)}...`);
            return {
                url: profileUrl,
                error: 'No profile content found on page',
                success: false
            };
        }
        
        // Scroll down to load all sections
        console.log('  Scrolling to load sections...');
        try {
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 300;
                    const maxScrolls = 20; // Limit scrolls to prevent infinite loops
                    let scrollCount = 0;
                    
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        scrollCount++;
                        
                        if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 200);
                });
            });
        } catch (scrollError) {
            console.log('  ⚠️  Scrolling error (continuing anyway)');
        }
        
        await delay(2000);
        
        // Expand all "See more" buttons
        await expandAllSections(page);
        
        // Scroll back to top for consistent extraction
        await page.evaluate(() => window.scrollTo(0, 0));
        await delay(500);
        
        // Extract all profile data
        console.log('  Extracting profile data...');
        let profileData;
        
        try {
            profileData = await extractProfileData(page);
        } catch (extractError) {
            console.error(`  ❌ Data extraction error: ${extractError.message}`);
            return {
                url: profileUrl,
                error: `Data extraction failed: ${extractError.message}`,
                success: false
            };
        }
        
        if (!profileData || !profileData.name) {
            console.log('  ⚠️  No data extracted (profile may require login)');
            return {
                url: profileUrl,
                error: 'Failed to extract profile data - may require authentication',
                success: false
            };
        }
        
        console.log(`  ✓ Successfully scraped profile: ${profileData.name || 'Unknown'}`);
        
        return {
            url: profileUrl,
            ...profileData,
            scrapedAt: new Date().toISOString(),
            success: true
        };
        
    } catch (error) {
        console.error(`  ❌ Error scraping profile: ${error.message}`);
        return {
            url: profileUrl,
            error: error.message,
            success: false
        };
    }
}

/**
 * Main function to scrape multiple LinkedIn profiles
 * @param {Array<string>} profileUrls - Array of LinkedIn profile URLs
 * @param {boolean} headless - Run browser in headless mode
 */
async function scrapeLinkedInProfiles(profileUrls, headless = true) {
    let browser;
    let page;
    
    try {
        console.log('🚀 Starting LinkedIn Profile Scraper\n');
        console.log(`📋 Profiles to scrape: ${profileUrls.length}`);
        console.log(`👁️  Headless mode: ${headless}\n`);
        console.log('━'.repeat(60));
        
        console.log('🌐 Launching browser...');
        
        // Note: puppeteer-real-browser manages its own session/profile
        // It automatically persists cookies between runs
        console.log('  Note: Browser will remember your login session automatically');
        
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
        
        console.log('✓ Browser launched successfully\n');
        
        // First, navigate to LinkedIn to check authentication status
        console.log('🔍 Checking LinkedIn authentication status...');
        console.log('  (If you logged in before, session should be preserved)');
        
        try {
            await page.goto('https://www.linkedin.com/feed/', { 
                waitUntil: 'domcontentloaded', 
                timeout: 20000 
            });
        } catch (err) {
            console.log('  Initial navigation timeout (continuing...)');
            // Wait a bit to let page settle
            await delay(3000);
        }
        
        await delay(5000);
        
        const needsInitialLogin = await requiresLogin(page);
        
        if (needsInitialLogin) {
            console.log('\n⚠️  Not logged in to LinkedIn. Login required before scraping.');
            console.log('💡 TIP: Your login session will be saved for future runs!');
            const loginSuccess = await waitForManualLogin(page);
            
            if (!loginSuccess) {
                throw new Error('Failed to authenticate with LinkedIn');
            }
            
            // Give extra time for session to stabilize
            console.log('\n  ⏳ Waiting for session to stabilize...');
            await delay(5000);
            
            // Final verification: make sure we can access LinkedIn
            const finalCheck = await page.evaluate(() => {
                const url = window.location.href;
                const notOnAuth = !url.includes('/login') && !url.includes('/authwall');
                const hasNav = document.querySelector('nav') !== null;
                return notOnAuth && hasNav;
            });
            
            if (!finalCheck) {
                console.log('\n⚠️  Verification warning: Session may not be stable.');
                console.log('   Continuing anyway - will check again when scraping profiles.');
            } else {
                console.log('✅ Login verified and session stable!\n');
            }
        } else {
            console.log('✅ Already logged in to LinkedIn!\n');
        }
        
        const results = [];
        
        // Scrape each profile
        for (let i = 0; i < profileUrls.length; i++) {
            const profileUrl = profileUrls[i].trim();
            
            console.log(`\n[${i + 1}/${profileUrls.length}] Processing profile...`);
            console.log(`URL: ${profileUrl}`);
            
            if (!profileUrl || !profileUrl.includes('linkedin.com')) {
                console.log('  ⚠️  Invalid LinkedIn URL, skipping...');
                results.push({
                    url: profileUrl,
                    error: 'Invalid LinkedIn URL',
                    success: false
                });
                continue;
            }
            
            // Scrape the profile (we're already logged in)
            const profileData = await scrapeSingleProfile(page, profileUrl);
            results.push(profileData);
            
            // Small delay between profiles to be respectful
            if (i < profileUrls.length - 1) {
                console.log('  ⏳ Waiting 3 seconds before next profile...');
                await delay(3000);
            }
        }
        
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 SCRAPING COMPLETE - SUMMARY');
        console.log('='.repeat(60));
        
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        
        console.log(`✅ Successfully scraped: ${successCount}`);
        console.log(`❌ Failed: ${failureCount}`);
        console.log('='.repeat(60));
        
        return results;
        
    } catch (error) {
        console.error('\n❌ Fatal error during scraping:', error.message);
        throw error;
    } finally {
        // Close browser
        if (browser) {
            await browser.close();
            console.log('\n🔒 Browser closed');
        }
    }
}

module.exports = { scrapeLinkedInProfiles, scrapeSingleProfile };
