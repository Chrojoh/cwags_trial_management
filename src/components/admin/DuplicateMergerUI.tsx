'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';

// Type Definitions
interface DuplicateEntry {
  handler_name: string;
  dog_call_name: string;
  cwags_number: string;
  status: string;
  entry_id: string;
  submitted_at: string;
  num_selections: number;
  num_scores: number;
  action: 'KEEP' | 'MERGE (has scores!)' | 'MERGE (has selections)' | 'DELETE (empty)';
}

interface AnalysisStats {
  total: number;
  primaryEntries: number;
  toMerge: number;
  toDelete: number;
  totalSelections: number;
  totalScores: number;
}

interface MergeResult {
  success: boolean;
  totalGroups: number;
  mergedEntries: number;
  deletedEntries: number;
  movedSelections: number;
  preservedScores: number;
  errors: string[];
}

interface AnalysisResult {
  stats: AnalysisStats;
  groups: Record<string, DuplicateEntry[]>;
  mergeResult?: MergeResult;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

interface ResultStatProps {
  label: string;
  value: number;
}

interface ActionBadgeProps {
  action: string;
}

const DuplicateMergerUI = () => {
  const [duplicateData, setDuplicateData] = useState<DuplicateEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trialId, setTrialId] = useState('71871ff4-1710-4a90-8999-a08b3c9379ec');

