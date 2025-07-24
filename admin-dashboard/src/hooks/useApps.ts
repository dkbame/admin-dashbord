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

export function useApps() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchApps = async () => {
    try {
      console.log('Fetching apps from Supabase...')
      
      const { data, error } = await supabase
        .from('apps')
        .select(`
          id,
          name,
          developer,
          category:categories!apps_category_id_fkey (name),
          price,
          is_on_mas,
          status,
          icon_url,
          is_featured,
          is_free,
          screenshots:screenshots!fk_app (
            id,
            url,
            caption,
            display_order
          )
        `)
        .order('created_at', { ascending: false })

      console.log('Supabase apps data:', data)
      console.log('Supabase apps error:', error)
      console.log('Apps count from database:', data?.length || 0)

      if (error) {
        console.error('Supabase query error:', error)
        throw error
      }

      if (!data) {
        console.warn('No data returned from Supabase')
        setApps([])
        return
      }

      // Properly type the response data and handle price field
      const typedData = (data || []).map(item => ({
        ...item,
        price: item.price || '0',
        category: Array.isArray(item.category) ? item.category[0] : item.category
      })) as App[]
      
      console.log('Processed apps data:', typedData)
      console.log('Final apps count to set in state:', typedData.length)
      setApps(typedData)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error in fetchApps:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch apps')
    } finally {
      setLoading(false)
    }
  }

  // Simple fetch on mount (real-time subscriptions can be added later)
  useEffect(() => {
    fetchApps()
  }, [])

  const toggleFeatured = async (appId: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('apps')
        .update({ is_featured: !currentFeatured })
        .eq('id', appId)

      if (error) throw error
      await fetchApps() // Refresh the list
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
      await fetchApps() // Refresh the list immediately
      
      // Add a second refresh after a short delay to ensure consistency
      setTimeout(async () => {
        console.log('Performing delayed refresh...')
        await fetchApps()
      }, 1000)
      
      // Add a third refresh after a longer delay to handle any caching issues
      setTimeout(async () => {
        console.log('Performing final refresh to clear any cache...')
        await fetchApps()
      }, 2000)
    } catch (err) {
      console.error('Error deleting app:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete app')
      throw err // Re-throw to let the calling component handle it
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
    fetchApps,
    toggleFeatured,
    deleteApp,
    clearError
  }
} 