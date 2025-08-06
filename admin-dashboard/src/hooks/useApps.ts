'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Screenshot {
  id: string
  url: string
  caption: string
  display_order: number
}

interface App {
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

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number | null
  prevPage: number | null
}

interface AppsResponse {
  apps: App[]
  pagination: PaginationInfo
  error?: string
}

export function useApps() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Pagination and filtering state
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchApps = async (page: number = 1, category: string = 'all', search: string = '') => {
    try {
      console.log('Fetching apps from API with pagination and filters...')
      console.log('Params:', { page, category, search })
      
      // Build query parameters
      const params = new URLSearchParams()
      if (page > 1) params.append('page', page.toString())
      if (category && category !== 'all') params.append('category', category)
      if (search) params.append('search', search)
      
      const url = `/api/apps${params.toString() ? `?${params.toString()}` : ''}`
      console.log('API URL:', url)
      
      const response = await fetch(url)
      const data: AppsResponse = await response.json()
      
      console.log('API Response:', {
        appsCount: data.apps?.length || 0,
        pagination: data.pagination
      })

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch apps')
      }

      if (!data.apps) {
        console.warn('No apps data returned from API')
        setApps([])
        setPagination(null)
        return
      }

      // Properly type the response data and handle price field
      const typedData = (data.apps || []).map(item => ({
        ...item,
        price: item.price || '0',
        category: Array.isArray(item.category) ? item.category[0] : item.category
      })) as App[]
      
      console.log('Processed apps data:', typedData)
      console.log('Final apps count to set in state:', typedData.length)
      
      setApps(typedData)
      setPagination(data.pagination)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error in fetchApps:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch apps')
    } finally {
      setLoading(false)
    }
  }

  // Fetch apps with current filters
  const fetchAppsWithCurrentFilters = () => {
    return fetchApps(currentPage, selectedCategory, searchTerm)
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchApps(newPage, selectedCategory, searchTerm)
  }

  // Handle category filter change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setCurrentPage(1) // Reset to first page when changing filters
    fetchApps(1, category, searchTerm)
  }

  // Handle search term change
  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    setCurrentPage(1) // Reset to first page when changing filters
    fetchApps(1, selectedCategory, search)
  }

  // Simple fetch on mount (real-time subscriptions can be added later)
  useEffect(() => {
    fetchAppsWithCurrentFilters()
  }, [])

  const toggleFeatured = async (appId: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('apps')
        .update({ is_featured: !currentFeatured })
        .eq('id', appId)

      if (error) throw error
      await fetchAppsWithCurrentFilters() // Refresh the list with current filters
    } catch (err) {
      console.error('Error toggling featured status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update featured status')
    }
  }

  const deleteApp = async (appId: string) => {
    try {
      console.log('Attempting to delete app with ID:', appId)
      
      // First, let's check if the app exists before deletion
      const { data: existingApp, error: checkError } = await supabase
        .from('apps')
        .select('id, name')
        .eq('id', appId)
        .single()

      console.log('App exists check:', { existingApp, checkError })

      if (checkError) {
        console.error('Error checking if app exists:', checkError)
        throw new Error('App not found')
      }

      if (!existingApp) {
        throw new Error('App not found')
      }

      // Now attempt the deletion
      const { data, error } = await supabase
        .from('apps')
        .delete()
        .eq('id', appId)
        .select()

      console.log('Delete response:', { data, error })

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }

      console.log('App deleted successfully:', data)
      
      // Force immediate refresh without verification
      console.log('Forcing immediate refresh...')
      await fetchAppsWithCurrentFilters() // Refresh with current filters
      
      // Add a second refresh after a short delay to ensure consistency
      setTimeout(async () => {
        console.log('Performing delayed refresh...')
        await fetchAppsWithCurrentFilters()
      }, 1000)
      
      // Add a third refresh after a longer delay to handle any caching issues
      setTimeout(async () => {
        console.log('Performing final refresh to clear any cache...')
        await fetchAppsWithCurrentFilters()
      }, 2000)
    } catch (err) {
      console.error('Error deleting app:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete app')
      throw err // Re-throw to let the calling component handle it
    }
  }

  // Separate function for single app deletion (simplified)
  const deleteSingleApp = async (appId: string) => {
    try {
      console.log('Single delete: Attempting to delete app with ID:', appId)
      
      // Simple delete without complex verification
      const { error } = await supabase
        .from('apps')
        .delete()
        .eq('id', appId)

      if (error) {
        console.error('Single delete error:', error)
        throw error
      }

      console.log('Single delete: App deleted successfully')
      
      // Simple refresh with current filters
      await fetchAppsWithCurrentFilters()
    } catch (err) {
      console.error('Single delete error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete app')
      throw err
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    apps,
    loading,
    error,
    lastUpdate,
    pagination,
    currentPage,
    selectedCategory,
    searchTerm,
    fetchApps: fetchAppsWithCurrentFilters,
    handlePageChange,
    handleCategoryChange,
    handleSearchChange,
    toggleFeatured,
    deleteApp,
    deleteSingleApp,
    clearError
  }
} 