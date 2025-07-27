const puppeteer = require('puppeteer');

async function testScraper() {
  console.log('Starting MacUpdate scraper test...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('Navigating to iStat Menus page...');
    await page.goto('https://istat-menus.macupdate.com/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('Waiting for content...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get page content
    const html = await page.content();
    console.log('HTML length:', html.length);
    
    // Extract basic info using page.evaluate
    const extractedData = await page.evaluate(() => {
      const name = document.querySelector('h1')?.textContent?.trim() || 
                   document.querySelector('.app-title')?.textContent?.trim() ||
                   document.title?.replace(' for Mac', '')?.trim();
      
      const developer = document.querySelector('a[href*="/developer/"]')?.textContent?.trim() || 
                       document.querySelector('.developer')?.textContent?.trim();
      
      const version = Array.from(document.querySelectorAll('span')).find(el => el.textContent?.includes('Version'))?.nextElementSibling?.textContent?.trim() ||
                     document.querySelector('.version')?.textContent?.trim();
      
      const priceText = document.querySelector('.price, .app-price')?.textContent?.trim() ||
                       Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('$'))?.textContent?.trim();
      
      const ratingText = document.querySelector('.rating, .stars')?.textContent?.trim() ||
                        Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('Based on'))?.textContent?.trim();
      
      const category = document.querySelector('a[href*="/category/"]')?.textContent?.trim() || 
                      document.querySelector('.category')?.textContent?.trim();
      
      const description = document.querySelector('.overview, .description, .app-description')?.textContent?.trim() ||
                         document.querySelector('p')?.textContent?.trim();
      
      return {
        name,
        developer,
        version,
        priceText,
        ratingText,
        category,
        description: description?.substring(0, 200) + '...',
        h1Count: document.querySelectorAll('h1').length,
        titleCount: document.querySelectorAll('title').length,
        linkCount: document.querySelectorAll('a').length,
        imgCount: document.querySelectorAll('img').length
      };
    });
    
    console.log('Extracted data:', JSON.stringify(extractedData, null, 2));
    
    // Check for specific elements
    const hasH1 = await page.$('h1');
    const hasTitle = await page.$('title');
    const hasPrice = await page.evaluate(() => Array.from(document.querySelectorAll('*')).some(el => el.textContent?.includes('$')));
    
    console.log('Element checks:', {
      hasH1: !!hasH1,
      hasTitle: !!hasTitle,
      hasPrice: !!hasPrice
    });
    
    // Get some sample text content
    const sampleText = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).slice(0, 20);
      return elements.map(el => ({
        tag: el.tagName,
        text: el.textContent?.substring(0, 100)?.trim()
      }));
    });
    
    console.log('Sample elements:', sampleText);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testScraper().catch(console.error); 