// Complete replacement for src/app/entries/[trialId]/page.tsx
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

// ============================================
// INTERFACES
// ============================================
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
  division_selections: Record<string, string>;
  waiver_accepted: boolean;
}

// ============================================
// HELPER FUNCTIONS (outside component)
// ============================================
const requiresDivision = (className: string | undefined): boolean => {
  if (!className) return false;
  const lowerName = className.toLowerCase();
  
  // Check if it's Obedience
  if (lowerName.includes('obedience')) return true;
  
  // Check if it's Rally
  const rallyClasses = ['starter', 'advanced', 'pro', 'arf', 'zoom'];
  return rallyClasses.some(rally => lowerName.includes(rally));
};

const getClassOrder = (className: string): number => {
  const classOrder = [
    'Patrol', 'Detective', 'Investigator', 'Super Sleuth', 
    'Private Investigator',
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

const formatDayDate = (dateString: string) => {
  const parts = dateString.split('-');
  const date = new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2]),
    12, 0, 0  // Set to noon to avoid timezone issues
  );
  
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function PublicEntryForm() {
  const params = useParams();
  const router = useRouter();
  const trialId = params.trialId as string;
  
  const [selectedDayTab, setSelectedDayTab] = useState<string>("1");
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
    division_selections: {},
    waiver_accepted: false
  });

  const [registryLoading, setRegistryLoading] = useState(false);
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [cwagsInputValue, setCwagsInputValue] = useState('');
  const [editModeLoading, setEditModeLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{originalSelections: number; currentSelections: number} | null>(null);
  const [originalFormData, setOriginalFormData] = useState<EntryFormData | null>(null);

  // ============================================
  // LOAD TRIAL DATA
  // ============================================
  const loadTrialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const trialResult = await simpleTrialOperations.getTrial(trialId);
      if (!trialResult.success) {
        throw new Error('Failed to load trial information');
      }

      if (!trialResult.data.entries_open) {
        throw new Error('Entries are not currently open for this trial');
      }

      setTrial(trialResult.data);

      const roundsResult = await simpleTrialOperations.getAllTrialRounds(trialId);
      if (!roundsResult.success) {
        throw new Error('Failed to load trial classes');
      }

      setTrialRounds(roundsResult.data || []);
    } catch (err) {
      console.error('Error loading trial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial information');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // C-WAGS LOOKUP
  // ============================================
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

  const handleCwagsLookup = async (cwagsNumber: string) => {
    if (!cwagsNumber || cwagsNumber.length < 8) return;

    setRegistryLoading(true);
    setEditModeLoading(true);
    
    try {
      console.log('Starting C-WAGS lookup for:', cwagsNumber);
      
      const { data: existingEntries, error: entryError } = await supabase
        .from('entries')
        .select('*')
        .eq('trial_id', trialId)
        .eq('cwags_number', cwagsNumber)
        .order('submitted_at', { ascending: false});

      console.log('Direct entry query result:', existingEntries, entryError);
      
      if (existingEntries && existingEntries.length > 0) {
        if (existingEntries.length > 1) {
          console.warn(`⚠️ Found ${existingEntries.length} entries for C-WAGS ${cwagsNumber}. This indicates duplicate entries.`);
        }

        const existingEntry = existingEntries[0];
        console.log('Found existing entry:', existingEntry);
        setExistingEntry(existingEntry);
        
        const entryIds = existingEntries.map(entry => entry.id);
        console.log('Loading entry selections for all entry IDs:', entryIds);
        
        const { data: allEntrySelections, error: selectionsError } = await supabase
          .from('entry_selections')
          .select('trial_round_id, entry_type, division, entry_id')
          .in('entry_id', entryIds);
        
        console.log('Entry selections query result:', allEntrySelections, selectionsError);
        
        let selectedRoundIds: string[] = [];
        let feoRoundIds: string[] = [];
        let divisionMap: Record<string, string> = {};
        
        if (allEntrySelections && allEntrySelections.length > 0) {
          console.log('Processing entry selections:', allEntrySelections);
          
          const uniqueSelections = new Map();
          allEntrySelections.forEach((selection: any) => {
            const roundId = selection.trial_round_id;
            uniqueSelections.set(roundId, {
              type: selection.entry_type,
              division: selection.division
            });
          });
          
          selectedRoundIds = Array.from(uniqueSelections.keys());
          feoRoundIds = Array.from(uniqueSelections.entries())
            .filter(([, data]) => data.type === 'feo')
            .map(([roundId]) => roundId);
          
          uniqueSelections.forEach((data, roundId) => {
            if (data.division) {
              divisionMap[roundId] = data.division;
            }
          });
        }
        
        console.log('Final selected round IDs:', selectedRoundIds);
        console.log('Final FEO round IDs:', feoRoundIds);
        console.log('Final division map:', divisionMap);
        
        const originalFormData: EntryFormData = {
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
          feo_selections: feoRoundIds,
          division_selections: divisionMap
        };
        
        console.log('Setting original form data:', originalFormData);
        setOriginalFormData(originalFormData);
        setFormData(originalFormData);
        
        console.log('Form populated with existing entry data and class selections');
      } else {
        console.log('No existing entry found, checking C-WAGS registry...');
        setExistingEntry(null);
        
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

  // ============================================
  // FORM HANDLERS
  // ============================================
  const handleDivisionChange = (roundId: string, division: string) => {
    setFormData(prev => ({
      ...prev,
      division_selections: {
        ...prev.division_selections,
        [roundId]: division
      }
    }));
  };

  const handleRoundSelection = (roundId: string, type: 'regular' | 'feo') => {
    setFormData(prev => {
      const isCurrentlySelected = prev.selected_rounds.includes(roundId);
      const isCurrentlyFeo = prev.feo_selections.includes(roundId);
      
      if (isCurrentlySelected && ((type === 'feo' && isCurrentlyFeo) || (type === 'regular' && !isCurrentlyFeo))) {
        // Deselect
        const newDivisions = { ...prev.division_selections };
        delete newDivisions[roundId];
        
        return {
          ...prev,
          selected_rounds: prev.selected_rounds.filter(id => id !== roundId),
          feo_selections: prev.feo_selections.filter(id => id !== roundId),
          division_selections: newDivisions
        };
      } else {
        // Select or change type
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

  // ============================================
  // VALIDATION
  // ============================================
  const validateDivisions = (): boolean => {
    const missingDivisions: string[] = [];
    
    formData.selected_rounds.forEach(roundId => {
      const round = trialRounds.find(r => r.id === roundId);
      if (requiresDivision(round?.trial_classes?.class_name)) {
        if (!formData.division_selections[roundId]) {
          const className = round?.trial_classes?.class_name || 'Unknown';
          missingDivisions.push(`${className} - Round ${round?.round_number}`);
        }
      }
    });
    
    if (missingDivisions.length > 0) {
      setError(`Please select a division for: ${missingDivisions.join(', ')}`);
      return false;
    }
    
    return true;
  };

  // ============================================
  // SUBMISSION
  // ============================================
  const performSubmit = async () => {
    if (!formData.waiver_accepted) {
      setError('You must accept the waiver before submitting');
      return;
    }

    if (!validateDivisions()) {
      return;
    }

    if (existingEntry && originalFormData) {
      const currentSelections = formData.selected_rounds.length;
      const originalSelections = originalFormData.selected_rounds.length;
      
      if (currentSelections !== originalSelections) {
        setConfirmationData({ originalSelections, currentSelections });
        setShowConfirmDialog(true);
        return;
      }
    }

    await handleConfirmedSubmit();
  };

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
        primaryEntryId = existingEntries[0].id;
        isNewEntry = false;
        
        console.log(`✅ Found existing entry record: ${primaryEntryId}`);
        
        if (existingEntries.length > 1) {
          console.warn(`⚠️ Found ${existingEntries.length} entry records for ${formData.cwags_number}. This indicates duplicate entries.`);
        }
      } else {
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
      
      // Sync entry_selections
      const { data: existingSelections, error: selectionsError } = await supabase
        .from('entry_selections')
        .select('id, trial_round_id, entry_type')
        .eq('entry_id', primaryEntryId);
      
      if (selectionsError) {
        console.error('Error fetching existing selections:', selectionsError);
      }
      
      const existingRoundIds = new Set(existingSelections?.map(s => s.trial_round_id) || []);
      const newRoundIds = new Set(formData.selected_rounds);
      
      const selectionsToDelete = existingSelections?.filter(s => 
        !newRoundIds.has(s.trial_round_id)
      ) || [];
      
      const roundsToAdd = formData.selected_rounds.filter(roundId => 
        !existingRoundIds.has(roundId)
      );
      
      const selectionsToUpdate = existingSelections?.filter(s => {
        if (!newRoundIds.has(s.trial_round_id)) return false;
        
        const shouldBeFeo = formData.feo_selections.includes(s.trial_round_id);
        const isFeo = s.entry_type === 'feo';
        
        return shouldBeFeo !== isFeo;
      }) || [];
      
      console.log(`📊 Sync summary:
        - Existing selections: ${existingSelections?.length || 0}
        - New selections from form: ${formData.selected_rounds.length}
        - To DELETE: ${selectionsToDelete.length}
        - To ADD: ${roundsToAdd.length}
        - To UPDATE: ${selectionsToUpdate.length}`);
      
      // DELETE
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
      
      // ADD
      if (roundsToAdd.length > 0) {
        const newSelections = roundsToAdd.map((roundId, index) => {
          const round = trialRounds.find(r => r.id === roundId);
          const isFeo = formData.feo_selections.includes(roundId);
          const division = formData.division_selections[roundId] || null;
          
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
            entry_status: 'entered',
            division: division
          };
        });
        
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
      
      // UPDATE
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
      
      // Recalculate total fee
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

  // ============================================
  // GROUP ROUNDS BY DAY
  // ============================================
  const roundsByDay = trialRounds.reduce((acc, round) => {
    if (!round.trial_classes?.trial_days) return acc;
    
    const dayNumber = round.trial_classes.trial_days.day_number;
    if (!acc[dayNumber]) {
      acc[dayNumber] = [];
    }
    acc[dayNumber].push(round);
    return acc;
  }, {} as Record<number, TrialRound[]>);

  Object.keys(roundsByDay).forEach(day => {
    roundsByDay[parseInt(day)].sort((a, b) => {
      const orderA = getClassOrder(a.trial_classes?.class_name || '');
      const orderB = getClassOrder(b.trial_classes?.class_name || '');
      if (orderA !== orderB) return orderA - orderB;
      return a.round_number - b.round_number;
    });
  });

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (trialId) {
      loadTrialData();
    }
  }, [trialId]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cwagsParam = urlParams.get('cwags');
    
    if (cwagsParam) {
      console.log('Auto-populating C-WAGS number from URL:', cwagsParam);
      setCwagsInputValue(cwagsParam);
      setFormData(prev => ({ ...prev, cwags_number: cwagsParam }));
      
      setTimeout(() => {
        handleCwagsLookup(cwagsParam);
      }, 500);
    }
  }, []);

  // ============================================
  // RENDER
  // ============================================
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Entry {existingEntry ? 'Updated' : 'Submitted'} Successfully!</CardTitle>
            <CardDescription>
              Your entry for {trial.trial_name} has been {existingEntry ? 'updated' : 'received'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Entry Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Handler:</strong> {formData.handler_name}</p>
                <p><strong>Dog:</strong> {formData.dog_call_name}</p>
                <p><strong>C-WAGS Number:</strong> {formData.cwags_number}</p>
                <p><strong>Classes Selected:</strong> {formData.selected_rounds.length}</p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Submit Another Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
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

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                <p>Competitors, through submission of entry, acknowledge that they are knowledgeable of C-WAGS rules and regulations including but not limited to the following rules regarding entry:</p>
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

        {/* Waiver and Acceptance */}
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
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded border max-h-64 overflow-y-auto">
              <div className="text-sm whitespace-pre-wrap">
                {trial.waiver_text || 'No waiver text provided.'}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="waiver"
                checked={formData.waiver_accepted}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, waiver_accepted: checked as boolean }))
                }
              />
              <Label htmlFor="waiver" className="text-sm">
                I have read and accept the waiver agreement *
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* C-WAGS Lookup */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              C-WAGS Number Lookup
            </CardTitle>
            <CardDescription>
              Enter your C-WAGS number to auto-fill handler and dog information and previous entries, Hit LOOKUP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="C-WAGS-XXXX"
                value={cwagsInputValue}
                onChange={(e) => setCwagsInputValue(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCwagsSubmit();
                  }
                }}
                className="flex-1"
              />
              <Button
  onClick={handleCwagsSubmit}
  disabled={registryLoading || !cwagsInputValue}
  className="border-2 border-purple-600 hover:bg-purple-600 hover:text-white transition-colors"
>
  {registryLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    'Lookup'
  )}
</Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Format: xx-xxxx-xx (e.g., 17-1955 or 17-1955-01). Enter to look up existing registration.
            </p>
            {existingEntry && (
              <Alert className="mt-4">
                <Edit className="h-4 w-4" />
                <AlertDescription>
                  Editing existing entry for {existingEntry.handler_name} / {existingEntry.dog_call_name}
                </AlertDescription>
              </Alert>
            )}
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
                <Label>Handler Name *</Label>
                <Input
                  value={formData.handler_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, handler_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Handler Email *</Label>
                <Input
                  type="email"
                  value={formData.handler_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, handler_email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Handler Phone *</Label>
                <Input
                  type="tel"
                  value={formData.handler_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, handler_phone: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Emergency Contact</Label>
                <Input
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
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
                <Label>C-WAGS Number *</Label>
                <Input
                  value={formData.cwags_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, cwags_number: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div>
                <Label>Dog Call Name *</Label>
                <Input
                  value={formData.dog_call_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, dog_call_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Breed</Label>
                <Input
                  value={formData.dog_breed}
                  onChange={(e) => setFormData(prev => ({ ...prev, dog_breed: e.target.value }))}
                />
              </div>
              <div>
                <Label>Sex</Label>
                <Select 
                  value={formData.dog_sex} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dog_sex: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="junior"
                checked={formData.is_junior_handler}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_junior_handler: checked as boolean }))
                }
              />
              <Label htmlFor="junior" className="text-sm">Junior Handler</Label>
            </div>
          </CardContent>
        </Card>

        {/* Class Entries - FIXED VERSION */}
        <div className="mb-6">
          {/* Single Tabs component wrapping BOTH TabsList and TabsContent */}
          <Tabs value={selectedDayTab} onValueChange={setSelectedDayTab} className="w-full">
            
            {/* Sticky Header Container */}
            <div className="sticky top-0 z-30 bg-gray-50 pt-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Class Entries
                      </CardTitle>
                      <CardDescription>
                        Select the class entries/rounds you want to enter  REMEMBER TO ACCEPT WAIVER
                      </CardDescription>
                    </div>
                    
                    {/* Submit Button - Top Right */}
                    <Button 
  onClick={performSubmit}
  disabled={submitting || !formData.waiver_accepted}
  size="lg"
  className={`
    min-w-[140px] shrink-0 border-2 border-purple-600 
    hover:bg-purple-600 hover:text-white transition-colors
    disabled:opacity-50 disabled:cursor-not-allowed
  `}
>
  {submitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {existingEntry ? 'Updating...' : 'Submitting...'}
    </>
  ) : (
    <>
      {existingEntry ? 'Update Entry' : 'Submit Entry'}
    </>
  )}
