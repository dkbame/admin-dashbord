import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const testUrl = url.searchParams.get('url') || 'https://www.macupdate.com/explore/categories/developer-tools'
    
    console.log('Fetching URL:', testUrl)
    
    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    })
    
    const $ = cheerio.load(response.data)
    
    // Test different selectors
    const results = {
      h3Links: [] as string[],
      mainLinks: [] as string[],
      allLinks: [] as string[],
      appLinks: [] as string[]
    }
    
    // Test h3 links
    $('h3 a[href*=".macupdate.com/"]').each((_, element) => {
      const href = $(element).attr('href')
      const text = $(element).text().trim()
      if (href) {
        results.h3Links.push(`${text} -> ${href}`)
      }
    })
    
    // Test main content links
    $('main a[href*=".macupdate.com/"]').each((_, element) => {
      const href = $(element).attr('href')
      const text = $(element).text().trim()
      if (href) {
        results.mainLinks.push(`${text} -> ${href}`)
      }
    })
    
    // Test all links
    $('a[href*=".macupdate.com/"]').each((_, element) => {
      const href = $(element).attr('href')
      const text = $(element).text().trim()
      if (href && text.length > 0 && text.length < 100) {
        results.allLinks.push(`${text} -> ${href}`)
      }
    })
    
    // Test for app-specific patterns
    $('a').each((_, element) => {
      const href = $(element).attr('href')
      const text = $(element).text().trim()
      
      if (href && 
          href.includes('.macupdate.com/') && 
          !href.includes('/explore/') && 
          !href.includes('/categories/') &&
          !href.includes('/search') &&
          !href.includes('/about') &&
          !href.includes('/contact') &&
          text.length > 0 && 
          text.length < 100 &&
          !text.includes('MacUpdate') &&
          !text.includes('Download') &&
          !text.includes('Free') &&
          !text.includes('$') &&
          !text.match(/^\d+$/) &&
          !text.includes('Sign in') &&
          !text.includes('Create account') &&
          !text.includes('Categories') &&
          !text.includes('Articles') &&
          !text.includes('Best Apps') &&
          !text.includes('Reviews') &&
          !text.includes('Comparisons') &&
          !text.includes('How To') &&
          !text.includes('About') &&
          !text.includes('Contact') &&
          !text.includes('Help') &&
          !text.includes('Terms') &&
          !text.includes('Privacy') &&
          !text.includes('Cookie') &&
          !text.includes('RSS') &&
          !text.includes('Feed') &&
          !text.includes('Home') &&
          !text.includes('All apps') &&
          !text.includes('Sort by') &&
          !text.includes('Price') &&
          !text.includes('Rating') &&
          !text.includes('MB') &&
          !text.includes('GB') &&
          !text.includes('Join us') &&
          !text.includes('We stand with Ukraine') &&
          !text.includes('Logo') &&
          !text.includes('©') &&
          !text.includes('1997') &&
          !text.includes('Tekkie') &&
          !text.includes('rights reserved') &&
          !text.includes('Add App') &&
          !text.includes('Discontinued Apps') &&
          !text.includes('Add Article') &&
          !text.includes('Terms of Service') &&
          !text.includes('Privacy Policy') &&
          !text.includes('Privacy Settings') &&
          !text.includes('Cookie Policy') &&
          !text.includes('RSS Feed') &&
          !text.includes('Improve your workflow') &&
          !text.includes('life-saving apps') &&
          !text.includes('apps') &&
          !text.includes('July') &&
          !text.includes('2025') &&
          !text.includes('Cross-platform') &&
          !text.includes('code editor') &&
          !text.includes('debugger') &&
          !text.includes('web apps') &&
          !text.includes('Manage the installation') &&
          !text.includes('open source software') &&
          !text.includes('Turn any web apps') &&
          !text.includes('native-like Mac apps') &&
          !text.includes('Simplified front end') &&
          !text.includes('LaTeX') &&
          !text.includes('Open Source universal') &&
          !text.includes('database manager') &&
          !text.includes('Scalable event-driven') &&
          !text.includes('JavaScript runtime') &&
          !text.includes('Xib / Storyboard') &&
          !text.includes('Swift converter') &&
          !text.includes('Synchronize branches') &&
          !text.includes('clone repositories') &&
          !text.includes('Mockup and design') &&
          !text.includes('web pages faster') &&
          !text.includes('WYSIWYG website builder') &&
          !text.includes('Easily deploy') &&
          !text.includes('Drupal Content Management') &&
          !text.includes('Visual web-design tool') &&
          !text.includes('Procedural programming') &&
          !text.includes('language') &&
          !text.includes('Fast and Powerful') &&
          !text.includes('Code Editor') &&
          !text.includes('high-level, open source') &&
          !text.includes('high-performance dynamic') &&
          !text.includes('Intuitive website editor') &&
          !text.includes('fully responsive layout') &&
          !text.includes('Fast and friendly') &&
          !text.includes('git client') &&
          !text.includes('Powerful text and HTML') &&
          !text.includes('editor') &&
          !text.includes('PHP/Node.js Web') &&
          !text.includes('development environment') &&
          !text.includes('no dependencies') &&
          !text.includes('non-intrusive') &&
          !text.includes('Optimize your Azure') &&
          !text.includes('Storage Management') &&
          !text.includes('Sourcing the best') &&
          !text.includes('Mac apps and software') &&
          !text.includes('million users') &&
          !text.includes('since 1997') &&
          !text.includes('1124 apps') &&
          !text.includes('1') &&
          !text.includes('2') &&
          !text.includes('3') &&
          !text.includes('57') &&
          !text.includes('...')
          ) {
        results.appLinks.push(`${text} -> ${href}`)
      }
    })
    
    return NextResponse.json({
      success: true,
      url: testUrl,
      results
    })
    
  } catch (error) {
    console.error('Error debugging category links:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 