// === SCORE SHEET MANAGEMENT ===

// Update score selector grid
function updateScoreSelectorGrid() {
    const container = document.getElementById('scoreSelectorGrid');
    if (!container) return;
    
    if (!TrialApp.trialConfig || TrialApp.trialConfig.length === 0) {
        container.innerHTML = '<p class="loading-text">Configure trial first to enable score entry.</p>';
        return;
    }
    
    if (!TrialApp.entryResults || TrialApp.entryResults.length === 0) {
        container.innerHTML = '<p class="loading-text">No entries available for scoring.</p>';
        return;
    }
    
    // Group by class and round
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    
    let html = '';
    for (const key in grouped) {
        const group = grouped[key];
        const hasScores = getDigitalScores(TrialApp.currentTrialId, key);
        const scoreCount = hasScores ? Object.keys(hasScores).length : 0;
        
        html += `
            <div class="selector-item ${scoreCount > 0 ? 'has-scores' : ''}" 
                 onclick="selectClassRoundForScoring('${key}')">
                <div class="selector-title">${group.className} - Round ${group.round}</div>
                <div class="selector-meta">
                    <strong>Date:</strong> ${formatDate(group.date)}<br>
                    <strong>Judge:</strong> ${group.judge}<br>
                    <strong>Entries:</strong> ${group.entries.length}<br>
                    <strong>Scored:</strong> ${scoreCount}/${group.entries.length}
                </div>
            </div>
        `;
    }
    
    if (html) {
        container.innerHTML = html;
    } else {
        container.innerHTML = '<p class="loading-text">No scoreable classes available.</p>';
    }
}

