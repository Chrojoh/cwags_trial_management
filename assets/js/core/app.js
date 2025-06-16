// === DOG TRIAL MANAGEMENT SYSTEM - MAIN APPLICATION ===

// Global Application State
const TrialApp = {
    currentUser: null,
    currentTrialId: null,
    dogData: [],
    availableClasses: [],
    availableJudges: [],
    trialConfig: [],
    entryResults: [],
    runningOrders: {},
    digitalScores: {},
    totalDays: 0,
    savedDays: 0,
    isInitialized: false
};

// Application Initialization
function initializeApp() {
    console.log('🐕 Initializing Dog Trial Management System...');
    
    // Check if this is a direct entry form access
    if (handleURLParameters()) {
        loadDogData();
        return;
    }
    
    // Initialize dashboard
    loadDogData();
    loadUserTrials();
    updateDashboardStats();
    showTab('dashboard');
    
    console.log('✅ Application initialized successfully');
    TrialApp.isInitialized = true;
}

// URL Parameter Handling (for entry forms)
function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const trialId = urlParams.get('trial');
    
    if (trialId) {
        TrialApp.currentTrialId = trialId;
        // Hide dashboard tabs and show entry form
        const headerButtons = document.querySelector('.header-buttons');
        if (headerButtons) {
            headerButtons.style.display = 'none';
        }
        return true;
    }
    
    return false;
}

// Load Dog Data from JSON file
async function loadDogData() {
    try {
        showStatusMessage('Loading dog database...', 'info');
        
        const response = await fetch('./assets/data/dogs.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            TrialApp.dogData = data;
            
            // Extract unique values for dropdowns
            TrialApp.availableClasses = getUniqueValues(data, 'class');
            TrialApp.availableJudges = getUniqueValues(data, 'judges');
            
            console.log(`📊 Dog data loaded: ${data.length} records`);
            console.log(`📋 Available classes:`, TrialApp.availableClasses);
            console.log(`👨‍⚖️ Available judges:`, TrialApp.availableJudges);
            console.log('Sample dog record:', data[0]);
            
            showStatusMessage(`Dog database loaded successfully! ${data.length} dogs, ${TrialApp.availableClasses.length} classes, ${TrialApp.availableJudges.length} judges.`, 'success');
            
            updateDashboardStats();
            
            // Trigger any dropdowns to refresh if we're on setup page
            if (window.location.hash === '#setup' || document.querySelector('.tab-content.active')?.id === 'setup') {
                setTimeout(() => {
                    console.log('Refreshing dropdowns after data load...');
                }, 500);
            }
        } else {
            throw new Error('Invalid data format or empty dataset');
        }
    } catch (error) {
        console.error('❌ Error loading dog data:', error);
        showStatusMessage('Failed to load dog database. Using demo data.', 'warning');
        loadDemoData();
    }
}

// Demo data if JSON file is not available
function loadDemoData() {
    TrialApp.dogData = [
        {
            registration: "DOG001",
            callName: "Max",
            handler: "John Smith",
            class: "Agility 1",
            judges: "Jane Doe"
        },
        {
            registration: "DOG002", 
            callName: "Bella",
            handler: "Sarah Johnson",
            class: "Agility 2",
            judges: "Mike Wilson"
        },
        {
            registration: "DOG003",
            callName: "Charlie",
            handler: "David Brown",
            class: "Jumping 1",
            judges: "Jane Doe"
        },
        {
            registration: "DOG004",
            callName: "Luna",
            handler: "Emily Davis",
            class: "Jumping 2", 
            judges: "Mike Wilson"
        },
        {
            registration: "DOG005",
            callName: "Rocky",
            handler: "Michael Taylor",
            class: "Agility 1",
            judges: "Jane Doe"
        }
    ];
    
    TrialApp.availableClasses = getUniqueValues(TrialApp.dogData, 'class');
    TrialApp.availableJudges = getUniqueValues(TrialApp.dogData, 'judges');
    
    console.log('📋 Demo data loaded');
    updateDashboardStats();
}

