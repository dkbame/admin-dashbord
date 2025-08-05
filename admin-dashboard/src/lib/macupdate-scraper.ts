import puppeteer, { Browser, LaunchOptions } from 'puppeteer'
import * as cheerio from 'cheerio'
import axios from 'axios'
import { supabase } from './supabase'

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

export interface CategoryScrapingResult {
  appUrls: string[]
  totalApps: number
  newApps: number
  existingApps: number
  categoryName: string
  currentPage: number
  totalPages: number
  processedPages: number[]
  apiData?: {
    apps: any[]
    total: number
  }
}

export interface PaginationInfo {
  currentPage: number
  totalPages: number
  nextPage: number | null
  processedPages: number[]
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

export class MacUpdateCategoryScraper {
  private scraper: MacUpdateScraper

  constructor() {
    this.scraper = new MacUpdateScraper()
  }

  /**
   * Scrape a MacUpdate category page to extract app URLs
   */
  async scrapeCategoryPage(categoryUrl: string, limit: number = 20): Promise<CategoryScrapingResult> {
    try {
      console.log(`Scraping category page: ${categoryUrl}`)
      
      // Extract category name from URL
      const categoryName = this.extractCategoryName(categoryUrl)
      
      // Scrape the category page using axios + cheerio
      const response = await axios.get(categoryUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      // Extract app URLs from the embedded JSON data using regex
      const appUrls: string[] = []
      const htmlContent = response.data
      
      // Look for custom_url patterns in the HTML
      const customUrlMatches = htmlContent.match(/"custom_url":"([^"]+)"/g)
      if (customUrlMatches) {
        console.log(`Found ${customUrlMatches.length} custom_url matches`)
        customUrlMatches.forEach((match: string) => {
          const urlMatch = match.match(/"custom_url":"([^"]+)"/)
          if (urlMatch && urlMatch[1]) {
            const url = urlMatch[1]
            console.log(`Checking URL: ${url}`)
            if (this.isValidAppUrl(url)) {
              console.log(`Valid URL: ${url}`)
              if (!appUrls.includes(url)) {
                appUrls.push(url)
              }
            } else {
              console.log(`Invalid URL: ${url}`)
            }
          }
        })
      }
      
      console.log(`Found ${appUrls.length} app URLs in category page`)
      
      // Limit the number of URLs
      const limitedUrls = appUrls.slice(0, limit)
      
      // Check which apps already exist in database
      const { newApps, existingApps } = await this.checkExistingApps(limitedUrls)
      
      return {
        appUrls: newApps,
        totalApps: limitedUrls.length,
        newApps: newApps.length,
        existingApps: existingApps.length,
        categoryName,
        currentPage: 1,
        totalPages: 1,
        processedPages: []
      }
      
    } catch (error) {
      console.error('Error scraping category page:', error)
      throw new Error(`Failed to scrape category page: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check which apps already exist in the database
   */
  private async checkExistingApps(appUrls: string[]): Promise<{ newApps: string[], existingApps: string[] }> {
    const newApps: string[] = []
    const existingApps: string[] = []
    
    for (const url of appUrls) {
      try {
        // Check if app exists by URL first
        const { data: existingAppByUrl } = await supabase
          .from('apps')
          .select('id, name')
          .eq('macupdate_url', url)
          .single()
        
        if (existingAppByUrl) {
          existingApps.push(url)
          continue
        }
        
        // If not found by URL, check by name (extract name from URL)
        const appName = this.extractAppNameFromUrl(url)
        if (appName) {
          const { data: existingAppByName } = await supabase
            .from('apps')
            .select('id, name')
            .ilike('name', appName)
            .single()
          
          if (existingAppByName) {
            existingApps.push(url)
            continue
          }
        }
        
        // App doesn't exist, add to new apps
        newApps.push(url)
      } catch (error) {
        // App doesn't exist, add to new apps
        newApps.push(url)
      }
    }
    
    console.log(`Found ${newApps.length} new apps and ${existingApps.length} existing apps`)
    return { newApps, existingApps }
  }

  /**
   * Extract app name from MacUpdate URL
   */
  private extractAppNameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname
      
      // Extract subdomain (app name) from hostname
      // e.g., "istat-menus.macupdate.com" -> "istat-menus"
      const subdomain = hostname.split('.')[0]
      
      if (subdomain && subdomain !== 'www') {
        // Convert kebab-case to Title Case
        return subdomain
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Get only new apps that don't exist in the database (single page approach)
   */
  async getNewAppsOnly(categoryUrl: string, limit: number = 20): Promise<CategoryScrapingResult> {
    try {
      console.log(`Getting new apps from single page: ${categoryUrl}`)
      
      // Extract category name from URL
      const categoryName = this.extractCategoryName(categoryUrl)
      
      // Since MacUpdate loads apps dynamically via JavaScript and we can't use Puppeteer in Netlify,
      // we'll use a different approach: scrape multiple pages directly
      const allAppUrls = await this.scrapeMultiplePages(categoryUrl)
      
      console.log(`Found ${allAppUrls.length} total app URLs across multiple pages`)
      
      // Check which apps already exist in database
      const { newApps, existingApps } = await this.checkExistingApps(allAppUrls)
      
      console.log(`Found ${newApps.length} new apps and ${existingApps.length} existing apps`)
      
      // Get the next batch of unprocessed apps
      const processedCount = await this.getProcessedAppsCount(categoryUrl)
      const startIndex = processedCount
      const endIndex = Math.min(startIndex + limit, newApps.length)
      const batchApps = newApps.slice(startIndex, endIndex)
      
      console.log(`Returning batch ${startIndex + 1}-${endIndex} of ${newApps.length} new apps`)
      
      return {
        appUrls: batchApps,
        totalApps: allAppUrls.length,
        newApps: batchApps.length,
        existingApps: existingApps.length,
        categoryName,
        currentPage: Math.floor(startIndex / limit) + 1,
        totalPages: Math.ceil(newApps.length / limit),
        processedPages: [Math.floor(startIndex / limit) + 1] // Track current batch
      }
      
    } catch (error) {
      console.error('Error getting new apps:', error)
      throw new Error(`Failed to get new apps: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Scrape multiple pages to get more apps since JavaScript-loaded content isn't available
   */
  private async scrapeMultiplePages(categoryUrl: string): Promise<string[]> {
    const allAppUrls: string[] = [];
    const maxPages = 1; // Reduced to 1 page for ultra-fast mode
    
    console.log(`Starting HTML scraping for up to ${maxPages} pages (optimized for serverless timeout)...`);
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        console.log(`Scraping page ${page} with HTML...`);
        
        // Construct page URL
        let pageUrl = categoryUrl;
        if (page > 1) {
          if (categoryUrl.includes('?')) {
            pageUrl = `${categoryUrl}&page=${page}`;
          } else {
            pageUrl = `${categoryUrl}?page=${page}`;
          }
        }
        
        const pageUrls = await this.scrapeAllAppUrlsWithAxios(pageUrl);
        console.log(`Found ${pageUrls.length} apps on page ${page}`);
        
        // Add new URLs to our collection
        pageUrls.forEach(url => {
          if (!allAppUrls.includes(url)) {
            allAppUrls.push(url);
          }
        });
        
        // If we found very few apps on this page, it might be the last page
        if (pageUrls.length < 5) {
          console.log(`Page ${page} has very few apps (${pageUrls.length}), likely the last page`);
          break;
        }
        
        // Minimal delay to avoid timeout (only wait 100ms between requests)
        if (page < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.log(`Error scraping page ${page}:`, error);
        break; // Stop if we encounter an error
      }
    }
    
    console.log(`Total unique apps found across ${maxPages} pages: ${allAppUrls.length}`);
    return allAppUrls;
  }

  /**
   * Scrape all app URLs using Puppeteer to handle JavaScript rendering
   */
  private async scrapeAllAppUrlsWithPuppeteer(categoryUrl: string): Promise<string[]> {
    let browser;
    try {
      // Import puppeteer dynamically
      const puppeteer = await import('puppeteer');
      
      // Launch browser
      browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log(`Navigating to: ${categoryUrl}`);
      await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for the content to load and scroll to load more apps
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Scroll down to trigger loading of more apps
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for any additional content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract all app URLs from the page
      const appUrls = await page.evaluate(() => {
        const urls: string[] = [];
        
        // Look for custom_url patterns in the page content
        const pageContent = document.documentElement.outerHTML;
        const customUrlMatches = pageContent.match(/"custom_url":"([^"]+)"/g);
        
        if (customUrlMatches) {
          customUrlMatches.forEach((match: string) => {
            const urlMatch = match.match(/"custom_url":"([^"]+)"/);
            if (urlMatch && urlMatch[1]) {
              const url = urlMatch[1];
              if (url.includes('/app/') && !urls.includes(url)) {
                urls.push(url);
              }
            }
          });
        }
        
        return urls;
      });
      
      console.log(`Extracted ${appUrls.length} app URLs using Puppeteer`);
      return appUrls;
      
    } catch (error) {
      console.error('Error scraping with Puppeteer:', error);
      
      // Fallback to axios if Puppeteer fails
      console.log('Falling back to axios scraping...');
      return await this.scrapeAllAppUrlsWithAxios(categoryUrl);
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Fallback method using axios (for when Puppeteer is not available)
   */
  private async scrapeAllAppUrlsWithAxios(categoryUrl: string): Promise<string[]> {
    try {
      console.log(`Scraping with axios: ${categoryUrl}`)
      
      const response = await axios.get(categoryUrl, {
        timeout: 5000, // Further reduced timeout to avoid function timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const allAppUrls: string[] = [];
      const htmlContent = response.data;
      
      console.log(`HTML content length: ${htmlContent.length} characters`);
      
      // Pattern 1: Look for custom_url patterns in the HTML (most reliable)
      const customUrlMatches = htmlContent.match(/"custom_url":"([^"]+)"/g);
      if (customUrlMatches) {
        console.log(`Found ${customUrlMatches.length} custom_url matches in HTML`);
        customUrlMatches.forEach((match: string, index: number) => {
          const urlMatch = match.match(/"custom_url":"([^"]+)"/);
          if (urlMatch && urlMatch[1]) {
            const url = urlMatch[1];
            // Convert relative URLs to absolute
            const fullUrl = url.startsWith('http') ? url : `https://www.macupdate.com${url}`;
            console.log(`URL ${index + 1}: ${fullUrl}`);
            if (this.isValidAppUrl(fullUrl) && !allAppUrls.includes(fullUrl)) {
              allAppUrls.push(fullUrl);
              console.log(`✅ Added URL ${index + 1}: ${fullUrl}`);
            } else {
              console.log(`❌ Skipped URL ${index + 1}: ${fullUrl} (invalid or duplicate)`);
            }
          }
        });
      }
      
      // Pattern 2: Look for app links in the HTML structure (backup)
      if (allAppUrls.length < 20) {
        console.log(`Only found ${allAppUrls.length} URLs, trying backup pattern...`);
        const appLinkMatches = htmlContent.match(/href="\/app\/[^"]+"/g);
        if (appLinkMatches) {
          console.log(`Found ${appLinkMatches.length} app link matches in HTML`);
          appLinkMatches.forEach((match: string, index: number) => {
            const urlMatch = match.match(/href="([^"]+)"/);
            if (urlMatch && urlMatch[1]) {
              const url = `https://www.macupdate.com${urlMatch[1]}`;
              if (this.isValidAppUrl(url) && !allAppUrls.includes(url)) {
                allAppUrls.push(url);
                console.log(`✅ Added URL from links ${index + 1}: ${url}`);
              } else {
                console.log(`❌ Skipped URL from links ${index + 1}: ${url} (invalid or duplicate)`);
              }
            }
          });
        }
      }
      
      // Pattern 3: Look for script tags with app data (if we still need more)
      if (allAppUrls.length < 20) {
        console.log(`Only found ${allAppUrls.length} URLs, trying script pattern...`);
        const scriptMatches = htmlContent.match(/<script[^>]*>([^<]+)<\/script>/g);
        if (scriptMatches) {
          console.log(`Found ${scriptMatches.length} script tags in HTML`);
          scriptMatches.forEach((script: string, scriptIndex: number) => {
            // Look for app data in script content
            const appDataMatches = script.match(/"custom_url":"([^"]+)"/g);
            if (appDataMatches) {
              console.log(`Found ${appDataMatches.length} app data matches in script ${scriptIndex + 1}`);
              appDataMatches.forEach((match: string, index: number) => {
                const urlMatch = match.match(/"custom_url":"([^"]+)"/);
                if (urlMatch && urlMatch[1]) {
                  const url = urlMatch[1];
                  const fullUrl = url.startsWith('http') ? url : `https://www.macupdate.com${url}`;
                  if (this.isValidAppUrl(fullUrl) && !allAppUrls.includes(fullUrl)) {
                    allAppUrls.push(fullUrl);
                    console.log(`✅ Added URL from script ${scriptIndex + 1}-${index + 1}: ${fullUrl}`);
                  } else {
                    console.log(`❌ Skipped URL from script ${scriptIndex + 1}-${index + 1}: ${fullUrl} (invalid or duplicate)`);
                  }
                }
              });
            }
          });
        }
      }
      
