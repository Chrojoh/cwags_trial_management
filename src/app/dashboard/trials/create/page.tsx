'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, FileText, ArrowRight, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { simpleTrialOperations } from '@/lib/trial-operations-simple';

// Canadian provinces/territories and US states
const LOCATIONS = {
  'Canada': [
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'ON', name: 'Ontario' },
    { code: 'QC', name: 'Quebec' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'YT', name: 'Yukon' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NU', name: 'Nunavut' }
  ],
  'United States': [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
    { code: 'DC', name: 'District of Columbia' }
  ]
};

// Default waiver text from the document
const DEFAULT_WAIVER = `DISCLAIMER -- MUST BE SENT WITH ENTRY

I/we acknowledge that I am/we are familiar with the current rules applying to Canine-Work And GameS Trials. I/we agree that the Host Club holding the Trial has the right to refuse entry for cause which the Host Club shall deem to be sufficient. Upon acceptance of this entry, I/we agree to hold Canine-Work And GameS, LLC, and its members and officers, this Host Club, its members, directors, officers, agents, show secretary, show chairperson, show committee and the owner or lessor of the premises and any employees of the aforementioned parties, any sponsors of this event, harmless from any claim or loss or injury which may be alleged to have been caused directly or indirectly to any person or thing by the act of this dog or handler while in or upon the show trial premises or grounds or near any entrance thereto, and I/we further agree to hold the fore mentioned parties harmless from any claim or loss of this dog by disappearance, theft, death or otherwise, and from any claim for damage or injury to the dog, whether any claim be caused or alleged to be caused by the negligence of the Host Club or any of the parties aforementioned, or by the negligence of any other person, or any other cause or causes. I/we hereby assume sole responsibility for and agree to indemnify and save the aforementioned parties harmless from any and all loss and expense (including legal fees) by reason of the liability imposed by law upon any of the aforementioned parties for damage because of bodily injuries, including death at any time resulting there from, sustained by any person or persons, including myself/ ourselves or on account of damage to property, arising out of or in consequence of my/our participation in the Trial, howsoever such injuries, death or damage to property may be caused and whether or not the same may have been caused by negligence of the aforementioned parties or any of their employees or agents, or any other persons.

THIS DISCLAIMER MUST BE SIGNED AND INCLUDED FOR A VALID ENTRY

I/we agree to abide by the rules of C-WAGS currently in effect at the time of the trial. I/we testify that the dog entered is healthy and vaccinated or titered. I/we certify that the dog entered is not dangerous to any person or other dog. By signing below, I/we agree to the disclaimer on this entry form.

_______________________________________________
Signature -- Owner or Parent / Guardian if Minor Date

Entry form MUST be signed and the Disclaimer MUST be attached for a valid entry.`;

const DEFAULT_NOTICE = `C-WAGS Notice to Exhibitors

Competitors, through submission of entry, acknowledge that they are knowledgeable of C-WAGS Obedience & Rally rules and regulations including but not limited to the following rules regarding entry:

• All exhibitors are expected to treat the judges, trial hosts, your canine partner and all other exhibitors with respect.
• All judges and trial hosts are expected to show respect to all exhibitors.
• This trial is open to all dogs registered with C-WAGS.
• Trial Hosts may elect to accept FOR EXHIBITION ONLY entries of non-registered dogs.
• Teams may be entered in multiple levels/classes at the same trial.
• Dogs must be shown by a member of the owner's immediate family.
• Collars: The dog must wear a flat type collar (buckle, snap or proper fit martingale) and/or body harness in the ring. Electronic training collars are not allowed on the show grounds.
• Owners with disabilities are encouraged to compete. Any necessary modifications to the exercises must be provided by the handler to the judge and approved by the judge.
• Safety shall always be of foremost consideration in actions and conduct by handlers at all times. Handlers, through entry at this event, accept full responsibility for themselves and the actions of their dogs.

In addition,
• The organizing committee may refuse any entry for any reason.
• THERE SHALL BE NO REFUND for entries in the event a dog and/or handler are dismissed from competition, regardless of reason for such dismissal. There will be no refunds if the trial has to be cancelled for any reason.
• Refunds will be made for females in season upon written request accompanied by a statement from the exhibitor's veterinarian.
• Returned checks do not constitute a valid entry. There will be a $35.00 service charge for returned checks. Payment of entry fees and service charges shall be made by money order within 7 days of notice to exhibitor of returned check. Any fees not received within 7 days of notice result in cancellation of event results for all classes for the registration number(s) of delinquent entry/entries. No reinstatement of results is possible.
• All competitors through entry at this event waive any and all rights relative to video broadcast of this event. Competitors shall have the right to videotape portions of this event for their personal use only. No portion of this event may be videotaped for commercial or other purposes.
• Dogs must be on leash while on show grounds unless being shown.`;

