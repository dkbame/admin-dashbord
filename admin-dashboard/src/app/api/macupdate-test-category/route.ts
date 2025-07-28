import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url).searchParams.get('url') || 'https://paragraphic.macupdate.com/'
    
    console.log('Testing category extraction for:', url)
    
    const response = await axios.get(url, {
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
    
    const $ = cheerio.load(response.data)
    
    // Test different category extraction methods
    const results = {
      url: url,
      category_extraction_methods: {
        method1: $('a[href*="/category/"]').first().text().trim(),
        method2: $('.category').first().text().trim(),
        method3: $('a[href*="category"]').first().text().trim(),
        method4: $('*').filter((_, el) => $(el).text().includes('Category')).next().text().trim(),
        method5: $('a[href*="/category/"]').first().attr('href'),
        method6: $('*').filter((_, el) => $(el).text().includes('Graphics')).text().trim(),
        method7: $('*').filter((_, el) => $(el).text().includes('Design')).text().trim(),
      },
      all_category_links: [] as string[],
      all_text_containing_category: [] as string[]
    }
    
    // Get all category links
    $('a[href*="/category/"]').each((_, el) => {
      const href = $(el).attr('href')
      const text = $(el).text().trim()
      if (href && text) {
        results.all_category_links.push(`${text} (${href})`)
      }
    })
    
    // Get all text containing "category"
    $('*').each((_, el) => {
      const text = $(el).text().trim()
      if (text.toLowerCase().includes('category') && text.length < 100) {
        results.all_text_containing_category.push(text)
      }
    })
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error('Error testing category extraction:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      url: new URL(request.url).searchParams.get('url') || 'https://paragraphic.macupdate.com/'
    }, { status: 500 })
  }
} 