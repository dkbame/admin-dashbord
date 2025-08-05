import axios from 'axios'
import * as cheerio from 'cheerio'
import { supabase } from './supabase'

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
    
    if (timeSinceLastRequest < this.delay) {
      const waitTime = this.delay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequest = Date.now()
  }
}

export class MacUpdateCategoryScraper {
  private config: ScrapingConfig
  private rateLimiter: RateLimiter

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.rateLimiter = new RateLimiter(this.config.delayBetweenRequests)
  }

  async scrapeAppPage(appUrl: string): Promise<MacUpdateApp | null> {
    try {
      console.log(`Scraping app page: ${appUrl}`)
      return await this.scrapeWithAxios(appUrl)
    } catch (error) {
      console.error('Error scraping app page:', error)
      return null
    }
  }

  // Primary scraping method using Axios + Cheerio
  private async scrapeWithAxios(appUrl: string): Promise<MacUpdateApp | null> {
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

  /**
   * Extract app data from HTML using Cheerio
   */
  private extractAppData($: cheerio.CheerioAPI, appUrl: string): MacUpdateApp | null {
    try {
      // Extract basic app information
      const name = $('h1').first().text().trim() || $('.app-title').text().trim()
      const developer = $('.developer-name').text().trim() || $('[data-developer]').attr('data-developer') || 'Unknown'
      const version = $('.version').text().trim() || $('[data-version]').attr('data-version') || 'Unknown'
      
      // Extract price information
      const priceText = $('.price').text().trim() || $('[data-price]').attr('data-price') || ''
      const price = this.parsePrice(priceText)
      const currency = priceText.includes('$') ? 'USD' : 'Unknown'
      
      // Extract rating information
      const ratingText = $('.rating').text().trim() || $('[data-rating]').attr('data-rating') || ''
      const rating = this.parseRating(ratingText)
      const ratingCount = parseInt($('.rating-count').text().trim()) || 0
      
      // Extract download count
      const downloadText = $('.download-count').text().trim() || ''
      const downloadCount = this.parseDownloadCount(downloadText)
      
      // Extract description
      const description = $('.description').text().trim() || $('.app-description').text().trim() || ''
      
      // Extract category - try multiple approaches
      let category = $('.category').text().trim() || $('[data-category]').attr('data-category') || ''
      
      // If category is still empty, try to extract from JSON data in the page
      if (!category) {
        const pageContent = $.html()
        
        // Look for category in JSON data
        const categoryMatches = pageContent.match(/"category":"([^"]+)"/g)
        if (categoryMatches && categoryMatches.length > 0) {
          const categoryMatch = categoryMatches[0].match(/"category":"([^"]+)"/)
          if (categoryMatch && categoryMatch[1]) {
            category = categoryMatch[1]
          }
        }
        
        // Look for category in breadcrumbs or navigation
        if (!category) {
          const breadcrumbText = $('.breadcrumb').text().toLowerCase()
          const navText = $('nav').text().toLowerCase()
          const allText = breadcrumbText + ' ' + navText
          
          // Check for main categories
          if (allText.includes('music') || allText.includes('audio')) category = 'Music & Audio'
          else if (allText.includes('system') || allText.includes('utilities')) category = 'System Utilities'
          else if (allText.includes('video')) category = 'Video'
          else if (allText.includes('photo')) category = 'Photography'
          else if (allText.includes('productivity')) category = 'Productivity'
          else if (allText.includes('development') || allText.includes('developer')) category = 'Developer Tools'
          else if (allText.includes('games')) category = 'Games'
          else if (allText.includes('education')) category = 'Education'
          else if (allText.includes('business')) category = 'Business'
          else if (allText.includes('customization')) category = 'Customization'
          else if (allText.includes('finance')) category = 'Finance'
          else if (allText.includes('graphic') || allText.includes('design')) category = 'Graphic Design'
          else if (allText.includes('health') || allText.includes('fitness')) category = 'Health & Fitness'
          else if (allText.includes('internet')) category = 'Internet Utilities'
          else if (allText.includes('lifestyle') || allText.includes('hobby')) category = 'Lifestyle & Hobby'
          else if (allText.includes('medical')) category = 'Medical Software'
          else if (allText.includes('security')) category = 'Security'
          else if (allText.includes('travel')) category = 'Travel'
          
          // Check for subcategories
          else if (allText.includes('dvd')) category = 'DVD Software'
          else if (allText.includes('converter')) category = 'Video Converters'
          else if (allText.includes('editor')) category = 'Video Editors'
          else if (allText.includes('player')) category = 'Video Players'
          else if (allText.includes('recording')) category = 'Video Recording'
          else if (allText.includes('streaming')) category = 'Video Streaming'
          else if (allText.includes('audio converter')) category = 'Audio Converters'
          else if (allText.includes('audio player')) category = 'Audio Players'
          else if (allText.includes('audio plug')) category = 'Audio Plug-ins'
          else if (allText.includes('audio production')) category = 'Audio Production'
          else if (allText.includes('audio recording')) category = 'Audio Recording'
          else if (allText.includes('audio streaming')) category = 'Audio Streaming'
          else if (allText.includes('dj') || allText.includes('mixing')) category = 'DJ Mixing Software'
          else if (allText.includes('music management')) category = 'Music Management'
          else if (allText.includes('radio')) category = 'Radio'
          else if (allText.includes('automation')) category = 'Automation'
          else if (allText.includes('backup')) category = 'Backup'
          else if (allText.includes('cleaner')) category = 'Cleaners'
          else if (allText.includes('clock') || allText.includes('alarm')) category = 'Clocks & Alarms'
          else if (allText.includes('compression')) category = 'Compression'
          else if (allText.includes('contextual menu')) category = 'Contextual Menus'
          else if (allText.includes('diagnostic')) category = 'Diagnostic Software'
          else if (allText.includes('disk utility')) category = 'Disk Utilities'
          else if (allText.includes('emulation')) category = 'Emulation'
          else if (allText.includes('file management')) category = 'File Management'
          else if (allText.includes('font manager')) category = 'Font Managers'
          else if (allText.includes('maintenance') || allText.includes('optimization')) category = 'Maintenance & Optimization'
          else if (allText.includes('network software')) category = 'Network Software'
          else if (allText.includes('printer') || allText.includes('scanner')) category = 'Printer & Scanner Drivers'
          else if (allText.includes('recovery')) category = 'Recovery'
          else if (allText.includes('synchronization')) category = 'Synchronization'
          else if (allText.includes('usb driver')) category = 'USB Drivers'
          else if (allText.includes('virtualization')) category = 'Virtualization'
        }
      }
      
      // Fallback category if still empty
      if (!category) {
        category = 'Unknown'
      }
      
      // Extract system requirements
      const systemRequirements: string[] = []
      $('.system-requirements li').each((_, el) => {
        const req = $(el).text().trim()
        if (req) systemRequirements.push(req)
      })
      
      // Extract screenshots
      const screenshots: string[] = []
      $('.screenshots img').each((_, el) => {
        const src = $(el).attr('src')
        if (src) screenshots.push(src)
      })
      
      // Extract icon URL
      const iconUrl = $('.app-icon img').attr('src') || $('.icon img').attr('src') || ''
      
      // Extract developer website
      const developerWebsite = $('.developer-website a').attr('href') || ''
      
      // Extract file size
      const fileSize = $('.file-size').text().trim() || ''
      
      // Extract requirements
      const requirements = $('.requirements').text().trim() || ''
      
      // Extract architecture
      const architecture = $('.architecture').text().trim() || ''
      
      // Parse version
      const parsedVersion = this.parseVersion(version)
      
      // Parse last updated date
      const updatedText = $('.last-updated').text().trim() || ''
      const lastUpdated = this.parseUpdatedDate(updatedText)
      
      if (!name) {
        console.error('Could not extract app name from HTML')
        return null
      }
      
      console.log(`Extracted data: {
  name: '${name}',
  developer: '${developer}',
  version: '${parsedVersion}',
  price: ${price},
  category: '${category}',
  descriptionLength: ${description.length}
}`)
      
      return {
        name,
        developer,
        version: parsedVersion,
        price,
        currency,
        rating,
        rating_count: ratingCount,
        download_count: downloadCount,
        description,
        category,
        system_requirements: systemRequirements,
        screenshots,
        icon_url: iconUrl,
        macupdate_url: appUrl,
        developer_website_url: developerWebsite,
        last_updated: lastUpdated,
        file_size: fileSize,
        requirements,
        architecture
      }
      
    } catch (error) {
      console.error('Error extracting app data:', error)
      return null
    }
  }

  /**
   * Parse price from text
   */
  private parsePrice(priceText: string): number | null {
    if (priceText.toLowerCase() === 'free') {
      return 0
    }
    const match = priceText.match(/[\d,]+\.?\d*/)
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''))
    }
    return null
  }

  /**
   * Parse rating from text
   */
  private parseRating(ratingText: string): number | null {
    const match = ratingText.match(/[\d.]+/)
    if (match) {
      return parseFloat(match[0])
    }
    return null
  }

  /**
   * Parse download count from text
   */
  private parseDownloadCount(downloadText: string): number {
    const match = downloadText.match(/[\d,]+\.?\d*/)
    if (match) {
      return parseInt(match[0].replace(/,/g, ''))
    }
    return 0
  }

  /**
   * Parse version from text
   */
  private parseVersion(versionText: string): string {
    // Simple regex to extract version numbers
    const match = versionText.match(/v?(\d+\.\d+(\.\d+)?)/)
    if (match) {
      return match[1]
    }
    return versionText
  }

  /**
   * Parse last updated date from text
   */
  private parseUpdatedDate(updatedText: string): Date {
    // Simple regex to extract date in YYYY-MM-DD format
    const match = updatedText.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return new Date(match[1]);
    }
    return new Date(); // Fallback to current date
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
    const maxPages = 5; // Limit to 5 pages to avoid timeout
    
    console.log(`Starting HTML scraping for up to ${maxPages} pages (optimized for serverless timeout)...`);
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        console.log(`Scraping page ${page} with HTML...`);
        const pageUrls = await this.scrapeSinglePage(categoryUrl, page);
        
        if (pageUrls.length === 0) {
          console.log(`No more apps found on page ${page}, stopping`);
          break;
        }
        
        // Add new URLs to the list
        pageUrls.forEach(url => {
          if (!allAppUrls.includes(url)) {
            allAppUrls.push(url);
          }
        });
        
        console.log(`Found ${pageUrls.length} apps on page ${page}`);
        
        // If we have enough URLs, stop
        if (allAppUrls.length >= 20) {
          console.log(`Reached limit of ${allAppUrls.length} URLs, stopping`);
          break;
        }
        
        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error scraping page ${page}:`, error);
        break;
      }
    }
    
    console.log(`Total unique apps found across ${maxPages} pages: ${allAppUrls.length}`);
    return allAppUrls;
  }

  /**
   * Scrape all app URLs using Axios (primary method for serverless environments)
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
export function createMacUpdateScraper(config?: Partial<ScrapingConfig>): MacUpdateCategoryScraper {
  return new MacUpdateCategoryScraper(config)
} 