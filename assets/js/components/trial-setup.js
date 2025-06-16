// === TRIAL SETUP COMPONENT ===

// Generate day configuration interface
function generateDayConfig() {
    const daysSelect = document.getElementById('trialDays');
    const dayConfigSection = document.getElementById('dayConfigSection');
    const dayConfigContainer = document.getElementById('dayConfigContainer');
    
    if (!daysSelect || !dayConfigSection || !dayConfigContainer) return;
    
    const numDays = parseInt(daysSelect.value);
    if (!numDays || numDays < 1) {
        dayConfigSection.style.display = 'none';
        return;
    }
    
    TrialApp.totalDays = numDays;
    TrialApp.savedDays = 0;
    dayConfigSection.style.display = 'block';
    
    let html = '';
    for (let day = 1; day <= numDays; day++) {
        html += generateDayConfigHTML(day);
    }
    
    dayConfigContainer.innerHTML = html;
    showStatusMessage(`Configure ${numDays} day${numDays > 1 ? 's' : ''} of trials`, 'info');
}

// Generate HTML for a single day configuration
function generateDayConfigHTML(dayNumber) {
    const savedConfig = TrialApp.trialConfig.filter(config => config.day === dayNumber.toString());
    const isComplete = savedConfig.length > 0;
    
    return `
        <div class="day-config">
            <h4>
                Day ${dayNumber} Configuration
                <span class="day-status ${isComplete ? 'complete' : 'incomplete'}">
                    ${isComplete ? '✓ Complete' : '⚠ Incomplete'}
                </span>
            </h4>
            
            <div class="form-group">
                <label for="date_${dayNumber}">Date:</label>
                <input type="date" id="date_${dayNumber}" 
                       value="${savedConfig[0]?.date || ''}"
                       onchange="updateDayConfig()">
            </div>
            
            <div class="classes-section">
                <h5>Classes and Rounds</h5>
                <div id="classesContainer_${dayNumber}">
                    ${generateClassesHTML(dayNumber, savedConfig)}
                </div>
                <button type="button" onclick="addClassConfig(${dayNumber})" 
                        class="btn btn-secondary">+ Add Class</button>
            </div>
            
            <div class="form-actions">
                <button type="button" onclick="saveDayConfig(${dayNumber})" 
                        class="btn btn-success">Save Day ${dayNumber}</button>
            </div>
        </div>
    `;
}

// Generate classes HTML for a day
function generateClassesHTML(dayNumber, savedConfig = []) {
    if (savedConfig.length === 0) {
        return `
            <div class="class-config" id="class_${dayNumber}_1">
                ${generateSingleClassHTML(dayNumber, 1)}
            </div>
        `;
    }
    
    const classes = {};
    savedConfig.forEach(config => {
        if (!classes[config.className]) {
            classes[config.className] = [];
        }
        classes[config.className].push(config);
    });
    
    let html = '';
    let classIndex = 1;
    for (const className in classes) {
        html += `
            <div class="class-config" id="class_${dayNumber}_${classIndex}">
                ${generateSingleClassHTML(dayNumber, classIndex, className, classes[className])}
            </div>
        `;
        classIndex++;
    }
    
    return html;
}

