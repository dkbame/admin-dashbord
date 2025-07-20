// App-related types for the admin dashboard

export interface Screenshot {
  id: string
  url: string
  caption: string
  display_order: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  created_at: string
  updated_at: string
}

export interface App {
  id: string
  name: string
  developer: string
  description?: string
  category_id: string
  category?: Category
  price: string | number | null
  currency: string
  is_on_mas: boolean
  mas_id?: string
  mas_url?: string
  download_url?: string
  website_url?: string
  icon_url?: string
  minimum_os_version?: string
  features: string[]
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE'
  screenshots: Screenshot[]
  is_featured: boolean | null
  is_free: boolean | null
  version?: string
  size?: number
  rating?: number
  rating_count?: number
  release_date?: string
  last_updated?: string
  created_at: string
  updated_at: string
  source: string
}

export interface AppFormData {
  name: string
  developer: string
  description: string
  category_id: string
  price: string | number | null
  currency: string
  is_on_mas: boolean
  mas_id?: string
  mas_url?: string
  download_url?: string
  website_url?: string
  icon_url?: string
  minimum_os_version?: string
  features: string[]
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE'
  version?: string
  size?: number
  rating?: number
  rating_count?: number
  release_date?: string
}

export interface AppListItem {
  id: string
  name: string
  developer: string
  category: { name: string }
  price: string | number | null
  is_on_mas: boolean
  status: string
  icon_url: string | null
  screenshots: Screenshot[]
  is_featured: boolean | null
  is_free: boolean | null
}

export interface AppStats {
  total: number
  active: number
  pending: number
  inactive: number
  featured: number
  free: number
  paid: number
  masApps: number
  customApps: number
}

export interface AppFilters {
  status?: string
  category?: string
  featured?: boolean
  isFree?: boolean
  source?: string
  search?: string
}

export interface AppSortOptions {
  field: 'name' | 'developer' | 'created_at' | 'updated_at' | 'rating' | 'price'
  direction: 'asc' | 'desc'
}

export interface AppBulkAction {
  type: 'delete' | 'activate' | 'deactivate' | 'feature' | 'unfeature'
  appIds: string[]
}

export interface AppImportResult {
  success: boolean
  message: string
  importedCount?: number
  errors?: string[]
}

export interface AppExportOptions {
  format: 'csv' | 'json' | 'xlsx'
  includeScreenshots: boolean
  filters?: AppFilters
}

export interface AppValidationError {
  field: string
  message: string
}

export interface AppValidationResult {
  isValid: boolean
  errors: AppValidationError[]
}

// Utility types
export type AppStatus = 'ACTIVE' | 'PENDING' | 'INACTIVE'
export type AppSource = 'MAS' | 'CUSTOM' | 'IMPORTED'
export type AppCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'

// Constants
export const APP_STATUSES: AppStatus[] = ['ACTIVE', 'PENDING', 'INACTIVE']
export const APP_SOURCES: AppSource[] = ['MAS', 'CUSTOM', 'IMPORTED']
export const APP_CURRENCIES: AppCurrency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']

export const APP_STATUS_LABELS: Record<AppStatus, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  INACTIVE: 'Inactive'
}

export const APP_SOURCE_LABELS: Record<AppSource, string> = {
  MAS: 'Mac App Store',
  CUSTOM: 'Custom',
  IMPORTED: 'Imported'
}

export const APP_CURRENCY_LABELS: Record<AppCurrency, string> = {
  USD: 'US Dollar ($)',
  EUR: 'Euro (€)',
  GBP: 'British Pound (£)',
  CAD: 'Canadian Dollar (C$)',
  AUD: 'Australian Dollar (A$)'
}

// Helper functions
export function getAppStatusColor(status: AppStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'INACTIVE':
      return 'error'
    default:
      return 'default'
  }
}

export function getAppSourceColor(source: AppSource): string {
  switch (source) {
    case 'MAS':
      return 'primary'
    case 'CUSTOM':
      return 'secondary'
    case 'IMPORTED':
      return 'info'
    default:
      return 'default'
  }
}

export function formatAppPrice(price: string | number | null): string {
  if (price === '0' || price === '' || price === null || price === 0) {
    return 'Free'
  }
  return `$${String(price || '0.00')}`
}

export function validateAppForm(data: AppFormData): AppValidationResult {
  const errors: AppValidationError[] = []

  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'App name is required' })
  }

  if (!data.developer.trim()) {
    errors.push({ field: 'developer', message: 'Developer name is required' })
  }

  if (!data.category_id) {
    errors.push({ field: 'category_id', message: 'Category is required' })
  }

  if (data.is_on_mas && !data.mas_id?.trim()) {
    errors.push({ field: 'mas_id', message: 'Mac App Store ID is required for MAS apps' })
  }

  if (data.price !== null && data.price !== '' && isNaN(Number(data.price))) {
    errors.push({ field: 'price', message: 'Price must be a valid number' })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
} 