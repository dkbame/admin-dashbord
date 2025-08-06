interface iTunesSearchResult {
  trackId: number
  trackName: string
  artistName: string
  trackViewUrl: string
  artworkUrl100: string
  price: number
  currency: string
  averageUserRating: number
  userRatingCount: number
  description: string
  releaseNotes: string
  fileSizeBytes: string
  minimumOsVersion: string
  genres: string[]
  screenshotUrls: string[]
}

interface iTunesSearchResponse {
  resultCount: number
  results: iTunesSearchResult[]
}

interface MatchResult {
  found: boolean
  confidence: number
  masId?: string
  masUrl?: string
  itunesData?: iTunesSearchResult
  error?: string
}

export class iTunesMatchingService {
  private static readonly BASE_URL = 'https://itunes.apple.com/search'
  private static readonly RATE_LIMIT_DELAY = 1000 // 1 second between requests

  /**
   * Search iTunes API for a Mac app
   */
  static async searchApp(appName: string, developerName?: string): Promise<MatchResult> {
    try {
      console.log(`Searching iTunes for: "${appName}" by ${developerName || 'unknown'}`)
      
      // Build search query
      const searchTerm = encodeURIComponent(appName)
      const url = `${this.BASE_URL}?term=${searchTerm}&entity=macSoftware&country=us&limit=10`
      
      console.log(`iTunes API URL: ${url}`)
      
      const response = await fetch(url)
      const data: iTunesSearchResponse = await response.json()
      
      console.log(`iTunes API response: ${data.resultCount} results`)
      
      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status}`)
      }
      
      if (data.resultCount === 0) {
        return {
          found: false,
          confidence: 0,
          error: 'No results found'
        }
      }
      
      // Find the best match using strict criteria
      const bestMatch = this.findBestMatch(data.results, appName, developerName)
      
      if (bestMatch) {
        const masId = bestMatch.result.trackId.toString()
        const masUrl = bestMatch.result.trackViewUrl
        
        console.log(`✅ Found match: ${bestMatch.result.trackName} by ${bestMatch.result.artistName}`)
        console.log(`MAS ID: ${masId}, URL: ${masUrl}`)
        
        return {
          found: true,
          confidence: bestMatch.confidence,
          masId,
          masUrl,
          itunesData: bestMatch.result
        }
      }
      
      return {
        found: false,
        confidence: 0,
        error: 'No high-confidence match found'
      }
      
    } catch (error) {
      console.error('iTunes API error:', error)
      return {
        found: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Find the best match using strict criteria
   */
  private static findBestMatch(
    results: iTunesSearchResult[], 
    appName: string, 
    developerName?: string
  ): { result: iTunesSearchResult; confidence: number } | null {
    
    console.log(`Analyzing ${results.length} results for "${appName}"`)
    
    let bestMatch: { result: iTunesSearchResult; confidence: number } | null = null
    let highestConfidence = 0
    
    for (const result of results) {
      const confidence = this.calculateConfidence(result, appName, developerName)
      
      console.log(`Result: "${result.trackName}" by "${result.artistName}" - Confidence: ${confidence}`)
      
      if (confidence > highestConfidence) {
        highestConfidence = confidence
        bestMatch = { result, confidence }
      }
    }
    
    // Only return if confidence is 95% or higher
    if (bestMatch && bestMatch.confidence >= 0.95) {
      console.log(`✅ High-confidence match found: ${bestMatch.confidence}`)
      return bestMatch
    }
    
    console.log(`❌ No high-confidence match found. Best was: ${highestConfidence}`)
    return null
  }

  /**
   * Calculate confidence score (0-1) for a match
   */
  private static calculateConfidence(
    result: iTunesSearchResult, 
    appName: string, 
    developerName?: string
  ): number {
    let score = 0
    
    // Name matching (60% weight)
    const nameScore = this.calculateNameSimilarity(result.trackName, appName)
    score += nameScore * 0.6
    
    // Developer matching (40% weight)
    if (developerName) {
      const developerScore = this.calculateNameSimilarity(result.artistName, developerName)
      score += developerScore * 0.4
    } else {
      // If no developer name, give full weight to name matching
      score += nameScore * 0.4
    }
    
    return Math.min(score, 1.0)
  }

  /**
   * Calculate similarity between two names
   */
  private static calculateNameSimilarity(name1: string, name2: string): number {
    const clean1 = this.cleanName(name1)
    const clean2 = this.cleanName(name2)
    
    // Exact match
    if (clean1 === clean2) {
      return 1.0
    }
    
    // Contains match (one name contains the other)
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return 0.9
    }
    
    // Word-by-word comparison
    const words1 = clean1.split(' ').filter(w => w.length > 0)
    const words2 = clean2.split(' ').filter(w => w.length > 0)
    
    if (words1.length === 0 || words2.length === 0) {
      return 0.0
    }
    
    const commonWords = words1.filter(word1 => 
      words2.some(word2 => word1 === word2)
    ).length
    
    const totalWords = Math.max(words1.length, words2.length)
    return commonWords / totalWords
  }

  /**
   * Clean name for comparison
   */
  private static cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Rate limiting delay
   */
  static async delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY))
  }
} 