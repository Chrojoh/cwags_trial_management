'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dog,
  User,
  Search,
  AlertCircle,
  CheckCircle,
  Calendar,
  Loader2,
  Shield,
  FileText,
  Edit
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';
import { supabase } from '@/lib/supabase';

interface Trial {
  id: string;
  trial_name: string;
  club_name: string;
  location: string;
  start_date: string;
  end_date: string;
  trial_secretary: string;
  secretary_email: string;
  waiver_text: string;
  entries_open: boolean;
}

interface TrialRound {
  id: string;
  round_number: number;
  judge_name: string;
  trial_class_id: string;
  feo_available: boolean;
  trial_classes?: {
    class_name: string;
    class_level: string;
    class_type: string;
    games_subclass?: string;
    entry_fee: number;
    feo_price?: number;
    feo_available?: boolean;
    trial_days?: {
      day_number: number;
      trial_date: string;
    };
  };
}

interface EntryFormData {
  handler_name: string;
  handler_email: string;
  handler_phone: string;
  emergency_contact: string;
  cwags_number: string;
  dog_call_name: string;
  dog_breed: string;
  dog_sex: string;
  dog_dob: string;
  is_junior_handler: boolean;
  selected_rounds: string[];
  feo_selections: string[];
  waiver_accepted: boolean;
}

