// === UTILITY FUNCTIONS ===

// Status Message System
function showStatusMessage(message, type = 'info', duration = 5000) {
    const container = document.getElementById('statusMessages');
    if (!container) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `status-message status-${type}`;
    messageElement.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: inherit; font-size: 16px; cursor: pointer;">&times;</button>
    `;
    
    container.appendChild(messageElement);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (messageElement.parentElement) {
                messageElement.remove();
            }
        }, duration);
    }
    
    // Add fade-in animation
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
    }, 10);
}

// Get unique values from array of objects
function getUniqueValues(array, field, fallbackField = null) {
    const values = new Set();
    
    array.forEach(item => {
        const value = item[field] || (fallbackField ? item[fallbackField] : null);
        if (value) {
            if (typeof value === 'string' && value.includes(',')) {
                // Handle comma-separated values
                value.split(',').forEach(v => values.add(v.trim()));
            } else {
                values.add(value);
            }
        }
    });
    
    return Array.from(values).sort();
}

// Get unique days from trial config
function getUniqueDays(config) {
    if (!Array.isArray(config)) return [];
    
    const days = new Set();
    config.forEach(item => {
        if (item.day) days.add(item.day);
    });
    
    return Array.from(days).sort((a, b) => parseInt(a) - parseInt(b));
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Generate unique ID
function generateUniqueId(prefix = 'trial') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Merge entries (remove duplicates based on registration + trial selection)
function mergeEntries(userEntries, publicEntries) {
    const merged = [...userEntries];
    const existingKeys = new Set();
    
    // Create keys for existing entries
    userEntries.forEach(entry => {
        const key = `${entry.regNumber}_${entry.date}_${entry.className}_${entry.round}`;
        existingKeys.add(key);
    });
    
    // Add public entries that don't already exist
    publicEntries.forEach(entry => {
        const key = `${entry.regNumber}_${entry.date}_${entry.className}_${entry.round}`;
        if (!existingKeys.has(key)) {
            merged.push(entry);
        }
    });
    
    return merged;
}

// Validate registration number format
function isValidRegistration(regNumber) {
    if (!regNumber || typeof regNumber !== 'string') return false;
    
    // Allow alphanumeric with common separators
    return /^[A-Za-z0-9\-_]+$/.test(regNumber.trim());
}

// Validate email format
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

// Sanitize text input
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text.trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .substring(0, 100); // Limit length
}

// Copy text to clipboard
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            return result;
        }
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
}

// Download file
function downloadFile(content, filename, contentType = 'text/plain') {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// Debounce function for search inputs
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

// Shuffle array (Fisher-Yates)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Sort entries for running order
function sortEntriesForRunningOrder(entries, method = 'handler') {
    const sorted = [...entries];
    
    switch (method) {
        case 'handler':
            return sorted.sort((a, b) => a.handler.localeCompare(b.handler));
        case 'callName':
            return sorted.sort((a, b) => a.callName.localeCompare(b.callName));
        case 'registration':
            return sorted.sort((a, b) => a.regNumber.localeCompare(b.regNumber));
        case 'random':
            return shuffleArray(sorted);
        default:
            return sorted;
    }
}

// Group entries by class and round
function groupEntriesByClassRound(entries) {
    const grouped = {};
    
    entries.forEach(entry => {
        const key = `${entry.date}_${entry.className}_${entry.round}`;
        if (!grouped[key]) {
            grouped[key] = {
                date: entry.date,
                className: entry.className,
                round: entry.round,
                judge: entry.judge,
                entries: []
            };
        }
        grouped[key].entries.push(entry);
    });
    
    return grouped;
}

// Calculate placement based on scores
function calculatePlacements(scores) {
    // Sort scores in descending order (higher score = better)
    const sortedScores = [...scores].sort((a, b) => {
        const scoreA = parseFloat(a.score) || 0;
        const scoreB = parseFloat(b.score) || 0;
        return scoreB - scoreA;
    });
    
    // Assign placements
    let currentPlace = 1;
    for (let i = 0; i < sortedScores.length; i++) {
        if (i > 0 && sortedScores[i].score !== sortedScores[i-1].score) {
            currentPlace = i + 1;
        }
        sortedScores[i].placement = currentPlace;
    }
    
    return sortedScores;
}

// Format score for display
function formatScore(score) {
    if (score === null || score === undefined || score === '') return '';
    
    const numScore = parseFloat(score);
    if (isNaN(numScore)) return score;
    
    return numScore.toFixed(2);
}

// Check if browser supports local storage
function supportsLocalStorage() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
}

// Get current timestamp
function getCurrentTimestamp() {
    return new Date().toISOString();
}

// Parse CSV content
function parseCSV(csvContent) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const values = line.split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    
    return data;
}

// Export utility functions to global scope
window.showStatusMessage = showStatusMessage;
window.getUniqueValues = getUniqueValues;
window.getUniqueDays = getUniqueDays;
window.formatDate = formatDate;
window.generateUniqueId = generateUniqueId;
window.mergeEntries = mergeEntries;
window.isValidRegistration = isValidRegistration;
window.isValidEmail = isValidEmail;
window.sanitizeText = sanitizeText;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
window.debounce = debounce;
window.shuffleArray = shuffleArray;
window.sortEntriesForRunningOrder = sortEntriesForRunningOrder;
window.groupEntriesByClassRound = groupEntriesByClassRound;
window.calculatePlacements = calculatePlacements;
window.formatScore = formatScore;
window.supportsLocalStorage = supportsLocalStorage;
window.getCurrentTimestamp = getCurrentTimestamp;
window.parseCSV = parseCSV;