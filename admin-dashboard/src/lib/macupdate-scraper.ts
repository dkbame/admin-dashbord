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
  developer_website_url?: string
  release_date?: Date
  last_updated: Date
  file_size?: string
  requirements?: string
  architecture?: string
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
      
      // Check if we're on Netlify (where Puppeteer doesn't work)
      const isNetlify = process.env.NETLIFY || process.env.VERCEL || process.env.NODE_ENV === 'production'
      
      if (isNetlify) {
        console.log('Detected Netlify/Vercel environment, using fallback method directly')
        return await this.scrapeWithFallback(appUrl)
      }
      
      // Try Puppeteer first (for local development)
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
      
      // Fallback: Use axios + cheerio
      return await this.scrapeWithFallback(appUrl)
      
    } catch (error) {
      console.error(`Failed to scrape app page ${appUrl}:`, error)
      return null
    }
  }

  // Fallback scraping method using axios + cheerio
  private async scrapeWithFallback(appUrl: string): Promise<MacUpdateApp | null> {
    try {
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
      console.error('Fallback method failed:', error)
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
      
      // Extract developer name from JSON data first (most reliable)
      let developer = ''
      
      // Look for JSON data containing developer information
      $('script').each((_, script) => {
        const scriptContent = $(script).html() || ''
        if (scriptContent.includes('"developer"') && scriptContent.includes('"name"')) {
          try {
            // Try to find and parse JSON data
            const jsonMatch = scriptContent.match(/"developer"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/)
            if (jsonMatch && jsonMatch[1]) {
              developer = jsonMatch[1].trim()
              return false // break the loop
            }
          } catch (error) {
            // Continue to next script if parsing fails
          }
        }
      })
      
      // Fallback: Look for "Developer Go to developer's website" pattern
      if (!developer) {
        $('*').filter((_, el) => $(el).text().includes('Developer Go to developer')).each((_, el) => {
          const text = $(el).text().trim()
          const match = text.match(/Developer\s+(.*?)\s+Go to developer's website/)
          if (match && match[1]) {
            developer = match[1].trim()
            return false // break the loop
          }
        })
      }
      
      // Fallback: Look for developer website links
      if (!developer) {
        $('a[href*="developer"]').each((_, link) => {
          const href = $(link).attr('href')
          const text = $(link).text().trim()
          if (href && text && !text.includes('Developer Tools') && text.length > 0) {
            // Extract domain name from href
            const domainMatch = href.match(/https?:\/\/([^\/]+)/)
            if (domainMatch && domainMatch[1]) {
              const domain = domainMatch[1].replace('www.', '')
              developer = domain.split('.')[0] // Get first part of domain
              return false // break the loop
            }
          }
        })
      }
      
      // Final fallback: use existing selectors
      if (!developer) {
        developer = $('a[href*="/developer/"]').first().text().trim() || 
                   $('.developer').first().text().trim() ||
                   $('a[href*="developer"]').first().text().trim()
      }
      
      const versionText = $('span').filter((_, el) => $(el).text().includes('Version')).next().text().trim() || 
                         $('.version').first().text().trim() ||
                         $('*').filter((_, el) => $(el).text().includes('Version')).next().text().trim()
      
      // Clean up version text to extract just the version number
      const version = this.parseVersion(versionText)
      
      const priceText = $('.price, .app-price').first().text().trim() ||
                       $('*').filter((_, el) => $(el).text().includes('$')).first().text().trim()
      
      // Skip rating extraction - will use our own rating system
      // const ratingText = $('.rating, .stars').first().text().trim() ||
      //                   $('*').filter((_, el) => $(el).text().includes('Based on')).first().text().trim()
      
      const downloadCountText = $('*').filter((_, el) => $(el).text().includes('Downloads')).text().trim() || 
                               $('.downloads').first().text().trim()
      
      // Extract category with multiple fallback methods
      let category = ''
      
      // Method 0: Look for category in JSON data (most reliable)
      $('script').each((_, script) => {
        const scriptContent = $(script).html() || ''
        if (scriptContent.includes('"category"') && scriptContent.includes('"name"')) {
          try {
            // Try to find and parse JSON data for category
            const categoryMatch = scriptContent.match(/"category"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/)
            if (categoryMatch && categoryMatch[1]) {
              category = categoryMatch[1].trim()
              console.log('Found category from JSON:', category)
              return false // break the loop
            }
          } catch (error) {
            // Continue to next script if parsing fails
          }
        }
      })
      
      // Method 1: Look for category links
      if (!category) {
        category = $('a[href*="/category/"]').first().text().trim()
        if (category) console.log('Found category from links:', category)
      }
      
      // Method 2: Look for category class
      if (!category) {
        category = $('.category').first().text().trim()
        if (category) console.log('Found category from class:', category)
      }
      
      // Method 3: Look for any link with category
      if (!category) {
        category = $('a[href*="category"]').first().text().trim()
        if (category) console.log('Found category from category links:', category)
      }
      
      // Method 4: Look for breadcrumb navigation
      if (!category) {
        $('.breadcrumb, .breadcrumbs, nav').find('a').each((_, el) => {
          const text = $(el).text().trim()
          const href = $(el).attr('href') || ''
          if (href.includes('/category/') && text && text !== 'Home' && text !== 'Mac') {
            category = text
            console.log('Found category from breadcrumbs:', category)
            return false // break the loop
          }
        })
      }
      
      // Method 5: Look for category in page metadata
      if (!category) {
        category = $('meta[property="article:section"]').attr('content') || ''
        if (category) console.log('Found category from metadata:', category)
      }
      
      // Method 6: Look for category in structured data
      if (!category) {
        $('script[type="application/ld+json"]').each((_, script) => {
          try {
            const data = JSON.parse($(script).html() || '{}')
            if (data.category || data.genre) {
              category = data.category || data.genre
              console.log('Found category from structured data:', category)
              return false // break the loop
            }
          } catch (error) {
            // Continue to next script if parsing fails
          }
        })
      }
      
      // Method 7: Look for category in the page props data
      if (!category) {
        $('script').each((_, script) => {
          const scriptContent = $(script).html() || ''
          if (scriptContent.includes('"pageProps"') && scriptContent.includes('"categoriesData"')) {
            try {
              // Try to extract category from the page props
              const categoryMatch = scriptContent.match(/"name"\s*:\s*"([^"]+)"[^}]*"slug"\s*:\s*"graphic-design"/)
              if (categoryMatch && categoryMatch[1]) {
                category = categoryMatch[1].trim()
                console.log('Found category from page props:', category)
                return false // break the loop
              }
            } catch (error) {
              // Continue to next script if parsing fails
            }
          }
        })
      }
      
      console.log('Final extracted category:', category)
      
      const description = $('.overview, .description, .app-description').first().text().trim() ||
                         $('p').first().text().trim()
      
      // Extract icon - look for the main logo in picture element first
      let iconUrl = ''
      
      // Try to get the main logo from picture element (force PNG format)
      // Look for picture elements that contain the app logo (not MacUpdate logo)
      $('picture').each((_, el) => {
        const $el = $(el)
        const pngSource = $el.find('source[type="image/png"]').attr('srcset')
        const imgSrc = $el.find('img').attr('src')
        
        // Check if this picture contains the app logo (not MacUpdate logo)
        const src = pngSource || imgSrc || ''
        if (src && src.includes('/products/') && !src.includes('mu_logo') && !src.includes('avatar') && !iconUrl) {
          // Force PNG format - prefer PNG source, fallback to img src if it's PNG
          if (pngSource) {
            iconUrl = pngSource
          } else if (imgSrc && imgSrc.includes('.png')) {
            iconUrl = imgSrc
          }
          return false // break the loop
        }
      })
      
      // Fallback to main_logo class if picture element not found (force PNG)
      if (!iconUrl) {
        // Try to find PNG images first
        const pngLogo = $('img[src*=".png"]').filter((_, img) => {
          const src = $(img).attr('src') || ''
          return src.includes('/products/') && !src.includes('mu_logo') && !src.includes('avatar')
        }).first().attr('src')
        
        if (pngLogo) {
          iconUrl = pngLogo
        } else {
          // Fallback to any image if no PNG found
          iconUrl = $('img.main_logo').first().attr('src') || 
                   $('img[src*="logo"]').first().attr('src') || 
                   $('img[src*="icon"]').first().attr('src') || 
                   $('.logo img').first().attr('src') || 
                   $('.app-icon img').first().attr('src') || 
                   $('img').first().attr('src') || ''
        }
      }
      
      const icon_url = iconUrl.startsWith('http') ? iconUrl : `https://www.macupdate.com${iconUrl}`
      
      // Extract screenshots from the slider/carousel
      const screenshots: string[] = []
      
      // Look for screenshots in the slider structure
      $('.slider .slide picture').each((_, picture) => {
        const $picture = $(picture)
        const webpSource = $picture.find('source[type="image/webp"]').attr('srcset')
        const pngSource = $picture.find('source[type="image/png"]').attr('srcset')
        const imgSrc = $picture.find('img').attr('src')
        
        // Get the best quality screenshot (webp first, then png, then img)
        const screenshotUrl = webpSource || pngSource || imgSrc
        
        if (screenshotUrl && screenshotUrl.includes('/screenshots/')) {
          const fullUrl = screenshotUrl.startsWith('http') ? screenshotUrl : `https://www.macupdate.com${screenshotUrl}`
          // Avoid duplicates
          if (!screenshots.includes(fullUrl)) {
            screenshots.push(fullUrl)
          }
        }
      })
      
      // Fallback: look for any screenshot images if slider not found
      if (screenshots.length === 0) {
        $('img[src*="screenshot"]').each((_, img) => {
          const src = $(img).attr('src')
          if (src && src.includes('/screenshots/')) {
            const fullUrl = src.startsWith('http') ? src : `https://www.macupdate.com${src}`
            if (!screenshots.includes(fullUrl)) {
              screenshots.push(fullUrl)
            }
          }
        })
      }
      
      // Extract data from the consistent specs_list structure
      let file_size = ''
      let requirements = ''
      let download_count = 0
      let updated_on = ''
      let architecture = ''
      let developer_website_url = ''
      
      $('.specs_list .specs_list_item').each((_, item) => {
        const $item = $(item)
        const title = $item.find('.specs_list_title').text().trim()
        const description = $item.find('.specs_list_description').text().trim()
        
        switch (title) {
          case 'Size':
            file_size = description
            break
          case 'OS':
            requirements = description
            break
          case 'Downloads':
            download_count = this.parseDownloadCount(description)
            break
          case 'Updated on':
            updated_on = description
            break
          case 'Architecture':
            architecture = this.parseArchitecture(description)
            break
        }
      })
      
      // Extract developer website URL from the specs_list
      $('.specs_list .specs_list_item').each((_, item) => {
        const $item = $(item)
        const title = $item.find('.specs_list_title').text().trim()
        
        if (title === 'Developer') {
          // Look for the developer website link within this item
          const websiteLink = $item.find('a[href*="http"]').first()
          if (websiteLink.length > 0) {
            developer_website_url = websiteLink.attr('href') || ''
          }
          return false // break the loop
        }
      })
      
      const system_requirements = requirements ? [requirements] : []
      
      // Parse data
      const price = this.parsePrice(priceText)
      // Skip rating parsing - will use our own rating system
      // const rating = this.parseRating(ratingText)
      
      console.log('Extracted data:', {
        name,
        developer,
        version,
        price,
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
        rating: null, // Skip ratings - will use our own rating system
        rating_count: 0, // Skip rating count - will use our own rating system
        download_count,
        description: description || '',
        category: category || 'Unknown',
        system_requirements,
        screenshots,
        icon_url,
        macupdate_url: appUrl,
        developer_website_url,
        last_updated: this.parseUpdatedDate(updated_on),
        file_size,
        requirements,
        architecture
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

  // Parse version from text to extract just the version number
  private parseVersion(versionText: string): string {
    if (!versionText) return ''
    
    // Remove "Version" prefix and clean up
    let cleaned = versionText.replace(/^Version\s*/i, '').trim()
    
    // Extract version number pattern (e.g., "20.1.7", "1.0.0", "2.1.3.4")
    const versionMatch = cleaned.match(/(\d+(?:\.\d+)*)/)
    if (versionMatch) {
      return versionMatch[1]
    }
    
    // If no version pattern found, return the cleaned text
    return cleaned
  }

  // Parse "Updated on" date from MacUpdate format
  private parseUpdatedDate(updatedOnText: string): Date {
    if (!updatedOnText) {
      return new Date() // Fallback to current date if no date found
    }
    
    try {
      // MacUpdate format: "Apr 23 2025" or "Dec 15 2024"
      const dateMatch = updatedOnText.match(/(\w+)\s+(\d+)\s+(\d{4})/)
      if (dateMatch) {
        const [, month, day, year] = dateMatch
        const monthIndex = this.getMonthIndex(month)
        if (monthIndex !== -1) {
          return new Date(parseInt(year), monthIndex, parseInt(day))
        }
      }
    } catch (error) {
      console.warn('Failed to parse updated date:', updatedOnText, error)
    }
    
    return new Date() // Fallback to current date
  }

  // Helper method to convert month name to index
  private getMonthIndex(monthName: string): number {
    const months = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ]
    
    const monthLower = monthName.toLowerCase().substring(0, 3)
    return months.indexOf(monthLower)
  }

  // Parse and format architecture field
  private parseArchitecture(architectureText: string): string {
    if (!architectureText) return ''
    
    // Clean up the text and split by common separators
    const cleaned = architectureText.trim()
    
    // Check for common patterns
    const architectures: string[] = []
    
    // Check for Intel 64
    if (cleaned.includes('Intel 64') || cleaned.includes('Intel64') || cleaned.includes('x86_64')) {
      architectures.push('Intel 64')
    }
    
    // Check for Apple Silicon
    if (cleaned.includes('Apple Silicon') || cleaned.includes('AppleSilicon') || cleaned.includes('ARM64') || cleaned.includes('arm64')) {
      architectures.push('Apple Silicon')
    }
    
    // Check for Universal
    if (cleaned.includes('Universal') || cleaned.includes('universal')) {
      architectures.push('Universal')
    }
    
    // If we found specific architectures, format them
    if (architectures.length > 0) {
      if (architectures.length === 1) {
        return architectures[0]
      } else {
        // Multiple architectures = Universal (modern approach)
        return 'Universal'
      }
    }
    
    // If no specific patterns found, return the cleaned text
    return cleaned
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