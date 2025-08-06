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
  private static readonly RATE_LIMIT_DELAY = 200 // Reduced from 1000ms to 200ms

  /**
   * Search iTunes API for a Mac app
   */
  static async searchApp(appName: string, developerName?: string): Promise<MatchResult> {
    try {
      // Clean the app name by removing "For Mac" suffix
      const cleanAppName = this.cleanAppName(appName)
      console.log(`Searching iTunes for: "${cleanAppName}" (original: "${appName}") by ${developerName || 'unknown'}`)
      
      // Build search query
      const searchTerm = encodeURIComponent(cleanAppName)
      const url = `${this.BASE_URL}?term=${searchTerm}&entity=macSoftware&country=us&limit=10`
      
      console.log(`iTunes API URL: ${url}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      try {
        const response = await fetch(url, {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`iTunes API error: ${response.status}`)
        }
        
        let data: iTunesSearchResponse
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError)
          throw new Error('Invalid JSON response from iTunes API')
        }
        
        console.log(`iTunes API response: ${data.resultCount} results`)
        
        if (data.resultCount === 0) {
          return {
            found: false,
            confidence: 0,
            error: 'No results found'
          }
        }
        
        // Find the best match using strict criteria
        const bestMatch = this.findBestMatch(data.results, cleanAppName, developerName)
        
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
        
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('iTunes API request timed out')
        }
        throw fetchError
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
    
    // Only return if confidence is 80% or higher (reduced from 95%)
    if (bestMatch && bestMatch.confidence >= 0.8) {
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
    
    // Name matching (70% weight)
    const nameScore = this.calculateNameSimilarity(result.trackName, appName)
    score += nameScore * 0.7
    
    // Developer matching (30% weight)
    if (developerName) {
      const developerScore = this.calculateNameSimilarity(result.artistName, developerName)
      score += developerScore * 0.3
    } else {
      // If no developer name, give full weight to name matching
      score += nameScore * 0.3
    }
    
    // Bonus for exact name matches
    if (this.cleanName(result.trackName) === this.cleanName(appName)) {
      score += 0.2 // 20% bonus for exact name match
    }
    
    // Bonus for exact developer matches
    if (developerName && this.cleanName(result.artistName) === this.cleanName(developerName)) {
      score += 0.1 // 10% bonus for exact developer match
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
      return 0.95
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
    const wordSimilarity = commonWords / totalWords
    
    // If we have at least 50% word similarity, boost the score
    if (wordSimilarity >= 0.5) {
      return Math.min(wordSimilarity + 0.2, 1.0)
    }
    
    return wordSimilarity
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
   * Clean app name by removing "For Mac" suffix
   */
  private static cleanAppName(appName: string): string {
    return appName
      .replace(/\s+for\s+mac$/i, '') // Remove "For Mac" suffix
      .replace(/\s+for\s+macos$/i, '') // Remove "For macOS" suffix
      .replace(/\s+mac\s+version$/i, '') // Remove "Mac Version" suffix
      .trim()
  }

  /**
   * Rate limiting delay
   */
  static async delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY))
  }
} 