// Generate single class configuration HTML
function generateSingleClassHTML(dayNumber, classIndex, className = '', rounds = []) {
    const availableClasses = TrialApp.availableClasses || ['Agility 1', 'Agility 2', 'Agility 3', 'Jumping 1', 'Jumping 2', 'Jumping 3'];
    const availableJudges = TrialApp.availableJudges || ['Jane Doe', 'Mike Wilson', 'Susan Clark'];
    
    let classOptions = '';
    availableClasses.forEach(cls => {
        classOptions += `<option value="${cls}" ${cls === className ? 'selected' : ''}>${cls}</option>`;
    });
    
    let judgeOptions = '';
    availableJudges.forEach(judge => {
        judgeOptions += `<option value="${judge}" ${judge === (rounds[0]?.judge) ? 'selected' : ''}>${judge}</option>`;
    });
    
    const numRounds = rounds.length || 1;
    
    return `
        <h5>Class ${classIndex}</h5>
        <div class="form-grid">
            <div class="form-group">
                <label>Class Name:</label>
                <select id="className_${dayNumber}_${classIndex}">
                    <option value="">Select Class</option>
                    ${classOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Judge:</label>
                <select id="judge_${dayNumber}_${classIndex}">
                    <option value="">Select Judge</option>
                    ${judgeOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Number of Rounds:</label>
                <select id="rounds_${dayNumber}_${classIndex}" onchange="updateRoundsConfig(${dayNumber}, ${classIndex})">
                    <option value="1" ${numRounds === 1 ? 'selected' : ''}>1 Round</option>
                    <option value="2" ${numRounds === 2 ? 'selected' : ''}>2 Rounds</option>
                    <option value="3" ${numRounds === 3 ? 'selected' : ''}>3 Rounds</option>
                </select>
            </div>
        </div>
        <div id="roundsConfig_${dayNumber}_${classIndex}">
            ${generateRoundsHTML(dayNumber, classIndex, numRounds)}
        </div>
        <button type="button" onclick="removeClassConfig(${dayNumber}, ${classIndex})" 
                class="btn btn-secondary">Remove Class</button>
    `;
}

