import type { NextApiRequest, NextApiResponse } from 'next'

interface ScrapeRatingResponse {
  average: number
  count: number
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScrapeRatingResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ average: 0, count: 0, error: 'Method not allowed' })
  }

  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ average: 0, count: 0, error: 'URL parameter is required' })
  }

  try {
    console.log('Scraping ratings from:', url)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch App Store page: ${response.status}`)
    }

    const html = await response.text()
    
    let average = 0
    let count = 0
    
    // 1. Try to extract from JSON-LD structured data (most reliable)
    const jsonLdMatch = html.match(/"aggregateRating":\s*{[^}]*"ratingValue"\s*:\s*([0-9.]+)[^}]*"reviewCount"\s*:\s*(\d+)/i)
    if (jsonLdMatch) {
      average = parseFloat(jsonLdMatch[1])
      count = parseInt(jsonLdMatch[2])
      console.log('Extracted from JSON-LD:', { average, count })
    }
    
    // 2. Fallback: Extract from figure caption pattern like "4.6 • 151 Ratings"
    if (average === 0 || count === 0) {
      const captionMatch = html.match(/(\d+\.?\d*)\s*[•·]\s*(\d+)\s+Rating/i)
      if (captionMatch) {
        average = average || parseFloat(captionMatch[1])
        count = count || parseInt(captionMatch[2])
        console.log('Extracted from caption:', { average, count })
      }
    }
    
    // 3. Fallback: Extract from "X out of 5" pattern
    if (average === 0) {
      const ratingMatch = html.match(/(\d+\.?\d*)\s+out\s+of\s+5/i)
      if (ratingMatch) {
        average = parseFloat(ratingMatch[1])
        console.log('Extracted rating from "out of 5":', average)
      }
    }
    
    // 4. Fallback: Extract count from standalone "X Ratings" pattern
    if (count === 0) {
      const countMatch = html.match(/(\d+)\s+Rating/i)
      if (countMatch) {
        count = parseInt(countMatch[1])
        console.log('Extracted count from "Ratings":', count)
      }
    }
    
    console.log(`Final scraped ratings: ${average} stars, ${count} ratings`)
    
    return res.status(200).json({ average, count })
  } catch (error) {
    console.error('Error scraping App Store ratings:', error)
    return res.status(500).json({ 
      average: 0, 
      count: 0, 
      error: error instanceof Error ? error.message : 'Failed to scrape ratings' 
    })
  }
} 