  // Your actual duplicate data - paste the full JSON array here
  const sampleDuplicateData: DuplicateEntry[] = [
    
       
  {
    "handler_name": "Aarin Frigon",
    "dog_call_name": "Winston",
    "cwags_number": "23-4647-02",
    "status": "✅ PRIMARY",
    "entry_id": "b99b44ec-b594-46d2-8d64-78d30d60d42b",
    "submitted_at": "2025-11-14 07:23:46.103+00",
    "num_selections": 11,
    "num_scores": 10,
    "action": "KEEP"
  },
  {
    "handler_name": "Aarin Frigon",
    "dog_call_name": "Winston",
    "cwags_number": "23-4647-02",
    "status": "❌ DUPLICATE #1",
    "entry_id": "247e4a82-3be5-4ea2-a1d4-f6da23d1f3f8",
    "submitted_at": "2025-11-23 03:31:19.646+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Amanda Casavant",
    "dog_call_name": "Parker",
    "cwags_number": "25-5505-01",
    "status": "✅ PRIMARY",
    "entry_id": "bf1ef238-87b9-4338-bf2f-0ad572767ebc",
    "submitted_at": "2025-12-07 08:01:41.508+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "KEEP"
  },
  {
    "handler_name": "Amanda Casavant",
    "dog_call_name": "Parker",
    "cwags_number": "25-5505-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "58bb9696-23cf-4202-a8e9-f01fa7b48e19",
    "submitted_at": "2025-12-15 04:02:21.8+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Amanda Casavant",
    "dog_call_name": "Parker",
    "cwags_number": "25-5505-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "13dbdda8-b538-4078-9289-72a782d7d426",
    "submitted_at": "2025-12-15 04:05:39.489+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Amanda Cromer",
    "dog_call_name": "Stanley",
    "cwags_number": "24-5198-01",
    "status": "✅ PRIMARY",
    "entry_id": "87f44b8e-73f6-4008-9f36-2e6501e6e621",
    "submitted_at": "2025-11-14 07:16:13.324+00",
    "num_selections": 12,
    "num_scores": 10,
    "action": "KEEP"
  },
  {
    "handler_name": "Amanda Cromer",
    "dog_call_name": "Stanley",
    "cwags_number": "24-5198-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "1e2ad09d-0683-4062-a09e-c72d154d7164",
    "submitted_at": "2025-11-23 08:30:02.715+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Amanda Cromer",
    "dog_call_name": "Stanley",
    "cwags_number": "24-5198-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "42f6636b-56a5-4a3e-82a1-12f47a900558",
    "submitted_at": "2025-11-23 08:36:42.171+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Amanda Cromer",
    "dog_call_name": "Stanley",
    "cwags_number": "24-5198-01",
    "status": "❌ DUPLICATE #3",
    "entry_id": "9802895b-8b3b-4a9d-b61c-aa7250e889a0",
    "submitted_at": "2025-11-23 08:39:55.443+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Amanda Cromer",
    "dog_call_name": "Stanley",
    "cwags_number": "24-5198-01",
    "status": "❌ DUPLICATE #4",
    "entry_id": "84b47b71-f167-4215-bfec-b4b04f7bcc1b",
    "submitted_at": "2025-12-05 05:23:33.639+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Amanda Cromer",
    "dog_call_name": "Stanley",
    "cwags_number": "24-5198-01",
    "status": "❌ DUPLICATE #5",
    "entry_id": "46256609-0079-4528-b104-658fc74992b3",
    "submitted_at": "2025-12-15 03:24:30.349+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Amanda Cromer",
    "dog_call_name": "Stanley",
    "cwags_number": "24-5198-01",
    "status": "❌ DUPLICATE #6",
    "entry_id": "5bc31ebd-68dd-4516-b4b7-37b2fe64746a",
    "submitted_at": "2025-12-15 03:28:44.354+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Anne Fletcher",
    "dog_call_name": "Araia",
    "cwags_number": "22-4153-03",
    "status": "✅ PRIMARY",
    "entry_id": "19c86c1e-30f2-4b05-8333-2fff43681280",
    "submitted_at": "2025-11-14 07:24:57.799+00",
    "num_selections": 4,
    "num_scores": 2,
    "action": "KEEP"
  },
  {
    "handler_name": "Anne Fletcher",
    "dog_call_name": "Araia",
    "cwags_number": "22-4153-03",
    "status": "❌ DUPLICATE #1",
    "entry_id": "9eb5121c-a0ac-4394-b7a5-191a3c0f288c",
    "submitted_at": "2025-12-05 05:10:15.976+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Anne Fletcher",
    "dog_call_name": "Araia",
    "cwags_number": "22-4153-03",
    "status": "❌ DUPLICATE #2",
    "entry_id": "b4893e5a-0b8a-48ba-9ad0-d2b3e938c77a",
    "submitted_at": "2025-12-05 05:11:27.558+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1955-02",
    "status": "✅ PRIMARY",
    "entry_id": "456b4ad6-2a10-4787-8805-1fe7fd6e8ddf",
    "submitted_at": "2025-11-14 07:08:50.505+00",
    "num_selections": 11,
    "num_scores": 7,
    "action": "KEEP"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1955-02",
    "status": "❌ DUPLICATE #1",
    "entry_id": "228b6730-9639-4862-946b-c75573f4f80b",
    "submitted_at": "2025-11-23 08:39:36.253+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1955-02",
    "status": "❌ DUPLICATE #2",
    "entry_id": "728a8f5b-140c-4907-a3d4-c2ad7d47f0a6",
    "submitted_at": "2025-11-23 08:52:46.577+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1955-02",
    "status": "❌ DUPLICATE #3",
    "entry_id": "cee05ac8-adf2-4b8f-a882-a2a857f13f05",
    "submitted_at": "2025-11-23 08:53:13.863+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1955-02",
    "status": "❌ DUPLICATE #4",
    "entry_id": "8df161fd-4ff8-47f4-b046-f6fb8bf4df8c",
    "submitted_at": "2025-12-07 05:06:42.074+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1955-02",
    "status": "❌ DUPLICATE #5",
    "entry_id": "b5c8eb3e-5430-4ae1-9225-9e4f5c534208",
    "submitted_at": "2025-12-07 07:59:21.702+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1955-02",
    "status": "❌ DUPLICATE #6",
    "entry_id": "77e9b35b-34f4-4534-a67a-b3c8b01873cc",
    "submitted_at": "2025-12-07 07:59:59.265+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1955-02",
    "status": "❌ DUPLICATE #7",
    "entry_id": "5f6acb3a-db38-4181-89e2-6c170bb385af",
    "submitted_at": "2025-12-07 08:04:31.687+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1955-02",
    "status": "❌ DUPLICATE #8",
    "entry_id": "df511d5e-12f6-44f5-8470-d193aec0748a",
    "submitted_at": "2025-12-15 04:41:05.01+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Hiro",
    "cwags_number": "17-1955-01",
    "status": "✅ PRIMARY",
    "entry_id": "4471a8f3-4da6-428f-a8ce-1ce918d2dad9",
    "submitted_at": "2025-11-14 07:08:14.55+00",
    "num_selections": 9,
    "num_scores": 9,
    "action": "KEEP"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Hiro",
    "cwags_number": "17-1955-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "c8fec69f-2ac9-4093-b448-d9260cdec374",
    "submitted_at": "2025-11-23 08:27:07.15+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Hiro",
    "cwags_number": "17-1955-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "36c8f5c7-bf71-453f-8d41-197f34230240",
    "submitted_at": "2025-11-23 08:32:57.492+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Hiro",
    "cwags_number": "17-1955-01",
    "status": "❌ DUPLICATE #3",
    "entry_id": "df39a967-d9ea-4e4e-93ca-3ea1cfc38080",
    "submitted_at": "2025-11-23 08:42:31.05+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Hiro",
    "cwags_number": "17-1955-01",
    "status": "❌ DUPLICATE #4",
    "entry_id": "f84c1024-c3b9-4c8b-a82a-a6f52804d3a6",
    "submitted_at": "2025-11-23 08:45:38.234+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Hiro",
    "cwags_number": "17-1955-01",
    "status": "❌ DUPLICATE #5",
    "entry_id": "d74cf3f8-718b-460c-a119-91af5bc3b098",
    "submitted_at": "2025-11-23 08:46:49.803+00",
    "num_selections": 0,
    "num_scores": 0,
    "action": "DELETE (empty)"
  },
  {
    "handler_name": "Brennan Johansen",
    "dog_call_name": "Hiro",
    "cwags_number": "17-1955-01",
    "status": "❌ DUPLICATE #6",
    "entry_id": "dc56986b-02c1-4382-ab60-e0de248bf8d5",
    "submitted_at": "2025-11-23 08:49:11.011+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Brittany Partington",
    "dog_call_name": "Jasper",
    "cwags_number": "25-5525-01",
    "status": "✅ PRIMARY",
    "entry_id": "f875fcdf-c829-47b3-b713-271f990b8cef",
    "submitted_at": "2025-12-10 08:32:54.496+00",
    "num_selections": 3,
    "num_scores": 3,
    "action": "KEEP"
  },
  {
    "handler_name": "Brittany Partington",
    "dog_call_name": "Jasper",
    "cwags_number": "25-5525-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "7d2fc335-0ade-4839-adb6-930d992a7799",
    "submitted_at": "2025-12-15 03:02:55.584+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "✅ PRIMARY",
    "entry_id": "7a2381f3-b831-4351-879d-6d819fc156b1",
    "submitted_at": "2025-11-14 04:36:33.906+00",
    "num_selections": 6,
    "num_scores": 6,
    "action": "KEEP"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "012c8cde-ffcf-4d69-9eeb-3ebb7d4945d9",
    "submitted_at": "2025-11-23 08:26:19.684+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "a07d7d3b-69e5-4084-9cc6-1015ce287ddb",
    "submitted_at": "2025-11-23 08:31:17.131+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #3",
    "entry_id": "d7227e54-fa61-41d4-a90e-2b664eed601a",
    "submitted_at": "2025-11-23 08:39:05.833+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #4",
    "entry_id": "91a38086-6e14-4e9e-9394-01e59ea0ff29",
    "submitted_at": "2025-11-23 08:52:07.327+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #5",
    "entry_id": "83e1c879-d6cc-484b-bfbe-acef7d8fe9a0",
    "submitted_at": "2025-11-23 08:52:28.005+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #6",
    "entry_id": "9d3767be-c332-4a07-b9c9-832fa52cc44b",
    "submitted_at": "2025-12-01 03:32:26.024+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #7",
    "entry_id": "e9122dab-6626-49e5-9f85-c52a1622b7ff",
    "submitted_at": "2025-12-05 05:25:27.173+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #8",
    "entry_id": "22b447ad-6641-4d48-8690-7fcd7828e425",
    "submitted_at": "2025-12-15 03:01:15.543+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #9",
    "entry_id": "61650cbb-740d-4ef1-81d6-f7ee8a2a58ed",
    "submitted_at": "2025-12-15 03:04:11.006+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Chelsea Warman",
    "dog_call_name": "Goose",
    "cwags_number": "17-1956-01",
    "status": "❌ DUPLICATE #10",
    "entry_id": "30de6642-adee-4b98-ba8b-63dbda397b0e",
    "submitted_at": "2025-12-15 04:05:58.393+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Cheryl Duggan",
    "dog_call_name": "Elton",
    "cwags_number": "24-5168-01",
    "status": "✅ PRIMARY",
    "entry_id": "b3868b75-08eb-440a-9466-e1c25242ad9e",
    "submitted_at": "2025-11-14 07:36:56.904+00",
    "num_selections": 8,
    "num_scores": 8,
    "action": "KEEP"
  },
  {
    "handler_name": "Cheryl Duggan",
    "dog_call_name": "Elton",
    "cwags_number": "24-5168-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "0df4eca0-f005-45b6-8ba6-0f9c97d58ce9",
    "submitted_at": "2025-12-15 04:22:03.727+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Cortnee Chulo",
    "dog_call_name": "Fable",
    "cwags_number": "23-4205-01",
    "status": "✅ PRIMARY",
    "entry_id": "89780d07-1ea7-4eec-b9e9-55a8cee2b03d",
    "submitted_at": "2025-12-07 05:15:11.566+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "KEEP"
  },
  {
    "handler_name": "Cortnee Chulo",
    "dog_call_name": "Fable",
    "cwags_number": "23-4205-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "78681ff4-7d15-4d16-b9aa-90cb57473e10",
    "submitted_at": "2025-12-07 05:18:48.38+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Cortnee Chulo",
    "dog_call_name": "Fable",
    "cwags_number": "23-4205-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "b376eb8b-5263-45a5-8360-ea78a8341ab1",
    "submitted_at": "2025-12-07 05:19:44.708+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Gayle Cohen",
    "dog_call_name": "Zoey",
    "cwags_number": "25-5384-01",
    "status": "✅ PRIMARY",
    "entry_id": "b6ba15bc-e785-4523-816a-6122e8d40f85",
    "submitted_at": "2025-12-05 05:08:20.365+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "KEEP"
  },
  {
    "handler_name": "Gayle Cohen",
    "dog_call_name": "Zoey",
    "cwags_number": "25-5384-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "663978e9-4a87-4da1-8ea9-e460a1da3c43",
    "submitted_at": "2025-12-05 05:13:34.567+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Heather Schneider",
    "dog_call_name": "Emma",
    "cwags_number": "15-0894-01",
    "status": "✅ PRIMARY",
    "entry_id": "7ac4250a-1113-4fa7-89f4-8171eb66a36a",
    "submitted_at": "2025-11-23 08:29:32.237+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "KEEP"
  },
  {
    "handler_name": "Heather Schneider",
    "dog_call_name": "Emma",
    "cwags_number": "15-0894-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "9914be3f-9226-44ba-86d1-bd3d0d2006f4",
    "submitted_at": "2025-11-23 08:36:17.472+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Heather Schneider",
    "dog_call_name": "Emma",
    "cwags_number": "15-0894-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "f88d41c6-518f-48c6-9469-465330c58ab1",
    "submitted_at": "2025-11-23 08:43:16.165+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Heather Schneider",
    "dog_call_name": "Gabby",
    "cwags_number": "15-0894-02",
    "status": "✅ PRIMARY",
    "entry_id": "11311917-7140-4056-a77b-eb9e94a6402d",
    "submitted_at": "2025-11-14 07:28:38.47+00",
    "num_selections": 14,
    "num_scores": 13,
    "action": "KEEP"
  },
  {
    "handler_name": "Heather Schneider",
    "dog_call_name": "Gabby",
    "cwags_number": "15-0894-02",
    "status": "❌ DUPLICATE #1",
    "entry_id": "6417dbac-dd5c-4062-8a76-dc7fb9736e82",
    "submitted_at": "2025-12-01 01:21:26.662+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Heather Schneider",
    "dog_call_name": "Gabby",
    "cwags_number": "15-0894-02",
    "status": "❌ DUPLICATE #2",
    "entry_id": "b32614b5-0db1-4bc4-b6d2-d6fbc00018ff",
    "submitted_at": "2025-12-01 01:27:52.62+00",
    "num_selections": 0,
    "num_scores": 0,
    "action": "DELETE (empty)"
  },
  {
    "handler_name": "Heather Schneider",
    "dog_call_name": "Gabby",
    "cwags_number": "15-0894-02",
    "status": "❌ DUPLICATE #3",
    "entry_id": "a2a87955-dab1-4028-a40e-9d3719a222b2",
    "submitted_at": "2025-12-15 04:34:49.542+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Heather Schneider",
    "dog_call_name": "Gabby",
    "cwags_number": "15-0894-02",
    "status": "❌ DUPLICATE #4",
    "entry_id": "f471de8b-9e71-40b6-ad1d-ecbb76e332f1",
    "submitted_at": "2025-12-15 06:08:15.255+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Luka",
    "cwags_number": "22-4168-02",
    "status": "✅ PRIMARY",
    "entry_id": "88ae3ced-4d38-413c-b4f8-db919db92eec",
    "submitted_at": "2025-11-14 03:33:54.935+00",
    "num_selections": 13,
    "num_scores": 8,
    "action": "KEEP"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Luka",
    "cwags_number": "22-4168-02",
    "status": "❌ DUPLICATE #1",
    "entry_id": "684e028e-e476-42a6-824c-ade1dcf6b1f6",
    "submitted_at": "2025-12-05 05:26:24.864+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Luka",
    "cwags_number": "22-4168-02",
    "status": "❌ DUPLICATE #2",
    "entry_id": "b67af996-2293-4a30-a19e-7dd47e1e4f03",
    "submitted_at": "2025-12-07 05:38:50.97+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Luka",
    "cwags_number": "22-4168-02",
    "status": "❌ DUPLICATE #3",
    "entry_id": "eb772558-ae7c-4805-8713-d7509d1740eb",
    "submitted_at": "2025-12-07 05:40:35.274+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Luka",
    "cwags_number": "22-4168-02",
    "status": "❌ DUPLICATE #4",
    "entry_id": "d78cf760-7ad0-4bf2-9006-efd36c0a8462",
    "submitted_at": "2025-12-10 04:23:11.757+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Luka",
    "cwags_number": "22-4168-02",
    "status": "❌ DUPLICATE #5",
    "entry_id": "0b3317b9-9713-4eab-8368-c604eb10964e",
    "submitted_at": "2025-12-15 03:27:55.433+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Luka",
    "cwags_number": "22-4168-02",
    "status": "❌ DUPLICATE #6",
    "entry_id": "6516fe5f-9489-4b08-a6bd-5097c478fd59",
    "submitted_at": "2025-12-15 04:32:29.237+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Luka",
    "cwags_number": "22-4168-02",
    "status": "❌ DUPLICATE #7",
    "entry_id": "0b74f3c0-5203-4045-b7eb-e8ac8468debb",
    "submitted_at": "2025-12-15 04:38:47.483+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Titan",
    "cwags_number": "22-4168-01",
    "status": "✅ PRIMARY",
    "entry_id": "99176ce9-5816-4272-add8-239d86af1498",
    "submitted_at": "2025-11-14 03:35:46.681+00",
    "num_selections": 13,
    "num_scores": 8,
    "action": "KEEP"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Titan",
    "cwags_number": "22-4168-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "ed6e1b86-84ba-4cb8-84de-ad9adb9398bf",
    "submitted_at": "2025-12-07 05:31:19.663+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Titan",
    "cwags_number": "22-4168-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "782c7a44-5992-4439-92b7-01e0e1de11cf",
    "submitted_at": "2025-12-07 05:34:42.635+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Titan",
    "cwags_number": "22-4168-01",
    "status": "❌ DUPLICATE #3",
    "entry_id": "ab9ec0b0-8016-476c-b191-f7b00a9598f6",
    "submitted_at": "2025-12-07 05:36:02.735+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Titan",
    "cwags_number": "22-4168-01",
    "status": "❌ DUPLICATE #4",
    "entry_id": "48603815-e239-4c1e-ae1b-930b295d76ad",
    "submitted_at": "2025-12-15 03:16:36.892+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Titan",
    "cwags_number": "22-4168-01",
    "status": "❌ DUPLICATE #5",
    "entry_id": "39fcb507-8348-4d1f-ae04-4fcaa801e277",
    "submitted_at": "2025-12-15 03:20:17.005+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Titan",
    "cwags_number": "22-4168-01",
    "status": "❌ DUPLICATE #6",
    "entry_id": "4bfebb69-a4df-4b53-93f0-3886356418c2",
    "submitted_at": "2025-12-15 03:23:30.714+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Karen Yuen",
    "dog_call_name": "Titan",
    "cwags_number": "22-4168-01",
    "status": "❌ DUPLICATE #7",
    "entry_id": "753e7a40-3831-45bd-a2ed-0665287db4da",
    "submitted_at": "2025-12-15 03:24:01.556+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Kristi Kalke",
    "dog_call_name": "Rhenna",
    "cwags_number": "23-4514-01",
    "status": "✅ PRIMARY",
    "entry_id": "ec2ec69f-dea9-40bf-bbdd-9539091126ec",
    "submitted_at": "2025-11-14 07:32:51.43+00",
    "num_selections": 10,
    "num_scores": 9,
    "action": "KEEP"
  },
  {
    "handler_name": "Kristi Kalke",
    "dog_call_name": "Rhenna",
    "cwags_number": "23-4514-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "bd1211af-a52a-45b4-858b-16e851034482",
    "submitted_at": "2025-12-07 08:06:32.089+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Kristi Kalke",
    "dog_call_name": "Rhenna",
    "cwags_number": "23-4514-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "68a854a2-ff56-41f5-96bb-09d05dd8be4b",
    "submitted_at": "2025-12-07 08:07:43.753+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Kristi Kalke",
    "dog_call_name": "Rhenna",
    "cwags_number": "23-4514-01",
    "status": "❌ DUPLICATE #3",
    "entry_id": "fdbf9bee-c628-4775-96dd-f77d3f67edf0",
    "submitted_at": "2025-12-07 08:09:56.669+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Kristi Kalke",
    "dog_call_name": "Rhenna",
    "cwags_number": "23-4514-01",
    "status": "❌ DUPLICATE #4",
    "entry_id": "6a72a9ba-0a5d-4000-9b93-5544ecf55068",
    "submitted_at": "2025-12-07 08:10:47.553+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Kristi Kalke",
    "dog_call_name": "Rhenna",
    "cwags_number": "23-4514-01",
    "status": "❌ DUPLICATE #5",
    "entry_id": "d0b28571-1794-4415-8903-50866e656a81",
    "submitted_at": "2025-12-15 03:19:04.374+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Linda Heming",
    "dog_call_name": "Annie",
    "cwags_number": "25-5229-01",
    "status": "✅ PRIMARY",
    "entry_id": "09ffa493-d2b4-474a-89c8-95dcad9cff06",
    "submitted_at": "2025-11-14 07:19:33.122+00",
    "num_selections": 6,
    "num_scores": 6,
    "action": "KEEP"
  },
  {
    "handler_name": "Linda Heming",
    "dog_call_name": "Annie",
    "cwags_number": "25-5229-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "dc2a915f-af8b-4c46-995b-b4273c84810b",
    "submitted_at": "2025-12-07 08:03:07.879+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Linda Heming",
    "dog_call_name": "Annie",
    "cwags_number": "25-5229-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "6649b040-fc23-43c1-906e-031a53456531",
    "submitted_at": "2025-12-07 08:03:33.067+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Linda Heming",
    "dog_call_name": "Annie",
    "cwags_number": "25-5229-01",
    "status": "❌ DUPLICATE #3",
    "entry_id": "e9213d6d-421a-4006-ac1b-4101a180678f",
    "submitted_at": "2025-12-07 08:08:28.517+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Lynne Eross",
    "dog_call_name": "Kyra",
    "cwags_number": "23-4413-01",
    "status": "✅ PRIMARY",
    "entry_id": "b6ccedb7-d3ad-4e99-9844-81fa6dad8152",
    "submitted_at": "2025-11-14 07:36:20.125+00",
    "num_selections": 10,
    "num_scores": 9,
    "action": "KEEP"
  },
  {
    "handler_name": "Lynne Eross",
    "dog_call_name": "Kyra",
    "cwags_number": "23-4413-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "659bda41-f0fb-48ef-928e-f7a7ed91a431",
    "submitted_at": "2025-11-23 03:39:27.674+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1734-04",
    "status": "✅ PRIMARY",
    "entry_id": "115376f4-f484-4761-908c-29a20244c770",
    "submitted_at": "2025-11-15 07:36:47.887+00",
    "num_selections": 2,
    "num_scores": 1,
    "action": "KEEP"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1734-04",
    "status": "❌ DUPLICATE #1",
    "entry_id": "0abbf84c-c8a0-4f4b-94cb-cbabae76859f",
    "submitted_at": "2025-12-01 01:09:30.439+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Akasha",
    "cwags_number": "17-1734-04",
    "status": "❌ DUPLICATE #2",
    "entry_id": "71f5e6f9-7ee1-4a9d-bed0-337d72cf05a1",
    "submitted_at": "2025-12-01 03:38:40.229+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Arwyn",
    "cwags_number": "17-1734-09",
    "status": "✅ PRIMARY",
    "entry_id": "3888e480-f937-45f8-962d-9f46d0f37a5e",
    "submitted_at": "2025-11-14 04:35:46.02+00",
    "num_selections": 13,
    "num_scores": 4,
    "action": "KEEP"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Arwyn",
    "cwags_number": "17-1734-09",
    "status": "❌ DUPLICATE #1",
    "entry_id": "fba21766-3f26-4791-84fc-5eef6aa76762",
    "submitted_at": "2025-11-14 07:27:15.278+00",
    "num_selections": 5,
    "num_scores": 5,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Arwyn",
    "cwags_number": "17-1734-09",
    "status": "❌ DUPLICATE #2",
    "entry_id": "0e9b452c-2ee7-4e1c-854c-50e2115f793d",
    "submitted_at": "2025-11-23 08:25:26.735+00",
    "num_selections": 0,
    "num_scores": 0,
    "action": "DELETE (empty)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Arwyn",
    "cwags_number": "17-1734-09",
    "status": "❌ DUPLICATE #3",
    "entry_id": "60f38a5f-9442-4fbd-84a4-b25e6227b008",
    "submitted_at": "2025-11-23 08:30:55.301+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Arwyn",
    "cwags_number": "17-1734-09",
    "status": "❌ DUPLICATE #4",
    "entry_id": "6451c4d1-2c36-40f3-b6dc-82a69695991c",
    "submitted_at": "2025-11-23 08:32:23.366+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Arwyn",
    "cwags_number": "17-1734-09",
    "status": "❌ DUPLICATE #5",
    "entry_id": "ea932e21-e7ac-4008-813b-0036524ece8c",
    "submitted_at": "2025-12-07 08:04:08.729+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Arwyn",
    "cwags_number": "17-1734-09",
    "status": "❌ DUPLICATE #6",
    "entry_id": "8fdef355-1ff2-48f2-a45c-770dead14dea",
    "submitted_at": "2025-12-15 04:32:12.29+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Fizgig",
    "cwags_number": "17-1734-02",
    "status": "✅ PRIMARY",
    "entry_id": "a6af734f-8de2-4db1-b307-0c1f5584c8f4",
    "submitted_at": "2025-11-15 07:35:21.164+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "KEEP"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Fizgig",
    "cwags_number": "17-1734-02",
    "status": "❌ DUPLICATE #1",
    "entry_id": "d0159e0e-42d3-4935-8334-155efb6e2c67",
    "submitted_at": "2025-11-23 08:38:44.403+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Fizgig",
    "cwags_number": "17-1734-02",
    "status": "❌ DUPLICATE #2",
    "entry_id": "e6556583-b3f2-4af0-93f8-8cf76cd6a1b1",
    "submitted_at": "2025-11-23 08:42:09.597+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Fizgig",
    "cwags_number": "17-1734-02",
    "status": "❌ DUPLICATE #3",
    "entry_id": "de2283bc-7168-4387-961e-89ccdee8463d",
    "submitted_at": "2025-11-23 08:45:20.358+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Fizgig",
    "cwags_number": "17-1734-02",
    "status": "❌ DUPLICATE #4",
    "entry_id": "882cf45f-e845-4549-86a8-ce45a14b5231",
    "submitted_at": "2025-11-23 08:47:14.167+00",
    "num_selections": 0,
    "num_scores": 0,
    "action": "DELETE (empty)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Fizgig",
    "cwags_number": "17-1734-02",
    "status": "❌ DUPLICATE #5",
    "entry_id": "57163085-687f-4d19-b8c1-af264a66822c",
    "submitted_at": "2025-11-23 08:48:46.133+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Fizgig",
    "cwags_number": "17-1734-02",
    "status": "❌ DUPLICATE #6",
    "entry_id": "16183c6d-b123-4759-ba2c-6d143b15011c",
    "submitted_at": "2025-11-23 08:51:23.732+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Marla Williamson",
    "dog_call_name": "Fizgig",
    "cwags_number": "17-1734-02",
    "status": "❌ DUPLICATE #7",
    "entry_id": "6d43f6cc-f8c8-4e08-895e-4f8b9d2c0e9f",
    "submitted_at": "2025-11-23 08:51:43.942+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Monica Vogler",
    "dog_call_name": "Black Betty",
    "cwags_number": "22-3865-02",
    "status": "✅ PRIMARY",
    "entry_id": "753ea001-8d97-4744-83ff-4d58922f09c9",
    "submitted_at": "2025-11-14 07:20:16.729+00",
    "num_selections": 12,
    "num_scores": 9,
    "action": "KEEP"
  },
  {
    "handler_name": "Monica Vogler",
    "dog_call_name": "Black Betty",
    "cwags_number": "22-3865-02",
    "status": "❌ DUPLICATE #1",
    "entry_id": "d1609179-09e1-47cd-9588-cd5db10cfa1d",
    "submitted_at": "2025-11-23 08:33:31.009+00",
    "num_selections": 0,
    "num_scores": 0,
    "action": "DELETE (empty)"
  },
  {
    "handler_name": "Monica Vogler",
    "dog_call_name": "Black Betty",
    "cwags_number": "22-3865-02",
    "status": "❌ DUPLICATE #2",
    "entry_id": "91b654c8-5d71-404c-862d-8b445407c318",
    "submitted_at": "2025-12-05 05:14:34.727+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Monica Vogler",
    "dog_call_name": "Black Betty",
    "cwags_number": "22-3865-02",
    "status": "❌ DUPLICATE #3",
    "entry_id": "be7fd281-5c12-4e9e-aaab-6b973c24db73",
    "submitted_at": "2025-12-05 05:17:16.313+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Monica Vogler",
    "dog_call_name": "JoLene",
    "cwags_number": "22-3865-03",
    "status": "✅ PRIMARY",
    "entry_id": "2c34f76d-c1bf-4b8c-9944-352a04b79341",
    "submitted_at": "2025-11-14 07:22:13.55+00",
    "num_selections": 8,
    "num_scores": 7,
    "action": "KEEP"
  },
  {
    "handler_name": "Monica Vogler",
    "dog_call_name": "JoLene",
    "cwags_number": "22-3865-03",
    "status": "❌ DUPLICATE #1",
    "entry_id": "46780445-430d-4ad4-8554-873b5f2b4bc9",
    "submitted_at": "2025-12-07 05:15:47.093+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Monica Vogler",
    "dog_call_name": "JoLene",
    "cwags_number": "22-3865-03",
    "status": "❌ DUPLICATE #2",
    "entry_id": "ef91ed88-6406-40b8-a601-b3f41cbb4558",
    "submitted_at": "2025-12-15 03:07:57.489+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Naomi Robertson",
    "dog_call_name": "Hattie",
    "cwags_number": "17-1954-03",
    "status": "✅ PRIMARY",
    "entry_id": "7de3b747-2c0c-4547-ae3e-3c8139166d9d",
    "submitted_at": "2025-11-15 08:08:28.143+00",
    "num_selections": 6,
    "num_scores": 6,
    "action": "KEEP"
  },
  {
    "handler_name": "Naomi Robertson",
    "dog_call_name": "Hattie",
    "cwags_number": "17-1954-03",
    "status": "❌ DUPLICATE #1",
    "entry_id": "d507d7e4-60e7-4267-b60d-bb5ed30c920d",
    "submitted_at": "2025-12-05 05:27:36.279+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Naomi Robertson",
    "dog_call_name": "Hattie",
    "cwags_number": "17-1954-03",
    "status": "❌ DUPLICATE #2",
    "entry_id": "657300ab-02b2-4156-b645-b71c112db224",
    "submitted_at": "2025-12-05 05:28:00.983+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Naomi Robertson",
    "dog_call_name": "Libby",
    "cwags_number": "17-1954-04",
    "status": "✅ PRIMARY",
    "entry_id": "5036f7df-c5fd-4540-bafa-c6abcb5eb5b8",
    "submitted_at": "2025-11-14 07:35:36.41+00",
    "num_selections": 6,
    "num_scores": 4,
    "action": "KEEP"
  },
  {
    "handler_name": "Naomi Robertson",
    "dog_call_name": "Libby",
    "cwags_number": "17-1954-04",
    "status": "❌ DUPLICATE #1",
    "entry_id": "b61bb582-ab59-4484-9305-6e63ed366278",
    "submitted_at": "2025-11-15 08:09:19.61+00",
    "num_selections": 2,
    "num_scores": 2,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Naomi Robertson",
    "dog_call_name": "Remy",
    "cwags_number": "17-1954-05",
    "status": "✅ PRIMARY",
    "entry_id": "d4657efa-0f93-4142-9238-e36370c37563",
    "submitted_at": "2025-11-15 08:09:51.479+00",
    "num_selections": 2,
    "num_scores": 2,
    "action": "KEEP"
  },
  {
    "handler_name": "Naomi Robertson",
    "dog_call_name": "Remy",
    "cwags_number": "17-1954-05",
    "status": "❌ DUPLICATE #1",
    "entry_id": "5e48dc0e-bcd3-4e9e-864a-13fc787e5a2d",
    "submitted_at": "2025-12-07 05:39:10.671+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Naomi Robertson",
    "dog_call_name": "Remy",
    "cwags_number": "17-1954-05",
    "status": "❌ DUPLICATE #2",
    "entry_id": "4d6487d9-7fef-4169-b64b-5bba198a2c2b",
    "submitted_at": "2025-12-07 05:40:19.95+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Nina and Lane Michie",
    "dog_call_name": "Wendel",
    "cwags_number": "20-3170-01",
    "status": "✅ PRIMARY",
    "entry_id": "9df04fb7-ab0f-46c6-836d-8a00d3cfcb4a",
    "submitted_at": "2025-11-14 07:10:46.68+00",
    "num_selections": 18,
    "num_scores": 10,
    "action": "KEEP"
  },
  {
    "handler_name": "Nina and Lane Michie",
    "dog_call_name": "Wendel",
    "cwags_number": "20-3170-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "10461305-d827-4634-81d9-18256574691b",
    "submitted_at": "2025-12-07 08:12:50.602+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Nina and Lane Michie",
    "dog_call_name": "Wendel",
    "cwags_number": "20-3170-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "c12aed2d-21c2-4d40-a86d-d12fe968e772",
    "submitted_at": "2025-12-15 03:25:02.421+00",
    "num_selections": 1,
    "num_scores": 0,
    "action": "MERGE (has selections)"
  },
  {
    "handler_name": "Silje Riise",
    "dog_call_name": "Sushi",
    "cwags_number": "25-5293-01",
    "status": "✅ PRIMARY",
    "entry_id": "08f6bbf1-1ccb-4583-9ca5-cb3538b35b05",
    "submitted_at": "2025-12-06 00:42:15.324+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "KEEP"
  },
  {
    "handler_name": "Silje Riise",
    "dog_call_name": "Sushi",
    "cwags_number": "25-5293-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "999222b1-1221-4e0b-8059-c560d241d5f8",
    "submitted_at": "2025-12-06 00:42:27.295+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Silje Riise",
    "dog_call_name": "Sushi",
    "cwags_number": "25-5293-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "05f42f15-d213-43f6-a103-34d3f33bb1ca",
    "submitted_at": "2025-12-11 04:21:26.374+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Silje Riise",
    "dog_call_name": "Sushi",
    "cwags_number": "25-5293-01",
    "status": "❌ DUPLICATE #3",
    "entry_id": "82451cdf-2a71-4807-8d3b-f80b9f047be2",
    "submitted_at": "2025-12-11 04:21:58.762+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Silje Riise",
    "dog_call_name": "Sushi",
    "cwags_number": "25-5293-01",
    "status": "❌ DUPLICATE #4",
    "entry_id": "9f6f1ca1-227f-4d92-a59c-fcba5906f00d",
    "submitted_at": "2025-12-11 04:22:21.853+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Silje Riise",
    "dog_call_name": "Sushi",
    "cwags_number": "25-5293-01",
    "status": "❌ DUPLICATE #5",
    "entry_id": "e2332ec4-edd6-40c2-a816-ab6f7f09307a",
    "submitted_at": "2025-12-11 04:23:18.745+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Silje Riise",
    "dog_call_name": "Sushi",
    "cwags_number": "25-5293-01",
    "status": "❌ DUPLICATE #6",
    "entry_id": "816bf0ae-901d-4ffe-8707-3e6201db5c9b",
    "submitted_at": "2025-12-11 04:24:08.995+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Tara Thompson",
    "dog_call_name": "Clover",
    "cwags_number": "23-4391-01",
    "status": "✅ PRIMARY",
    "entry_id": "ad941ebc-b18d-437a-a26e-7853cca86662",
    "submitted_at": "2025-11-14 07:37:38.862+00",
    "num_selections": 15,
    "num_scores": 15,
    "action": "KEEP"
  },
  {
    "handler_name": "Tara Thompson",
    "dog_call_name": "Clover",
    "cwags_number": "23-4391-01",
    "status": "❌ DUPLICATE #1",
    "entry_id": "4db0a65f-7638-4e20-b167-123852efb171",
    "submitted_at": "2025-11-26 08:46:41.456+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  },
  {
    "handler_name": "Tara Thompson",
    "dog_call_name": "Clover",
    "cwags_number": "23-4391-01",
    "status": "❌ DUPLICATE #2",
    "entry_id": "4010eb0b-1643-4111-9b64-bbc1f5ae6819",
    "submitted_at": "2025-12-10 09:08:18.48+00",
    "num_selections": 1,
    "num_scores": 1,
    "action": "MERGE (has scores!)"
  }
]
  ;

  useEffect(() => {
    // Load duplicate data on mount
    setDuplicateData(sampleDuplicateData);
  }, []);

  const analyzeDuplicates = () => {
    setAnalyzing(true);
    
    // Calculate statistics
    const stats: AnalysisStats = {
      total: duplicateData.length,
      primaryEntries: duplicateData.filter(e => e.status.startsWith('✅')).length,
      toMerge: duplicateData.filter(e => e.action.startsWith('MERGE')).length,
      toDelete: duplicateData.filter(e => e.action === 'DELETE (empty)').length,
      totalSelections: duplicateData.reduce((sum, e) => sum + e.num_selections, 0),
      totalScores: duplicateData.reduce((sum, e) => sum + e.num_scores, 0)
    };

    // Group by handler/dog
    const groups: Record<string, DuplicateEntry[]> = {};
    duplicateData.forEach(entry => {
      const key = `${entry.handler_name} - ${entry.dog_call_name}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });

    setResult({ stats, groups });
    setAnalyzing(false);
  };

  const executeMerge = async () => {
    if (!confirm('Are you sure you want to merge these duplicate entries? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/merge-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trialId: trialId,
          duplicates: duplicateData
        })
      });

      if (!response.ok) {
        throw new Error('Merge operation failed');
      }

      const mergeResult: MergeResult = await response.json();
      setResult(prev => prev ? { ...prev, mergeResult } : null);
      
      alert(`Merge complete! 
        Merged: ${mergeResult.mergedEntries}
        Deleted: ${mergeResult.deletedEntries}
        Selections moved: ${mergeResult.movedSelections}
        Scores preserved: ${mergeResult.preservedScores}
      `);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (analyzing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Analyzing duplicates...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Duplicate Entry Merger
        </h1>
        <p className="text-gray-600">
          Review and merge duplicate trial entries while preserving scores and selections.
        </p>
      </div>

      {/* Trial ID Input */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Trial ID
        </label>
        <input
          type="text"
          value={trialId}
          onChange={(e) => setTrialId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter trial ID"
        />
        <p className="mt-2 text-sm text-gray-500">
          Current trial: 71871ff4-1710-4a90-8999-a08b3c9379ec
        </p>
      </div>

      {/* Statistics */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<Info className="text-blue-500" />}
            label="Total Entries"
            value={result.stats.total}
          />
          <StatCard
            icon={<CheckCircle className="text-green-500" />}
            label="Primary"
            value={result.stats.primaryEntries}
          />
          <StatCard
            icon={<AlertCircle className="text-yellow-500" />}
            label="To Merge"
            value={result.stats.toMerge}
          />
          <StatCard
            icon={<XCircle className="text-red-500" />}
            label="To Delete"
            value={result.stats.toDelete}
          />
          <StatCard
            icon={<Info className="text-purple-500" />}
            label="Selections"
            value={result.stats.totalSelections}
          />
          <StatCard
            icon={<Info className="text-indigo-500" />}
            label="Scores"
            value={result.stats.totalScores}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-md p-6 flex gap-4">
        <button
          onClick={analyzeDuplicates}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={loading}
        >
          Analyze Duplicates
        </button>
        
        {result && !result.mergeResult && (
          <button
            onClick={executeMerge}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
                Merging...
              </>
            ) : (
              'Execute Merge'
            )}
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Merge Result */}
      {result?.mergeResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start">
            <CheckCircle className="w-6 h-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 text-lg mb-3">
                Merge Completed Successfully!
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ResultStat label="Groups Processed" value={result.mergeResult.totalGroups} />
                <ResultStat label="Entries Merged" value={result.mergeResult.mergedEntries} />
                <ResultStat label="Entries Deleted" value={result.mergeResult.deletedEntries} />
                <ResultStat label="Selections Moved" value={result.mergeResult.movedSelections} />
              </div>
              
              {result.mergeResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    Warnings ({result.mergeResult.errors.length})
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {result.mergeResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                    {result.mergeResult.errors.length > 5 && (
                      <li>• ... and {result.mergeResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Groups Table */}
      {result && result.groups && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Duplicate Groups ({Object.keys(result.groups).length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              {Object.entries(result.groups).map(([key, entries]) => (
                <div key={key} className="border-b border-gray-200 last:border-0">
                  <div className="bg-gray-50 px-6 py-3 font-semibold text-gray-700">
                    {key} ({entries.length} entries)
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {entries.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`px-6 py-3 flex items-center justify-between ${
                          entry.status.startsWith('✅') ? 'bg-green-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <span className="font-mono text-sm text-gray-500 w-20">
                            {entry.status.split(' ')[0]}
                          </span>
                          <span className="text-sm text-gray-700 font-medium">
                            {entry.status.includes('PRIMARY') ? 'PRIMARY' : entry.status.split(' ').slice(1).join(' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">{entry.num_selections}</span> selections
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">{entry.num_scores}</span> scores
                          </div>
                          <ActionBadge action={entry.action} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="flex items-center justify-between mb-2">
      {icon}
      <span className="text-2xl font-bold text-gray-900">{value}</span>
    </div>
    <div className="text-sm text-gray-600">{label}</div>
  </div>
);

const ResultStat: React.FC<ResultStatProps> = ({ label, value }) => (
  <div className="text-center">
    <div className="text-2xl font-bold text-green-700">{value}</div>
    <div className="text-sm text-green-600">{label}</div>
  </div>
);

const ActionBadge: React.FC<ActionBadgeProps> = ({ action }) => {
  const colors: Record<string, string> = {
    'KEEP': 'bg-green-100 text-green-800',
    'MERGE (has scores!)': 'bg-yellow-100 text-yellow-800',
    'MERGE (has selections)': 'bg-blue-100 text-blue-800',
    'DELETE (empty)': 'bg-red-100 text-red-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[action] || 'bg-gray-100 text-gray-800'}`}>
      {action}
    </span>
  );
};

export default DuplicateMergerUI;