      console.log(`🎯 Final result: Found ${allAppUrls.length} unique app URLs with optimized axios scraping`);
      console.log('📋 All URLs found:', allAppUrls);
      
      return allAppUrls;
      
    } catch (error) {
      console.error('Error with axios scraping:', error);
      return [];
    }
  }

  /**
   * Extract app URLs from JSON data structure
   */
  private extractAppsFromJson(jsonData: any, allAppUrls: string[]): void {
    try {
      // Recursively search for custom_url patterns in JSON
      const searchJson = (obj: any): void => {
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (key === 'custom_url' && typeof obj[key] === 'string') {
              const url = obj[key];
              if (this.isValidAppUrl(url) && !allAppUrls.includes(url)) {
                allAppUrls.push(url);
              }
            } else if (Array.isArray(obj[key])) {
              obj[key].forEach((item: any) => searchJson(item));
            } else if (typeof obj[key] === 'object') {
              searchJson(obj[key]);
            }
          }
        }
      };
      
      searchJson(jsonData);
    } catch (error) {
      console.log('Error extracting apps from JSON:', error);
    }
  }

  /**
   * Get count of processed apps for a category
   */
  private async getProcessedAppsCount(categoryUrl: string): Promise<number> {
    try {
      // Get all import sessions for this category URL
      const { data: sessions, error } = await supabase
        .from('import_sessions')
        .select('*')
        .eq('category_url', categoryUrl)
        .not('completed_at', 'is', null) // Only completed sessions

      if (error) {
        console.error('Error getting import sessions:', error)
        return 0
      }

      // Count total apps imported from all sessions
      let totalProcessed = 0
      sessions?.forEach(session => {
        totalProcessed += session.apps_imported || 0
      })

      console.log(`Found ${totalProcessed} processed apps for category`)
      return totalProcessed
    } catch (error) {
      console.error('Error getting processed apps count:', error)
      return 0
    }
  }

  /**
   * Mark apps as processed by creating an import session
   */
  async markAppsAsProcessed(categoryUrl: string, appsProcessed: number, categoryName: string): Promise<void> {
    try {
      const sessionName = `${categoryName} - Batch ${new Date().toISOString().split('T')[0]}`
      console.log(`📝 Creating import session: ${sessionName}`)
      
      const { data, error } = await supabase
        .from('import_sessions')
        .insert([{
          session_name: sessionName,
          category_url: categoryUrl,
          source_type: 'BULK_CATEGORY',
          apps_imported: appsProcessed,
          apps_skipped: 0,
          completed_at: new Date().toISOString()
        }])
        .select()

      if (error) {
        console.error('❌ Error marking apps as processed:', error)
      } else {
        console.log(`✅ Successfully marked ${appsProcessed} apps as processed for ${categoryName}`)
        console.log('📊 Created session:', data)
      }
    } catch (error) {
      console.error('❌ Error marking apps as processed:', error)
    }
  }

  /**
   * Create an import session to track the import process
   */
  async createImportSession(sessionName: string, categoryUrl?: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('import_sessions')
        .insert([{
          session_name: sessionName,
          category_url: categoryUrl,
          source_type: categoryUrl ? 'BULK_CATEGORY' : 'MANUAL'
        }])
        .select('id')
        .single()

      if (error) {
        console.error('Error creating import session:', error)
        throw error
      }

      console.log('Created import session:', data.id)
      return data.id
    } catch (error) {
      console.error('Failed to create import session:', error)
      throw error
    }
  }

  /**
   * Complete an import session
   */
  async completeImportSession(sessionId: string, appsImported: number, appsSkipped: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('import_sessions')
        .update({
          apps_imported: appsImported,
          apps_skipped: appsSkipped,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        console.error('Error completing import session:', error)
        throw error
      }

      console.log('Completed import session:', sessionId)
    } catch (error) {
      console.error('Failed to complete import session:', error)
      throw error
    }
  }

  /**
   * Get recent import sessions
   */
  async getRecentImportSessions(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('recent_import_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error getting recent import sessions:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to get recent import sessions:', error)
      return []
    }
  }

  /**
   * Extract category name from URL
   */
  private extractCategoryName(categoryUrl: string): string {
    try {
      const url = new URL(categoryUrl)
      const pathParts = url.pathname.split('/')
      const categoryPart = pathParts[pathParts.length - 1]
      
      // Convert kebab-case to Title Case
      return categoryPart
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    } catch (error) {
      return 'Unknown Category'
    }
  }

  /**
   * Check if URL is a valid MacUpdate app URL
   */
  private isValidAppUrl(url: string): boolean {
    // Must be a MacUpdate app page
    if (!url.includes('.macupdate.com')) {
      return false;
    }
    
    // Exclude non-app pages
    const excludePatterns = [
      '/explore/',
      '/categories/',
      '/search',
      '/about',
      '/contact',
      '/best-picks',
      '/reviews',
      '/articles',
      '/help',
      '/terms',
      '/privacy',
      '/cookie',
      '/rss',
      '/developer/',
      '/comparisons',
      '/how-to',
      '/content/',
      '/discontinued-apps',
      '/article/'
    ];
    
    for (const pattern of excludePatterns) {
      if (url.includes(pattern)) {
        return false;
      }
    }
    
    // Accept both subdomain format (appname.macupdate.com) and path format (macupdate.com/app/...)
    const subdomainPattern = /^https:\/\/[^.]+\.macupdate\.com(\/.*)?$/;
    const pathPattern = /^https:\/\/www\.macupdate\.com\/app\/[^\/]+(\/.*)?$/;
    
    return subdomainPattern.test(url) || pathPattern.test(url);
  }

  /**
   * Get preview data for apps without importing them
   */
  async getAppPreview(appUrl: string): Promise<Partial<MacUpdateApp> | null> {
    try {
      const response = await axios.get(appUrl, {
        timeout: 6000, // Reduced timeout to avoid function timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      const $ = cheerio.load(response.data)
      
      // Extract app name - look for the main app title
      let name = $('h1').first().text().trim()
      if (!name) {
        // Try alternative selectors for app name
        name = $('.app-title, .product-title, h2').first().text().trim()
      }
      if (!name) {
        // Fallback to page title
        name = $('title').text().replace(' - MacUpdate', '').trim()
      }
      
      // Clean up the name - remove "Download" prefix if present
      if (name.startsWith('Download ')) {
        name = name.replace('Download ', '')
      }
      
      // Extract developer name from the embedded JSON data
      let developer = 'Unknown Developer'
      const htmlContent = response.data
      
      // Look for developer name in the JSON data
      const developerMatch = htmlContent.match(/"developer":\s*{\s*"name":\s*"([^"]+)"/)
      if (developerMatch && developerMatch[1]) {
        developer = developerMatch[1]
      } else {
        // Fallback to HTML selectors
        developer = $('.developer-name, .developer, [class*="developer"]').text().trim()
        if (!developer) {
          // Look for developer links
          developer = $('a[href*="/developer/"]').first().text().trim()
        }
        if (!developer) {
          developer = 'Unknown Developer'
        }
      }
      
      // Extract price from the embedded JSON data
      let price: number | null = null
      const priceMatch = htmlContent.match(/"price":\s*{\s*"value":\s*(\d+)/)
      if (priceMatch && priceMatch[1]) {
        price = parseInt(priceMatch[1]) / 100 // Convert cents to dollars
      } else {
        // Fallback to HTML selectors
        const priceText = $('.price, .app-price, [class*="price"]').text().trim()
        if (priceText) {
          if (priceText.toLowerCase() === 'free') {
            price = 0
          } else {
            // Extract numeric value from price text
            const priceMatch = priceText.match(/[\d,]+\.?\d*/)
            if (priceMatch) {
              price = parseFloat(priceMatch[0].replace(/,/g, ''))
            }
          }
        }
      }
      
      // Extract rating from the embedded JSON data
      let rating: number | null = null
      const ratingMatch = htmlContent.match(/"rating":\s*([\d.]+)/)
      if (ratingMatch && ratingMatch[1]) {
        rating = parseFloat(ratingMatch[1])
      } else {
        // Fallback to HTML selectors
        const ratingText = $('.rating, .app-rating, [class*="rating"]').text().trim()
        if (ratingText) {
          const ratingMatch = ratingText.match(/[\d.]+/)
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[0])
          }
        }
      }
      
      console.log(`[DEBUG] getAppPreview - Extracted data for ${name}:`, {
        name,
        developer,
        price,
        rating,
        url: appUrl
      })
      
      return {
        name,
        developer,
        price,
        rating,
        macupdate_url: appUrl
      }
    } catch (error) {
      console.error('Error getting app preview:', error)
      return null
    }
  }

  /**
   * Extract pagination information from category page HTML
   */
  private async extractPaginationInfo(htmlContent: string): Promise<PaginationInfo> {
    try {
      const $ = cheerio.load(htmlContent)
      
      // Find pagination container
      const pagination = $('.mu_search_results_pagination .muui_pagination')
      
      if (pagination.length === 0) {
        // No pagination found, assume single page
        return {
          currentPage: 1,
          totalPages: 1,
          nextPage: null,
          processedPages: []
        }
      }
      
      // Find current page (has active class)
      let currentPage = 1
      pagination.find('.muui_pagination_item_active').each((_, el) => {
        const pageText = $(el).find('.muui_pagination_item_link').text().trim()
        const pageNum = parseInt(pageText)
        if (!isNaN(pageNum)) {
          currentPage = pageNum
        }
      })
      
      // Find total pages (last page number)
      let totalPages = 1
      const pageItems = pagination.find('.muui_pagination_item')
      pageItems.each((_, el) => {
        const pageText = $(el).find('.muui_pagination_item_link').text().trim()
        const pageNum = parseInt(pageText)
        if (!isNaN(pageNum) && pageNum > totalPages) {
          totalPages = pageNum
        }
      })
      
      // For now, just return basic pagination info without complex tracking
      console.log(`📊 Basic pagination info: current=${currentPage}, total=${totalPages}`)
      
      return {
        currentPage,
        totalPages,
        nextPage: currentPage + 1,
        processedPages: []
      }
    } catch (error) {
      console.error('Error extracting pagination info:', error)
      return {
        currentPage: 1,
        totalPages: 1,
        nextPage: null,
        processedPages: []
      }
    }
  }

  /**
   * Get processed pages for a category from import sessions
   */


  /**
   * Clear import sessions for a category when database is empty
   */
  async clearImportSessionsForCategory(categoryUrl: string): Promise<void> {
    try {
      console.log(`🧹 Clearing import sessions for category: ${categoryUrl}`)
      
      const { error } = await supabase
        .from('import_sessions')
        .delete()
        .eq('category_url', categoryUrl)

      if (error) {
        console.error('❌ Error clearing import sessions:', error)
      } else {
        console.log('✅ Successfully cleared import sessions for category')
      }
    } catch (error) {
      console.error('❌ Error clearing import sessions:', error)
    }
  }

  /**
   * Mark a page as processed by creating an import session
   */
  private async markPageAsProcessed(categoryUrl: string, pageNumber: number, categoryName: string): Promise<void> {
    try {
      const sessionName = `${categoryName} - Page ${pageNumber}`
      console.log(`📝 Creating import session: ${sessionName}`)
      
      const { data, error } = await supabase
        .from('import_sessions')
        .insert([{
          session_name: sessionName,
          category_url: categoryUrl,
          source_type: 'BULK_PAGE',
          page_status: 'scraped',
          apps_imported: 0,
          apps_skipped: 0,
          completed_at: new Date().toISOString()
        }])
        .select()

      if (error) {
        console.error('❌ Error marking page as processed:', error)
      } else {
        console.log(`✅ Successfully marked page ${pageNumber} as processed for ${categoryName}`)
        console.log('📊 Created session:', data)
      }
    } catch (error) {
      console.error('❌ Error marking page as processed:', error)
    }
  }

  /**
   * Build category URL with page parameter
   */
  private buildCategoryUrlWithPage(baseUrl: string, page: number): string {
    try {
      const url = new URL(baseUrl)
      url.searchParams.set('page', page.toString())
      return url.toString()
    } catch (error) {
      // If URL parsing fails, append page parameter manually
      const separator = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${separator}page=${page}`
    }
  }

  /**
   * Get only new apps that don't exist in the database with pagination
   */
  async getNewAppsOnlyWithPagination(categoryUrl: string, limit: number = 20): Promise<CategoryScrapingResult> {
    try {
      console.log(`Getting new apps with pagination from: ${categoryUrl}`)
      
      // Extract category name from URL
      const categoryName = this.extractCategoryName(categoryUrl)
      
      // First, get pagination info from the base category page
      const baseResponse = await axios.get(categoryUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      const paginationInfo = await this.extractPaginationInfo(baseResponse.data)
      
      // If no next page available, return empty result
      if (!paginationInfo.nextPage) {
        return {
          appUrls: [],
          totalApps: 0,
          newApps: 0,
          existingApps: 0,
          categoryName,
          currentPage: paginationInfo.currentPage,
          totalPages: paginationInfo.totalPages,
          processedPages: paginationInfo.processedPages
        }
      }
      
      // Build URL for the next page to scrape
      const nextPageUrl = this.buildCategoryUrlWithPage(categoryUrl, paginationInfo.nextPage)
      console.log(`Scraping next page: ${nextPageUrl}`)
      
      // Scrape the next page
      const response = await axios.get(nextPageUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      })
      
      // Extract app URLs from the page
      const allAppUrls: string[] = []
      const htmlContent = response.data
      
      // Look for custom_url patterns in the HTML
      const customUrlMatches = htmlContent.match(/"custom_url":"([^"]+)"/g)
      if (customUrlMatches) {
        console.log(`Found ${customUrlMatches.length} custom_url matches on page ${paginationInfo.nextPage}`)
        customUrlMatches.forEach((match: string) => {
          const urlMatch = match.match(/"custom_url":"([^"]+)"/)
          if (urlMatch && urlMatch[1]) {
            const url = urlMatch[1]
            if (this.isValidAppUrl(url)) {
              if (!allAppUrls.includes(url)) {
                allAppUrls.push(url)
              }
            }
          }
        })
      }
      
      console.log(`Found ${allAppUrls.length} total app URLs on page ${paginationInfo.nextPage}`)
      
      // Check which apps already exist in database
      const { newApps, existingApps } = await this.checkExistingApps(allAppUrls)
      
      // Limit the number of new apps
      const limitedNewApps = newApps.slice(0, limit)
      
      // Mark this page as processed
      await this.markPageAsProcessed(categoryUrl, paginationInfo.nextPage, categoryName)
      
      return {
        appUrls: limitedNewApps,
        totalApps: allAppUrls.length,
        newApps: limitedNewApps.length,
        existingApps: existingApps.length,
        categoryName,
        currentPage: paginationInfo.nextPage,
        totalPages: paginationInfo.totalPages,
        processedPages: paginationInfo.processedPages
      }
      
    } catch (error) {
      console.error('Error getting new apps with pagination:', error)
      throw new Error(`Failed to get new apps with pagination: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

    /**
   * Get apps using MacUpdate's API endpoint for reliable pagination
   */
  async getAppsFromAPI(categoryUrl: string, limit: number = 20): Promise<CategoryScrapingResult> {
    try {
      console.log(`Getting apps using HTML scraping: ${categoryUrl}`)
      
      // Extract category name from URL
      const categoryName = this.extractCategoryName(categoryUrl)
      
      // Get the current page to process
      const processedCount = await this.getProcessedAppsCount(categoryUrl)
      const currentPage = Math.floor(processedCount / limit) + 1
      
      console.log(`Processing batch ${currentPage} (${processedCount} apps already processed)`)
      
      // Use HTML scraping directly since API consistently returns 500 errors
      console.log('Using HTML scraping (API consistently returns 500 errors in server environments)')
      
      return await this.getNewAppsOnly(categoryUrl, limit)
      
    } catch (error) {
      console.error('Error in getAppsFromAPI:', error)
      
      // Fallback to the old scraping method
      console.log('Falling back to HTML scraping...')
      return await this.getNewAppsOnly(categoryUrl, limit)
    }
  }



  /**
   * Scrape a single page for URLs only
   */
  private async scrapeSinglePage(categoryUrl: string, pageNumber: number): Promise<string[]> {
    try {
      console.log(`Scraping single page ${pageNumber} with HTML...`)
      
      // Construct page URL
      let pageUrl = categoryUrl;
      if (pageNumber > 1) {
        if (categoryUrl.includes('?')) {
          pageUrl = `${categoryUrl}&page=${pageNumber}`;
        } else {
          pageUrl = `${categoryUrl}?page=${pageNumber}`;
        }
      }
      
      const pageUrls = await this.scrapeAllAppUrlsWithAxios(pageUrl);
      console.log(`Found ${pageUrls.length} apps on page ${pageNumber}`);
      
      return pageUrls;
      
    } catch (error) {
      console.log(`Error scraping page ${pageNumber}:`, error);
      return [];
    }
  }

  /**
   * Scrape a single page for URLs and full app data
   */
  private async scrapeSinglePageWithData(categoryUrl: string, pageNumber: number): Promise<{ urls: string[], appData: any[] }> {
    try {
      console.log(`Scraping single page ${pageNumber} with full data...`)
      
      // Construct page URL
      let pageUrl = categoryUrl;
      if (pageNumber > 1) {
        if (categoryUrl.includes('?')) {
          pageUrl = `${categoryUrl}&page=${pageNumber}`;
        } else {
          pageUrl = `${categoryUrl}?page=${pageNumber}`;
        }
      }
      
      // Get the category page HTML and extract both URLs and app data
      const response = await axios.get(pageUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const htmlContent = response.data;
      const pageUrls: string[] = [];
      const appData: any[] = [];
      
      console.log(`HTML content length: ${htmlContent.length} characters`);
      
      // Extract app data from embedded JSON in the HTML - try multiple patterns
      let appDataMatches = htmlContent.match(/"custom_url":"([^"]+)","title":"([^"]+)","developer":"([^"]+)","price":(\d+),"rating":([\d.]+),"download_count":(\d+),"review_count":(\d+),"filesize":"([^"]+)","logo":"([^"]+)","short_description":"([^"]+)"/g);
      
      // If the first pattern doesn't work, try a more flexible approach
      if (!appDataMatches || appDataMatches.length === 0) {
        console.log('Trying alternative JSON extraction patterns...');
        
        // Look for individual app objects in the JSON
        const appObjects = htmlContent.match(/\{[^}]*"custom_url"[^}]*\}/g);
        if (appObjects) {
          console.log(`Found ${appObjects.length} potential app objects`);
          
          appObjects.forEach((appObject: string) => {
            try {
              // Extract custom_url first
              const urlMatch = appObject.match(/"custom_url":"([^"]+)"/);
              if (urlMatch) {
                const customUrl = urlMatch[1];
                const fullUrl = `https://www.macupdate.com${customUrl}`;
                pageUrls.push(fullUrl);
                
                // Extract other fields with fallbacks
                const titleMatch = appObject.match(/"title":"([^"]+)"/);
                const developerMatch = appObject.match(/"developer":"([^"]+)"/);
                const priceMatch = appObject.match(/"price":(\d+)/);
                const ratingMatch = appObject.match(/"rating":([\d.]+)/);
                const downloadMatch = appObject.match(/"download_count":(\d+)/);
                const reviewMatch = appObject.match(/"review_count":(\d+)/);
                const filesizeMatch = appObject.match(/"filesize":"([^"]+)"/);
                const logoMatch = appObject.match(/"logo":"([^"]+)"/);
                const descriptionMatch = appObject.match(/"short_description":"([^"]+)"/);
                
                appData.push({
                  custom_url: customUrl,
                  title: titleMatch ? titleMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : 'Unknown App',
                  developer: developerMatch ? developerMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : 'Unknown Developer',
                  price: priceMatch ? parseInt(priceMatch[1]) / 100 : 0,
                  rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
                  download_count: downloadMatch ? parseInt(downloadMatch[1]) : 0,
                  review_count: reviewMatch ? parseInt(reviewMatch[1]) : 0,
                  filesize: filesizeMatch ? filesizeMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : 'Unknown',
                  logo: logoMatch ? logoMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : null,
                  short_description: descriptionMatch ? descriptionMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : 'No description available'
                });
              }
            } catch (error) {
              console.log('Error parsing app object:', error);
            }
          });
        }
      } else {
        console.log(`Found ${appDataMatches.length} complete app data matches in HTML`);
        
        appDataMatches.forEach((match: string) => {
          const dataMatch = match.match(/"custom_url":"([^"]+)","title":"([^"]+)","developer":"([^"]+)","price":(\d+),"rating":([\d.]+),"download_count":(\d+),"review_count":(\d+),"filesize":"([^"]+)","logo":"([^"]+)","short_description":"([^"]+)"/);
          
          if (dataMatch) {
            const [, customUrl, title, developer, price, rating, downloadCount, reviewCount, filesize, logo, shortDescription] = dataMatch;
            
            const fullUrl = `https://www.macupdate.com${customUrl}`;
            pageUrls.push(fullUrl);
            
            appData.push({
              custom_url: customUrl,
              title: title.replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
              developer: developer.replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
              price: parseInt(price) / 100, // Convert cents to dollars
              rating: parseFloat(rating),
              download_count: parseInt(downloadCount),
              review_count: parseInt(reviewCount),
              filesize: filesize.replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
              logo: logo.replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
              short_description: shortDescription.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
            });
          }
        });
      }
      
      // If we didn't find complete data, fall back to just URLs
      if (appData.length === 0) {
        console.log('No complete app data found, falling back to URL extraction only');
        const pageUrlsOnly = await this.scrapeAllAppUrlsWithAxios(pageUrl);
        pageUrls.push(...pageUrlsOnly);
      }
      
      console.log(`Found ${pageUrls.length} apps on page ${pageNumber} with full data`);
      
      return { urls: pageUrls, appData };
      
    } catch (error) {
      console.log(`Error scraping page ${pageNumber} with data:`, error);
      return { urls: [], appData: [] };
    }
  }

  /**
   * Get app preview data from API response
   */
  async getAppPreviewFromAPI(appData: any): Promise<Partial<MacUpdateApp> | null> {
    try {
      if (!appData || !appData.custom_url) {
        return null
      }

      return {
        name: appData.title || 'Unknown App',
        developer: appData.developer || 'Unknown Developer',
        description: appData.short_description || 'No description available',
        price: appData.price || 0,
        version: appData.version || 'Unknown',
        rating: appData.rating || null,
        download_count: appData.download_count || 0,
        rating_count: appData.review_count || 0,
        file_size: appData.filesize || 'Unknown',
        icon_url: appData.logo || null,
        macupdate_url: `https://www.macupdate.com${appData.custom_url}`
      }
    } catch (error) {
      console.error('Error getting app preview from API data:', error)
      return null
    }
  }

  /**
   * Extract category ID from MacUpdate URL
   */
  private getCategoryIdFromUrl(categoryUrl: string): string | null {
    // Known category mappings
    const categoryMappings: { [key: string]: string } = {
      'photography': '14',
      'graphic-design': '8',
      'developer-tools': '6',
      'productivity': '12',
      'utilities': '15',
      'games': '7',
      'business': '3',
      'education': '5',
      'entertainment': '6',
      'finance': '7',
      'health-fitness': '9',
      'lifestyle-hobby': '10',
      'medical-software': '11',
      'music-audio': '13',
      'security': '16',
      'system-utilities': '17',
      'travel': '18',
      'video': '19'
    }
    
    // Extract category slug from URL
    const urlMatch = categoryUrl.match(/\/categories\/([^\/\?]+)/)
    if (urlMatch && urlMatch[1]) {
      const categorySlug = urlMatch[1]
      return categoryMappings[categorySlug] || null
    }
    
    return null
  }

  /**
   * Simple sequential page scraping - no complex tracking
   */
  async getAppsUrlsOnly(categoryUrl: string, limit: number = 20, pages: number = 1): Promise<CategoryScrapingResult> {
    try {
      console.log(`Simple sequential scraping: ${categoryUrl} (pages: ${pages})`)
      
      // Extract category name from URL
      const categoryName = this.extractCategoryName(categoryUrl)
      
      // Get the last processed page number from import sessions
      const lastProcessedPage = await this.getLastProcessedPage(categoryUrl)
      const nextPage = lastProcessedPage + 1
      
      console.log(`📄 Last processed page: ${lastProcessedPage}`)
      console.log(`📄 Next page to scrape: ${nextPage}`)
      
      const allUrls: string[] = []
      const pagesProcessed: number[] = []
      
      // Scrape the next N pages starting from nextPage
      for (let i = 0; i < pages; i++) {
        const currentPage = nextPage + i
        console.log(`Scraping page ${currentPage} (${i + 1}/${pages})`)
        
        // Scrape this page
        const pageUrls = await this.scrapeSinglePage(categoryUrl, currentPage)
        console.log(`Found ${pageUrls.length} apps on page ${currentPage}`)
        
        // Add URLs from this page
        allUrls.push(...pageUrls)
        pagesProcessed.push(currentPage)
        
        // Mark this page as processed
        await this.markPageAsProcessed(categoryUrl, currentPage, categoryName)
        
        // If we have enough URLs, stop
        if (allUrls.length >= limit) {
          console.log(`Reached limit of ${limit} URLs, stopping`)
          break
        }
      }
      
      console.log(`Total URLs found: ${allUrls.length} from pages: ${pagesProcessed.join(', ')}`)
      
      return {
        appUrls: allUrls.slice(0, limit),
        totalApps: allUrls.length,
        newApps: allUrls.length,
        existingApps: 0,
        categoryName,
        currentPage: pagesProcessed[pagesProcessed.length - 1] || nextPage,
        totalPages: 999,
        processedPages: pagesProcessed
      }
      
    } catch (error) {
      console.error('Error in getAppsUrlsOnly:', error)
      throw new Error(`Failed to scrape URLs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getAppsWithFullData(categoryUrl: string, limit: number = 20, pages: number = 1): Promise<CategoryScrapingResult> {
    try {
      console.log(`Full data sequential scraping: ${categoryUrl} (pages: ${pages})`)
      
      // Extract category name from URL
      const categoryName = this.extractCategoryName(categoryUrl)
      
      // Get the last processed page number from import sessions
      const lastProcessedPage = await this.getLastProcessedPage(categoryUrl)
      const nextPage = lastProcessedPage + 1
      
      console.log(`📄 Last processed page: ${lastProcessedPage}`)
      console.log(`📄 Next page to scrape: ${nextPage}`)
      
      const allUrls: string[] = []
      const allAppData: any[] = []
      const pagesProcessed: number[] = []
      
      // Scrape the next N pages starting from nextPage
      for (let i = 0; i < pages; i++) {
        const currentPage = nextPage + i
        console.log(`Scraping page ${currentPage} (${i + 1}/${pages}) with full data`)
        
        // Scrape this page with full data
        const pageResult = await this.scrapeSinglePageWithData(categoryUrl, currentPage)
        console.log(`Found ${pageResult.urls.length} apps on page ${currentPage}`)
        
        // Add URLs and data from this page
        allUrls.push(...pageResult.urls)
        allAppData.push(...pageResult.appData)
        pagesProcessed.push(currentPage)
        
        // Mark this page as processed
        await this.markPageAsProcessed(categoryUrl, currentPage, categoryName)
        
        // If we have enough URLs, stop
        if (allUrls.length >= limit) {
          console.log(`Reached limit of ${limit} URLs, stopping`)
          break
        }
      }
      
      console.log(`Total URLs found: ${allUrls.length} from pages: ${pagesProcessed.join(', ')}`)
      
      return {
        appUrls: allUrls.slice(0, limit),
        totalApps: allUrls.length,
        newApps: allUrls.length,
        existingApps: 0,
        categoryName,
        currentPage: pagesProcessed[pagesProcessed.length - 1] || nextPage,
        totalPages: 999,
        processedPages: pagesProcessed,
        apiData: {
          apps: allAppData.slice(0, limit),
          total: allAppData.length
        }
      }
      
    } catch (error) {
      console.error('Error in getAppsWithFullData:', error)
      throw new Error(`Failed to scrape with full data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get the last processed page number for a category
   */
  private async getLastProcessedPage(categoryUrl: string): Promise<number> {
    try {
      const { data: sessions, error } = await supabase
        .from('import_sessions')
        .select('session_name')
        .eq('category_url', categoryUrl)
        .like('session_name', '%Page %')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error getting last processed page:', error)
        return 0
      }

      if (!sessions || sessions.length === 0) {
        console.log('No previous sessions found, starting from page 1')
        return 0
      }

      // Extract page number from session name like "Photography - Page 5"
      const sessionName = sessions[0].session_name
      const pageMatch = sessionName.match(/Page (\d+)/)
      
      if (pageMatch && pageMatch[1]) {
        const pageNum = parseInt(pageMatch[1])
        console.log(`Last processed page from session: ${pageNum}`)
        return pageNum
      }

      return 0
    } catch (error) {
      console.error('Error in getLastProcessedPage:', error)
      return 0
    }
  }
}

// Utility function to create scraper instance
export function createMacUpdateScraper(config?: Partial<ScrapingConfig>): MacUpdateScraper {
  return new MacUpdateScraper(config)
} 