export default function PublicEntryForm() {
  const params = useParams();
  const router = useRouter();
  const trialId = params.trialId as string;

  const [trial, setTrial] = useState<Trial | null>(null);
  const [trialRounds, setTrialRounds] = useState<TrialRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<EntryFormData>({
    handler_name: '',
    handler_email: '',
    handler_phone: '',
    emergency_contact: '',
    cwags_number: '',
    dog_call_name: '',
    dog_breed: '',
    dog_sex: '',
    dog_dob: '',
    is_junior_handler: false,
    selected_rounds: [],
    feo_selections: [],
    waiver_accepted: false
  });

  const [registryLoading, setRegistryLoading] = useState(false);
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [cwagsInputValue, setCwagsInputValue] = useState('');
  const [editModeLoading, setEditModeLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{originalSelections: number; currentSelections: number} | null>(null);
  const [originalFormData, setOriginalFormData] = useState<EntryFormData | null>(null);

  const getClassOrder = (className: string): number => {
  const classOrder = [
    'Patrol', 'Detective', 'Investigator', 'Super Sleuth', 
    'Private Investigator',  // ✅ CHANGED FROM 'Private Inv' to 'Private Investigator'
    'Detective Diversions', 
    'Ranger 1', 'Ranger 2', 'Ranger 3', 'Ranger 4', 'Ranger 5',
    'Dasher 3', 'Dasher 4', 'Dasher 5', 'Dasher 6',
    'Obedience 1', 'Obedience 2', 'Obedience 3', 'Obedience 4', 'Obedience 5',
    'Starter', 'Advanced', 'Pro', 'ARF',
    'Zoom 1', 'Zoom 1.5', 'Zoom 2',
    'Games 1', 'Games 2', 'Games 3', 'Games 4'
  ];
  
  const index = classOrder.findIndex(order => {
    if (className.includes('Games')) {
      return className.startsWith(order);
    }
    return className === order;
  });
  
  return index === -1 ? 999 : index;
};

const cleanCwagsNumber = (input: string): string => {
  const digits = input.replace(/\D/g, "");
  if (!digits) throw new Error("Please enter a C-WAGS registration number");

  // Part 1: first 2 digits
  const part1 = digits.slice(0, 2).padEnd(2, "0");

  // Part 2: next 4 digits
  const part2 = digits.slice(2, 6).padEnd(4, "0");

  // Part 3: everything after digit 6
  let part3 = digits.slice(6);

  // Pad END block on the LEFT to 2 digits
  part3 = part3.padStart(2, "0").slice(-2);

  return `${part1}-${part2}-${part3}`;
};



// UPDATED: Handle lookup button click
const handleCwagsSubmit = async () => {
  if (!cwagsInputValue.trim()) {
    setError('Please enter a C-WAGS registration number');
    return;
  }
  
  try {
    // Clean and format the number
    const cleanedNumber = cleanCwagsNumber(cwagsInputValue);
    
    // Update the input field with formatted number
    setCwagsInputValue(cleanedNumber);
    
    // Update form data with cleaned number
    setFormData(prev => ({ ...prev, cwags_number: cleanedNumber }));
    
    // Perform the lookup
    await handleCwagsLookup(cleanedNumber);
    
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Invalid C-WAGS number format');
  }
};

  const loadTrialData = async () => {
    try {
      setLoading(true);
      console.log('Loading trial data for public entry form:', trialId);

      const trialResult = await simpleTrialOperations.getTrial(trialId);
      console.log('Trial result:', trialResult);

      if (!trialResult.success) {
        throw new Error('Failed to load trial information');
      }

      setTrial(trialResult.data);

      const roundsResult = await simpleTrialOperations.getAllTrialRounds(trialId);
      if (!roundsResult.success) {
        throw new Error('Failed to load trial rounds');
      }

      setTrialRounds(roundsResult.data || []);
      console.log('Trial data loaded successfully');

    } catch (err) {
      console.error('Error loading trial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial information');
    } finally {
      setLoading(false);
    }
  };

// Around line 150, right after loadTrialData
useEffect(() => {
  if (trialId) {
    loadTrialData().then(() => {
      console.log('=== DEBUG TRIAL DATES ===');
      console.log('Trial Start:', trial?.start_date);
      console.log('Trial End:', trial?.end_date);
      console.log('Rounds:', trialRounds.map(r => ({
        class: r.trial_classes?.class_name,
        dayNum: r.trial_classes?.trial_days?.day_number,
        date: r.trial_classes?.trial_days?.trial_date
      })));
    });
  }
}, [trialId]);

  // FIXED: handleCwagsLookup function that handles multiple entries properly
  const handleCwagsLookup = async (cwagsNumber: string) => {
    if (!cwagsNumber || cwagsNumber.length < 8) return;

    setRegistryLoading(true);
    setEditModeLoading(true);
    
    try {
      console.log('Starting C-WAGS lookup for:', cwagsNumber);
      
      // Direct database query to find existing entries in this trial
      console.log('Searching for existing entries with direct database query...');
      const { data: existingEntries, error: entryError } = await supabase
        .from('entries')
        .select('*')
        .eq('trial_id', trialId)
        .eq('cwags_number', cwagsNumber)
        .order('submitted_at', { ascending: false });

      console.log('Direct entry query result:', existingEntries, entryError);
      
      if (existingEntries && existingEntries.length > 0) {
        // Handle multiple entries for same C-WAGS number
        if (existingEntries.length > 1) {
          console.warn(`⚠️ Found ${existingEntries.length} entries for C-WAGS ${cwagsNumber}. This indicates duplicate entries.`);
        }

        // Use the most recent entry as the "main" entry
        const existingEntry = existingEntries[0];
        console.log('Found existing entry:', existingEntry);
        setExistingEntry(existingEntry);
        
        // Get ALL entry selections from ALL entries for this C-WAGS number
        const entryIds = existingEntries.map(entry => entry.id);
        console.log('Loading entry selections for all entry IDs:', entryIds);
        
        const { data: allEntrySelections, error: selectionsError } = await supabase
          .from('entry_selections')
          .select('trial_round_id, entry_type, entry_id')
          .in('entry_id', entryIds);
        
        console.log('Entry selections query result:', allEntrySelections, selectionsError);
        
        let selectedRoundIds: string[] = [];
        let feoRoundIds: string[] = [];
        
        if (allEntrySelections && allEntrySelections.length > 0) {
          console.log('Processing entry selections:', allEntrySelections);
          
          // Collect ALL unique round selections across all entries
          const uniqueSelections = new Map();
          allEntrySelections.forEach((selection: any) => {
            const roundId = selection.trial_round_id;
            uniqueSelections.set(roundId, selection.entry_type);
          });
          
          // Convert to arrays
          selectedRoundIds = Array.from(uniqueSelections.keys());
          feoRoundIds = Array.from(uniqueSelections.entries())
            .filter(([, entryType]) => entryType === 'feo')
            .map(([roundId]) => roundId);
        }
        
        console.log('Final selected round IDs:', selectedRoundIds);
        console.log('Final FEO round IDs:', feoRoundIds);
        
        const originalFormData = {
          handler_name: existingEntry.handler_name,
          handler_email: existingEntry.handler_email,
          handler_phone: existingEntry.handler_phone || '',
          emergency_contact: '',
          cwags_number: existingEntry.cwags_number,
          dog_call_name: existingEntry.dog_call_name,
          dog_breed: existingEntry.dog_breed || '',
          dog_sex: existingEntry.dog_sex || '',
          dog_dob: '',
          is_junior_handler: existingEntry.is_junior_handler || false,
          waiver_accepted: existingEntry.waiver_accepted || false,
          selected_rounds: selectedRoundIds,
          feo_selections: feoRoundIds
        };
        
        console.log('Setting original form data:', originalFormData);
        setOriginalFormData(originalFormData);
        
        const populatedFormData = {
          handler_name: existingEntry.handler_name,
          handler_email: existingEntry.handler_email,
          handler_phone: existingEntry.handler_phone || '',
          emergency_contact: '',
          cwags_number: existingEntry.cwags_number,
          dog_call_name: existingEntry.dog_call_name,
          dog_breed: existingEntry.dog_breed || '',
          dog_sex: existingEntry.dog_sex || '',
          dog_dob: '',
          is_junior_handler: existingEntry.is_junior_handler || false,
          waiver_accepted: existingEntry.waiver_accepted || false,
          selected_rounds: selectedRoundIds,
          feo_selections: feoRoundIds
        };
        
        console.log('Setting populated form data with selections:', populatedFormData);
        setFormData(populatedFormData);
        
        console.log('Form populated with existing entry data and class selections');
      } else {
        console.log('No existing entry found, checking C-WAGS registry...');
        setExistingEntry(null);
        
        // Check C-WAGS registry for handler/dog info
        try {
          const registryResult = await simpleTrialOperations.getCwagsRegistryByNumber(cwagsNumber);
          if (registryResult.success && registryResult.data) {
            console.log('Found C-WAGS registry data:', registryResult.data);
            setFormData(prev => ({
              ...prev,
              handler_name: registryResult.data.handler_name || '',
              dog_call_name: registryResult.data.dog_call_name || '',
              cwags_number: cwagsNumber
            }));
          } else {
            console.log('No C-WAGS registry data found');
            setFormData(prev => ({
              ...prev,
              cwags_number: cwagsNumber
            }));
          }
        } catch (registryError) {
          console.error('Error checking C-WAGS registry:', registryError);
          setFormData(prev => ({
            ...prev,
            cwags_number: cwagsNumber
          }));
        }
      }
      
    } catch (error) {
      console.error('Error in C-WAGS lookup:', error);
      setError('Failed to lookup C-WAGS information');
    } finally {
      setRegistryLoading(false);
      setEditModeLoading(false);
    }
  };

  const saveToRegistry = async () => {
    if (!formData.cwags_number || !formData.handler_name || !formData.dog_call_name) {
      return;
    }

    try {
      const existingResult = await simpleTrialOperations.getCwagsRegistryByNumber(formData.cwags_number);
      if (existingResult.success && existingResult.data) {
        return;
      }

      const registryData = {
        cwags_number: formData.cwags_number,
        dog_call_name: formData.dog_call_name,
        handler_name: formData.handler_name,
        is_active: true
      };

      await simpleTrialOperations.createRegistryEntry(registryData);
    } catch (error) {
      console.warn('Failed to save to registry:', error);
    }
  };

  // FIXED: performSubmit function with custom confirmation dialog
  const performSubmit = async () => {
    if (!formData.waiver_accepted) {
      setError('You must accept the waiver before submitting');
      return;
    }

    // CONFIRMATION DIALOG FOR EDITS
    if (existingEntry && originalFormData) {
      const currentSelections = formData.selected_rounds.length;
      const originalSelections = originalFormData.selected_rounds.length;
      
      if (currentSelections !== originalSelections) {
        setConfirmationData({ originalSelections, currentSelections });
        setShowConfirmDialog(true);
        return;
      }
    }

    // If no confirmation needed, proceed directly
    await handleConfirmedSubmit();
  };

// CORRECT FIX for /entries/[trialId]/page.tsx
// This properly handles multiple rounds without creating duplicate entry records

const handleConfirmedSubmit = async () => {
  setShowConfirmDialog(false);
  setSubmitting(true);
  setError(null);

  try {
    await saveToRegistry();

    const totalFee = formData.selected_rounds.reduce((sum, roundId) => {
      const round = trialRounds.find(r => r.id === roundId);
      const isFeo = formData.feo_selections.includes(roundId);
      
      if (isFeo && round?.trial_classes?.feo_price) {
        return sum + round.trial_classes.feo_price;
      } else {
        return sum + (round?.trial_classes?.entry_fee || 0);
      }
    }, 0);

    let primaryEntryId: string;
    let isNewEntry = false;
    
    // Step 1: Find or create the PRIMARY entry record
    // There should only be ONE entry record per cwags_number per trial
    const { data: existingEntries, error: findError } = await supabase
      .from('entries')
      .select('id, handler_name, dog_call_name')
      .eq('trial_id', trialId)
      .eq('cwags_number', formData.cwags_number)
      .order('submitted_at', { ascending: true });
    
    if (findError) {
      throw new Error('Failed to find existing entries: ' + findError.message);
    }
    
    if (existingEntries && existingEntries.length > 0) {
      // Use the first (oldest) entry as the primary
      primaryEntryId = existingEntries[0].id;
      isNewEntry = false;
      
      console.log(`✅ Found existing entry record: ${primaryEntryId}`);
      
      // If there are multiple entry records (bug from before), clean them up
      if (existingEntries.length > 1) {
        console.warn(`⚠️ Found ${existingEntries.length} entry records for ${formData.cwags_number}. Cleaning up...`);
        
        const duplicateIds = existingEntries.slice(1).map(e => e.id);
        
        // Move all entry_selections to the primary entry
        const { error: moveSelectionsError } = await supabase
          .from('entry_selections')
          .update({ entry_id: primaryEntryId })
          .in('entry_id', duplicateIds);
        
        if (moveSelectionsError) {
          console.error('Error moving selections:', moveSelectionsError);
        }
        
        // Delete duplicate entry records
        const { error: deleteError } = await supabase
          .from('entries')
          .delete()
          .in('id', duplicateIds);
        
        if (deleteError) {
          console.error('Error deleting duplicates:', deleteError);
        } else {
          console.log(`✅ Cleaned up ${duplicateIds.length} duplicate entry records`);
        }
      }
      
      // Update the existing entry with latest information
      const updateData = {
        handler_name: formData.handler_name,
        dog_call_name: formData.dog_call_name,
        dog_breed: formData.dog_breed,
        dog_sex: formData.dog_sex,
        handler_email: formData.handler_email,
        handler_phone: formData.handler_phone,
        is_junior_handler: formData.is_junior_handler,
        waiver_accepted: formData.waiver_accepted,
        total_fee: totalFee,
        entry_status: 'submitted'
      };
      
      const updateResult = await simpleTrialOperations.updateEntry(primaryEntryId, updateData);
      if (!updateResult.success) {
        throw new Error(updateResult.error as string);
      }
      
      console.log('✅ Updated existing entry record');
      
    } else {
      // Create a new entry record - first time this person is entering
      isNewEntry = true;
      
      const entryData = {
        trial_id: trialId,
        handler_name: formData.handler_name,
        dog_call_name: formData.dog_call_name,
        cwags_number: formData.cwags_number,
        dog_breed: formData.dog_breed,
        dog_sex: formData.dog_sex,
        handler_email: formData.handler_email,
        handler_phone: formData.handler_phone,
        is_junior_handler: formData.is_junior_handler,
        waiver_accepted: formData.waiver_accepted,
        total_fee: totalFee,
        payment_status: 'pending',
        entry_status: 'submitted'
      };

      const createResult = await simpleTrialOperations.createEntry(entryData);
      if (!createResult.success) {
        throw new Error(createResult.error as string);
      }
      
      primaryEntryId = createResult.data.id;
      console.log('✅ Created new entry record:', primaryEntryId);
    }
    
    // Step 2: Sync entry_selections to match the form
    // Get all existing selections for this entry
    const { data: existingSelections, error: selectionsError } = await supabase
      .from('entry_selections')
      .select('id, trial_round_id, entry_type')
      .eq('entry_id', primaryEntryId);
    
    if (selectionsError) {
      console.error('Error fetching existing selections:', selectionsError);
    }
    
    const existingRoundIds = new Set(existingSelections?.map(s => s.trial_round_id) || []);
    const newRoundIds = new Set(formData.selected_rounds);
    
    // Find selections to DELETE (rounds that were unselected)
    const selectionsToDelete = existingSelections?.filter(s => 
      !newRoundIds.has(s.trial_round_id)
    ) || [];
    
    // Find selections to ADD (new rounds that were selected)
    const roundsToAdd = formData.selected_rounds.filter(roundId => 
      !existingRoundIds.has(roundId)
    );
    
    // Find selections to UPDATE (entry type changed from regular to FEO or vice versa)
    const selectionsToUpdate = existingSelections?.filter(s => {
      if (!newRoundIds.has(s.trial_round_id)) return false;
      
      const shouldBeFeo = formData.feo_selections.includes(s.trial_round_id);
      const isFeo = s.entry_type === 'feo';
      
      return shouldBeFeo !== isFeo; // Type has changed
    }) || [];
    
    console.log(`📊 Sync summary:
      - Existing selections: ${existingSelections?.length || 0}
      - New selections from form: ${formData.selected_rounds.length}
      - To DELETE: ${selectionsToDelete.length}
      - To ADD: ${roundsToAdd.length}
      - To UPDATE: ${selectionsToUpdate.length}`);
    
    // DELETE removed selections
    if (selectionsToDelete.length > 0) {
      const deleteIds = selectionsToDelete.map(s => s.id);
      const { error: deleteError } = await supabase
        .from('entry_selections')
        .delete()
        .in('id', deleteIds);
      
      if (deleteError) {
        console.error('Error deleting selections:', deleteError);
      } else {
        console.log(`✅ Deleted ${deleteIds.length} old selections`);
      }
    }
    
    // ADD new selections
    if (roundsToAdd.length > 0) {
      const newSelections = roundsToAdd.map((roundId, index) => {
        const round = trialRounds.find(r => r.id === roundId);
        const isFeo = formData.feo_selections.includes(roundId);
        
        let entryFee = round?.trial_classes?.entry_fee || 0;
        let entryType = 'regular';
        
        if (isFeo && round?.trial_classes?.feo_price) {
          entryFee = round.trial_classes.feo_price;
          entryType = 'feo';
        }
        
        return {
          trial_round_id: roundId,
          entry_type: entryType,
          fee: entryFee,
          running_position: (existingSelections?.length || 0) + index + 1,
          entry_status: 'entered'
        };
      });
      
     // Direct insert - don't use score-aware function for adding selections
const { error: insertError } = await supabase
  .from('entry_selections')
  .insert(newSelections.map(selection => ({
    entry_id: primaryEntryId,
    ...selection
  })));

if (insertError) {
  throw new Error('Failed to add new selections: ' + insertError.message);
}
      
      console.log(`✅ Added ${newSelections.length} new selections`);
    }
    
    // UPDATE changed selections (FEO status changed)
    if (selectionsToUpdate.length > 0) {
      for (const selection of selectionsToUpdate) {
        const shouldBeFeo = formData.feo_selections.includes(selection.trial_round_id);
        const round = trialRounds.find(r => r.id === selection.trial_round_id);
        
        let newFee = round?.trial_classes?.entry_fee || 0;
        let newType = 'regular';
        
        if (shouldBeFeo && round?.trial_classes?.feo_price) {
          newFee = round.trial_classes.feo_price;
          newType = 'feo';
        }
        
        const { error: updateError } = await supabase
          .from('entry_selections')
          .update({
            entry_type: newType,
            fee: newFee
          })
          .eq('id', selection.id);
        
        if (updateError) {
          console.error('Error updating selection:', updateError);
        }
      }
      
      console.log(`✅ Updated ${selectionsToUpdate.length} selections`);
    }
    
    // Step 3: Recalculate and update total fee
    const { data: finalSelections, error: finalSelectionsError } = await supabase
      .from('entry_selections')
      .select('fee')
      .eq('entry_id', primaryEntryId);
    
    if (!finalSelectionsError && finalSelections) {
      const finalTotalFee = finalSelections.reduce((sum, s) => sum + (s.fee || 0), 0);
      
      await simpleTrialOperations.updateEntry(primaryEntryId, {
        total_fee: finalTotalFee
      });
      
      console.log(`✅ Updated total fee: $${finalTotalFee}`);
    }

    setSuccess(true);
    console.log(`✅ Entry ${isNewEntry ? 'submitted' : 'updated'} successfully`);

  } catch (err) {
    console.error('❌ Error submitting entry:', err);
    setError(err instanceof Error ? err.message : 'Failed to submit entry');
  } finally {
    setSubmitting(false);
  }
};

  const handleRoundSelection = (roundId: string, type: 'regular' | 'feo') => {
    setFormData(prev => {
      const isCurrentlySelected = prev.selected_rounds.includes(roundId);
      const isCurrentlyFeo = prev.feo_selections.includes(roundId);
      
      if (isCurrentlySelected && ((type === 'feo' && isCurrentlyFeo) || (type === 'regular' && !isCurrentlyFeo))) {
        return {
          ...prev,
          selected_rounds: prev.selected_rounds.filter(id => id !== roundId),
          feo_selections: prev.feo_selections.filter(id => id !== roundId)
        };
      } else {
        const newSelectedRounds = isCurrentlySelected 
          ? prev.selected_rounds 
          : [...prev.selected_rounds, roundId];
          
        const newFeoSelections = type === 'feo'
          ? isCurrentlySelected 
            ? prev.feo_selections.includes(roundId) 
              ? prev.feo_selections 
              : [...prev.feo_selections, roundId]
            : [...prev.feo_selections, roundId]
          : prev.feo_selections.filter(id => id !== roundId);
          
        return {
          ...prev,
          selected_rounds: newSelectedRounds,
          feo_selections: newFeoSelections
        };
      }
    });
  };

  // Group rounds by day
  const roundsByDay = trialRounds.reduce((acc, round) => {
    if (!round.trial_classes?.trial_days) return acc;
    
    const dayNumber = round.trial_classes.trial_days.day_number;
    if (!acc[dayNumber]) {
      acc[dayNumber] = [];
    }
    acc[dayNumber].push(round);
    return acc;
  }, {} as Record<number, TrialRound[]>);

  // Sort days and rounds within each day
  Object.keys(roundsByDay).forEach(day => {
    roundsByDay[parseInt(day)].sort((a, b) => {
      const orderA = getClassOrder(a.trial_classes?.class_name || '');
      const orderB = getClassOrder(b.trial_classes?.class_name || '');
      if (orderA !== orderB) return orderA - orderB;
      return a.round_number - b.round_number;
    });
  });

  useEffect(() => {
    if (trialId) {
      loadTrialData();
    }
  }, [trialId]);

  // Enhanced useEffect to auto-populate C-WAGS field and trigger full lookup
  useEffect(() => {
    // Check for cwags parameter in URL and auto-populate the field
    const urlParams = new URLSearchParams(window.location.search);
    const cwagsParam = urlParams.get('cwags');
    
    if (cwagsParam) {
      console.log('Auto-populating C-WAGS number from URL:', cwagsParam);
      setCwagsInputValue(cwagsParam);
      setFormData(prev => ({ ...prev, cwags_number: cwagsParam }));
      
      // Automatically trigger the full lookup including class selections
      setTimeout(() => {
        handleCwagsLookup(cwagsParam);
      }, 500); // Small delay to ensure state is set
    }
  }, []);

  // Debug logs
  console.log('🔍 DEBUG roundsByDay:', roundsByDay);
  console.log('🔍 DEBUG trialRounds:', trialRounds);
  console.log('🔍 DEBUG Object.keys(roundsByDay):', Object.keys(roundsByDay));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading trial information...</p>
        </div>
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Trial not found or entries are not currently open.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {existingEntry ? 'Entry Updated Successfully!' : 'Entry Submitted Successfully!'}
              </h3>
              <p className="text-gray-600 mb-4">
                {existingEntry 
                  ? 'Your entry has been updated in the system.'
                  : 'Your entry has been submitted and is now in the system.'
                }
              </p>
              <Button 
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    handler_name: '',
                    handler_email: '',
                    handler_phone: '',
                    emergency_contact: '',
                    cwags_number: '',
                    dog_call_name: '',
                    dog_breed: '',
                    dog_sex: '',
                    dog_dob: '',
                    is_junior_handler: false,
                    selected_rounds: [],
                    feo_selections: [],
                    waiver_accepted: false
                  });
                  setExistingEntry(null);
                  setCwagsInputValue('');
                }}
                className="w-full"
              >
                Submit Another Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{trial.trial_name}</CardTitle>
                <div className="text-base mt-2 text-gray-600">
  <div className="flex items-center gap-2 mb-1">
    <Calendar className="h-4 w-4" />
    <span>{new Date(trial.start_date).toLocaleDateString()} - {new Date(trial.end_date).toLocaleDateString()}</span>
  </div>
  <div>📍 {trial.location}</div>
  <div>🏆 Hosted by {trial.club_name}</div>
