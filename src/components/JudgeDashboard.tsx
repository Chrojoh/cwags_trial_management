// src/components/JudgeDashboard.tsx
// Judge management dashboard component - Simplified for Step 10
// This will be enhanced in Step 48 with full admin functionality

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, MapPin, Award, Search } from 'lucide-react';

// Simplified Judge interface for current implementation
interface Judge {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  province_state?: string;
  country?: string;
  level?: string;
  is_active: boolean;
}

interface JudgeDashboardProps {
  className?: string;
}

export default function JudgeDashboard({ className }: JudgeDashboardProps) {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [filteredJudges, setFilteredJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Simplified judge loading - will be enhanced in Step 48
  useEffect(() => {
    loadJudges();
  }, []);

  useEffect(() => {
    applySearch();
  }, [judges, searchTerm]);

  const loadJudges = async () => {
    try {
      setLoading(true);
      // For Step 10, we'll just show a placeholder
      // In Step 48, this will connect to the actual database
      setJudges([]);
      setError(null);
    } catch (err) {
      console.error('Error loading judges:', err);
      setError('Judge management will be available in Step 48 - Admin Data Management');
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchTerm.trim()) {
      setFilteredJudges(judges);
    } else {
      const filtered = judges.filter(judge =>
        judge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        judge.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredJudges(filtered);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading judge data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Cards - Placeholder for Step 48 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">200+</p>
              <p className="text-sm text-gray-600">Total Judges</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Award className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-gray-600">Multi-Qualified</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <MapPin className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-gray-600">Countries</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Search className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-gray-600">Search Results</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Interface - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Judge Management
          </CardTitle>
          <CardDescription>
            Full judge management will be available in Step 48
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search functionality coming in Step 48..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-64"
              disabled
            />
            <Button variant="outline" onClick={clearSearch} disabled>
              Clear Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      <Card>
        <CardHeader>
          <CardTitle>Judge Directory</CardTitle>
          <CardDescription>
            Advanced judge management coming in Step 48
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Judge Management Coming Soon</h3>
            <p className="mb-4">
              Full judge search, filtering, and management capabilities will be implemented in Step 48 - Admin Data Management.
            </p>
            <p className="text-sm text-gray-400">
              Current Status: Step 10 - Basic Navigation Structure (Complete)<br/>
              Next: Step 11 - Trial Creation Form
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}