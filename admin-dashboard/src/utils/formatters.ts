// Utility functions for formatting data in the admin dashboard

// MARK: - Date Formatting
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return 'Invalid Date'
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid Date'
  }
}

export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
    
    return `${Math.floor(diffInDays / 365)} years ago`
  } catch {
    return 'Invalid Date'
  }
}

// MARK: - File Size Formatting
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return 'Unknown'
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  if (i === 0) return `${bytes} ${sizes[i]}`
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export function formatFileSizeDetailed(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return 'Unknown'
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  if (i === 0) return `${bytes.toLocaleString()} ${sizes[i]}`
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]} (${bytes.toLocaleString()} bytes)`
}

// MARK: - Price Formatting
export function formatPrice(price: string | number | null | undefined, currency: string = 'USD'): string {
  if (!price || price === '0' || price === 0) return 'Free'
  
  const priceNumber = typeof price === 'string' ? parseFloat(price) : price
  
  if (isNaN(priceNumber)) return 'Invalid Price'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(priceNumber)
}

export function formatPriceRange(minPrice: string | number | null, maxPrice: string | number | null, currency: string = 'USD'): string {
  const minFormatted = formatPrice(minPrice, currency)
  const maxFormatted = formatPrice(maxPrice, currency)
  
  if (minFormatted === maxFormatted) return minFormatted
  
  return `${minFormatted} - ${maxFormatted}`
}

// MARK: - Rating Formatting
export function formatRating(rating: number | null | undefined): string {
  if (!rating || rating === 0) return 'No rating'
  return rating.toFixed(1)
}

export function formatRatingCount(count: number | null | undefined): string {
  if (!count || count === 0) return ''
  
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`
  }
  
  return count.toLocaleString()
}

export function formatRatingWithCount(rating: number | null | undefined, count: number | null | undefined): string {
  const ratingText = formatRating(rating)
  const countText = formatRatingCount(count)
  
  if (!countText) return ratingText
  
  return `${ratingText} (${countText})`
}

// MARK: - Text Formatting
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + suffix
}

export function capitalizeFirstLetter(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function formatAppName(name: string): string {
  return capitalizeFirstLetter(name)
}

export function formatDeveloperName(name: string): string {
  return capitalizeFirstLetter(name)
}

// MARK: - URL Formatting
export function isValidURL(urlString: string | null | undefined): boolean {
  if (!urlString) return false
  
  try {
    new URL(urlString)
    return true
  } catch {
    return false
  }
}

export function formatURL(urlString: string | null | undefined): string {
  if (!urlString || !isValidURL(urlString)) return ''
  
  try {
    const url = new URL(urlString)
    return url.hostname + url.pathname
  } catch {
    return urlString
  }
}

export function getDomainFromURL(urlString: string | null | undefined): string {
  if (!urlString || !isValidURL(urlString)) return ''
  
  try {
    const url = new URL(urlString)
    return url.hostname
  } catch {
    return ''
  }
}

// MARK: - Version Formatting
export function formatVersion(version: string | null | undefined): string {
  if (!version) return 'Unknown'
  return `v${version}`
}

export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number)
  const v2Parts = version2.split('.').map(Number)
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length)
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0
    const v2Part = v2Parts[i] || 0
    
    if (v1Part < v2Part) return -1
    if (v1Part > v2Part) return 1
  }
  
  return 0
}

// MARK: - Status Formatting
export function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown'
  
  const statusMap: Record<string, string> = {
    'ACTIVE': 'Active',
    'PENDING': 'Pending',
    'INACTIVE': 'Inactive',
    'DRAFT': 'Draft'
  }
  
  return statusMap[status.toUpperCase()] || capitalizeFirstLetter(status)
}

export function getStatusColor(status: string | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (!status) return 'default'
  
  const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    'ACTIVE': 'success',
    'PENDING': 'warning',
    'INACTIVE': 'error',
    'DRAFT': 'default'
  }
  
  return statusColors[status.toUpperCase()] || 'default'
}

// MARK: - Source Formatting
export function formatSource(source: string | null | undefined): string {
  if (!source) return 'Unknown'
  
  const sourceMap: Record<string, string> = {
    'MAS': 'Mac App Store',
    'MAC_APP_STORE': 'Mac App Store',
    'CUSTOM': 'Custom',
    'IMPORTED': 'Imported'
  }
  
  return sourceMap[source.toUpperCase()] || capitalizeFirstLetter(source)
}

export function getSourceColor(source: string | null | undefined): 'primary' | 'secondary' | 'info' | 'default' {
  if (!source) return 'default'
  
  const sourceColors: Record<string, 'primary' | 'secondary' | 'info' | 'default'> = {
    'MAS': 'primary',
    'MAC_APP_STORE': 'primary',
    'CUSTOM': 'secondary',
    'IMPORTED': 'info'
  }
  
  return sourceColors[source.toUpperCase()] || 'default'
}

// MARK: - Number Formatting
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0'
  return num.toLocaleString()
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

// MARK: - Time Formatting
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

// MARK: - Currency Formatting
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

// MARK: - Validation Helpers
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]+$/
  return slugRegex.test(slug)
} 