</div>
              </div>
              {existingEntry && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Edit className="h-4 w-4" />
                  <span className="text-sm font-medium">Edit Mode</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Notice to Exhibitors */}
<Card className="mb-6">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <FileText className="h-5 w-5" />
      C-WAGS Notice to Exhibitors
    </CardTitle>
    <CardDescription>
      Please read this important information before entering
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="text-sm text-blue-900 space-y-3 leading-relaxed">
        <p><strong>C-WAGS Notice to Exhibitors</strong></p>
        <p>Competitors, through submission of entry, acknowledge that they are knowledgeable of C-WAGS Obedience & Rally rules and regulations including but not limited to the following rules regarding entry:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>All exhibitors are expected to treat the judges, trial hosts, your canine partner and all other exhibitors with respect.</li>
          <li>All judges and trial hosts are expected to show respect to all exhibitors.</li>
          <li>This trial is open to all dogs registered with C-WAGS.</li>
          <li>Trial Hosts may elect to accept FOR EXHIBITION ONLY entries of non-registered dogs.</li>
          <li>Teams may be entered in multiple levels/classes at the same trial.</li>
          <li>Dogs must be shown by a member of the owner's immediate family.</li>
          <li>Collars: The dog must wear a flat type collar (buckle, snap or proper fit martingale) and/or body harness in the ring. Electronic training collars are not allowed on the show grounds.</li>
          <li>Owners with disabilities are encouraged to compete. Any necessary modifications to the exercises must be provided by the handler to the judge and approved by the judge.</li>
          <li>Safety shall always be of foremost consideration in actions and conduct by handlers at all times. Handlers, through entry at this event, accept full responsibility for themselves and the actions of their dogs.</li>
        </ul>
        <p className="pt-2"><strong>In addition:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The organizing committee may refuse any entry for any reason.</li>
          <li>THERE SHALL BE NO REFUND for entries in the event a dog and/or handler are dismissed from competition, regardless of reason for such dismissal. There will be no refunds if the trial has to be cancelled for any reason.</li>
        </ul>
      </div>
    </div>
  </CardContent>
