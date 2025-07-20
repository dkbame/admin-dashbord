import {
  formatDate,
  formatDateTime,
  formatRelativeDate,
  formatFileSize,
  formatPrice,
  formatRating,
  truncateText,
  capitalizeFirstLetter,
  isValidURL,
  formatVersion,
  isValidEmail,
  isValidSlug
} from '@/utils/formatters'

describe('Date Formatters', () => {
  it('formats date correctly', () => {
    const dateString = '2024-03-20T10:30:00Z'
    const result = formatDate(dateString)
    expect(result).toBe('Mar 20, 2024')
  })

  it('handles null date', () => {
    const result = formatDate(null)
    expect(result).toBe('Unknown')
  })

  it('formats date time correctly', () => {
    const dateString = '2024-03-20T10:30:00Z'
    const result = formatDateTime(dateString)
    expect(result).toMatch(/Mar 20, 2024/)
  })

  it('formats relative date correctly', () => {
    const today = new Date().toISOString()
    const result = formatRelativeDate(today)
    expect(result).toBe('Today')
  })
})

describe('File Size Formatters', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1048576)).toBe('1.0 MB')
    expect(formatFileSize(1073741824)).toBe('1.0 GB')
  })

  it('handles zero and null', () => {
    expect(formatFileSize(0)).toBe('Unknown')
    expect(formatFileSize(null)).toBe('Unknown')
  })
})

describe('Price Formatters', () => {
  it('formats price correctly', () => {
    expect(formatPrice(9.99)).toBe('$9.99')
    expect(formatPrice(0)).toBe('Free')
    expect(formatPrice('0')).toBe('Free')
  })

  it('handles different currencies', () => {
    expect(formatPrice(9.99, 'EUR')).toBe('€9.99')
  })
})

describe('Rating Formatters', () => {
  it('formats rating correctly', () => {
    expect(formatRating(4.5)).toBe('4.5')
    expect(formatRating(0)).toBe('No rating')
    expect(formatRating(null)).toBe('No rating')
  })
})

describe('Text Formatters', () => {
  it('truncates text correctly', () => {
    const longText = 'This is a very long text that needs to be truncated'
    const result = truncateText(longText, 20)
    expect(result).toBe('This is a very long...')
  })

  it('capitalizes first letter', () => {
    expect(capitalizeFirstLetter('hello world')).toBe('Hello world')
    expect(capitalizeFirstLetter('')).toBe('')
  })
})

describe('URL Formatters', () => {
  it('validates URLs correctly', () => {
    expect(isValidURL('https://example.com')).toBe(true)
    expect(isValidURL('http://example.com')).toBe(true)
    expect(isValidURL('invalid-url')).toBe(false)
    expect(isValidURL(null)).toBe(false)
  })
})

describe('Version Formatters', () => {
  it('formats version correctly', () => {
    expect(formatVersion('1.2.3')).toBe('v1.2.3')
    expect(formatVersion(null)).toBe('Unknown')
  })
})

describe('Validation Functions', () => {
  it('validates email correctly', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
  })

  it('validates slug correctly', () => {
    expect(isValidSlug('valid-slug')).toBe(true)
    expect(isValidSlug('valid_slug')).toBe(false)
    expect(isValidSlug('Invalid-Slug')).toBe(false)
    expect(isValidSlug('slug-with-123')).toBe(true)
  })
}) 