// Generate rounds configuration HTML
function generateRoundsHTML(dayNumber, classIndex, numRounds) {
    let html = '<div class="rounds-container">';
    
    for (let round = 1; round <= numRounds; round++) {
        html += `
            <div class="round-config">
                <label>Round ${round} Time:</label>
                <input type="time" id="roundTime_${dayNumber}_${classIndex}_${round}">
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Update rounds configuration when number changes
function updateRoundsConfig(dayNumber, classIndex) {
    const roundsSelect = document.getElementById(`rounds_${dayNumber}_${classIndex}`);
    const roundsContainer = document.getElementById(`roundsConfig_${dayNumber}_${classIndex}`);
    
    if (!roundsSelect || !roundsContainer) return;
    
    const numRounds = parseInt(roundsSelect.value);
    roundsContainer.innerHTML = generateRoundsHTML(dayNumber, classIndex, numRounds);
}

// Add new class configuration
function addClassConfig(dayNumber) {
    const container = document.getElementById(`classesContainer_${dayNumber}`);
    if (!container) return;
    
    const existingClasses = container.querySelectorAll('.class-config');
    const newClassIndex = existingClasses.length + 1;
    
    const newClassHTML = `
        <div class="class-config" id="class_${dayNumber}_${newClassIndex}">
            ${generateSingleClassHTML(dayNumber, newClassIndex)}
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', newClassHTML);
}

// Remove class configuration
function removeClassConfig(dayNumber, classIndex) {
    const classElement = document.getElementById(`class_${dayNumber}_${classIndex}`);
    if (classElement && confirm('Remove this class configuration?')) {
        classElement.remove();
    }
}

// Update day configuration status
function updateDayConfig() {
    // This function can be called when any day configuration changes
    // to update the overall status
}

// Save configuration for a specific day
function saveDayConfig(dayNumber) {
    const dateInput = document.getElementById(`date_${dayNumber}`);
    if (!dateInput || !dateInput.value) {
        showStatusMessage('Please select a date for this day', 'error');
        return;
    }
    
    const date = dateInput.value;
    const classConfigs = [];
    
    // Get all class configurations for this day
    const classElements = document.querySelectorAll(`#classesContainer_${dayNumber} .class-config`);
    
    for (let i = 0; i < classElements.length; i++) {
        const classIndex = i + 1;
        const classNameSelect = document.getElementById(`className_${dayNumber}_${classIndex}`);
        const judgeSelect = document.getElementById(`judge_${dayNumber}_${classIndex}`);
        const roundsSelect = document.getElementById(`rounds_${dayNumber}_${classIndex}`);
        
        if (!classNameSelect || !judgeSelect || !roundsSelect) continue;
        
        const className = classNameSelect.value;
        const judge = judgeSelect.value;
        const numRounds = parseInt(roundsSelect.value);
        
        if (!className || !judge) {
            showStatusMessage(`Please complete all fields for Class ${classIndex}`, 'error');
            return;
        }
        
        // Create configuration for each round
        for (let round = 1; round <= numRounds; round++) {
            const timeInput = document.getElementById(`roundTime_${dayNumber}_${classIndex}_${round}`);
            const time = timeInput ? timeInput.value : '';
            
            classConfigs.push({
                day: dayNumber.toString(),
                date: date,
                className: className,
                judge: judge,
                roundNum: round,
                time: time
            });
        }
    }
    
    if (classConfigs.length === 0) {
        showStatusMessage('Please add at least one class configuration', 'error');
        return;
    }
    
    // Remove existing configurations for this day
    TrialApp.trialConfig = TrialApp.trialConfig.filter(config => config.day !== dayNumber.toString());
    
    // Add new configurations
    TrialApp.trialConfig.push(...classConfigs);
    
    // Update UI
    TrialApp.savedDays++;
    updateDayConfigStatus(dayNumber);
    
    showStatusMessage(`Day ${dayNumber} configuration saved successfully!`, 'success');
    
    // Check if all days are configured
    if (TrialApp.savedDays === TrialApp.totalDays) {
        document.getElementById('saveTrialSection').style.display = 'block';
        showStatusMessage('All days configured! Please review and save your trial.', 'info');
    }
}

// Update day configuration status visual indicator
function updateDayConfigStatus(dayNumber) {
    const statusElement = document.querySelector(`#dayConfigContainer .day-config h4 .day-status`);
    if (statusElement) {
        statusElement.className = 'day-status complete';
        statusElement.textContent = '✓ Complete';
    }
}

// Save complete trial data
function saveTrialData() {
    const trialNameInput = document.getElementById('trialName');
    if (!trialNameInput || !trialNameInput.value.trim()) {
        showStatusMessage('Please enter a trial name', 'error');
        return;
    }
    
    if (TrialApp.trialConfig.length === 0) {
        showStatusMessage('Please configure at least one day', 'error');
        return;
    }
    
    const trialData = {
        id: TrialApp.currentTrialId || generateUniqueId('trial'),
        name: trialNameInput.value.trim(),
        config: TrialApp.trialConfig,
        created: TrialApp.currentTrialId ? undefined : getCurrentTimestamp(), // Don't update created date for edits
        results: TrialApp.entryResults || [],
        runningOrders: TrialApp.runningOrders || {},
        digitalScores: TrialApp.digitalScores || {}
    };
    
    const trialId = window.saveTrialData(trialData);
    
    if (trialId) {
        // Make trial public for entry form access
        makeTrialPublic(trialId);
        
        TrialApp.currentTrialId = trialId;
        
        // Generate shareable URL
        const baseURL = window.location.origin + window.location.pathname.replace('index.html', '');
        const shareableURL = `${baseURL}entry-form.html?trial=${trialId}`;
        
        // Show success section
        const entryFormLink = document.getElementById('entryFormLink');
        const shareableURLInput = document.getElementById('shareableURL');
        
        if (entryFormLink && shareableURLInput) {
            shareableURLInput.value = shareableURL;
            entryFormLink.style.display = 'block';
        }
        
        showStatusMessage(`Trial "${trialData.name}" saved successfully!`, 'success');
        
        // Update dashboard
        setTimeout(() => {
            loadUserTrials();
            updateDashboardStats();
        }, 1000);
    } else {
        showStatusMessage('Failed to save trial. Please try again.', 'error');
    }
}

// Copy URL to clipboard
async function copyURL() {
    const shareableURLInput = document.getElementById('shareableURL');
    if (!shareableURLInput) return;
    
    const success = await copyToClipboard(shareableURLInput.value);
    
    if (success) {
        showStatusMessage('Entry form URL copied to clipboard!', 'success');
    } else {
        showStatusMessage('Failed to copy URL. Please copy manually.', 'error');
    }
}

// Open entry form in new tab
function openEntryForm() {
    const shareableURLInput = document.getElementById('shareableURL');
    if (!shareableURLInput) return;
    
    window.open(shareableURLInput.value, '_blank');
}

// Reset trial setup form
function resetTrialSetup() {
    if (confirm('Reset all trial configuration? This will clear all unsaved changes.')) {
        document.getElementById('trialName').value = '';
        document.getElementById('trialDays').value = '';
        document.getElementById('dayConfigSection').style.display = 'none';
        document.getElementById('saveTrialSection').style.display = 'none';
        document.getElementById('entryFormLink').style.display = 'none';
        
        TrialApp.currentTrialId = null;
        TrialApp.trialConfig = [];
        TrialApp.totalDays = 0;
        TrialApp.savedDays = 0;
        
        showStatusMessage('Trial setup reset', 'info');
    }
}

// Validate trial configuration
function validateTrialConfig() {
    const errors = [];
    
    if (!TrialApp.trialConfig || TrialApp.trialConfig.length === 0) {
        errors.push('No trial configuration found');
        return errors;
    }
    
    // Check for missing required fields
    const requiredFields = ['day', 'date', 'className', 'judge', 'roundNum'];
    
    TrialApp.trialConfig.forEach((config, index) => {
        requiredFields.forEach(field => {
            if (!config[field]) {
                errors.push(`Missing ${field} in configuration ${index + 1}`);
            }
        });
    });
    
    // Check for duplicate class/round combinations on same day
    const combinations = new Set();
    TrialApp.trialConfig.forEach(config => {
        const key = `${config.day}_${config.className}_${config.roundNum}`;
        if (combinations.has(key)) {
            errors.push(`Duplicate class/round: ${config.className} Round ${config.roundNum} on Day ${config.day}`);
        }
        combinations.add(key);
    });
    
    return errors;
}

// Preview trial configuration
function previewTrialConfig() {
    const errors = validateTrialConfig();
    
    if (errors.length > 0) {
        showStatusMessage(`Configuration errors: ${errors.join(', ')}`, 'error');
        return;
    }
    
    // Group by day for preview
    const dayGroups = {};
    TrialApp.trialConfig.forEach(config => {
        if (!dayGroups[config.day]) {
            dayGroups[config.day] = {
                date: config.date,
                classes: {}
            };
        }
        
        if (!dayGroups[config.day].classes[config.className]) {
            dayGroups[config.day].classes[config.className] = {
                judge: config.judge,
                rounds: []
            };
        }
        
        dayGroups[config.day].classes[config.className].rounds.push({
            round: config.roundNum,
            time: config.time || 'TBD'
        });
    });
    
    // Generate preview HTML
    let previewHTML = '<div class="trial-preview"><h4>Trial Configuration Preview</h4>';
    
    for (const day in dayGroups) {
        const dayData = dayGroups[day];
        previewHTML += `
            <div class="day-preview">
                <h5>Day ${day} - ${formatDate(dayData.date)}</h5>
        `;
        
        for (const className in dayData.classes) {
            const classData = dayData.classes[className];
            previewHTML += `
                <div class="class-preview">
                    <strong>${className}</strong> - Judge: ${classData.judge}<br>
                    Rounds: ${classData.rounds.map(r => `${r.round} (${r.time})`).join(', ')}
                </div>
            `;
        }
        
        previewHTML += '</div>';
    }
    
    previewHTML += '</div>';
    
    // Show preview in a modal or alert
    const previewDiv = document.createElement('div');
    previewDiv.innerHTML = previewHTML;
    previewDiv.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000; max-width: 80%; max-height: 80%; overflow-y: auto;
    `;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 9999;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'btn btn-secondary';
    closeButton.onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(previewDiv);
    };
    
    previewDiv.appendChild(closeButton);
    
    document.body.appendChild(overlay);
    document.body.appendChild(previewDiv);
}

// Export functions to global scope
window.generateDayConfig = generateDayConfig;
window.addClassConfig = addClassConfig;
window.removeClassConfig = removeClassConfig;
window.updateRoundsConfig = updateRoundsConfig;
window.updateDayConfig = updateDayConfig;
window.saveDayConfig = saveDayConfig;
window.saveTrialData = saveTrialData;
window.copyURL = copyURL;
window.openEntryForm = openEntryForm;
window.resetTrialSetup = resetTrialSetup;
window.previewTrialConfig = previewTrialConfig;