</Card>

{/* Disclaimer & Waiver */}
<Card className="mb-6">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Shield className="h-5 w-5" />
      C-WAGS Disclaimer & Liability Waiver
    </CardTitle>
    <CardDescription>
      Please read and accept the waiver before proceeding
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="prose prose-sm max-w-none mb-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-amber-800 font-medium mb-2">
          <strong>Important:</strong> You must read and agree to the waiver to submit this form
        </p>
        <div className="text-xs text-amber-700 leading-relaxed">
          {trial.waiver_text || `
                    I/we acknowledge that I/we will be involved with the canine class along with C-WAGS (NW). 
                    I/we agree that the trial club hosting this trial has the right to refuse entry for cause which, in the case of this 
                    member and club, does not include prejudice or bias on account of race, color, religion, sex, sexual 
                    orientation, gender identity, national origin, or disability. I/we agree to abide by the rules and regulations of 
                    member and official, the trial club, its members, directors, officials, agents, show superintendents, show 
                    secretaries, show committees and the owner or lessor of the premises used for the performance and any employees 
                    of the aforementioned parties from any claim for loss or injury which may be alleged to have been caused directly 
                    or indirectly to any person or thing by the act of this dog/horse while in or about the trial premises or grounds 
                    or near any entrance thereto, and I/we personally assume all responsibility and liability for any such claim, and 
                    I/we further agree to hold the aforementioned parties harmless from any claim for loss, injury, or damage to myself 
                    and my property and handlers, agents, employees and dogs whether such loss, injury or damage be caused by negligence 
                    while on the trial premises.
                  `}
        </div>
      </div>
    </div>
    
    {/* IMPROVED CHECKBOX WITH BETTER VISIBILITY */}
    <div className="flex items-start space-x-3 p-4 border-2 border-gray-300 rounded-lg bg-white hover:border-blue-500 transition-colors">
      <Checkbox 
        id="waiver"
        checked={formData.waiver_accepted}
        onCheckedChange={(checked) => 
          setFormData(prev => ({ ...prev, waiver_accepted: checked as boolean }))
        }
        className="mt-1 h-5 w-5 border-2 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
      />
      <Label htmlFor="waiver" className="text-base font-medium leading-6 cursor-pointer">
        I have read, understand, and agree to the complete C-WAGS disclaimer and all terms above.
      </Label>
    </div>
  </CardContent>
