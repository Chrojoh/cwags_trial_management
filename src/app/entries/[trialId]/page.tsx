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
    feo_available?: boolean; // ADD THIS LINE
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
  selected_rounds: string[];  // Changed from selected_classes
  feo_selections: string[];   // NEW: Track which rounds are FEO
  waiver_accepted: boolean;
}

export default function PublicEntryForm() {
  const params = useParams();
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
    feo_selections: [], // NEW
    waiver_accepted: false
  });

  const [registryLoading, setRegistryLoading] = useState(false);
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [cwagsInputValue, setCwagsInputValue] = useState('');
  const [editModeLoading, setEditModeLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<EntryFormData | null>(null);

  const formatCwagsNumber = (input: string): string => {
    const numbersOnly = input.replace(/\D/g, '');
    
    if (numbersOnly.length === 0) return '';
    if (numbersOnly.length <= 2) return numbersOnly;
    if (numbersOnly.length <= 6) return `${numbersOnly.slice(0, 2)}-${numbersOnly.slice(2)}`;
    
    const part1 = numbersOnly.slice(0, 2);
    const part2 = numbersOnly.slice(2, 6);
    const part3 = numbersOnly.slice(6, 8).padStart(2, '0');
   
    return `${part1}-${part2}-${part3}`;
  };

  const getClassOrder = (className: string): number => {
  const classOrder = [
    'Patrol', 'Detective', 'Investigator', 'Super Sleuth', 'Private Inv',
    'Detective Diversions', 'Ranger 1', 'Ranger 2', 'Ranger 3', 'Ranger 4', 'Ranger 5',
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
    const numbersOnly = input.replace(/\D/g, '');
    
    if (numbersOnly.length < 6) {
      throw new Error('C-WAGS number must be at least 6 digits');
    }
    
    const paddedNumbers = numbersOnly.padEnd(8, '0');
    const part1 = paddedNumbers.slice(0, 2);
    const part2 = paddedNumbers.slice(2, 6);  
    const part3 = paddedNumbers.slice(6, 8);
    
    return `${part1}-${part2}-${part3}`;
  };

  const handleCwagsSubmit = async () => {
    if (!cwagsInputValue.trim()) return;
    
    try {
      const cleanedNumber = cleanCwagsNumber(cwagsInputValue);
      setCwagsInputValue(cleanedNumber);
      setFormData(prev => ({ ...prev, cwags_number: cleanedNumber }));
      await handleCwagsLookup(cleanedNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid C-WAGS number format');
    }
  };

  useEffect(() => {
    if (trialId) {
      loadTrialData();
    }
  }, [trialId]);

  const loadTrialData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading trial data for public entry form:', trialId);

      const trialResult = await simpleTrialOperations.getTrial(trialId);
      console.log('Trial result:', trialResult);
      
      if (!trialResult.success) {
        throw new Error('Trial not found or not accepting entries');
      }

      if (!trialResult.data || !trialResult.data.entries_open) {
        throw new Error('This trial is not currently accepting entries');
      }

      const roundsResult = await simpleTrialOperations.getAllTrialRounds(trialId);
      if (!roundsResult.success) {
        console.warn('Failed to load trial rounds:', roundsResult.error);
      }

      setTrial(trialResult.data);
      setTrialRounds(roundsResult.data || []);

      console.log('Trial data loaded successfully');

    } catch (err) {
      console.error('Error loading trial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trial information');
    } finally {
      setLoading(false);
    }
  };

  const handleCwagsLookup = async (cwagsNumber: string) => {
    if (!cwagsNumber || cwagsNumber.length < 8) return;

    setRegistryLoading(true);
    setEditModeLoading(true);
    
    try {
      // First check for existing entry in this trial
      const existingResult = await simpleTrialOperations.getEntryByCwagsNumber(trialId, cwagsNumber);
      if (existingResult.success && existingResult.data) {
        console.log('Found existing entry:', existingResult.data);
        setExistingEntry(existingResult.data);
        
        // Get the entry selections for this entry
        console.log('Getting entry selections for entry ID:', existingResult.data.id);
        
        let selectionsResult = await simpleTrialOperations.getEntrySelections(existingResult.data.id);
        console.log('Entry selections result from function:', selectionsResult);
        
        // If that fails OR returns no data, try a direct query approach
        if (!selectionsResult.success || !selectionsResult.data || selectionsResult.data.length === 0) {
          console.log('Original function failed or returned no data, trying direct database query approach...');
          
          try {
            console.log('Performing direct supabase query...');
            const directQuery = await supabase
              .from('entry_selections')
              .select('*')
              .eq('entry_id', existingResult.data.id);
            
            console.log('Direct query result:', directQuery);
            
            if (directQuery.data && directQuery.data.length > 0) {
              selectionsResult = { success: true, data: directQuery.data };
              console.log('Direct query successful, found', directQuery.data.length, 'selections');
            } else {
              console.log('Direct query returned no data');
            }
          } catch (err) {
            console.error('Direct query failed:', err);
          }
        }
        
        let selectedRoundIds: string[] = [];
        if (selectionsResult.success && selectionsResult.data && selectionsResult.data.length > 0) {
          console.log('Processing selections data...');
          console.log('Raw selections data:', selectionsResult.data);
          
          // Get round IDs directly from selections
          selectedRoundIds = selectionsResult.data
            .map((selection: any) => selection.trial_round_id)
            .filter((roundId: string) => roundId)
            .filter((roundId: string, index: number, array: string[]) => array.indexOf(roundId) === index);
          
          console.log('Final selected round IDs:', selectedRoundIds);
        } else {
          console.warn('No entry selections found or query failed completely');
        }
        
        // Store original data with the correct original round selections
        const trueOriginalData = {
  handler_name: existingResult.data.handler_name || '',
  handler_email: existingResult.data.handler_email || '',
  handler_phone: existingResult.data.handler_phone || '',
  emergency_contact: '',
  cwags_number: cwagsNumber,
  dog_call_name: existingResult.data.dog_call_name || '',
  dog_breed: existingResult.data.dog_breed || '',
  dog_sex: existingResult.data.dog_sex || '',
  dog_dob: '',
  is_junior_handler: existingResult.data.is_junior_handler || false,
  waiver_accepted: existingResult.data.waiver_accepted || false,
  selected_rounds: selectedRoundIds,
  feo_selections: []  // ADD THIS
};
        
        console.log('Storing TRUE original data:', trueOriginalData);
        
        // Populate form with existing entry data
       const populatedData = {
  handler_name: existingResult.data.handler_name || '',
  handler_email: existingResult.data.handler_email || '',
  handler_phone: existingResult.data.handler_phone || '',
  emergency_contact: formData.emergency_contact,
  cwags_number: cwagsNumber,
  dog_call_name: existingResult.data.dog_call_name || '',
  dog_breed: existingResult.data.dog_breed || '',
  dog_sex: existingResult.data.dog_sex || '',
  dog_dob: formData.dog_dob,
  is_junior_handler: existingResult.data.is_junior_handler || false,
  waiver_accepted: existingResult.data.waiver_accepted || false,
  selected_rounds: selectedRoundIds,
  feo_selections: []  // ADD THIS
};
        
        setFormData(populatedData);
        setOriginalFormData(trueOriginalData);
        setExistingEntry({...existingResult.data, _originalFormData: trueOriginalData});
        
        console.log('Form populated with existing entry data');
        return;
      }

      // If no existing entry, try to populate from registry
      const registryResult = await simpleTrialOperations.getCwagsRegistryByNumber(cwagsNumber);
      if (registryResult.success && registryResult.data) {
        setFormData(prev => ({
          ...prev,
          handler_name: registryResult.data.handler_name || '',
          dog_call_name: registryResult.data.dog_call_name || ''
        }));
        console.log('Form populated from registry data');
      }
    } catch (err) {
      console.error('Error during C-WAGS lookup:', err);
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

      const result = await simpleTrialOperations.createRegistryEntry(registryData);
      if (result.success) {
        console.log('New registry entry created:', result.data);
      } else {
        console.warn('Failed to create registry entry:', result.error);
      }
    } catch (err) {
      console.error('Error saving to registry:', err);
    }
  };

  const detectChanges = () => {
    const originalData = originalFormData || (existingEntry?._originalFormData);
    if (!originalData) return [];
    
    const changes: Array<{field: string, label: string, old: any, new: any}> = [];
    
    // Check text fields
    const fieldsToCheck = [
      { key: 'handler_name', label: 'Handler Name' },
      { key: 'handler_email', label: 'Handler Email' },
      { key: 'handler_phone', label: 'Phone Number' },
      { key: 'emergency_contact', label: 'Emergency Contact' },
      { key: 'dog_call_name', label: 'Dog Call Name' },
      { key: 'dog_breed', label: 'Dog Breed' },
      { key: 'dog_sex', label: 'Dog Sex' },
      { key: 'dog_dob', label: 'Date of Birth' }
    ];
    
    fieldsToCheck.forEach(field => {
      const oldValue = originalData[field.key as keyof EntryFormData] || '';
      const newValue = formData[field.key as keyof EntryFormData] || '';
      if (oldValue !== newValue) {
        changes.push({
          field: field.key,
          label: field.label,
          old: oldValue,
          new: newValue
        });
      }
    });
    
    // Check boolean fields
    if (originalData.is_junior_handler !== formData.is_junior_handler) {
      changes.push({
        field: 'is_junior_handler',
        label: 'Junior Handler',
        old: originalData.is_junior_handler ? 'Yes' : 'No',
        new: formData.is_junior_handler ? 'Yes' : 'No'
      });
    }
    
    if (originalData.waiver_accepted !== formData.waiver_accepted) {
      changes.push({
        field: 'waiver_accepted',
        label: 'Waiver Accepted',
        old: originalData.waiver_accepted ? 'Yes' : 'No',
        new: formData.waiver_accepted ? 'Yes' : 'No'
      });
    }
    
    // Check round selections
    const originalRounds = [...originalData.selected_rounds].sort();
    const newRounds = [...formData.selected_rounds].sort();
    
    if (JSON.stringify(originalRounds) !== JSON.stringify(newRounds)) {
      const addedRounds = newRounds.filter(id => !originalRounds.includes(id));
      const removedRounds = originalRounds.filter(id => !newRounds.includes(id));
      
      const getRoundName = (roundId: string) => {
        const round = trialRounds.find(r => r.id === roundId);
        if (!round) return 'Unknown Round';
        
        const className = round.trial_classes?.class_name || 'Unknown';
        const gamesSubclass = round.trial_classes?.games_subclass;
        const roundNumber = round.round_number;
        
        return `${className}${gamesSubclass ? ` - ${gamesSubclass}` : ''} (Round ${roundNumber})`;
      };
      
      const roundChangeText = [
        ...addedRounds.map(id => `Added: ${getRoundName(id)}`),
        ...removedRounds.map(id => `Removed: ${getRoundName(id)}`)
      ].join(', ');
      
      changes.push({
        field: 'selected_rounds',
        label: 'Round Selections',
        old: originalRounds.map(getRoundName).join(', ') || 'None',
        new: roundChangeText
      });
    }
    
    return changes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 HANDLE SUBMIT CALLED');

    if (!formData.waiver_accepted) {
      setError('You must accept the waiver to submit your entry');
      return;
    }

    if (formData.selected_rounds.length === 0) {
      setError('Please select at least one round to enter');
      return;
    }

    if (!formData.cwags_number) {
      setError('C-WAGS registration number is required');
      return;
    }

    if (!formData.handler_email) {
      setError('Email address is required');
      return;
    }

    // If this is an existing entry, check for changes and show confirmation
    const originalData = originalFormData || (existingEntry?._originalFormData);
    
    if (existingEntry && originalData) {
      const changes = detectChanges();
      
      if (changes.length > 0 && !showConfirmDialog) {
        setShowConfirmDialog(true);
        return;
      }
    }

    await performSubmit();
  };

  const performSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setShowConfirmDialog(false);

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

      let entryResult;
      
      if (existingEntry) {
        // Update existing entry
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

        entryResult = await simpleTrialOperations.updateEntry(existingEntry.id, updateData);
        if (!entryResult.success) {
          throw new Error(entryResult.error as string);
        }
        entryResult.data = { ...existingEntry, ...updateData };
      } else {
        // Create new entry
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

        entryResult = await simpleTrialOperations.createEntry(entryData);
        if (!entryResult.success) {
          throw new Error(entryResult.error as string);
        }
      }

      // Create/update entry selections - directly to rounds
     const selections = formData.selected_rounds.map((roundId, index) => {
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
    running_position: index + 1,
    entry_status: 'entered'
  };
});

      if (selections.length > 0) {
        const selectionsResult = await simpleTrialOperations.createEntrySelections(
          entryResult.data.id,
          selections
        );
        if (!selectionsResult.success) {
          console.warn('Failed to create entry selections:', selectionsResult.error);
        }
      }

      setSuccess(true);
      console.log('Entry submitted successfully');

    } catch (err) {
      console.error('Error submitting entry:', err);
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
        ? [...prev.feo_selections.filter(id => id !== roundId), roundId]
        : prev.feo_selections.filter(id => id !== roundId);
        
      return {
        ...prev,
        selected_rounds: newSelectedRounds,
        feo_selections: newFeoSelections
      };
    }
  });
};

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

