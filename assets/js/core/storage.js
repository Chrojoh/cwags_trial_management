// === DATA STORAGE MANAGEMENT ===

// Storage keys
const STORAGE_KEYS = {
    USER_TRIALS: 'userTrials',
    PUBLIC_TRIALS: 'publicTrials',
    DIGITAL_SCORES: 'digitalScores',
    RUNNING_ORDERS: 'runningOrders',
    APP_SETTINGS: 'appSettings'
};

// Check if localStorage is available
function isStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        console.warn('LocalStorage not available, using memory storage');
        return false;
    }
}

// Memory storage fallback
const memoryStorage = {
    data: {},
    setItem(key, value) {
        this.data[key] = value;
    },
    getItem(key) {
        return this.data[key] || null;
    },
    removeItem(key) {
        delete this.data[key];
    },
    clear() {
        this.data = {};
    }
};

// Get storage interface (localStorage or memory fallback)
function getStorage() {
    return isStorageAvailable() ? localStorage : memoryStorage;
}

// Safe JSON parse with error handling
function safeJSONParse(jsonString, defaultValue = null) {
    if (!jsonString) return defaultValue;
    
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        return defaultValue;
    }
}

// Safe JSON stringify with error handling
function safeJSONStringify(data, defaultValue = '{}') {
    try {
        return JSON.stringify(data);
    } catch (error) {
        console.error('Error stringifying JSON:', error);
        return defaultValue;
    }
}

// Get item from storage
function getStorageItem(key, defaultValue = null) {
    try {
        const storage = getStorage();
        const item = storage.getItem(key);
        return item ? safeJSONParse(item, defaultValue) : defaultValue;
    } catch (error) {
        console.error(`Error getting storage item ${key}:`, error);
        return defaultValue;
    }
}

// Set item in storage
function setStorageItem(key, value) {
    try {
        const storage = getStorage();
        const jsonString = safeJSONStringify(value);
        storage.setItem(key, jsonString);
        return true;
    } catch (error) {
        console.error(`Error setting storage item ${key}:`, error);
        return false;
    }
}