interface TrialFormData {
  trial_name: string;
  club_name: string;
  venue_name: string;
  city: string;
  province: string;
  country: string;
  full_address: string;
  start_date: string;
  end_date: string;
  trial_secretary: string;
  secretary_email: string;
  secretary_phone: string;
  max_entries_per_day: number;
  waiver_text: string;
  notes: string;
}

export default function CreateTrialPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [trialData, setTrialData] = useState<TrialFormData>({
    trial_name: '',
    club_name: '',
    venue_name: '',
    city: '',
    province: '',
    country: 'Canada', // Default to Canada
    full_address: '',
    start_date: '',
    end_date: '',
    trial_secretary: '',
    secretary_email: '',
    secretary_phone: '',
    max_entries_per_day: 50,
    waiver_text: DEFAULT_WAIVER,
    notes: ''
  });

  const [errors, setErrors] = useState<Partial<TrialFormData>>({});

  // Auto-fill form fields when user data is available
  useEffect(() => {
    if (user) {
      setTrialData(prev => ({
        ...prev,
        club_name: user.club_name || '',
        trial_secretary: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}`.trim()
          : '',
        secretary_email: user.email || '',
        secretary_phone: user.phone || ''
      }));
    }
  }, [user]);

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<TrialFormData> = {};

    if (step === 1) {
      if (!trialData.trial_name.trim()) newErrors.trial_name = 'Trial name is required';
      if (!trialData.club_name.trim()) newErrors.club_name = 'Club name is required';
      if (!trialData.city.trim()) newErrors.city = 'City is required';
      if (!trialData.province) newErrors.province = 'Province/State is required';
      if (!trialData.country) newErrors.country = 'Country is required';
      if (!trialData.start_date) newErrors.start_date = 'Start date is required';
      if (!trialData.end_date) newErrors.end_date = 'End date is required';
      if (!trialData.trial_secretary.trim()) newErrors.trial_secretary = 'Secretary name is required';
      if (!trialData.secretary_email.trim()) newErrors.secretary_email = 'Secretary email is required';
      
      if (trialData.start_date && trialData.end_date && trialData.start_date > trialData.end_date) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof TrialFormData, value: string | number) => {
    setTrialData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save trial to database and proceed to days
      await saveTrialAndProceed();
    }
  };

  const saveTrialAndProceed = async () => {
    if (!user) {
      alert('User not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Build the location string from structured data
      const locationParts = [
        trialData.venue_name,
        trialData.city,
        trialData.province,
        trialData.country
      ].filter(part => part.trim());
      
      const location = locationParts.join(', ');

      const trialToSave = {
        trial_name: trialData.trial_name,
        club_name: trialData.club_name,
        location: location,
        start_date: trialData.start_date,
        end_date: trialData.end_date,
        created_by: user.id,
        trial_status: 'draft',
        premium_published: false,
        entries_open: false,
        entries_close_date: null,
        max_entries_per_day: trialData.max_entries_per_day,
        trial_secretary: trialData.trial_secretary,
        secretary_email: trialData.secretary_email,
        secretary_phone: trialData.secretary_phone || null,
        waiver_text: trialData.waiver_text,
        fee_configuration: {}, // Empty object instead of null
        notes: trialData.notes || null
      };

      console.log('Saving trial data:', trialToSave); // Debug log

      const result = await simpleTrialOperations.createTrial(trialToSave);
      
      if (result.success && result.data) {
        console.log('Trial created successfully:', result.data);
        // Navigate to day selection with trial ID
        router.push(`/dashboard/trials/create/days?trial=${result.data.id}`);
      } else {
        console.error('Error creating trial:', result.error);
        alert(`Error creating trial: ${result.error?.toString() || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving trial:', error);
      alert('Error creating trial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Build the location string from structured data
      const locationParts = [
        trialData.venue_name || 'TBD',
        trialData.city || 'TBD',
        trialData.province || 'AB',
        trialData.country || 'Canada'
      ].filter(part => part.trim());
      
      const location = locationParts.join(', ');

      const trialToSave = {
        trial_name: trialData.trial_name || 'Draft Trial',
        club_name: trialData.club_name || user.club_name || 'Unknown Club',
        location: location,
        start_date: trialData.start_date || new Date().toISOString().split('T')[0],
        end_date: trialData.end_date || new Date().toISOString().split('T')[0],
        created_by: user.id,
        trial_status: 'draft',
        premium_published: false,
        entries_open: false,
        entries_close_date: null,
        max_entries_per_day: trialData.max_entries_per_day,
        trial_secretary: trialData.trial_secretary,
        secretary_email: trialData.secretary_email,
        secretary_phone: trialData.secretary_phone || null,
        waiver_text: trialData.waiver_text,
        fee_configuration: {}, // Empty object instead of null
        notes: trialData.notes || null
      };

      console.log('Saving draft:', trialToSave); // Debug log

      const result = await simpleTrialOperations.createTrial(trialToSave);
      
      if (result.success) {
        console.log('Draft saved successfully:', result.data);
        alert('Draft saved successfully!');
      } else {
        console.error('Error saving draft:', result.error);
        alert(`Error saving draft: ${result.error?.toString() || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Error saving draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <MainLayout title="Create New Trial">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              You must be logged in to create a trial.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Trials', href: '/dashboard/trials' },
    { label: 'Create Trial' }
  ];

  const stepTitles = [
    'Basic Information',
    'Waiver & Notice Text'
  ];

  return (
    <MainLayout 
      title="Create New Trial"
      breadcrumbItems={breadcrumbItems}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Auto-fill notification */}
        {user && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              <strong>Auto-filled:</strong> Form has been pre-populated with your account information. You can modify any field as needed.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-8 mb-8">
          {stepTitles.map((title, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            
            return (
              <div key={stepNumber} className="flex items-center">
                <div className={`flex items-center space-x-2 ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNumber}
                  </div>
                  <span className="text-sm font-medium">{title}</span>
                </div>
                {index < stepTitles.length - 1 && (
                  <div className={`ml-4 w-16 h-0.5 ${
                    stepNumber < currentStep ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Basic Trial Information</span>
              </CardTitle>
              <CardDescription>
                Enter the basic details for your C-WAGS trial event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="trial_name">Trial Name *</Label>
                  <Input
                    id="trial_name"
                    value={trialData.trial_name}
                    onChange={(e) => handleInputChange('trial_name', e.target.value)}
                    placeholder="e.g., Spring Championship Trial"
                    className={errors.trial_name ? 'border-red-500' : ''}
                  />
                  {errors.trial_name && (
                    <p className="text-sm text-red-600">{errors.trial_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="club_name">Host Club Name * 
                    {user?.club_name && (
                      <Badge variant="secondary" className="ml-2 text-xs">Auto-filled</Badge>
                    )}
                  </Label>
                  <Input
                    id="club_name"
                    value={trialData.club_name}
                    onChange={(e) => handleInputChange('club_name', e.target.value)}
                    placeholder="e.g., Toronto Working Dogs Club"
                    className={errors.club_name ? 'border-red-500' : ''}
                  />
                  {errors.club_name && (
                    <p className="text-sm text-red-600">{errors.club_name}</p>
                  )}
                </div>

                {/* Location Section */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-base font-medium flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>Trial Location</span>
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="venue_name">Venue Name</Label>
                      <Input
                        id="venue_name"
                        value={trialData.venue_name}
                        onChange={(e) => handleInputChange('venue_name', e.target.value)}
                        placeholder="e.g., Training Center"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={trialData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="e.g., Calgary"
                        className={errors.city ? 'border-red-500' : ''}
                      />
                      {errors.city && (
                        <p className="text-sm text-red-600">{errors.city}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Select 
                        value={trialData.country}
                        onValueChange={(value) => {
                          handleInputChange('country', value);
                          // Reset province when country changes
                          handleInputChange('province', '');
                        }}
                      >
                        <SelectTrigger className={errors.country ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(LOCATIONS).map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.country && (
                        <p className="text-sm text-red-600">{errors.country}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="province">Province/State *</Label>
                      <Select 
                        value={trialData.province}
                        onValueChange={(value) => handleInputChange('province', value)}
                        disabled={!trialData.country}
                      >
                        <SelectTrigger className={errors.province ? 'border-red-500' : ''}>
                          <SelectValue placeholder={
                            trialData.country === 'Canada' ? 'Select province' : 
                            trialData.country === 'United States' ? 'Select state' : 
                            'Select country first'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {trialData.country && LOCATIONS[trialData.country as keyof typeof LOCATIONS]?.map((location) => (
                            <SelectItem key={location.code} value={location.code}>
                              {location.name} ({location.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.province && (
                        <p className="text-sm text-red-600">{errors.province}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="full_address">Full Address (Optional)</Label>
                    <Textarea
                      id="full_address"
                      value={trialData.full_address}
                      onChange={(e) => handleInputChange('full_address', e.target.value)}
                      placeholder="Complete address with postal code for GPS navigation..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={trialData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className={errors.start_date ? 'border-red-500' : ''}
                  />
                  {errors.start_date && (
                    <p className="text-sm text-red-600">{errors.start_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={trialData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    className={errors.end_date ? 'border-red-500' : ''}
                  />
                  {errors.end_date && (
                    <p className="text-sm text-red-600">{errors.end_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trial_secretary">Trial Secretary Name *
                    {user?.first_name && user?.last_name && (
                      <Badge variant="secondary" className="ml-2 text-xs">Auto-filled</Badge>
                    )}
                  </Label>
                  <Input
                    id="trial_secretary"
                    value={trialData.trial_secretary}
                    onChange={(e) => handleInputChange('trial_secretary', e.target.value)}
                    placeholder="Secretary's full name"
                    className={errors.trial_secretary ? 'border-red-500' : ''}
                  />
                  {errors.trial_secretary && (
                    <p className="text-sm text-red-600">{errors.trial_secretary}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secretary_email">Secretary Email *
                    {user?.email && (
                      <Badge variant="secondary" className="ml-2 text-xs">Auto-filled</Badge>
                    )}
                  </Label>
                  <Input
                    id="secretary_email"
                    type="email"
                    value={trialData.secretary_email}
                    onChange={(e) => handleInputChange('secretary_email', e.target.value)}
                    placeholder="secretary@email.com"
                    className={errors.secretary_email ? 'border-red-500' : ''}
                  />
                  {errors.secretary_email && (
                    <p className="text-sm text-red-600">{errors.secretary_email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secretary_phone">Secretary Phone
                    {user?.phone && (
                      <Badge variant="secondary" className="ml-2 text-xs">Auto-filled</Badge>
                    )}
                  </Label>
                  <Input
                    id="secretary_phone"
                    value={trialData.secretary_phone}
                    onChange={(e) => handleInputChange('secretary_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_entries">Max Entries Per Day</Label>
                  <Input
                    id="max_entries"
                    type="number"
                    min="1"
                    max="200"
                    value={trialData.max_entries_per_day}
                    onChange={(e) => handleInputChange('max_entries_per_day', parseInt(e.target.value) || 50)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={trialData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any additional information about this trial..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Location Preview */}
              {(trialData.city || trialData.province || trialData.country) && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-sm font-medium text-blue-900">Location Preview:</Label>
                  <p className="text-blue-800">
                    {[trialData.venue_name, trialData.city, trialData.province, trialData.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Waiver & Notice Text */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>Waiver Text</span>
                </CardTitle>
                <CardDescription>
                  Edit the waiver text that will be included with entries. Default text provided.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="waiver_text">Waiver Text</Label>
                  <Textarea
                    id="waiver_text"
                    value={trialData.waiver_text}
                    onChange={(e) => handleInputChange('waiver_text', e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-gray-600">
                    You can copy and paste custom waiver text or modify the default text above.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notice to Exhibitors</CardTitle>
                <CardDescription>
                  Standard C-WAGS notice that will be included with trial information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notice_text">Notice to Exhibitors</Label>
                  <Textarea
                    id="notice_text"
                    value={DEFAULT_NOTICE}
                    readOnly
                    rows={15}
                    className="font-mono text-sm bg-gray-50"
                  />
                  <p className="text-sm text-gray-600">
                    This is the standard C-WAGS notice to exhibitors.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </Button>
          </div>

          <div className="flex space-x-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={loading}
              >
                Previous
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{currentStep === 2 ? 'Continue to Days' : 'Next'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}