</Card>

        {/* C-WAGS Registration Lookup */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              C-WAGS Registration Lookup
            </CardTitle>
            <CardDescription>
              Enter your C-WAGS registration number to auto-fill information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cwags-lookup">C-WAGS Registration Number *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
  id="cwags-lookup"
  value={cwagsInputValue}
  onChange={(e) => setCwagsInputValue(e.target.value)} 
  placeholder="XX-XXXX-XX"
  className="flex-1"
/>
                  <Button 
                    onClick={handleCwagsSubmit} 
                    disabled={registryLoading || !cwagsInputValue.trim()}
                  >
                    {registryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Note the format: YY-NNNN-NN (e.g., 17-1955 or 17-1955-01). Modify your selections below and submit to update.
                </p>
              </div>
              
              {editModeLoading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Editing existing entry for {cwagsInputValue}...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Handler Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Handler Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="handler-name">Handler Name *</Label>
                <Input
                  id="handler-name"
                  value={formData.handler_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, handler_name: e.target.value }))}
                  placeholder="Brennan Johansen"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.handler_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, handler_phone: e.target.value }))}
                  placeholder="604-xxx-xxxx"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.handler_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, handler_email: e.target.value }))}
                  placeholder="handler@email.com"
                />
              </div>
              <div>
                <Label htmlFor="emergency">Emergency Contact</Label>
                <Input
                  id="emergency"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  placeholder="Name and phone number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dog Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5" />
              Dog Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dog-name">Dog's Call Name *</Label>
                <Input
                  id="dog-name"
                  value={formData.dog_call_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, dog_call_name: e.target.value }))}
                  placeholder="Hiro"
                />
              </div>
              <div>
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  value={formData.dog_breed}
                  onChange={(e) => setFormData(prev => ({ ...prev, dog_breed: e.target.value }))}
                  placeholder="Border Collie"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sex">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dog_dob}
                  onChange={(e) => setFormData(prev => ({ ...prev, dog_dob: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="sex">Sex</Label>
                <Select 
                  value={formData.dog_sex} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dog_sex: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                 <SelectContent>
     <SelectItem value="Male">Male</SelectItem>     
     <SelectItem value="Female">Female</SelectItem>  
   </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="junior">Junior Handler (Under 18)</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox 
                    id="junior"
                    checked={formData.is_junior_handler}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_junior_handler: checked as boolean }))
                    }
                  />
                  <Label htmlFor="junior" className="text-sm">Yes</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Class Entries */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Class Entries
            </CardTitle>
            <CardDescription>
              Select the class entries/rounds you want to enter
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(roundsByDay).length > 0 ? (
              <Tabs defaultValue="1" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  {Object.keys(roundsByDay).sort().map(day => {
                    const dayRounds = roundsByDay[parseInt(day)];
                    const dayDate = dayRounds[0]?.trial_classes?.trial_days?.trial_date;
                    return (
                      <TabsTrigger key={day} value={day}>
                        Day {day} - {dayDate ? new Date(dayDate).toLocaleDateString('en-US', { weekday: 'short' }) : 'TBD'}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                
               {Object.keys(roundsByDay).sort().map(day => (
                  <TabsContent key={day} value={day} className="mt-4">
                    <div className="space-y-3">
                      {roundsByDay[parseInt(day)].map((round) => {
                        const isSelected = formData.selected_rounds.includes(round.id);
                        const isFeo = formData.feo_selections.includes(round.id);
                        const regularFee = round.trial_classes?.entry_fee || 0;
                        const feoFee = round.trial_classes?.feo_price || 0;
                        const showFeoOptions = round.trial_classes?.feo_available || round.feo_available;

                        return (
                          <div 
                            key={round.id}
                            className={`border rounded-lg p-4 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium">
                                    {round.trial_classes?.class_name || 'Unknown Class'} 
                                    {round.trial_classes?.games_subclass && (
                                      <span className="text-sm text-gray-600 ml-1">
                                        ({round.trial_classes.games_subclass})
                                      </span>
                                    )}
                                  </h4>
                                  <div className="text-right">
                                    <div className="text-sm text-gray-600">
                                      Judge: {round.judge_name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Round {round.round_number}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex gap-3">
                                  {/* Regular Entry Button */}
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleRoundSelection(round.id, 'regular')}
                                    className={`
                                      relative min-w-[140px] font-semibold transition-all duration-200
                                      ${isSelected && !isFeo
                                        ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-700 shadow-md' 
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300'
                                      }
                                    `}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isSelected && !isFeo && (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      <span>Regular ${regularFee.toFixed(2)}</span>
                                    </div>
                                  </Button>
                                  
                                  {/* FEO Entry Button */}
                                  {showFeoOptions && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleRoundSelection(round.id, 'feo')}
                                      className={`
                                        relative min-w-[140px] font-semibold transition-all duration-200
                                        ${isSelected && isFeo
                                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-600 shadow-md' 
                                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300'
                                        }
                                      `}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isSelected && isFeo && (
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                        <span>FEO ${feoFee.toFixed(2)}</span>
                                      </div>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No class information available yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Entry Fee */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Entry Fee:</span>
              <span>
                $
                {formData.selected_rounds.reduce((sum, roundId) => {
                  const round = trialRounds.find(r => r.id === roundId);
                  const isFeo = formData.feo_selections.includes(roundId);
                  
                  if (isFeo && round?.trial_classes?.feo_price) {
                    return sum + round.trial_classes.feo_price;
                  } else {
                    return sum + (round?.trial_classes?.entry_fee || 0);
                  }
                }, 0).toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Payment due at trial
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={performSubmit}
              disabled={submitting || !formData.waiver_accepted}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {existingEntry ? 'Updating Entry...' : 'Submitting Entry...'}
                </>
              ) : (
                <>
                  {existingEntry ? 'Update Entry' : 'Submit Entry'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Custom Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Entry Modification Confirmation</h3>
              </div>
              
              <div className="space-y-3 mb-6">
                {confirmationData && (
                  <>
                    <div className="space-y-2 text-gray-700">
                      <p>Original entry had: <strong>{confirmationData.originalSelections}</strong> class selections</p>
                      <p>New entry will have: <strong>{confirmationData.currentSelections}</strong> class selections</p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                      <p className="text-sm text-amber-800">
                        This will <strong>REPLACE</strong> all existing class selections with the new ones.
                      </p>
                    </div>
                    <p className="text-gray-700">Do you want to proceed with this change?</p>
                  </>
                )}
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    console.log('User cancelled the edit operation');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleConfirmedSubmit}>
                  Proceed with Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}