// Remove item from storage
function removeStorageItem(key) {
    try {
        const storage = getStorage();
        storage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing storage item ${key}:`, error);
        return false;
    }
}

// Clear all storage
function clearAllStorage() {
    try {
        const storage = getStorage();
        storage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
}

// === USER TRIALS MANAGEMENT ===

// Save trial data
function saveTrialData(trialData) {
    const trialId = trialData.id || generateUniqueId('trial');
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    
    const trial = {
        id: trialId,
        name: trialData.name,
        created: trialData.created || getCurrentTimestamp(),
        modified: getCurrentTimestamp(),
        config: trialData.config || [],
        results: trialData.results || [],
        runningOrders: trialData.runningOrders || {},
        digitalScores: trialData.digitalScores || {}
    };
    
    userTrials[trialId] = trial;
    
    if (setStorageItem(STORAGE_KEYS.USER_TRIALS, userTrials)) {
        console.log(`✅ Trial saved: ${trial.name} (${trialId})`);
        return trialId;
    } else {
        console.error('❌ Failed to save trial');
        return null;
    }
}

// Get trial by ID
function getTrialById(trialId) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    return userTrials[trialId] || null;
}

// Update trial configuration
function updateTrialConfig(trialId, config) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    
    if (userTrials[trialId]) {
        userTrials[trialId].config = config;
        userTrials[trialId].modified = getCurrentTimestamp();
        
        return setStorageItem(STORAGE_KEYS.USER_TRIALS, userTrials);
    }
    
    return false;
}

// Add entry to trial
function addEntryToTrial(trialId, entryData) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    
    if (userTrials[trialId]) {
        if (!userTrials[trialId].results) {
            userTrials[trialId].results = [];
        }
        
        const entry = {
            ...entryData,
            id: generateUniqueId('entry'),
            timestamp: getCurrentTimestamp()
        };
        
        userTrials[trialId].results.push(entry);
        userTrials[trialId].modified = getCurrentTimestamp();
        
        return setStorageItem(STORAGE_KEYS.USER_TRIALS, userTrials) ? entry : null;
    }
    
    return null;
}

// === PUBLIC TRIALS MANAGEMENT ===

// Make trial public (accessible via entry form)
function makeTrialPublic(trialId) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    const trial = userTrials[trialId];
    
    if (!trial) {
        console.error('Trial not found');
        return false;
    }
    
    const publicTrials = getStorageItem(STORAGE_KEYS.PUBLIC_TRIALS, {});
    
    publicTrials[trialId] = {
        id: trialId,
        name: trial.name,
        config: trial.config,
        created: trial.created,
        results: trial.results || []
    };
    
    return setStorageItem(STORAGE_KEYS.PUBLIC_TRIALS, publicTrials);
}

// Add public entry (from entry form)
function addPublicEntry(trialId, entryData) {
    const publicTrials = getStorageItem(STORAGE_KEYS.PUBLIC_TRIALS, {});
    
    if (publicTrials[trialId]) {
        if (!publicTrials[trialId].results) {
            publicTrials[trialId].results = [];
        }
        
        const entry = {
            ...entryData,
            id: generateUniqueId('entry'),
            timestamp: getCurrentTimestamp(),
            source: 'public'
        };
        
        publicTrials[trialId].results.push(entry);
        
        if (setStorageItem(STORAGE_KEYS.PUBLIC_TRIALS, publicTrials)) {
            console.log(`✅ Public entry added to trial ${trialId}`);
            return entry;
        }
    }
    
    return null;
}

// Sync public entries back to user trial
function syncPublicEntries(trialId) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    const publicTrials = getStorageItem(STORAGE_KEYS.PUBLIC_TRIALS, {});
    
    const userTrial = userTrials[trialId];
    const publicTrial = publicTrials[trialId];
    
    if (!userTrial || !publicTrial) {
        return false;
    }
    
    const userEntries = userTrial.results || [];
    const publicEntries = publicTrial.results || [];
    
    // Merge entries (avoiding duplicates)
    const mergedEntries = mergeEntries(userEntries, publicEntries);
    
    userTrial.results = mergedEntries;
    userTrial.modified = getCurrentTimestamp();
    
    return setStorageItem(STORAGE_KEYS.USER_TRIALS, userTrials);
}

// === RUNNING ORDERS MANAGEMENT ===

// Save running order for a class/round
function saveRunningOrder(trialId, classRoundKey, runningOrder) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    
    if (userTrials[trialId]) {
        if (!userTrials[trialId].runningOrders) {
            userTrials[trialId].runningOrders = {};
        }
        
        userTrials[trialId].runningOrders[classRoundKey] = {
            order: runningOrder,
            generated: getCurrentTimestamp()
        };
        
        userTrials[trialId].modified = getCurrentTimestamp();
        
        return setStorageItem(STORAGE_KEYS.USER_TRIALS, userTrials);
    }
    
    return false;
}

// Get running order for a class/round
function getRunningOrder(trialId, classRoundKey) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    const trial = userTrials[trialId];
    
    if (trial && trial.runningOrders && trial.runningOrders[classRoundKey]) {
        return trial.runningOrders[classRoundKey].order;
    }
    
    return null;
}

// === DIGITAL SCORES MANAGEMENT ===

// Save digital scores for a class/round
function saveDigitalScores(trialId, classRoundKey, scores) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    
    if (userTrials[trialId]) {
        if (!userTrials[trialId].digitalScores) {
            userTrials[trialId].digitalScores = {};
        }
        
        userTrials[trialId].digitalScores[classRoundKey] = {
            scores: scores,
            updated: getCurrentTimestamp()
        };
        
        userTrials[trialId].modified = getCurrentTimestamp();
        
        return setStorageItem(STORAGE_KEYS.USER_TRIALS, userTrials);
    }
    
    return false;
}

// Get digital scores for a class/round
function getDigitalScores(trialId, classRoundKey) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    const trial = userTrials[trialId];
    
    if (trial && trial.digitalScores && trial.digitalScores[classRoundKey]) {
        return trial.digitalScores[classRoundKey].scores;
    }
    
    return {};
}

// === DATA EXPORT/IMPORT ===

// Export all trial data
function exportTrialData(trialId) {
    const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
    const trial = userTrials[trialId];
    
    if (!trial) {
        return null;
    }
    
    // Sync with public entries first
    syncPublicEntries(trialId);
    
    return {
        ...trial,
        exportedAt: getCurrentTimestamp(),
        version: '1.0'
    };
}

// Import trial data
function importTrialData(trialData) {
    if (!trialData || !trialData.name) {
        return false;
    }
    
    const trialId = generateUniqueId('imported_trial');
    const importedTrial = {
        ...trialData,
        id: trialId,
        imported: getCurrentTimestamp(),
        modified: getCurrentTimestamp()
    };
    
    delete importedTrial.exportedAt;
    
    return saveTrialData(importedTrial);
}

// === CLEANUP AND MAINTENANCE ===

// Clean up old data (optional maintenance)
function cleanupOldData(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTime = cutoffDate.getTime();
    
    let cleaned = 0;
    
    // Clean up old public trials without recent activity
    const publicTrials = getStorageItem(STORAGE_KEYS.PUBLIC_TRIALS, {});
    for (const trialId in publicTrials) {
        const trial = publicTrials[trialId];
        const createdTime = new Date(trial.created).getTime();
        
        if (createdTime < cutoffTime) {
            delete publicTrials[trialId];
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        setStorageItem(STORAGE_KEYS.PUBLIC_TRIALS, publicTrials);
        console.log(`🧹 Cleaned up ${cleaned} old public trials`);
    }
    
    return cleaned;
}

// Get storage usage info
function getStorageInfo() {
    if (!isStorageAvailable()) {
        return {
            available: false,
            message: 'Using memory storage (data will be lost on page refresh)'
        };
    }
    
    try {
        const userTrials = getStorageItem(STORAGE_KEYS.USER_TRIALS, {});
        const publicTrials = getStorageItem(STORAGE_KEYS.PUBLIC_TRIALS, {});
        
        return {
            available: true,
            userTrialsCount: Object.keys(userTrials).length,
            publicTrialsCount: Object.keys(publicTrials).length,
            totalSize: JSON.stringify(userTrials).length + JSON.stringify(publicTrials).length
        };
    } catch (error) {
        return {
            available: true,
            error: error.message
        };
    }
}

// Export functions to global scope
window.getStorageItem = getStorageItem;
window.setStorageItem = setStorageItem;
window.removeStorageItem = removeStorageItem;
window.clearAllStorage = clearAllStorage;
window.saveTrialData = saveTrialData;
window.getTrialById = getTrialById;
window.updateTrialConfig = updateTrialConfig;
window.addEntryToTrial = addEntryToTrial;
window.makeTrialPublic = makeTrialPublic;
window.addPublicEntry = addPublicEntry;
window.syncPublicEntries = syncPublicEntries;
window.saveRunningOrder = saveRunningOrder;
window.getRunningOrder = getRunningOrder;
window.saveDigitalScores = saveDigitalScores;
window.getDigitalScores = getDigitalScores;
window.exportTrialData = exportTrialData;
window.importTrialData = importTrialData;
window.cleanupOldData = cleanupOldData;
window.getStorageInfo = getStorageInfo;
