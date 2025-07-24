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
      setApps(typedData)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error in fetchApps:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch apps')
    } finally {
      setLoading(false)
    }
  }

  // Real-time subscription setup
  useEffect(() => {
    // Initial fetch
    fetchApps()

    // Set up real-time subscription
    const channel = supabase
      .channel('apps-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apps'
        },
        (payload) => {
          console.log('Real-time apps change:', payload)
          
          // Handle different types of changes
          switch (payload.eventType) {
            case 'INSERT':
              // New app added - refresh the list
              fetchApps()
              break
            case 'UPDATE':
              // App updated - refresh the list
              fetchApps()
              break
            case 'DELETE':
              // App deleted - refresh the list
              fetchApps()
              break
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screenshots'
        },
        (payload) => {
          console.log('Real-time screenshots change:', payload)
          // Refresh apps when screenshots change
          fetchApps()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const toggleFeatured = async (appId: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('apps')
        .update({ is_featured: !currentFeatured })
        .eq('id', appId)

      if (error) throw error
      // No need to manually fetch - real-time subscription will handle it
    } catch (err) {
      console.error('Error toggling featured status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update featured status')
    }
  }

  const deleteApp = async (appId: string) => {
    try {
      const { error } = await supabase
        .from('apps')
        .delete()
        .eq('id', appId)

      if (error) throw error
      // No need to manually fetch - real-time subscription will handle it
    } catch (err) {
      console.error('Error deleting app:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete app')
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