import React from 'react';
import { Calendar, MapPin, Clock, DollarSign, Users, Trophy } from 'lucide-react';

interface TrialEntryHeroProps {
  trial: {
    trial_name: string;
    club_name: string;
    start_date: string;
    end_date: string;
    city: string;
    province: string;
    country: string;
    entry_open_date?: string;
    entry_close_date?: string;
  };
  totalRounds?: number;
  entryFeeRange?: { min: number; max: number };
}

export default function TrialEntryHero({ trial, totalRounds, entryFeeRange }: TrialEntryHeroProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isEntryOpen = () => {
    const now = new Date();
    const openDate = trial.entry_open_date ? new Date(trial.entry_open_date) : null;
    const closeDate = trial.entry_close_date ? new Date(trial.entry_close_date) : null;
    
    if (openDate && now < openDate) return false;
    if (closeDate && now > closeDate) return false;
    return true;
  };

  const entryStatus = isEntryOpen();

  return (
    <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
            entryStatus 
              ? 'bg-green-500 text-white' 
              : 'bg-yellow-400 text-gray-900'
          }`}>
            {entryStatus ? '✓ Entries Open' : '⏳ Entries Not Yet Open'}
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          {trial.trial_name}
        </h1>
        
        <p className="text-xl md:text-2xl text-blue-100 mb-8">
          {trial.club_name}
        </p>

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Date */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-start space-x-3">
              <Calendar className="h-6 w-6 text-blue-200 mt-1" />
              <div>
                <p className="text-sm text-blue-200 font-medium mb-1">Trial Dates</p>
                <p className="text-lg font-semibold">{formatShortDate(trial.start_date)}</p>
                {trial.start_date !== trial.end_date && (
                  <p className="text-sm text-blue-200">to {formatShortDate(trial.end_date)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="flex items-start space-x-3">
              <MapPin className="h-6 w-6 text-blue-200 mt-1" />
              <div>
                <p className="text-sm text-blue-200 font-medium mb-1">Location</p>
                <p className="text-lg font-semibold">{trial.city}</p>
                <p className="text-sm text-blue-200">{trial.province}, {trial.country}</p>
              </div>
            </div>
          </div>

          {/* Entry Deadline */}
          {trial.entry_close_date && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-start space-x-3">
                <Clock className="h-6 w-6 text-blue-200 mt-1" />
                <div>
                  <p className="text-sm text-blue-200 font-medium mb-1">Entry Closes</p>
                  <p className="text-lg font-semibold">{formatShortDate(trial.entry_close_date)}</p>
                  <p className="text-sm text-blue-200">Submit early!</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="flex flex-wrap gap-6 text-blue-100">
          {totalRounds && totalRounds > 0 && (
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>{totalRounds} Classes Available</span>
            </div>
          )}
          {entryFeeRange && (
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>
                Entry Fees: ${entryFeeRange.min} - ${entryFeeRange.max}
              </span>
            </div>
          )}
        </div>

        {/* Call to Action */}
        {entryStatus && (
          <div className="mt-8">
            <p className="text-lg text-blue-100 mb-4">
              Ready to compete? Fill out the entry form below to register your dog.
            </p>
            <div className="flex items-center space-x-2 text-sm text-blue-200">
              <Users className="h-4 w-4" />
              <span>All skill levels welcome • FEO (For Exhibition Only) entries available</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}