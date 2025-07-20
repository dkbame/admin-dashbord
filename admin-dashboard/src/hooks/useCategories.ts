'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Category } from '@/types/app'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        throw error
      }

      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async (categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('categories')
        .insert([categoryData])
        .select()
        .single()

      if (error) {
        throw error
      }

      setCategories(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error creating category:', err)
      setError(err instanceof Error ? err.message : 'Failed to create category')
      throw err
    }
  }

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setCategories(prev => prev.map(cat => cat.id === id ? data : cat))
      return data
    } catch (err) {
      console.error('Error updating category:', err)
      setError(err instanceof Error ? err.message : 'Failed to update category')
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      setError(null)
      
      // Check if category has associated apps
      const { data: apps, error: appsError } = await supabase
        .from('apps')
        .select('id')
        .eq('category_id', id)
        .limit(1)

      if (appsError) {
        throw appsError
      }

      if (apps && apps.length > 0) {
        throw new Error('Cannot delete category with associated apps')
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      setCategories(prev => prev.filter(cat => cat.id !== id))
    } catch (err) {
      console.error('Error deleting category:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete category')
      throw err
    }
  }

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(cat => cat.id === id)
  }

  const getCategoryByName = (name: string): Category | undefined => {
    return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase())
  }

  const getCategoryStats = () => {
    return {
      total: categories.length,
      withDescription: categories.filter(cat => cat.description).length,
      withoutDescription: categories.filter(cat => !cat.description).length
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryByName,
    getCategoryStats,
    clearError: () => setError(null)
  }
}

// MARK: - Category Validation
export function validateCategoryData(data: {
  name: string
  slug: string
  description?: string
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.name.trim()) {
    errors.push('Category name is required')
  }

  if (!data.slug.trim()) {
    errors.push('Category slug is required')
  } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push('Category slug must contain only lowercase letters, numbers, and hyphens')
  }

  if (data.name.length > 100) {
    errors.push('Category name must be less than 100 characters')
  }

  if (data.slug.length > 50) {
    errors.push('Category slug must be less than 50 characters')
  }

  if (data.description && data.description.length > 500) {
    errors.push('Category description must be less than 500 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// MARK: - Category Utilities
export function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

export function formatCategoryName(name: string): string {
  return name
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function getCategoryIcon(categoryName: string): string {
  const name = categoryName.toLowerCase()
  
  if (name.includes('productivity') || name.includes('business')) {
    return 'work'
  }
  if (name.includes('game') || name.includes('entertainment')) {
    return 'sports_esports'
  }
  if (name.includes('photo') || name.includes('video') || name.includes('media')) {
    return 'photo_camera'
  }
  if (name.includes('music') || name.includes('audio')) {
    return 'music_note'
  }
  if (name.includes('social') || name.includes('communication')) {
    return 'people'
  }
  if (name.includes('education') || name.includes('learning')) {
    return 'school'
  }
  if (name.includes('health') || name.includes('fitness')) {
    return 'favorite'
  }
  if (name.includes('finance') || name.includes('money')) {
    return 'account_balance'
  }
  if (name.includes('travel') || name.includes('navigation')) {
    return 'flight'
  }
  if (name.includes('food') || name.includes('recipe')) {
    return 'restaurant'
  }
  if (name.includes('weather')) {
    return 'wb_sunny'
  }
  if (name.includes('news')) {
    return 'article'
  }
  
  return 'category'
} 