// Tab Management
function showTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const activeTab = document.getElementById(tabName);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Update button states
    const buttons = document.querySelectorAll('.header-buttons .btn');
    buttons.forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    
    // Highlight active button
    const activeButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (activeButton) {
        activeButton.classList.remove('btn-secondary');
        activeButton.classList.add('btn-primary');
    }
    
    // Tab-specific initialization
    switch(tabName) {
        case 'entries':
            updateEntriesList();
            updateRunningOrderDisplay();
            break;
        case 'scores':
            updateScoreSelectorGrid();
            break;
        case 'setup':
            // Reset setup form if needed
            break;
    }
}

// Dashboard Functions
function loadUserTrials() {
    const userTrials = getStorageItem('userTrials') || {};
    const trialsList = document.getElementById('trialsList');
    
    if (!trialsList) return;
    
    if (Object.keys(userTrials).length === 0) {
        trialsList.innerHTML = `
            <div class="empty-state">
                <p>No trials created yet.</p>
                <p class="help-text">Create your first trial to get started!</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="trials-list">';
    for (const trialId in userTrials) {
        if (userTrials.hasOwnProperty(trialId)) {
            const trial = userTrials[trialId];
            const created = new Date(trial.created).toLocaleDateString();
            const days = trial.config ? getUniqueDays(trial.config).length : 0;
            
            // Get current entry count
            const totalEntries = (trial.results || []).length;
            
            const trialName = trial.name || 'Untitled Trial';
            const trialStatus = (trial.config && trial.config.length > 0) ? 'Configured' : 'Setup Incomplete';
            const statusColor = (trial.config && trial.config.length > 0) ? '#28a745' : '#dc3545';
            
            html += `
                <div class="trial-item">
                    <div class="trial-header">
                        <h4>${trialName}</h4>
                        <span class="trial-status" style="color: ${statusColor}">${trialStatus}</span>
                    </div>
                    <div class="trial-meta">
                        <p><strong>Created:</strong> ${created}</p>
                        <p><strong>Days:</strong> ${days} | <strong>Entries:</strong> ${totalEntries}</p>
                    </div>
                    <div class="trial-actions">
                        <button onclick="editTrial('${trialId}')" class="btn btn-secondary">Edit</button>
                        <button onclick="viewTrial('${trialId}')" class="btn btn-primary">View</button>
                        <button onclick="deleteTrial('${trialId}')" class="btn btn-secondary">Delete</button>
                    </div>
                </div>
            `;
        }
    }
    html += '</div>';
    
    trialsList.innerHTML = html;
}

function updateDashboardStats() {
    const totalDogsElement = document.getElementById('totalDogs');
    const totalTrialsElement = document.getElementById('totalTrials');
    
    if (totalDogsElement) {
        totalDogsElement.textContent = TrialApp.dogData.length;
    }
    
    if (totalTrialsElement) {
        const userTrials = getStorageItem('userTrials') || {};
        totalTrialsElement.textContent = Object.keys(userTrials).length;
    }
}

// Trial Management
function createNewTrial() {
    showTab('setup');
    // Reset setup form
    document.getElementById('trialName').value = '';
    document.getElementById('trialDays').value = '';
    document.getElementById('dayConfigSection').style.display = 'none';
    document.getElementById('saveTrialSection').style.display = 'none';
    TrialApp.trialConfig = [];
    TrialApp.totalDays = 0;
    TrialApp.savedDays = 0;
}

function editTrial(trialId) {
    const userTrials = getStorageItem('userTrials') || {};
    const trial = userTrials[trialId];
    
    if (!trial) {
        showStatusMessage('Trial not found!', 'error');
        return;
    }
    
    TrialApp.currentTrialId = trialId;
    
    // Load trial data into setup form
    document.getElementById('trialName').value = trial.name || '';
    
    if (trial.config) {
        TrialApp.trialConfig = trial.config;
        const days = getUniqueDays(trial.config).length;
        TrialApp.totalDays = days;
        TrialApp.savedDays = days;
        
        document.getElementById('trialDays').value = days.toString();
        generateDayConfig();
        document.getElementById('saveTrialSection').style.display = 'block';
    }
    
    showTab('setup');
    showStatusMessage(`Editing trial: ${trial.name}`, 'info');
}

function viewTrial(trialId) {
    TrialApp.currentTrialId = trialId;
    loadTrialData(trialId);
    showTab('entries');
}

function deleteTrial(trialId) {
    if (confirm('Are you sure you want to delete this trial? This action cannot be undone.')) {
        const userTrials = getStorageItem('userTrials') || {};
        delete userTrials[trialId];
        setStorageItem('userTrials', userTrials);
        
        // Also remove from public trials
        const publicTrials = getStorageItem('publicTrials') || {};
        delete publicTrials[trialId];
        setStorageItem('publicTrials', publicTrials);
        
        loadUserTrials();
        updateDashboardStats();
        showStatusMessage('Trial deleted successfully!', 'success');
    }
}

function loadTrialData(trialId) {
    const userTrials = getStorageItem('userTrials') || {};
    const trial = userTrials[trialId];
    
    if (!trial) {
        showStatusMessage('Trial not found!', 'error');
        return;
    }
    
    TrialApp.trialConfig = trial.config || [];
    TrialApp.entryResults = trial.results || [];
    TrialApp.runningOrders = trial.runningOrders || {};
    TrialApp.digitalScores = trial.digitalScores || {};
    
    // Sync with public storage
    const publicTrials = getStorageItem('publicTrials') || {};
    if (publicTrials[trialId] && publicTrials[trialId].results) {
        const publicEntries = publicTrials[trialId].results;
        TrialApp.entryResults = mergeEntries(TrialApp.entryResults, publicEntries);
    }
    
    console.log(`📋 Loaded trial: ${trial.name}`);
}

// Entry Form Functions for Public Access
function initializeEntryForm() {
    if (!TrialApp.currentTrialId) {
        document.body.innerHTML = `
            <div class="container">
                <div class="error-panel">
                    <h2>❌ Invalid Trial Link</h2>
                    <p>This entry form link is invalid or expired.</p>
                    <p>Please contact the trial organizer for the correct link.</p>
                </div>
            </div>
        `;
        return;
    }
    
    loadDogData().then(() => {
        loadTrialInfo();
        updateTrialOptions();
    });
}

function loadTrialInfo() {
    const publicTrials = getStorageItem('publicTrials') || {};
    const trial = publicTrials[TrialApp.currentTrialId];
    
    if (!trial) {
        document.getElementById('trialInfo').innerHTML = `
            <h2>❌ Trial Not Found</h2>
            <p>This trial is no longer available or the link is invalid.</p>
        `;
        return;
    }
    
    const trialTitle = document.getElementById('trialTitle');
    const trialDetails = document.getElementById('trialDetails');
    
    if (trialTitle) {
        trialTitle.textContent = trial.name || 'Dog Trial';
    }
    
    if (trialDetails) {
        const days = trial.config ? getUniqueDays(trial.config).length : 0;
        trialDetails.innerHTML = `
            <strong>Duration:</strong> ${days} day${days !== 1 ? 's' : ''} | 
            <strong>Entry Form</strong>
        `;
    }
    
    TrialApp.trialConfig = trial.config || [];
}

// Initialize application when page loads
window.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the entry form page
    if (window.location.pathname.includes('entry-form.html')) {
        initializeEntryForm();
    } else {
        initializeApp();
    }
});

// Export functions for global access
window.TrialApp = TrialApp;
window.showTab = showTab;
window.createNewTrial = createNewTrial;
window.editTrial = editTrial;
window.viewTrial = viewTrial;
window.deleteTrial = deleteTrial;