</Button>

                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {Object.keys(roundsByDay).length > 0 ? (
                    /* Day Tabs - ENHANCED VISIBILITY */
                    <TabsList className="grid w-full grid-cols-5 mb-0 bg-gray-100 p-1">
                      {Object.keys(roundsByDay).sort().map(day => {
                        const dayRounds = roundsByDay[parseInt(day)];
                        const dayDate = dayRounds[0]?.trial_classes?.trial_days?.trial_date;
                        return (
                          <TabsTrigger 
                            key={day} 
                            value={day}
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-bold data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 border-2 data-[state=active]:border-blue-700 data-[state=inactive]:border-gray-300 transition-all"
                          >
                            <div className="text-center">
                              <div className="font-semibold">Day {day}</div>
                              <div className="text-xs">
                                {dayDate ? formatDayDate(dayDate) : 'TBD'}
                              </div>
                            </div>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <p>No class information available yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {Object.keys(roundsByDay).length > 0 && (
              <Card className="mt-0 border-t-0 rounded-t-none">
                <CardContent className="pt-4">
                  {/* Tab Content - Scrollable with max height */}
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    {Object.keys(roundsByDay).sort().map(day => (
                      <TabsContent key={day} value={day} className="mt-0">
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
                                className={`border rounded-lg p-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
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

                              {/* Division Dropdown */}
                              {requiresDivision(round.trial_classes?.class_name) && isSelected && (
                                <select
                                  value={formData.division_selections[round.id] || ''}
                                  onChange={(e) => handleDivisionChange(round.id, e.target.value)}
                                  className="h-9 px-3 border-2 border-purple-300 rounded-md text-sm font-medium bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  required
                                >
                                  <option value="">Select Division *</option>
                                  <option value="A">Division A (Beginner)</option>
                                  <option value="B">Division B (Experienced)</option>
                                  <option value="TO">TO (Trial Official)</option>
                                  <option value="JR">JR (Junior Handler)</option>
                                </select>
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
                  </div>
                </CardContent>
              </Card>
            )}
          </Tabs>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && confirmationData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Confirm Entry Update</CardTitle>
                <CardDescription>
                  You are updating an existing entry. Please confirm the changes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-sm">
                    <strong>Previous selections:</strong> {confirmationData.originalSelections} classes
                  </p>
                  <p className="text-sm">
                    <strong>New selections:</strong> {confirmationData.currentSelections} classes
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowConfirmDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmedSubmit}
                    className="flex-1"
                  >
                    Confirm Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}