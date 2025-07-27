import puppeteer, { Browser, LaunchOptions } from 'puppeteer'
import * as cheerio from 'cheerio'
import axios from 'axios'

// Import Chromium for Netlify
let chromium: any = null
if (process.env.NETLIFY) {
  try {
    chromium = require('@sparticuz/chromium')
  } catch (error) {
    console.log('Chromium not available, using fallback scraping method')
  }
}

// Types for MacUpdate data
export interface MacUpdateApp {
  name: string
  developer: string
  version: string
  price: number | null
  currency: string
  rating: number | null
  rating_count: number
  download_count: number
  description: string
  category: string
  system_requirements: string[]
  screenshots: string[]
  icon_url: string
  macupdate_url: string
  release_date?: Date
  last_updated: Date
  file_size?: string
  requirements?: string
}

export interface ScrapingConfig {
  pageLimit: number
  minRating: number
  priceFilter: 'all' | 'free' | 'paid'
  category: string
  delayBetweenRequests: number
  timeout: number
  userAgent: string
}

export interface ScrapingResult {
  success: boolean
  apps: MacUpdateApp[]
  totalFound: number
  errors: string[]
  warnings: string[]
}

// Default configuration optimized for Netlify
const DEFAULT_CONFIG: ScrapingConfig = {
  pageLimit: 5,
  minRating: 0,
  priceFilter: 'all',
  category: 'all',
  delayBetweenRequests: 2000, // 2 seconds between requests
  timeout: 30000, // 30 seconds timeout
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

// Rate limiting utility
class RateLimiter {
  private lastRequest = 0
  private delay: number

  constructor(delay: number) {
    this.delay = delay
  }

  async wait(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest
    const waitTime = Math.max(0, this.delay - timeSinceLastRequest)
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequest = Date.now()
  }
}

// Main scraper class
export class MacUpdateScraper {
  private config: ScrapingConfig
  private rateLimiter: RateLimiter
  private browser: Browser | null = null

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.rateLimiter = new RateLimiter(this.config.delayBetweenRequests)
  }

  // Initialize browser (optimized for Netlify)
  private async initBrowser(): Promise<Browser> {
    if (this.browser) return this.browser

    const launchOptions: LaunchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript',
        '--user-agent=' + this.config.userAgent
      ]
    }

    // Netlify-specific configuration
    if (process.env.NETLIFY && chromium) {
      try {
        // Use @sparticuz/chromium for Netlify
        const executablePath = await chromium.executablePath()
        launchOptions.executablePath = executablePath
        if (launchOptions.args) {
          launchOptions.args.push(...chromium.args)
        }
      } catch (error) {
        console.log('Failed to get Chromium executable path, using fallback')
      }
    }

    try {
      this.browser = await puppeteer.launch(launchOptions)
      return this.browser
    } catch (error) {
      console.error('Failed to launch browser with default options:', error)
      
      // Fallback: try with minimal options
      const fallbackOptions: LaunchOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
      
      this.browser = await puppeteer.launch(fallbackOptions)
      return this.browser
    }
  }

  // Close browser
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  // Scrape MacUpdate listing pages
  async scrapeListings(config?: Partial<ScrapingConfig>): Promise<ScrapingResult> {
    const finalConfig = { ...this.config, ...config }
    const result: ScrapingResult = {
      success: true,
      apps: [],
      totalFound: 0,
      errors: [],
      warnings: []
    }

    try {
      const browser = await this.initBrowser()
      
      for (let page = 1; page <= finalConfig.pageLimit; page++) {
        try {
          console.log(`Scraping page ${page}/${finalConfig.pageLimit}`)
          
          const pageUrl = this.buildListingUrl(page, finalConfig)
          const pageApps = await this.scrapeListingPage(browser, pageUrl, finalConfig)
          
          result.apps.push(...pageApps)
          result.totalFound += pageApps.length
          
          // Rate limiting between pages
          if (page < finalConfig.pageLimit) {
            await this.rateLimiter.wait()
          }
          
        } catch (error) {
          const errorMsg = `Failed to scrape page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(errorMsg)
          
          // Continue with next page instead of failing completely
          continue
        }
      }
      
    } catch (error) {
      result.success = false
      result.errors.push(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      await this.close()
    }

    return result
  }

  // Scrape individual app page
  async scrapeAppPage(appUrl: string): Promise<MacUpdateApp | null> {
    try {
      console.log(`Scraping app page: ${appUrl}`)
      
      // Try Puppeteer first (for local development)
      if (!process.env.NETLIFY) {
        try {
          if (!this.browser) {
            await this.initBrowser()
          }
          
          const page = await this.browser!.newPage()
          
          try {
            await page.setDefaultTimeout(this.config.timeout)
            await page.setUserAgent(this.config.userAgent)
            
            console.log('Navigating to page with Puppeteer...')
            await page.goto(appUrl, { waitUntil: 'networkidle2' })
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            const title = await page.title()
            console.log('Page title:', title)
            
            const content = await page.content()
            console.log('HTML length:', content.length)
            
            const $ = cheerio.load(content)
            const app = this.extractAppData($, appUrl)
            
            if (app) {
              console.log('Successfully scraped with Puppeteer')
              return app
            }
            
          } finally {
            await page.close()
          }
        } catch (puppeteerError) {
          console.log('Puppeteer failed, trying fallback method:', puppeteerError)
        }
      }
      
      // Fallback: Use axios + cheerio (works on Netlify)
      console.log('Using fallback scraping method with axios...')
      const response = await axios.get(appUrl, {
        timeout: this.config.timeout,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      console.log('Response status:', response.status)
      console.log('HTML length:', response.data.length)
      
      const $ = cheerio.load(response.data)
      const app = this.extractAppData($, appUrl)
      
      if (app) {
        console.log('Successfully scraped with fallback method')
        return app
      } else {
        console.error('Failed to extract app data with fallback method')
        return null
      }
      
    } catch (error) {
      console.error(`Failed to scrape app page ${appUrl}:`, error)
      return null
    }
  }

  // Build listing URL with filters
  private buildListingUrl(page: number, config: ScrapingConfig): string {
    const baseUrl = 'https://www.macupdate.com/find/mac'
    const params = new URLSearchParams({
      page: page.toString(),
      sort: 'computed_rank'
    })

    if (config.category && config.category !== 'all') {
      params.append('category', config.category.toLowerCase().replace(/\s+/g, '-'))
    }

    if (config.priceFilter === 'free') {
      params.append('price', 'free')
    } else if (config.priceFilter === 'paid') {
      params.append('price', 'paid')
    }

    return `${baseUrl}?${params.toString()}`
  }

  // Scrape a single listing page
  private async scrapeListingPage(
    browser: Browser, 
    url: string, 
    config: ScrapingConfig
  ): Promise<MacUpdateApp[]> {
    const page = await browser.newPage()
    const apps: MacUpdateApp[] = []

    try {
      // Set timeout and user agent
      await page.setDefaultTimeout(config.timeout)
      await page.setUserAgent(config.userAgent)
      
      // Navigate to listing page
      await page.goto(url, { waitUntil: 'networkidle2' })
      
      // Wait for app listings to load
      await page.waitForSelector('.app-item, .app-listing, [data-app-id]', { timeout: 10000 })
      
      // Get page content
      const content = await page.content()
      const $ = cheerio.load(content)
      
      // Extract app listings
      const appElements = $('.app-item, .app-listing, [data-app-id]')
      
      for (let i = 0; i < appElements.length; i++) {
        const element = appElements.eq(i)
        const appData = this.extractListingAppData($, element)
        
        if (appData && this.filterApp(appData, config)) {
          apps.push(appData)
        }
      }
      
    } catch (error) {
      console.error(`Error scraping listing page ${url}:`, error)
      throw error
    } finally {
      await page.close()
    }

    return apps
  }

  // Extract app data from listing page
  private extractListingAppData($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>): MacUpdateApp | null {
    try {
      // Extract basic info
      const name = element.find('.app-name, h3, .title').first().text().trim()
      const developer = element.find('.developer, .publisher').first().text().trim()
      const version = element.find('.version').first().text().trim()
      const priceText = element.find('.price').first().text().trim()
      const ratingText = element.find('.rating, .stars').first().attr('title') || ''
      const downloadCountText = element.find('.downloads, .download-count').first().text().trim()
      const category = element.find('.category').first().text().trim()
      const appUrl = element.find('a').first().attr('href')
      
      // Parse price
      const price = this.parsePrice(priceText)
      
      // Parse rating
      const rating = this.parseRating(ratingText)
      
      // Parse download count
      const download_count = this.parseDownloadCount(downloadCountText)
      
      // Build full URL
      const macupdate_url = appUrl ? `https://www.macupdate.com${appUrl}` : ''
      
      if (!name || !developer) {
        return null
      }

      return {
        name,
        developer,
        version: version || 'Unknown',
        price,
        currency: 'USD',
        rating,
        rating_count: 0, // Will be updated from individual page
        download_count,
        description: '', // Will be updated from individual page
        category: category || 'Unknown',
        system_requirements: [],
        screenshots: [],
        icon_url: '', // Will be updated from individual page
        macupdate_url,
        last_updated: new Date()
      }
      
    } catch (error) {
      console.error('Error extracting listing app data:', error)
      return null
    }
  }

  // Extract detailed app data from individual page
  private extractAppData($: cheerio.CheerioAPI, appUrl: string): MacUpdateApp | null {
    try {
      console.log('Extracting app data from:', appUrl)
      
      // Extract basic info - updated selectors based on actual MacUpdate structure
      const name = $('h1').first().text().trim() || 
                   $('.app-title').first().text().trim() ||
                   $('title').first().text().replace(' for Mac', '').trim()
      
      const developer = $('a[href*="/developer/"]').first().text().trim() || 
                       $('.developer').first().text().trim() ||
                       $('a[href*="developer"]').first().text().trim()
      
      const version = $('span').filter((_, el) => $(el).text().includes('Version')).next().text().trim() || 
                     $('.version').first().text().trim() ||
                     $('*').filter((_, el) => $(el).text().includes('Version')).next().text().trim()
      
      const priceText = $('.price, .app-price').first().text().trim() ||
                       $('*').filter((_, el) => $(el).text().includes('$')).first().text().trim()
      
      const ratingText = $('.rating, .stars').first().text().trim() ||
                        $('*').filter((_, el) => $(el).text().includes('Based on')).first().text().trim()
      
      const downloadCountText = $('*').filter((_, el) => $(el).text().includes('Downloads')).text().trim() || 
                               $('.downloads').first().text().trim()
      
      const category = $('a[href*="/category/"]').first().text().trim() || 
                      $('.category').first().text().trim() ||
                      $('a[href*="category"]').first().text().trim()
      
      const description = $('.overview, .description, .app-description').first().text().trim() ||
                         $('p').first().text().trim()
      
      // Extract icon - look for logo or app icon
      const iconUrl = $('img[src*="logo"], img[src*="icon"], .logo img, .app-icon img').first().attr('src') || 
                     $('img').first().attr('src') || ''
      const icon_url = iconUrl.startsWith('http') ? iconUrl : `https://www.macupdate.com${iconUrl}`
      
      // Extract screenshots - look for gallery images
      const screenshots: string[] = []
      $('img[src*="screenshot"], img[src*="gallery"], .screenshots img, .gallery img').each((_, img) => {
        const src = $(img).attr('src')
        if (src) {
          const fullUrl = src.startsWith('http') ? src : `https://www.macupdate.com${src}`
          screenshots.push(fullUrl)
        }
      })
      
      // Extract system requirements from app specs section
      const requirements = $('*').filter((_, el) => $(el).text().includes('OS')).parent().text().trim() || 
                          $('.requirements, .system-requirements').first().text().trim()
      const system_requirements = requirements ? [requirements] : []
      
      // Parse data
      const price = this.parsePrice(priceText)
      const rating = this.parseRating(ratingText)
      const download_count = this.parseDownloadCount(downloadCountText)
      
      console.log('Extracted data:', {
        name,
        developer,
        version,
        price,
        rating,
        category,
        descriptionLength: description?.length || 0
      })
      
      if (!name) {
        console.error('No app name found on page')
        return null
      }

      return {
        name,
        developer: developer || 'Unknown',
        version: version || 'Unknown',
        price,
        currency: 'USD',
        rating,
        rating_count: 0, // MacUpdate doesn't always show review count
        download_count,
        description: description || '',
        category: category || 'Unknown',
        system_requirements,
        screenshots,
        icon_url,
        macupdate_url: appUrl,
        last_updated: new Date(),
        requirements
      }
      
    } catch (error) {
      console.error('Error extracting app data:', error)
      return null
    }
  }

  // Parse price from text
  private parsePrice(priceText: string): number | null {
    if (!priceText) return null
    
    const match = priceText.match(/\$?(\d+(?:\.\d{2})?)/)
    if (match) {
      return parseFloat(match[1])
    }
    
    // Handle "Free" case
    if (priceText.toLowerCase().includes('free')) {
      return 0
    }
    
    return null
  }

  // Parse rating from text
  private parseRating(ratingText: string): number | null {
    if (!ratingText) return null
    
    const match = ratingText.match(/(\d+(?:\.\d)?)/)
    if (match) {
      const rating = parseFloat(match[1])
      return rating >= 0 && rating <= 5 ? rating : null
    }
    
    return null
  }

  // Parse download count from text
  private parseDownloadCount(countText: string): number {
    if (!countText) return 0
    
    const match = countText.match(/(\d+(?:,\d+)*)/)
    if (match) {
      return parseInt(match[1].replace(/,/g, ''))
    }
    
    return 0
  }

  // Filter app based on configuration
  private filterApp(app: MacUpdateApp, config: ScrapingConfig): boolean {
    // Filter by rating
    if (config.minRating > 0 && (!app.rating || app.rating < config.minRating)) {
      return false
    }
    
    // Filter by price
    if (config.priceFilter === 'free' && app.price !== 0) {
      return false
    }
    
    if (config.priceFilter === 'paid' && app.price === 0) {
      return false
    }
    
    return true
  }
}

// Utility function to create scraper instance
export function createMacUpdateScraper(config?: Partial<ScrapingConfig>): MacUpdateScraper {
  return new MacUpdateScraper(config)
} 