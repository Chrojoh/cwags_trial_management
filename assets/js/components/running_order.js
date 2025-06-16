// === RUNNING ORDER MANAGEMENT ===

// Update entries list display
function updateEntriesList() {
    const container = document.getElementById('entriesList');
    if (!container) return;
    
    if (!TrialApp.entryResults || TrialApp.entryResults.length === 0) {
        container.innerHTML = '<p class="loading-text">No entries yet. Share the entry form link to collect entries.</p>';
        return;
    }
    
    // Group entries by class and round
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    
    let html = '<div class="entries-summary">';
    html += `<h4>Total Entries: ${TrialApp.entryResults.length}</h4>`;
    
    for (const key in grouped) {
        const group = grouped[key];
        const regularEntries = group.entries.filter(e => e.entryType === 'regular').length;
        const feoEntries = group.entries.filter(e => e.entryType === 'feo').length;
        
        html += `
            <div class="entry-group">
                <div class="entry-group-header">
                    <h5>${group.className} - Round ${group.round}</h5>
                    <span class="entry-count">${group.entries.length} entries</span>
                </div>
                <div class="entry-group-meta">
                    <p><strong>Date:</strong> ${formatDate(group.date)} | <strong>Judge:</strong> ${group.judge}</p>
                    <p><strong>Regular:</strong> ${regularEntries} | <strong>FEO:</strong> ${feoEntries}</p>
                </div>
                <div class="entry-group-actions">
                    <button onclick="viewRunningOrder('${key}')" class="btn btn-secondary">View Running Order</button>
                    <button onclick="generateRunningOrderForClass('${key}')" class="btn btn-primary">Generate Order</button>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Update running order display
function updateRunningOrderDisplay() {
    const container = document.getElementById('runningOrderDisplay');
    if (!container) return;
    
    if (!TrialApp.trialConfig || TrialApp.trialConfig.length === 0) {
        container.innerHTML = '<p class="loading-text">Configure trial first to generate running orders.</p>';
        return;
    }
    
    if (!TrialApp.entryResults || TrialApp.entryResults.length === 0) {
        container.innerHTML = '<p class="loading-text">No entries available for running order.</p>';
        return;
    }
    
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    
    let html = '<div class="running-order-container">';
    
    for (const key in grouped) {
        const group = grouped[key];
        const customOrder = getRunningOrder(TrialApp.currentTrialId, key);
        const entries = customOrder || sortEntriesForRunningOrder(group.entries, 'handler');
        
        html += `
            <div class="running-order-section">
                <div class="running-order-header">
                    <span>${group.className} - Round ${group.round}</span>
                    <div class="running-order-actions">
                        <button onclick="editRunningOrder('${key}')" class="btn btn-secondary">Edit Order</button>
                        <button onclick="printRunningOrderForClass('${key}')" class="btn btn-secondary">Print</button>
                    </div>
                </div>
                <div class="running-order-list" id="runningOrder_${key}">
                    ${generateRunningOrderHTML(entries, key)}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Generate running order HTML
function generateRunningOrderHTML(entries, classRoundKey) {
    if (!entries || entries.length === 0) {
        return '<p class="loading-text">No entries for this class/round.</p>';
    }
    
    let html = '';
    entries.forEach((entry, index) => {
        const position = index + 1;
        html += `
            <div class="draggable-entry" draggable="true" 
                 data-entry-id="${entry.id || entry.regNumber}" 
                 data-class-round="${classRoundKey}">
                <div class="entry-info">
                    <div class="entry-details">
                        ${entry.handler} - ${entry.callName}
                        <span class="entry-type-badge badge-${entry.entryType}">
                            ${entry.entryType.toUpperCase()}
                        </span>
                    </div>
                    <div class="entry-meta">
                        Reg: ${entry.regNumber}
                    </div>
                </div>
                <div class="entry-position">${position}</div>
            </div>
        `;
    });
    
    return html;
}

// Generate running order for all classes
function generateRunningOrder() {
    if (!TrialApp.entryResults || TrialApp.entryResults.length === 0) {
        showStatusMessage('No entries available to generate running order', 'warning');
        return;
    }
    
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    let generated = 0;
    
    for (const key in grouped) {
        const group = grouped[key];
        const sortedEntries = sortEntriesForRunningOrder(group.entries, 'handler');
        
        if (saveRunningOrder(TrialApp.currentTrialId, key, sortedEntries)) {
            generated++;
        }
    }
    
    if (generated > 0) {
        updateRunningOrderDisplay();
        showStatusMessage(`Generated running orders for ${generated} class/round combinations`, 'success');
    } else {
        showStatusMessage('Failed to generate running orders', 'error');
    }
}

// Generate running order for specific class
function generateRunningOrderForClass(classRoundKey) {
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    const group = grouped[classRoundKey];
    
    if (!group) {
        showStatusMessage('Class/round not found', 'error');
        return;
    }
    
    // Show sorting options
    const sortMethod = prompt(
        'Choose sorting method:\n' +
        '1. Handler name (default)\n' +
        '2. Call name\n' +
        '3. Registration number\n' +
        '4. Random order\n\n' +
        'Enter 1, 2, 3, or 4:'
    );
    
    let method = 'handler';
    switch(sortMethod) {
        case '2': method = 'callName'; break;
        case '3': method = 'registration'; break;
        case '4': method = 'random'; break;
        default: method = 'handler'; break;
    }
    
    const sortedEntries = sortEntriesForRunningOrder(group.entries, method);
    
    if (saveRunningOrder(TrialApp.currentTrialId, classRoundKey, sortedEntries)) {
        updateRunningOrderDisplay();
        showStatusMessage(`Running order generated for ${group.className} Round ${group.round}`, 'success');
    } else {
        showStatusMessage('Failed to save running order', 'error');
    }
}

// View running order in detail
function viewRunningOrder(classRoundKey) {
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    const group = grouped[classRoundKey];
    
    if (!group) {
        showStatusMessage('Class/round not found', 'error');
        return;
    }
    
    const customOrder = getRunningOrder(TrialApp.currentTrialId, classRoundKey);
    const entries = customOrder || sortEntriesForRunningOrder(group.entries, 'handler');
    
    // Create modal for detailed view
    const modal = document.createElement('div');
    modal.className = 'running-order-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>Running Order - ${group.className} Round ${group.round}</h3>
                <button onclick="this.closest('.running-order-modal').remove()" class="btn btn-secondary">Close</button>
            </div>
            <div class="modal-body">
                <div class="running-order-info">
                    <p><strong>Date:</strong> ${formatDate(group.date)}</p>
                    <p><strong>Judge:</strong> ${group.judge}</p>
                    <p><strong>Total Entries:</strong> ${entries.length}</p>
                </div>
                <div class="running-order-table-container">
                    <table class="running-order-table">
                        <thead>
                            <tr>
                                <th class="position-col">Pos</th>
                                <th class="reg-col">Registration</th>
                                <th class="name-col">Call Name</th>
                                <th class="handler-col">Handler</th>
                                <th class="type-col">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entries.map((entry, index) => `
                                <tr class="${entry.entryType === 'feo' ? 'feo-row' : ''}">
                                    <td class="position-col">${index + 1}</td>
                                    <td class="reg-col">${entry.regNumber}</td>
                                    <td class="name-col">${entry.callName}</td>
                                    <td class="handler-col">${entry.handler}</td>
                                    <td class="type-col">${entry.entryType.toUpperCase()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="modal-actions">
                    <button onclick="printRunningOrderForClass('${classRoundKey}')" class="btn btn-primary">Print</button>
                    <button onclick="editRunningOrder('${classRoundKey}')" class="btn btn-secondary">Edit Order</button>
                </div>
            </div>
        </div>
    `;
    
    // Style the modal
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000;
        display: flex; justify-content: center; align-items: center;
    `;
    
    const overlay = modal.querySelector('.modal-overlay');
    overlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5);
    `;
    
    const content = modal.querySelector('.modal-content');
    content.style.cssText = `
        background: white; border-radius: 10px; padding: 20px; max-width: 90%; max-height: 90%;
        overflow-y: auto; position: relative; z-index: 1;
    `;
    
    document.body.appendChild(modal);
}

// Edit running order with drag and drop
function editRunningOrder(classRoundKey) {
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    const group = grouped[classRoundKey];
    
    if (!group) {
        showStatusMessage('Class/round not found', 'error');
        return;
    }
    
    const customOrder = getRunningOrder(TrialApp.currentTrialId, classRoundKey);
    const entries = customOrder || sortEntriesForRunningOrder(group.entries, 'handler');
    
    // Create drag-and-drop editor
    const editor = document.createElement('div');
    editor.className = 'running-order-editor';
    editor.innerHTML = `
        <div class="editor-overlay"></div>
        <div class="editor-content">
            <div class="editor-header">
                <h3>Edit Running Order - ${group.className} Round ${group.round}</h3>
                <div class="editor-actions">
                    <button onclick="saveRunningOrderEdit('${classRoundKey}')" class="btn btn-success">Save</button>
                    <button onclick="this.closest('.running-order-editor').remove()" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
            <div class="editor-body">
                <p class="help-text">Drag entries to reorder them. Changes are saved when you click Save.</p>
                <div class="draggable-list" id="editableRunningOrder">
                    ${entries.map((entry, index) => `
                        <div class="draggable-entry" draggable="true" data-entry-id="${entry.id || entry.regNumber}">
                            <div class="entry-info">
                                <div class="entry-details">
                                    ${entry.handler} - ${entry.callName}
                                    <span class="entry-type-badge badge-${entry.entryType}">
                                        ${entry.entryType.toUpperCase()}
                                    </span>
                                </div>
                                <div class="entry-meta">Reg: ${entry.regNumber}</div>
                            </div>
                            <div class="entry-position">${index + 1}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Style the editor
    editor.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000;
        display: flex; justify-content: center; align-items: center;
    `;
    
    const overlay = editor.querySelector('.editor-overlay');
    overlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5);
    `;
    
    const content = editor.querySelector('.editor-content');
    content.style.cssText = `
        background: white; border-radius: 10px; padding: 20px; max-width: 80%; max-height: 80%;
        overflow-y: auto; position: relative; z-index: 1;
    `;
    
    document.body.appendChild(editor);
    
    // Initialize drag and drop
    initializeDragAndDrop(editor);
    
    // Store reference for save function
    window.currentEditingKey = classRoundKey;
    window.currentEditingEntries = entries;
}

// Initialize drag and drop functionality
function initializeDragAndDrop(container) {
    const draggables = container.querySelectorAll('.draggable-entry');
    
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', handleDragStart);
        draggable.addEventListener('dragover', handleDragOver);
        draggable.addEventListener('drop', handleDrop);
        draggable.addEventListener('dragend', handleDragEnd);
    });
}

// Drag and drop handlers
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const draggableList = this.closest('.draggable-list');
    if (!draggableList) return;
    
    const afterElement = getDragAfterElement(draggableList, e.clientY);
    
    if (afterElement == null) {
        draggableList.appendChild(draggedElement);
    } else {
        draggableList.insertBefore(draggedElement, afterElement);
    }
    
    updatePositionNumbers(draggableList);
}

