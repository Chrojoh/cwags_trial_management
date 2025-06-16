// === ENTRY FORM COMPONENT ===

// Typeahead functionality for registration numbers
const regNumberTypeahead = debounce(handleRegNumberTypeahead, 300);

// Handle registration number typeahead
function handleRegNumberTypeahead(input) {
    const query = input.value.trim().toLowerCase();
    const dropdown = document.getElementById('regNumberDropdown');
    const callNameDisplay = document.getElementById('callName');
    
    if (!dropdown || !callNameDisplay) return;
    
    if (query.length < 1) {
        dropdown.style.display = 'none';
        callNameDisplay.textContent = 'Call Name will appear here';
        callNameDisplay.style.color = '#718096';
        return;
    }
    
    // Filter dog data based on registration number
    const matches = TrialApp.dogData.filter(dog => 
        dog.registration.toLowerCase().includes(query) ||
        dog.callName.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results
    
    if (matches.length === 0) {
        dropdown.innerHTML = '<div class="typeahead-item">No matches found</div>';
        dropdown.style.display = 'block';
        callNameDisplay.textContent = 'Not found';
        callNameDisplay.style.color = '#e53e3e';
        return;
    }
    
    // Generate dropdown HTML
    let html = '';
    matches.forEach(dog => {
        html += `
            <div class="typeahead-item" onclick="selectRegNumber('${dog.registration}', '${dog.callName}')">
                <strong>${dog.registration}</strong> - ${dog.callName}
                <br><small>${dog.handler}</small>
            </div>
        `;
    });
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    
    // Check for exact match
    const exactMatch = matches.find(dog => 
        dog.registration.toLowerCase() === query
    );
    
    if (exactMatch) {
        callNameDisplay.textContent = exactMatch.callName;
        callNameDisplay.style.color = '#48bb78';
    } else {
        callNameDisplay.textContent = 'Type to search...';
        callNameDisplay.style.color = '#718096';
    }
}

// Select registration number from dropdown
function selectRegNumber(regNumber, callName) {
    const regInput = document.getElementById('regNumber');
    const callNameDisplay = document.getElementById('callName');
    const dropdown = document.getElementById('regNumberDropdown');
    
    if (regInput) regInput.value = regNumber;
    if (callNameDisplay) {
        callNameDisplay.textContent = callName;
        callNameDisplay.style.color = '#48bb78';
    }
    if (dropdown) dropdown.style.display = 'none';
}

// Hide registration number dropdown
function hideRegNumberDropdown() {
    setTimeout(() => {
        const dropdown = document.getElementById('regNumberDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }, 200);
}

// Show registration number dropdown
function showRegNumberDropdown() {
    const input = document.getElementById('regNumber');
    if (input && input.value.length > 0) {
        handleRegNumberTypeahead(input);
    }
}

// Update trial options for entry form
function updateTrialOptions() {
    const container = document.getElementById('trialOptions');
    
    if (!container) return;
    
    if (!TrialApp.trialConfig || TrialApp.trialConfig.length === 0) {
        container.innerHTML = '<p class="loading-text">Trial configuration not available.</p>';
        return;
    }
    
    // Group trials by day and class
    const groupedTrials = groupEntriesByClassRound(TrialApp.trialConfig.map(config => ({
        date: config.date,
        className: config.className,
        round: config.roundNum,
        judge: config.judge,
        day: config.day,
        time: config.time
    })));
    
    let html = '';
    const sortedKeys = Object.keys(groupedTrials).sort();
    
    for (const key of sortedKeys) {
        const trial = groupedTrials[key];
        const displayTime = trial.entries[0]?.time || 'TBD';
        
        html += `
            <div class="trial-option">
                <label class="checkbox-option">
                    <input type="checkbox" name="trialSelection" value="${key}">
                    <div class="trial-info">
                        <h4>${trial.className} - Round ${trial.round}</h4>
                        <div class="trial-meta">
                            <strong>Date:</strong> ${formatDate(trial.date)}<br>
                            <strong>Judge:</strong> ${trial.judge}<br>
                            <strong>Time:</strong> ${displayTime}
                        </div>
                    </div>
                </label>
            </div>
        `;
    }
    
    if (html) {
        container.innerHTML = html;
    } else {
        container.innerHTML = '<p class="loading-text">No trials available for entry.</p>';
    }
}

// Submit entry form
function submitEntry() {
    const regNumber = document.getElementById('regNumber').value.trim();
    const handlerName = document.getElementById('handlerName').value.trim();
    const selectedTrials = document.querySelectorAll('input[name="trialSelection"]:checked');
    const entryType = document.querySelector('input[name="entryType"]:checked')?.value || 'regular';
    
    // Validation
    if (!regNumber) {
        showStatusMessage('Please enter a registration number', 'error');
        return;
    }
    
    if (!isValidRegistration(regNumber)) {
        showStatusMessage('Please enter a valid registration number', 'error');
        return;
    }
    
    if (!handlerName) {
        showStatusMessage('Please enter handler name', 'error');
        return;
    }
    
    if (selectedTrials.length === 0) {
        showStatusMessage('Please select at least one trial', 'error');
        return;
    }
    
    // Find dog data
    const dog = TrialApp.dogData.find(d => 
        d.registration.toLowerCase() === regNumber.toLowerCase()
    );
    
    const callName = dog ? dog.callName : 'Unknown';
    
    // Create entries
    const entries = [];
    selectedTrials.forEach(checkbox => {
        const trialKey = checkbox.value;
        const [date, className, round] = trialKey.split('_');
        
        // Find trial config for judge info
        const config = TrialApp.trialConfig.find(c => 
            c.date === date && 
            c.className === className && 
            c.roundNum === parseInt(round)
        );
        
        const entry = {
            regNumber: regNumber,
            callName: callName,
            handler: sanitizeText(handlerName),
            date: date,
            className: className,
            round: parseInt(round),
            judge: config ? config.judge : 'Unknown',
            entryType: entryType,
            timestamp: getCurrentTimestamp()
        };
        
        entries.push(entry);
    });
    
    // Submit entries
    let successCount = 0;
    let failureCount = 0;
    
    entries.forEach(entry => {
        const result = addPublicEntry(TrialApp.currentTrialId, entry);
        if (result) {
            successCount++;
        } else {
            failureCount++;
        }
    });
    
    if (successCount > 0) {
        showEntrySuccess(entries, successCount, failureCount);
    } else {
        showStatusMessage('Failed to submit entries. Please try again.', 'error');
    }
}

// Show entry success message
function showEntrySuccess(entries, successCount, failureCount) {
    const form = document.querySelector('.entry-form-container');
    const successPanel = document.getElementById('successMessage');
    const entryDetails = document.getElementById('entryDetails');
    
    if (!form || !successPanel || !entryDetails) return;
    
    // Hide form and show success
    form.style.display = 'none';
    successPanel.style.display = 'block';
    
    // Generate entry details
    let detailsHTML = `
        <div class="entry-summary">
            <h3>Entry Details</h3>
            <p><strong>Registration:</strong> ${entries[0].regNumber}</p>
            <p><strong>Call Name:</strong> ${entries[0].callName}</p>
            <p><strong>Handler:</strong> ${entries[0].handler}</p>
            <p><strong>Entry Type:</strong> ${entries[0].entryType.toUpperCase()}</p>
        </div>
        <div class="trials-entered">
            <h4>Trials Entered (${successCount})</h4>
            <ul>
    `;
    
    entries.forEach(entry => {
        detailsHTML += `
            <li>
                ${entry.className} - Round ${entry.round}<br>
                <small>${formatDate(entry.date)} | Judge: ${entry.judge}</small>
            </li>
        `;
    });
    
    detailsHTML += '</ul></div>';
    
    if (failureCount > 0) {
        detailsHTML += `
            <div class="entry-warnings">
                <p class="warning">⚠️ ${failureCount} entries failed to submit. Please contact the trial organizer.</p>
            </div>
        `;
    }
    
    entryDetails.innerHTML = detailsHTML;
    
    showStatusMessage(`Successfully submitted ${successCount} ${successCount === 1 ? 'entry' : 'entries'}!`, 'success');
}

// Submit another entry
function submitAnother() {
    const form = document.querySelector('.entry-form-container');
    const successPanel = document.getElementById('successMessage');
    
    if (form && successPanel) {
        successPanel.style.display = 'none';
        form.style.display = 'block';
        resetForm();
    }
}

// Reset entry form
function resetForm() {
    // Clear form fields
    const regNumber = document.getElementById('regNumber');
    const handlerName = document.getElementById('handlerName');
    const callNameDisplay = document.getElementById('callName');
    const checkboxes = document.querySelectorAll('input[name="trialSelection"]');
    const entryTypeRegular = document.querySelector('input[name="entryType"][value="regular"]');
    
    if (regNumber) regNumber.value = '';
    if (handlerName) handlerName.value = '';
    if (callNameDisplay) {
        callNameDisplay.textContent = 'Call Name will appear here';
        callNameDisplay.style.color = '#718096';
    }
    
    checkboxes.forEach(checkbox => checkbox.checked = false);
    if (entryTypeRegular) entryTypeRegular.checked = true;
    
    // Hide dropdown
    const dropdown = document.getElementById('regNumberDropdown');
    if (dropdown) dropdown.style.display = 'none';
    
    // Clear status messages
    const statusContainer = document.getElementById('statusMessages');
    if (statusContainer) statusContainer.innerHTML = '';
    
    showStatusMessage('Form reset. Ready for new entry.', 'info');
}

// Initialize entry form for public access
function initializePublicEntryForm() {
    // Load trial information
    loadTrialInfo();
    
    // Update trial options
    updateTrialOptions();
    
    // Set up event listeners
    const regNumberInput = document.getElementById('regNumber');
    if (regNumberInput) {
        regNumberInput.addEventListener('input', function() {
            handleRegNumberTypeahead(this);
        });
        
        regNumberInput.addEventListener('focus', showRegNumberDropdown);
        regNumberInput.addEventListener('blur', hideRegNumberDropdown);
    }
    
    // Auto-populate handler name if dog is found
    const handlerInput = document.getElementById('handlerName');
    if (handlerInput && regNumberInput) {
        regNumberInput.addEventListener('change', function() {
            const regNumber = this.value.trim();
            const dog = TrialApp.dogData.find(d => 
                d.registration.toLowerCase() === regNumber.toLowerCase()
            );
            
            if (dog && !handlerInput.value.trim()) {
                handlerInput.value = dog.handler;
            }
        });
    }
    
    console.log('🎯 Entry form initialized for public access');
}

// Validate entry form data
function validateEntryForm() {
    const regNumber = document.getElementById('regNumber').value.trim();
    const handlerName = document.getElementById('handlerName').value.trim();
    const selectedTrials = document.querySelectorAll('input[name="trialSelection"]:checked');
    
    const errors = [];
    
    if (!regNumber) {
        errors.push('Registration number is required');
    } else if (!isValidRegistration(regNumber)) {
        errors.push('Invalid registration number format');
    }
    
    if (!handlerName) {
        errors.push('Handler name is required');
    } else if (handlerName.length < 2) {
        errors.push('Handler name must be at least 2 characters');
    }
    
    if (selectedTrials.length === 0) {
        errors.push('At least one trial must be selected');
    }
    
    return errors;
}

// Export functions to global scope
window.handleRegNumberTypeahead = handleRegNumberTypeahead;
window.selectRegNumber = selectRegNumber;
window.hideRegNumberDropdown = hideRegNumberDropdown;
window.showRegNumberDropdown = showRegNumberDropdown;
window.updateTrialOptions = updateTrialOptions;
window.submitEntry = submitEntry;
window.submitAnother = submitAnother;
window.resetForm = resetForm;
window.initializePublicEntryForm = initializePublicEntryForm;
window.validateEntryForm = validateEntryForm;
