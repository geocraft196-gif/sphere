// Subject passages page functionality
let currentSubject = '';
let currentPassageId = '';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentSubject = urlParams.get('subject') || 'biology';
    
    initializePage();
    loadPassages();
    
    // Setup sort functionality
    document.getElementById('sort-select').addEventListener('change', loadPassages);
    document.getElementById('category-filter').addEventListener('change', loadPassages);
});

function initializePage() {
    // Update page title and breadcrumb
    const subjectName = currentSubject.charAt(0).toUpperCase() + currentSubject.slice(1);
    document.getElementById('current-subject').textContent = subjectName;
    document.getElementById('subject-title').textContent = `${subjectName} Passages`;
    
    // Update page title
    document.title = `${subjectName} - StudySphere`;
}

function loadPassages() {
    const passages = JSON.parse(localStorage.getItem('studysphere.passages.v1') || '[]');
    let subjectPassages = passages.filter(p => p.subject === currentSubject);
    
    // Update category filter options
    updateCategoryFilter(subjectPassages);
    
    // Apply category filter
    const selectedCategory = document.getElementById('category-filter').value;
    if (selectedCategory) {
        subjectPassages = subjectPassages.filter(p => p.category === selectedCategory);
    }
    
    // Sort passages
    const sortBy = document.getElementById('sort-select').value;
    sortPassages(subjectPassages, sortBy);
    
    // Update count
    const count = subjectPassages.length;
    const categoryText = selectedCategory ? ` in "${selectedCategory}"` : '';
    document.getElementById('passages-count').textContent = 
        `${count} passage${count !== 1 ? 's' : ''} found${categoryText}`;
    
    // Render passages
    renderPassages(subjectPassages);
}

function updateCategoryFilter(passages) {
    const categoryFilter = document.getElementById('category-filter');
    const currentValue = categoryFilter.value;
    
    // Get unique categories
    const categories = [...new Set(passages.map(p => p.category).filter(c => c))].sort();
    
    categoryFilter.innerHTML = `
        <option value="">All Categories</option>
        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
    `;
    
    // Restore selection if it still exists
    if (categories.includes(currentValue)) {
        categoryFilter.value = currentValue;
    }
}

function sortPassages(passages, sortBy) {
    switch (sortBy) {
        case 'newest':
            passages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            passages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'title':
            passages.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'difficulty':
            const difficultyOrder = { 'Easy': 0, 'Medium': 1, 'Hard': 2 };
            passages.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
            break;
        case 'category':
            passages.sort((a, b) => {
                const catA = a.category || 'General';
                const catB = b.category || 'General';
                return catA.localeCompare(catB);
            });
            break;
    }
}

function renderPassages(passages) {
    const container = document.getElementById('passages-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (passages.length === 0) {
        container.innerHTML = '';
        container.appendChild(emptyState);
        return;
    }
    
    // Hide empty state
    if (emptyState && emptyState.parentNode) {
        emptyState.parentNode.removeChild(emptyState);
    }
    
    container.innerHTML = passages.map(passage => {
        const date = new Date(passage.createdAt).toLocaleDateString();
        const questionCount = passage.questions ? passage.questions.length : 0;
        const categoryDisplay = passage.category ? `${passage.category} • ` : '';
        
        return `
            <div class="passage-card">
                <h3 class="passage-title">${passage.title}</h3>
                <div class="passage-meta">
                    <span class="difficulty-badge ${passage.difficulty.toLowerCase()}">${passage.difficulty}</span>
                    <span class="time-badge">${passage.timeLimit} min</span>
                    ${passage.category ? `<span class="subject-badge">${passage.category}</span>` : ''}
                </div>
                <p class="passage-date">${categoryDisplay}${date} • ${questionCount} questions</p>
                <div class="passage-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewPassage('${passage.id}')">View</button>
                    <button class="btn btn-primary btn-sm" onclick="startQuiz('${passage.id}')">Start</button>
                </div>
            </div>
        `;
    }).join('');
}

function viewPassage(passageId) {
    const passages = JSON.parse(localStorage.getItem('studysphere.passages.v1') || '[]');
    const passage = passages.find(p => p.id === passageId);
    
    if (!passage) {
        toast.error('Passage not found');
        return;
    }
    
    currentPassageId = passageId;
    
    // Populate modal
    document.getElementById('modal-title').textContent = passage.title;
    document.getElementById('modal-difficulty').textContent = passage.difficulty;
    document.getElementById('modal-difficulty').className = `difficulty-badge ${passage.difficulty.toLowerCase()}`;
    document.getElementById('modal-time').textContent = `${passage.timeLimit} min`;
    document.getElementById('modal-text').textContent = passage.text;
    document.getElementById('modal-question-count').textContent = passage.questions.length;
    
    // Show modal
    document.getElementById('passage-modal').classList.add('show');
}

function closePassageModal() {
    document.getElementById('passage-modal').classList.remove('show');
}

function startQuiz(passageId) {
    if (!passageId && currentPassageId) {
        passageId = currentPassageId;
    }
    
    if (!passageId) {
        toast.error('No passage selected');
        return;
    }
    
    window.location.href = `quiz.html?passage=${passageId}`;
}

function startQuizFromModal() {
    closePassageModal();
    startQuiz(currentPassageId);
}

// File System Access API functionality
async function loadFromFolder() {
    if (!('showDirectoryPicker' in window)) {
        toast.warning('File System Access API not supported in this browser. Use Chrome or Edge.');
        return;
    }
    
    try {
        const dirHandle = await window.showDirectoryPicker();
        let loadedCount = 0;
        
        for await (const [name, fileHandle] of dirHandle.entries()) {
            if (fileHandle.kind === 'file' && name.endsWith('.json')) {
                try {
                    const file = await fileHandle.getFile();
                    const content = await file.text();
                    const passage = JSON.parse(content);
                    
                    // Validate passage structure
                    if (passage.id && passage.title && passage.subject === currentSubject) {
                        // Save to localStorage
                        const passages = JSON.parse(localStorage.getItem('studysphere.passages.v1') || '[]');
                        const existingIndex = passages.findIndex(p => p.id === passage.id);
                        
                        if (existingIndex >= 0) {
                            passages[existingIndex] = passage;
                        } else {
                            passages.push(passage);
                        }
                        
                        localStorage.setItem('studysphere.passages.v1', JSON.stringify(passages));
                        loadedCount++;
                    }
                } catch (error) {
                    console.error(`Error loading file ${name}:`, error);
                }
            }
        }
        
        if (loadedCount > 0) {
            toast.success(`Loaded ${loadedCount} passage${loadedCount !== 1 ? 's' : ''}`);
            loadPassages();
        } else {
            toast.warning('No valid passages found in the selected folder');
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            toast.error('Error accessing folder: ' + error.message);
        }
    }
}

// Close modal when clicking outside
document.getElementById('passage-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closePassageModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePassageModal();
    }
});