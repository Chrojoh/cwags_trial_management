// src/lib/judges.ts
// Judge utilities for C-WAGS Trial Management System

import { createClient } from '@supabase/supabase-js';
import type { Judge, JudgeFormData } from '../types/judge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get all judges
 */
export async function getAllJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching judges:', error);
    throw new Error('Failed to fetch judges');
  }

  return data || [];
}

/**
 * Get all active judges
 */
export async function getActiveJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching active judges:', error);
    throw new Error('Failed to fetch judges');
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
      return null;
    }
    console.error('Error fetching judge by ID:', error);
    throw new Error('Failed to fetch judge');
  }

  return data;
}

/**
 * Create a new judge
 */
export async function createJudge(formData: JudgeFormData): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .insert([{
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      city: formData.city || null,
      province_state: formData.province_state || null,
      country: formData.country || null,
      obedience_levels: formData.obedience_levels,
      rally_levels: formData.rally_levels,
      games_levels: formData.games_levels,
      scent_levels: formData.scent_levels,
      is_active: formData.is_active
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating judge:', error);
    throw new Error('Failed to create judge');
  }

  return data;
}

/**
 * Update an existing judge
 */
export async function updateJudge(id: string, formData: JudgeFormData): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .update({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      city: formData.city || null,
      province_state: formData.province_state || null,
      country: formData.country || null,
      obedience_levels: formData.obedience_levels,
      rally_levels: formData.rally_levels,
      games_levels: formData.games_levels,
      scent_levels: formData.scent_levels,
      is_active: formData.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating judge:', error);
    throw new Error('Failed to update judge');
  }

  return data;
}

/**
 * Delete a judge
 */
export async function deleteJudge(id: string): Promise<void> {
  const { error } = await supabase
    .from('judges')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting judge:', error);
    throw new Error('Failed to delete judge');
  }
}

/**
 * Search judges by name, email, or location
 */
export async function searchJudges(searchTerm: string): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
    .order('name');

  if (error) {
    console.error('Error searching judges:', error);
    throw new Error('Failed to search judges');
  }

  return data || [];
}

/**
 * Get judges certified for a specific discipline and level
 */
export async function getJudgesByDiscipline(
  discipline: 'obedience' | 'rally' | 'games' | 'scent',
  level?: string
): Promise<Judge[]> {
  const columnMap = {
    obedience: 'obedience_levels',
    rally: 'rally_levels',
    games: 'games_levels',
    scent: 'scent_levels'
  };

  const column = columnMap[discipline];
  let query = supabase
    .from('judges')
    .select('*')
    .eq('is_active', true);

  if (level) {
    query = query.contains(column, [level]);
  } else {
    // Get judges with at least one level in this discipline
    query = query.filter(column, 'neq', '{}');
  }

  const { data, error } = await query.order('name');

  if (error) {
    console.error('Error fetching judges by discipline:', error);
    throw new Error('Failed to fetch judges');
  }

  return data || [];
}