// === EXPORT FUNCTIONS ===

// Export entries to CSV
function exportToCSV() {
    if (!TrialApp.entryResults || TrialApp.entryResults.length === 0) {
        showStatusMessage('No entries to export', 'warning');
        return;
    }
    
    // CSV headers
    const headers = [
        'Registration',
        'Call Name', 
        'Handler',
        'Date',
        'Class',
        'Round',
        'Judge',
        'Entry Type',
        'Timestamp'
    ];
    
    // Build CSV content
    let csv = headers.join(',') + '\n';
    
    TrialApp.entryResults.forEach(entry => {
        const row = [
            `"${entry.regNumber || ''}"`,
            `"${entry.callName || ''}"`,
            `"${entry.handler || ''}"`,
            `"${entry.date || ''}"`,
            `"${entry.className || ''}"`,
            `"${entry.round || ''}"`,
            `"${entry.judge || ''}"`,
            `"${entry.entryType || 'regular'}"`,
            `"${entry.timestamp || ''}"`
        ];
        csv += row.join(',') + '\n';
    });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `trial_entries_${timestamp}.csv`;
    
    downloadFile(csv, filename, 'text/csv');
    showStatusMessage('Entries exported to CSV successfully!', 'success');
}

// Export entries to JSON
function exportToJSON() {
    if (!TrialApp.entryResults || TrialApp.entryResults.length === 0) {
        showStatusMessage('No entries to export', 'warning');
        return;
    }
    
    const exportData = {
        trialName: TrialApp.currentTrialId ? getTrialById(TrialApp.currentTrialId)?.name : 'Unknown Trial',
        exportedAt: getCurrentTimestamp(),
        totalEntries: TrialApp.entryResults.length,
        trialConfig: TrialApp.trialConfig || [],
        entries: TrialApp.entryResults,
        runningOrders: TrialApp.runningOrders || {},
        digitalScores: TrialApp.digitalScores || {}
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `trial_data_${timestamp}.json`;
    
    downloadFile(jsonString, filename, 'application/json');
    showStatusMessage('Trial data exported to JSON successfully!', 'success');
}

// Export running orders to CSV
function exportRunningOrdersToCSV() {
    if (!TrialApp.entryResults || TrialApp.entryResults.length === 0) {
        showStatusMessage('No entries available for running order export', 'warning');
        return;
    }
    
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    
    // CSV headers
    const headers = [
        'Class',
        'Round',
        'Date',
        'Judge',
        'Position',
        'Registration',
        'Call Name',
        'Handler',
        'Entry Type'
    ];
    
    let csv = headers.join(',') + '\n';
    
    for (const key in grouped) {
        const group = grouped[key];
        const customOrder = getRunningOrder(TrialApp.currentTrialId, key);
        const entries = customOrder || sortEntriesForRunningOrder(group.entries, 'handler');
        
        entries.forEach((entry, index) => {
            const row = [
                `"${group.className}"`,
                `"${group.round}"`,
                `"${group.date}"`,
                `"${group.judge}"`,
                `"${index + 1}"`,
                `"${entry.regNumber}"`,
                `"${entry.callName}"`,
                `"${entry.handler}"`,
                `"${entry.entryType}"`
            ];
            csv += row.join(',') + '\n';
        });
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `running_orders_${timestamp}.csv`;
    
    downloadFile(csv, filename, 'text/csv');
    showStatusMessage('Running orders exported to CSV successfully!', 'success');
}

// Print all running orders
function printRunningOrder() {
    if (!TrialApp.entryResults || TrialApp.entryResults.length === 0) {
        showStatusMessage('No entries available for printing', 'warning');
        return;
    }
    
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    const trialInfo = TrialApp.currentTrialId ? getTrialById(TrialApp.currentTrialId) : null;
    const trialName = trialInfo?.name || 'Dog Trial';
    
    let printContent = `
        <html>
        <head>
            <title>Running Orders - ${trialName}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .page-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
                .class-section { page-break-before: always; margin-bottom: 40px; }
                .class-section:first-child { page-break-before: auto; }
                .class-header { margin-bottom: 15px; }
                .class-info { margin-bottom: 15px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                th { background-color: #f0f0f0; font-weight: bold; }
                .feo-row { background-color: #fff5f5; }
                .position-col { width: 60px; text-align: center; font-weight: bold; }
                .reg-col { width: 120px; }
                .name-col { width: 150px; }
                .handler-col { width: 200px; }
                .type-col { width: 80px; text-align: center; }
                @media print { 
                    body { margin: 0; }
                    .class-section { page-break-before: always; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="page-header">
                
