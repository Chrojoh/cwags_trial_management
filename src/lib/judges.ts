// src/lib/judges.ts
// Judge utilities for C-WAGS Trial Management System
// Supporting functions for judge selection and management

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Judge interface matching database structure
export interface Judge {
  id: string;
  first_name: string;
  last_name: string;
  city: string;
  state_province: string;
  country: string;
  email: string;
  phone?: string;
  obedience_levels: string[];
  rally_levels: string[];
  games_levels: string[];
  scent_levels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Judge search filters
export interface JudgeFilters {
  country?: string;
  state_province?: string;
  city?: string;
  specialization?: 'obedience' | 'rally' | 'games' | 'scent';
  level?: string;
  is_active?: boolean;
  search_term?: string; // For name/email search
}

/**
 * Get all active judges
 */
export async function getActiveJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('is_active', true)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error fetching active judges:', error);
    throw new Error('Failed to fetch judges');
  }

  return data || [];
}

/**
 * Get judges by specialization and level
 */
export async function getJudgesBySpecialization(
  specialization: 'obedience' | 'rally' | 'games' | 'scent',
  level?: string
): Promise<Judge[]> {
  let query = supabase
    .from('judges')
    .select('*')
    .eq('is_active', true);

  // Filter by specialization
  const columnMap = {
    obedience: 'obedience_levels',
    rally: 'rally_levels',
    games: 'games_levels',
    scent: 'scent_levels'
  };

  const column = columnMap[specialization];
  
  if (level) {
    // Check if the specific level is in the array
    query = query.contains(column, [level]);
  } else {
    // Check if the array is not empty
    query = query.not(column, 'is', null);
  }

  query = query
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching judges by specialization:', error);
    throw new Error('Failed to fetch judges');
  }

  return data || [];
}

/**
 * Get judges by geographic location
 */
export async function getJudgesByLocation(
  country?: string,
  state_province?: string,
  city?: string
): Promise<Judge[]> {
  let query = supabase
    .from('judges')
    .select('*')
    .eq('is_active', true);

  if (country) {
    query = query.eq('country', country);
  }
  if (state_province) {
    query = query.eq('state_province', state_province);
  }
  if (city) {
    query = query.eq('city', city);
  }

  query = query
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching judges by location:', error);
    throw new Error('Failed to fetch judges');
  }

  return data || [];
}

/**
 * Search judges by name or email
 */
export async function searchJudges(searchTerm: string): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('is_active', true)
    .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    console.error('Error searching judges:', error);
    throw new Error('Failed to search judges');
  }

  return data || [];
}

/**
 * Get judge by ID
 */
export async function getJudgeById(id: string): Promise<Judge | null> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No judge found
    }
    console.error('Error fetching judge by ID:', error);
    throw new Error('Failed to fetch judge');
  }

  return data;
}

/**
 * Get unique countries from judges
 */
export async function getJudgeCountries(): Promise<string[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('country')
    .eq('is_active', true)
    .order('country');

  if (error) {
    console.error('Error fetching judge countries:', error);
    throw new Error('Failed to fetch countries');
  }

  // Remove duplicates and return sorted array
  const countries = [...new Set(data?.map(item => item.country) || [])];
  return countries.sort();
}