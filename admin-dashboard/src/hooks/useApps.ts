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
    } catch (err) {
      console.error('Error in fetchApps:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch apps')
    } finally {
      setLoading(false)
    }
  }

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
      
      // First, verify the app exists
      const { data: existingApp, error: fetchError } = await supabase
        .from('apps')
        .select('id, name')
        .eq('id', appId)
        .single()
      
      if (fetchError) {
        console.error('Error fetching app before deletion:', fetchError)
        throw new Error('App not found')
      }
      
      // Delete the app using the SQL function (bypasses RLS)
      const { error: sqlError } = await supabase.rpc('delete_app_by_id', { target_app_id: appId })
      
      if (sqlError) {
        console.error('SQL function delete failed:', sqlError)
        
        // Fallback to regular delete method
        const { error: deleteError } = await supabase
          .from('apps')
          .delete()
          .eq('id', appId)
        
        if (deleteError) {
          throw new Error(`Both SQL function and regular delete failed. SQL: ${sqlError.message}, Regular: ${deleteError.message}`)
        }
      }

      // Verify the app was actually deleted
      const { data: deletedApp } = await supabase
        .from('apps')
        .select('id')
        .eq('id', appId)
      
      if (deletedApp && deletedApp.length > 0) {
        throw new Error('App was not deleted from database - possible RLS or constraint issue')
      }

      console.log('App deleted successfully, refreshing list...')
      await fetchApps()
    } catch (err) {
      console.error('Error in deleteApp:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchApps()
  }, [])

  return {
    apps,
    loading,
    error,
    fetchApps,
    toggleFeatured,
    deleteApp,
    clearError: () => setError(null)
  }
} 