// Select class/round for scoring
function selectClassRoundForScoring(classRoundKey) {
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    const group = grouped[classRoundKey];
    
    if (!group) {
        showStatusMessage('Class/round not found', 'error');
        return;
    }
    
    // Clear previous selection
    document.querySelectorAll('.selector-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Mark as selected
    event.target.closest('.selector-item').classList.add('selected');
    
    // Generate digital score sheet
    generateDigitalScoreSheet(classRoundKey, group);
}

// Generate digital score sheet
function generateDigitalScoreSheet(classRoundKey, group) {
    const container = document.getElementById('digitalScoreSheet');
    if (!container) return;
    
    // Get running order (custom or default)
    const customOrder = getRunningOrder(TrialApp.currentTrialId, classRoundKey);
    const entries = customOrder || sortEntriesForRunningOrder(group.entries, 'handler');
    
    // Get saved scores
    const savedScores = getDigitalScores(TrialApp.currentTrialId, classRoundKey) || {};
    
    let html = `
        <div class="digital-scoresheet">
            <div class="digital-header">
                <h3>DIGITAL SCORE SHEET</h3>
                <div class="trial-info">
                    <div class="info-block">
                        <div class="info-label">Date</div>
                        <div class="info-value">${formatDate(group.date)}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-label">Class</div>
                        <div class="info-value">${group.className}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-label">Round</div>
                        <div class="info-value">${group.round}</div>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <strong>Judge: </strong>${group.judge}
                    <span style="margin-left: 30px;"><strong>Total Entries: </strong>${entries.length}</span>
                </div>
            </div>
            
            <table class="score-entry-table">
                <thead>
                    <tr>
                        <th class="position-col">Pos</th>
                        <th class="reg-col">Registration</th>
                        <th class="name-col">Call Name</th>
                        <th class="handler-col">Handler</th>
                        <th class="score-col">Score</th>
                        <th class="placement-col">Place</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    entries.forEach((entry, index) => {
        const entryId = entry.id || entry.regNumber;
        const savedScore = savedScores[entryId];
        const entryTypeBadge = entry.entryType === 'feo' ? ' (FEO)' : '';
        const rowClass = entry.entryType === 'feo' ? 'feo-row' : '';
        
        html += `
            <tr class="${rowClass}">
                <td class="position-col">${index + 1}</td>
                <td class="reg-col">${entry.regNumber}${entryTypeBadge}</td>
                <td class="name-col">${entry.callName}</td>
                <td class="handler-col">${entry.handler}</td>
                <td class="score-col">
                    <input type="number" 
                           class="score-input" 
                           id="score_${entryId}"
                           value="${savedScore?.score || ''}"
                           step="0.01"
                           min="0"
                           max="200"
                           onchange="updateScore('${classRoundKey}', '${entryId}', this.value)"
                           placeholder="Score">
                </td>
                <td class="placement-col">
                    <span id="placement_${entryId}">${savedScore?.placement || ''}</span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <div class="score-actions" style="padding: 15px; text-align: center; border-top: 2px solid #333;">
                <button onclick="calculatePlacements('${classRoundKey}')" class="btn btn-primary">Calculate Placements</button>
                <button onclick="clearAllScores('${classRoundKey}')" class="btn btn-secondary">Clear All Scores</button>
                <button onclick="exportScores('${classRoundKey}')" class="btn btn-secondary">Export Scores</button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Update individual score
function updateScore(classRoundKey, entryId, score) {
    const savedScores = getDigitalScores(TrialApp.currentTrialId, classRoundKey) || {};
    
    if (score === '' || score === null) {
        delete savedScores[entryId];
    } else {
        savedScores[entryId] = {
            score: parseFloat(score),
            timestamp: getCurrentTimestamp()
        };
    }
    
    saveDigitalScores(TrialApp.currentTrialId, classRoundKey, savedScores);
    
    // Auto-calculate placements if multiple scores entered
    const scoreCount = Object.keys(savedScores).length;
    if (scoreCount > 1) {
        calculatePlacements(classRoundKey);
    }
}

// Calculate placements based on scores
function calculatePlacements(classRoundKey) {
    const savedScores = getDigitalScores(TrialApp.currentTrialId, classRoundKey) || {};
    
    if (Object.keys(savedScores).length === 0) {
        showStatusMessage('No scores entered yet', 'warning');
        return;
    }
    
    // Convert to array for sorting
    const scoreArray = Object.entries(savedScores).map(([entryId, data]) => ({
        entryId,
        score: data.score,
        timestamp: data.timestamp
    }));
    
    // Sort by score (highest first)
    scoreArray.sort((a, b) => b.score - a.score);
    
    // Calculate placements (handle ties)
    let currentPlace = 1;
    for (let i = 0; i < scoreArray.length; i++) {
        if (i > 0 && scoreArray[i].score !== scoreArray[i-1].score) {
            currentPlace = i + 1;
        }
        
        scoreArray[i].placement = currentPlace;
        
        // Update saved scores with placement
        savedScores[scoreArray[i].entryId].placement = currentPlace;
    }
    
    // Save updated scores
    saveDigitalScores(TrialApp.currentTrialId, classRoundKey, savedScores);
    
    // Update display
    scoreArray.forEach(item => {
        const placementElement = document.getElementById(`placement_${item.entryId}`);
        if (placementElement) {
            placementElement.textContent = item.placement;
        }
    });
    
    showStatusMessage('Placements calculated successfully!', 'success');
}

// Clear all scores for a class/round
function clearAllScores(classRoundKey) {
    if (!confirm('Clear all scores for this class/round? This cannot be undone.')) {
        return;
    }
    
    // Clear from storage
    saveDigitalScores(TrialApp.currentTrialId, classRoundKey, {});
    
    // Clear from display
    document.querySelectorAll('.score-input').forEach(input => {
        input.value = '';
    });
    
    document.querySelectorAll('[id^="placement_"]').forEach(span => {
        span.textContent = '';
    });
    
    showStatusMessage('All scores cleared', 'success');
}

// Export scores for a class/round
function exportScores(classRoundKey) {
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    const group = grouped[classRoundKey];
    const savedScores = getDigitalScores(TrialApp.currentTrialId, classRoundKey) || {};
    
    if (!group) {
        showStatusMessage('Class/round not found', 'error');
        return;
    }
    
    if (Object.keys(savedScores).length === 0) {
        showStatusMessage('No scores to export', 'warning');
        return;
    }
    
    // Get running order
    const customOrder = getRunningOrder(TrialApp.currentTrialId, classRoundKey);
    const entries = customOrder || sortEntriesForRunningOrder(group.entries, 'handler');
    
    // Build CSV
    const headers = ['Position', 'Registration', 'Call Name', 'Handler', 'Score', 'Placement'];
    let csv = headers.join(',') + '\n';
    
    entries.forEach((entry, index) => {
        const entryId = entry.id || entry.regNumber;
        const scoreData = savedScores[entryId];
        
        const row = [
            index + 1,
            `"${entry.regNumber}"`,
            `"${entry.callName}"`,
            `"${entry.handler}"`,
            scoreData ? scoreData.score : '',
            scoreData ? scoreData.placement || '' : ''
        ];
        
        csv += row.join(',') + '\n';
    });
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `scores_${group.className.replace(/\s+/g, '_')}_Round${group.round}_${timestamp}.csv`;
    
    downloadFile(csv, filename, 'text/csv');
    showStatusMessage('Scores exported successfully!', 'success');
}

// Generate printable score sheets
function generateScoreSheets() {
    if (!TrialApp.trialConfig || TrialApp.trialConfig.length === 0) {
        showStatusMessage('Configure trial first to generate score sheets', 'error');
        return;
    }
    
    if (!TrialApp.entryResults || TrialApp.entryResults.length === 0) {
        showStatusMessage('No entries available for score sheets', 'warning');
        return;
    }
    
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    const container = document.getElementById('scoreSheetPreview');
    
    if (!container) return;
    
    let html = '<div class="score-sheets-container">';
    
    for (const key in grouped) {
        const group = grouped[key];
        const customOrder = getRunningOrder(TrialApp.currentTrialId, key);
        const entries = customOrder || sortEntriesForRunningOrder(group.entries, 'handler');
        
        html += generateSingleScoreSheet(group, entries);
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    showStatusMessage('Score sheets generated! Review and print as needed.', 'success');
}

// Generate single score sheet HTML
function generateSingleScoreSheet(group, entries) {
    return `
        <div class="score-sheet">
            <div class="score-sheet-header">
                <h3>SCORE SHEET</h3>
                <div class="trial-info">
                    <div class="info-block">
                        <div class="info-label">Date</div>
                        <div class="info-value">${formatDate(group.date)}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-label">Class</div>
                        <div class="info-value">${group.className}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-label">Round</div>
                        <div class="info-value">${group.round}</div>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <strong>Judge: </strong>${group.judge}
                    <span style="margin-left: 30px;"><strong>Total Entries: </strong>${entries.length}</span>
                </div>
            </div>
            
            <table class="running-order-table">
                <thead>
                    <tr>
                        <th class="position-col">Pos</th>
                        <th class="reg-col">Registration</th>
                        <th class="name-col">Call Name</th>
                        <th class="handler-col">Handler</th>
                        <th class="score-col">Score</th>
                        <th class="placement-col">Place</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map((entry, index) => `
                        <tr class="${entry.entryType === 'feo' ? 'feo-row' : ''}">
                            <td class="position-col">${index + 1}</td>
                            <td class="reg-col">${entry.regNumber}${entry.entryType === 'feo' ? ' (FEO)' : ''}</td>
                            <td class="name-col">${entry.callName}</td>
                            <td class="handler-col">${entry.handler}</td>
                            <td class="score-col"></td>
                            <td class="placement-col"></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Print all score sheets
function printScoreSheets() {
    const container = document.getElementById('scoreSheetPreview');
    
    if (!container || !container.innerHTML.trim()) {
        showStatusMessage('Generate score sheets first before printing', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Score Sheets</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; }
                .score-sheet { 
                    page-break-after: always; 
                    margin-bottom: 0; 
                    border: 2px solid #333; 
                    background: white;
                }
                .score-sheet:last-child { page-break-after: avoid; }
                .score-sheet-header { 
                    background: #f8f9fa; 
                    padding: 15px 20px; 
                    border-bottom: 2px solid #333; 
                    text-align: center; 
                }
                .trial-info { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr 1fr; 
                    gap: 20px; 
                    margin-bottom: 15px; 
                }
                .info-block { text-align: center; }
                .info-label { 
                    font-weight: bold; 
                    font-size: 12px; 
                    color: #666; 
                    text-transform: uppercase; 
                }
                .info-value { 
                    font-size: 16px; 
                    font-weight: bold; 
                    color: #333; 
                    margin-top: 5px; 
                }
                .running-order-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px; 
                }
                .running-order-table th, .running-order-table td { 
                    border: 1px solid #333; 
                    padding: 8px 12px; 
                    text-align: left; 
                }
                .running-order-table th { 
                    background: #f8f9fa; 
                    font-weight: bold; 
                    font-size: 14px; 
                }
                .running-order-table td { height: 35px; vertical-align: top; }
                .position-col { width: 60px; text-align: center; font-weight: bold; }
                .reg-col { width: 120px; }
                .name-col { width: 150px; }
                .handler-col { width: 150px; }
                .score-col { width: 80px; text-align: center; }
                .placement-col { width: 80px; text-align: center; }
                .feo-row { background-color: #fff5f5; }
            </style>
        </head>
        <body>
            ${container.innerHTML}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// Export functions to global scope
window.updateScoreSelectorGrid = updateScoreSelectorGrid;
window.selectClassRoundForScoring = selectClassRoundForScoring;
window.generateDigitalScoreSheet = generateDigitalScoreSheet;
window.updateScore = updateScore;
window.calculatePlacements = calculatePlacements;
window.clearAllScores = clearAllScores;
window.exportScores = exportScores;
window.generateScoreSheets = generateScoreSheets;
window.printScoreSheets = printScoreSheets;