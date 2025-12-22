// src/components/layout/sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus,
  Users,
  Link2,
  Clock,
  PlayCircle,
  FileText,
  DollarSign,
  Info,
  Copy,
  Check,
  X
} from 'lucide-react';
import { simpleTrialOperations } from '@/lib/trialOperationsSimple';

interface Trial {
  id: string;
  trial_name: string;
  start_date: string;
  end_date: string;
  trial_status: string;
}

interface SidebarProps {
  className?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  className = '', 
  isMobileOpen = false,
  onCloseMobile 
}) => {
  const pathname = usePathname();
  const [trials, setTrials] = useState<Trial[]>([]);
  const [expandedTrials, setExpandedTrials] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    loadRecentTrials();
  }, []);

  // Auto-expand trial if we're viewing one of its pages
  useEffect(() => {
    const trialIdMatch = pathname.match(/\/trials\/([^\/]+)/);
    if (trialIdMatch && trialIdMatch[1]) {
      const trialId = trialIdMatch[1];
      setExpandedTrials(prev => new Set(prev).add(trialId));
    }
  }, [pathname]);

  const loadRecentTrials = async () => {
    try {
      setLoading(true);
      const result = await simpleTrialOperations.getAllTrials();
      
      if (result.success && result.data) {
        // Sort by start_date (soonest first) and take 5 most recent
        const sorted = result.data
          .sort((a: Trial, b: Trial) => 
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          )
          .slice(0, 5);
        
        setTrials(sorted);
      }
    } catch (error) {
      console.error('Error loading trials:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrial = (trialId: string) => {
    setExpandedTrials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trialId)) {
        newSet.delete(trialId);
      } else {
        newSet.add(trialId);
      }
      return newSet;
    });
  };

  const copyEntryLink = async (trialId: string) => {
    const baseUrl = window.location.origin;
    const entryLink = `${baseUrl}/enter/${trialId}`;
    
    try {
      await navigator.clipboard.writeText(entryLink);
      setCopiedLink(trialId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const isActivePage = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href;
  };

  const isTrialActive = (trialId: string): boolean => {
    return pathname.includes(`/trials/${trialId}`);
  };

  const trialMenuItems = (trialId: string) => [
    {
      label: 'Trial Details',
      href: `/dashboard/trials/${trialId}`,
      icon: Info,
    },
    {
      label: 'Entries',
      href: `/dashboard/trials/${trialId}/entries`,
      icon: Users,
    },
    {
      label: 'Entry Link',
      href: '#',
      icon: copiedLink === trialId ? Check : Link2,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        copyEntryLink(trialId);
      },
      special: 'copy',
    },
    {
      label: 'Time Calculator',
      href: `/dashboard/trials/${trialId}/time-calculator`,
      icon: Clock,
    },
    {
      label: 'Running Order & Score Entry',
      href: `/dashboard/trials/${trialId}/live-event`,
      icon: PlayCircle,
    },
    {
      label: 'Summary',
      href: `/dashboard/trials/${trialId}/summary`,
      icon: FileText,
    },
    {
      label: 'Financial Summary',
      href: `/dashboard/trials/${trialId}/financials`,
      icon: DollarSign,
    },
  ];

  return (
    <>
      {/* Mobile Overlay - only shows when menu is open on mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar - slides in on mobile, always visible on desktop */}
      <nav 
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          w-64 bg-white border-r border-gray-200 overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${className}
        `}
      >
        <div className="p-4">
          
          {/* Mobile Close Button - only shows on mobile */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2 ${
            isActivePage('/dashboard')
              ? 'bg-orange-100 text-orange-900 border-l-4 border-orange-500'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Home className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>

        {/* Trials Section */}
        <div className="mt-4">
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Trials
            </h3>
          </div>

          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Loading trials...
            </div>
          ) : (
            <div className="space-y-1">
              {trials.map((trial) => {
                const isExpanded = expandedTrials.has(trial.id);
                const isActive = isTrialActive(trial.id);

                return (
                  <div key={trial.id}>
                    {/* Trial Name - Clickable to expand/collapse */}
                    <button
                      onClick={() => toggleTrial(trial.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-900'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span className="truncate">{trial.trial_name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                    </button>

                    {/* Trial Submenu */}
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                        {trialMenuItems(trial.id).map((item) => {
                          const Icon = item.icon;
                          const isItemActive = isActivePage(item.href);

                          if (item.special === 'copy') {
                            return (
                              <button
                                key={item.label}
                                onClick={item.onClick}
                                className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                  copiedLink === trial.id
                                    ? 'bg-green-50 text-green-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                <span>
                                  {copiedLink === trial.id ? 'Link Copied!' : item.label}
                                </span>
                              </button>
                            );
                          }

                          return (
                            <Link
                              key={item.label}
                              href={item.href}
                              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                isItemActive
                                  ? 'bg-orange-100 text-orange-900'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Create New Trial Button */}
              <Link
                href="/dashboard/trials/create"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors border-2 border-dashed border-orange-300 hover:border-orange-400 mt-3"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Trial</span>
              </Link>
            </div>
          )}
        </div>

        {/* Trial Stats - Optional */}
        {trials.length > 0 && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Recent Trials</span>
                <span className="font-medium">{trials.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Trials</span>
                <span className="font-medium text-orange-600">
                  {trials.filter(t => t.trial_status === 'active').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
};