const calculateTotalFee = () => {
  return formData.selected_rounds.reduce((sum, roundId) => {
    const round = trialRounds.find(r => r.id === roundId);
    const isFeo = formData.feo_selections.includes(roundId);
    
    if (isFeo && round?.trial_classes?.feo_price) {
      return sum + round.trial_classes.feo_price;
    } else {
      return sum + (round?.trial_classes?.entry_fee || 0);
    }
  }, 0);
};

 const roundsByDay = trialRounds
  .sort((a, b) => {
    const aClassName = a.trial_classes?.class_name || '';
    const bClassName = b.trial_classes?.class_name || '';
    return getClassOrder(aClassName) - getClassOrder(bClassName);
  })
  .reduce((acc, round) => {
    const dayNumber = round.trial_classes?.trial_days?.day_number || 1;
    if (!acc[dayNumber]) acc[dayNumber] = [];
    acc[dayNumber].push(round);
    return acc;
  }, {} as Record<number, TrialRound[]>);
console.log('🔍 DEBUG roundsByDay:', roundsByDay);
console.log('🔍 DEBUG trialRounds:', trialRounds);
console.log('🔍 DEBUG Object.keys(roundsByDay):', Object.keys(roundsByDay));


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading trial information...</p>
        </div>
      </div>
    );
  }

  if (error && !trial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Trial Not Available</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              variant="outline"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {existingEntry ? 'Entry Updated!' : 'Entry Submitted!'}
            </h2>
            <p className="text-gray-600 mb-4">
              {existingEntry 
                ? 'Your entry has been updated successfully. You will receive confirmation from the trial secretary.'
                : 'Your entry has been submitted successfully. You will receive confirmation from the trial secretary.'
              }
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Total Fee:</strong> {formatCurrency(calculateTotalFee())}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Payment instructions will be sent to {formData.handler_email}
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Submit Another Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-blue-900">{trial?.trial_name}</CardTitle>
            <CardDescription className="text-blue-700 flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{trial && formatDate(trial.start_date)} - {trial && formatDate(trial.end_date)}</span>
              </span>
              <span>{trial?.club_name} • {trial?.location}</span>
            </CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-orange-600" />
                <span>C-WAGS Disclaimer & Liability Waiver</span>
              </CardTitle>
              <CardDescription>
                Please read and accept the waiver before proceeding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-40 overflow-y-auto mb-4">
                <div className="text-sm text-yellow-800 whitespace-pre-wrap">
                  {trial?.waiver_text || 'C-WAGS disclaimer and liability waiver text...'}
                </div>
              </div>
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="waiver"
                    checked={formData.waiver_accepted}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, waiver_accepted: checked as boolean }))
                    }
                    className="mt-1 h-5 w-5 border-2 border-orange-500 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                  />
                  <Label htmlFor="waiver" className="text-sm font-semibold text-orange-900 cursor-pointer leading-relaxed">
                    I have read, understood, and agree to the complete C-WAGS disclaimer and all terms above.
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-blue-600" />
                <span>C-WAGS Registration Lookup</span>
              </CardTitle>
              <CardDescription>
                Enter your C-WAGS registration number to auto-fill information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cwags_number">C-WAGS Registration Number *</Label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input
                        id="cwags_number"
                        placeholder="17-1734-02"
                        value={cwagsInputValue}
                        onChange={(e) => {
                          const formatted = formatCwagsNumber(e.target.value);
                          setCwagsInputValue(formatted);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCwagsSubmit();
                          }
                        }}
                        required
                      />
                      {(registryLoading || editModeLoading) && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                      )}
                    </div>
                    <Button 
                      type="button"
                      onClick={handleCwagsSubmit}
                      disabled={registryLoading || editModeLoading || !cwagsInputValue.trim()}
                    >
                      {(registryLoading || editModeLoading) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Lookup'
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-blue-600">
                    Enter any format: 17-1734-02, 1717342, or 17-1734-2. We'll format it correctly.
                  </p>
                </div>
                
                {existingEntry && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Edit className="h-4 w-4" />
                    <AlertDescription>
                      Editing existing entry for {existingEntry.dog_call_name} ({existingEntry.cwags_number}). 
                      Modify your selections below and submit to update.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <span>Handler Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="handler_name">Handler Name *</Label>
                  <Input
                    id="handler_name"
                    placeholder="Will auto-fill from registration"
                    value={formData.handler_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, handler_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handler_phone">Phone Number</Label>
                  <Input
                    id="handler_phone"
                    placeholder="(xxx) xxx-xxxx"
                    value={formData.handler_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, handler_phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handler_email">Email Address *</Label>
                  <Input
                    id="handler_email"
                    type="email"
                    placeholder="handler@email.com"
                    value={formData.handler_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, handler_email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Emergency Contact</Label>
                  <Input
                    id="emergency_contact"
                    placeholder="Name and phone number"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Dog className="h-5 w-5 text-blue-600" />
                <span>Dog Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dog_call_name">Dog's Call Name *</Label>
                  <Input
                    id="dog_call_name"
                    placeholder="Will auto-fill from registration"
                    value={formData.dog_call_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, dog_call_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dog_breed">Breed</Label>
                  <Input
                    id="dog_breed"
                    placeholder="Enter breed"
                    value={formData.dog_breed}
                    onChange={(e) => setFormData(prev => ({ ...prev, dog_breed: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dog_dob">Date of Birth</Label>
                  <Input
                    id="dog_dob"
                    type="date"
                    value={formData.dog_dob}
                    onChange={(e) => setFormData(prev => ({ ...prev, dog_dob: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dog_sex">Sex</Label>
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
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_junior_handler"
                      checked={formData.is_junior_handler}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, is_junior_handler: checked as boolean }))
                      }
                    />
                    <Label htmlFor="is_junior_handler">Junior Handler (Under 18)</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

<Card>
  <CardHeader>
    <CardTitle className="flex items-center space-x-2">
      <FileText className="h-5 w-5 text-blue-600" />
      <span>Class Entries</span>
    </CardTitle>
    <CardDescription>
      Select the specific rounds you want to enter
    </CardDescription>
  </CardHeader>
  <CardContent>
    {Object.keys(roundsByDay).length > 0 ? (
      <Tabs defaultValue={Object.keys(roundsByDay)[0]} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(roundsByDay).length}, minmax(0, 1fr))` }}>
          {Object.entries(roundsByDay).map(([dayNumber, rounds]) => {
            const dayDate = rounds[0]?.trial_classes?.trial_days?.trial_date;
            return (
              <TabsTrigger key={dayNumber} value={dayNumber} className="text-sm">
                Day {dayNumber} - {dayDate ? formatDate(dayDate).split(',')[0] : 'TBD'}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {Object.entries(roundsByDay).map(([dayNumber, rounds]) => {
          // Group by unique class ID to separate duplicate class names
          const roundsByClassId = rounds.reduce((acc, round) => {
            const classId = round.trial_class_id;
            if (!acc[classId]) acc[classId] = [];
            acc[classId].push(round);
            return acc;
          }, {} as Record<string, typeof rounds>);

          return (
            <TabsContent key={dayNumber} value={dayNumber} className="space-y-4">
              {Object.entries(roundsByClassId)
  .sort(([, aRounds], [, bRounds]) => {
    const aClassName = aRounds[0]?.trial_classes?.class_name || '';
    const bClassName = bRounds[0]?.trial_classes?.class_name || '';
    return getClassOrder(aClassName) - getClassOrder(bClassName);
  })
  .map(([classId, classRounds]) => {
    const classInfo = classRounds[0]?.trial_classes;
                
                return (
                  <div key={classId}>
                    {/* Class Header */}
                    <div className="bg-green-500 text-white p-3 rounded-t-lg">
                      <h3 className="text-lg font-semibold">
                        {classInfo?.class_name}
                        {classInfo?.games_subclass && ` ${classInfo.games_subclass}`}
                      </h3>
                    </div>

                    {/* Individual Round Cards */}
                    <div className="space-y-0">
                      {classRounds
                        .sort((a, b) => a.round_number - b.round_number)
                        .map((round, index) => {
                          const isSelected = formData.selected_rounds.includes(round.id);
                          const classPrice = Number(round.trial_classes?.entry_fee) || 0;
                          const feoPrice = Number(round.trial_classes?.feo_price) || 0;
                          const isLastRound = index === classRounds.length - 1;                          
                          return (
                          <div 
  key={round.id}
  className={`bg-white border border-t-0 p-4 flex items-center justify-between ${isLastRound ? 'rounded-b-lg' : ''}`}
>
  <div className="flex items-center space-x-3">
    <div>
      <div className="font-medium text-gray-900">
        Judge: {round.judge_name}
      </div>
      <div className="text-sm text-gray-600">
        Round {round.round_number}
      </div>
    </div>
  </div>
  <div className="flex items-center space-x-2">
    <button
      type="button"
      onClick={() => handleRoundSelection(round.id, 'regular')}
      className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
        isSelected && !formData.feo_selections.includes(round.id)
          ? 'bg-green-500 text-white border-green-500'
          : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
      }`}
    >
      Regular {formatCurrency(classPrice)}
    </button>
    
    {feoPrice > 0 && round.trial_classes?.feo_available && (
      <button
        type="button"
        onClick={() => handleRoundSelection(round.id, 'feo')}
        className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
          isSelected && formData.feo_selections.includes(round.id)
            ? 'bg-orange-500 text-white border-orange-500'
            : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100'
        }`}
      >
        feo {formatCurrency(feoPrice)}
      </button>
    )}
  </div>
</div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    ) : (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No rounds available for this trial</p>
      </div>
    )}
  </CardContent>
</Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Total Entry Fee</h3>
                  <p className="text-sm text-gray-600">
                    {formData.selected_rounds.length} rounds selected
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculateTotalFee())}
                  </div>
                  <p className="text-sm text-gray-600">Payment due at trial</p>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting || !formData.waiver_accepted || formData.selected_rounds.length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {existingEntry ? 'Updating Entry...' : 'Submitting Entry...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {existingEntry ? 'Update Entry' : 'Submit Entry'}
                  </>
                )}
              </Button>
              
              {!formData.waiver_accepted && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  Please accept the waiver to continue
                </p>
              )}
              
              {formData.waiver_accepted && formData.selected_rounds.length === 0 && (
                <p className="text-sm text-orange-600 mt-2 text-center">
                  Please select at least one round to enter
                </p>
              )}
              
              <div className="mt-4 pt-4 border-t text-center text-sm text-gray-600">
                <p>Questions? Contact {trial?.trial_secretary} at {trial?.secretary_email}</p>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Confirmation Dialog */}
        {showConfirmDialog && existingEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span>Confirm Entry Updates</span>
                </CardTitle>
                <CardDescription>
                  Review the changes below before updating the entry for {existingEntry.dog_call_name} ({existingEntry.cwags_number})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detectChanges().length > 0 ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-3">Changes to be made:</h4>
                        <div className="space-y-2">
                          {detectChanges().map((change, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium text-gray-700">{change.label}:</span>
                              <div className="ml-4 mt-1">
                                {change.field === 'selected_rounds' ? (
                                  <div className="text-orange-700 font-medium">{change.new}</div>
                                ) : (
                                  <>
                                    <div className="text-red-600">
                                      <span className="text-xs font-medium">FROM:</span> {change.old || '(empty)'}
                                    </div>
                                    <div className="text-green-600">
                                      <span className="text-xs font-medium">TO:</span> {change.new || '(empty)'}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            New total fee: {formatCurrency(calculateTotalFee())}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-gray-600">No changes detected.</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="flex justify-end space-x-3 p-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={submitting}
                >
                  Continue Editing
                </Button>
                <Button
                  onClick={performSubmit}
                  disabled={submitting || detectChanges().length === 0}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Entry...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Update
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© C-WAGS Trial Management System</p>
        </div>
      </div>
    </div>
  );
}