function handleDrop(e) {
    e.preventDefault();
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedElement = null;
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-entry:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updatePositionNumbers(container) {
    const entries = container.querySelectorAll('.draggable-entry');
    entries.forEach((entry, index) => {
        const positionElement = entry.querySelector('.entry-position');
        if (positionElement) {
            positionElement.textContent = index + 1;
        }
    });
}

// Save running order edit
function saveRunningOrderEdit(classRoundKey) {
    const draggableList = document.getElementById('editableRunningOrder');
    if (!draggableList) return;
    
    const orderedElements = draggableList.querySelectorAll('.draggable-entry');
    const newOrder = [];
    
    orderedElements.forEach(element => {
        const entryId = element.dataset.entryId;
        const originalEntry = window.currentEditingEntries.find(e => 
            (e.id && e.id === entryId) || e.regNumber === entryId
        );
        
        if (originalEntry) {
            newOrder.push(originalEntry);
        }
    });
    
    if (saveRunningOrder(TrialApp.currentTrialId, classRoundKey, newOrder)) {
        updateRunningOrderDisplay();
        showStatusMessage('Running order updated successfully!', 'success');
        
        // Close editor
        const editor = document.querySelector('.running-order-editor');
        if (editor) editor.remove();
    } else {
        showStatusMessage('Failed to save running order', 'error');
    }
}

// Print running order for specific class
function printRunningOrderForClass(classRoundKey) {
    const grouped = groupEntriesByClassRound(TrialApp.entryResults);
    const group = grouped[classRoundKey];
    
    if (!group) {
        showStatusMessage('Class/round not found', 'error');
        return;
    }
    
    const customOrder = getRunningOrder(TrialApp.currentTrialId, classRoundKey);
    const entries = customOrder || sortEntriesForRunningOrder(group.entries, 'handler');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Running Order - ${group.className} Round ${group.round}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .info { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                th { background-color: #f0f0f0; font-weight: bold; }
                .feo-row { background-color: #fff5f5; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>RUNNING ORDER</h1>
                <h2>${group.className} - Round ${group.round}</h2>
            </div>
            <div class="info">
                <p><strong>Date:</strong> ${formatDate(group.date)}</p>
                <p><strong>Judge:</strong> ${group.judge}</p>
                <p><strong>Total Entries:</strong> ${entries.length}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 60px;">Position</th>
                        <th style="width: 120px;">Registration</th>
                        <th style="width: 150px;">Call Name</th>
                        <th style="width: 200px;">Handler</th>
                        <th style="width: 80px;">Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map((entry, index) => `
                        <tr class="${entry.entryType === 'feo' ? 'feo-row' : ''}">
                            <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                            <td>${entry.regNumber}</td>
                            <td>${entry.callName}</td>
                            <td>${entry.handler}</td>
                            <td style="text-align: center;">${entry.entryType.toUpperCase()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// Export functions to global scope
window.updateEntriesList = updateEntriesList;
window.updateRunningOrderDisplay = updateRunningOrderDisplay;
window.generateRunningOrder = generateRunningOrder;
window.generateRunningOrderForClass = generateRunningOrderForClass;
window.viewRunningOrder = viewRunningOrder;
window.editRunningOrder = editRunningOrder;
window.saveRunningOrderEdit = saveRunningOrderEdit;
window.printRunningOrderForClass = printRunningOrderForClass;
