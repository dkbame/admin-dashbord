import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testUrl = searchParams.get('url') || 'https://cyberduck.macupdate.com/'
    
    console.log('Testing size extraction from:', testUrl)
    
    const response = await axios.get(testUrl, {
      timeout: 30000,
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
    
    // Test different size extraction methods
    const results = {
      url: testUrl,
      specs_list_items: [] as any[],
      size_extracted: '',
      requirements_extracted: '',
      all_specs_titles: [] as string[],
      all_specs_descriptions: [] as string[],
      version_info: {
        raw_text: '',
        parsed_version: ''
      }
    }
    
    // Method 1: Look for specs_list structure
    $('.specs_list .specs_list_item').each((_, item) => {
      const $item = $(item)
      const title = $item.find('.specs_list_title').text().trim()
      const description = $item.find('.specs_list_description').text().trim()
      
      results.specs_list_items.push({ title, description })
      
      if (title === 'Size') {
        results.size_extracted = description
      }
      if (title === 'OS') {
        results.requirements_extracted = description
      }
    })
    
    // Method 2: Look for any elements containing "Size"
    $('*').each((_, element) => {
      const text = $(element).text().trim()
      if (text.includes('Size') && text.length < 100) {
        results.all_specs_titles.push(text)
      }
      if (text.includes('MB') || text.includes('GB') || text.includes('KB')) {
        results.all_specs_descriptions.push(text)
      }
    })
    
    // Method 3: Look for specific patterns
    const sizePatterns = [
      /Size[:\s]+([0-9.]+)\s*(MB|GB|KB)/i,
      /([0-9.]+)\s*(MB|GB|KB)/i,
      /File Size[:\s]+([0-9.]+)\s*(MB|GB|KB)/i
    ]
    
    const html = response.data
    for (const pattern of sizePatterns) {
      const match = html.match(pattern)
      if (match) {
        results.size_extracted = match[0]
        break
      }
    }
    
    // Test version extraction
    const versionText = $('span').filter((_, el) => $(el).text().includes('Version')).next().text().trim() || 
                       $('.version').first().text().trim() ||
                       $('*').filter((_, el) => $(el).text().includes('Version')).next().text().trim()
    
    results.version_info.raw_text = versionText
    
    // Parse version (same logic as the scraper)
    if (versionText) {
      let cleaned = versionText.replace(/^Version\s*/i, '').trim()
      const versionMatch = cleaned.match(/(\d+(?:\.\d+)*)/)
      if (versionMatch) {
        results.version_info.parsed_version = versionMatch[1]
      } else {
        results.version_info.parsed_version = cleaned
      }
    }
    
    // Note: We're not extracting release dates from MacUpdate
    // They show "Updated on" dates, not initial release dates
    // Release date will be left empty for manual entry if needed
    
    return NextResponse.json({
      success: true,
      data: results
    })
    
  } catch (error) {
    console.error('Error testing size extraction:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
} 