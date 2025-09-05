// Add passage functionality
let questionCount = 0;
const DRAFT_KEY = 'studysphere.draft.v1';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    addQuestion(); // Add first question
    setupAutosave();
    loadCategories();
    loadDraft();
});

function loadCategories() {
    const subjectSelect = document.getElementById('subject');
    const categorySelect = document.getElementById('category');
    
    // Load categories when subject changes
    subjectSelect.addEventListener('change', function() {
        updateCategoryOptions(this.value);
    });
    
    // Initial load
    updateCategoryOptions(subjectSelect.value);
}

function updateCategoryOptions(subject) {
    const categorySelect = document.getElementById('category');
    
    if (!subject) {
        categorySelect.innerHTML = '<option value="">Select subject first</option>';
        categorySelect.disabled = true;
        return;
    }
    
    categorySelect.disabled = false;
    
    // Get existing categories for this subject
    const passages = JSON.parse(localStorage.getItem('studysphere.passages.v1') || '[]');
    const subjectPassages = passages.filter(p => p.subject === subject);
    const categories = [...new Set(subjectPassages.map(p => p.category).filter(c => c))].sort();
    
    categorySelect.innerHTML = `
        <option value="">No category (General)</option>
        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
    `;
}

function handleCategoryChange() {
    const newCategoryInput = document.getElementById('new-category');
    newCategoryInput.classList.add('hidden');
}

function showNewCategoryInput() {
    const categorySelect = document.getElementById('category');
    const newCategoryInput = document.getElementById('new-category');
    
    categorySelect.value = '';
    newCategoryInput.classList.remove('hidden');
    newCategoryInput.focus();
}

function handleNewCategory() {
    const newCategoryInput = document.getElementById('new-category');
    const categorySelect = document.getElementById('category');
    const categoryName = newCategoryInput.value.trim();
    
    if (categoryName) {
        // Add new option to select
        const option = document.createElement('option');
        option.value = categoryName;
        option.textContent = categoryName;
        option.selected = true;
        categorySelect.appendChild(option);
        
        toast.success(`Category "${categoryName}" created`);
    }
    
    newCategoryInput.classList.add('hidden');
    newCategoryInput.value = '';
}

function setupAutosave() {
    const form = document.getElementById('passage-form');
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('input', debounce(saveDraft, 1000));
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function addQuestion() {
    questionCount++;
    const container = document.getElementById('questions-container');
    
    const questionElement = document.createElement('div');
    questionElement.className = 'question-item';
    questionElement.dataset.questionId = questionCount;
    
    questionElement.innerHTML = `
        <div class="question-header">
            <span class="question-number">Question ${questionCount}</span>
            <div class="question-controls">
                <button type="button" class="btn btn-icon btn-secondary" onclick="moveQuestionUp(${questionCount})" title="Move Up">↑</button>
                <button type="button" class="btn btn-icon btn-secondary" onclick="moveQuestionDown(${questionCount})" title="Move Down">↓</button>
                <button type="button" class="btn btn-icon btn-warning" onclick="removeQuestion(${questionCount})" title="Remove">×</button>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Question Text *</label>
            <textarea class="form-input question-text" rows="2" required placeholder="Enter your question..."></textarea>
        </div>
        <div class="options-container">
            ${['A', 'B', 'C', 'D'].map((letter, index) => `
                <div class="option-group">
                    <label class="form-label">${letter}:</label>
                    <input type="text" class="option-input" placeholder="Option ${letter}" required>
                    <label class="correct-marker">
                        <input type="radio" name="correct-${questionCount}" value="${index}" onchange="markCorrectAnswer(${questionCount}, ${index})">
                        Correct
                    </label>
                </div>
            `).join('')}
        </div>
    `;
    
    container.appendChild(questionElement);
    setupQuestionAutosave(questionElement);
}

function setupQuestionAutosave(questionElement) {
    const inputs = questionElement.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', debounce(saveDraft, 1000));
    });
}

function removeQuestion(questionId) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    if (questionElement) {
        questionElement.remove();
        renumberQuestions();
        saveDraft();
    }
}

function moveQuestionUp(questionId) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    const prevElement = questionElement.previousElementSibling;
    
    if (prevElement) {
        questionElement.parentNode.insertBefore(questionElement, prevElement);
        renumberQuestions();
        saveDraft();
    }
}

function moveQuestionDown(questionId) {
    const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
    const nextElement = questionElement.nextElementSibling;
    
    if (nextElement) {
        questionElement.parentNode.insertBefore(nextElement, questionElement);
        renumberQuestions();
        saveDraft();
    }
}

function renumberQuestions() {
    const questionElements = document.querySelectorAll('.question-item');
    questionElements.forEach((element, index) => {
        const questionNumber = index + 1;
        element.querySelector('.question-number').textContent = `Question ${questionNumber}`;
        
        // Update radio button names for correct answer selection
        const radioButtons = element.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.name = `correct-${questionNumber}`;
        });
        
        element.dataset.questionId = questionNumber;
    });
    
    questionCount = questionElements.length;
}

function markCorrectAnswer(questionId, optionIndex) {
    // Visual feedback handled by radio button selection
    saveDraft();
}

function pasteQuestions() {
    document.getElementById('paste-modal').classList.add('show');
    document.getElementById('paste-textarea').value = '';
}

function closePasteModal() {
    document.getElementById('paste-modal').classList.remove('show');
}

function processPastedQuestions() {
    const text = document.getElementById('paste-textarea').value.trim();
    if (!text) {
        toast.warning('Please paste some questions');
        return;
    }
    
    try {
        const questions = parseQuestionText(text);
        if (questions.length === 0) {
            toast.warning('No valid questions found');
            return;
        }
        
        // Clear existing questions
        document.getElementById('questions-container').innerHTML = '';
        questionCount = 0;
        
        // Add parsed questions
        questions.forEach(questionData => {
            addQuestionWithData(questionData);
        });
        
        closePasteModal();
        toast.success(`Added ${questions.length} questions`);
        saveDraft();
        
    } catch (error) {
        toast.error('Error parsing questions: ' + error.message);
    }
}

function parseQuestionText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const questions = [];
    
    let currentQuestion = null;
    
    for (const line of lines) {
        if (line.toLowerCase().startsWith('question:')) {
            // Save previous question if exists
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            
            // Start new question
            currentQuestion = {
                text: line.substring(9).trim(),
                options: [],
                correctIndex: -1
            };
        } else if (currentQuestion && /^[A-D]\)/.test(line)) {
            const isCorrect = line.includes('*');
            const optionText = line.substring(2).replace('*', '').trim();
            
            currentQuestion.options.push(optionText);
            
            if (isCorrect) {
                currentQuestion.correctIndex = currentQuestion.options.length - 1;
            }
        }
    }
    
    // Add last question
    if (currentQuestion) {
        questions.push(currentQuestion);
    }
    
    // Validate questions
    return questions.filter(q => 
        q.text && 
        q.options.length === 4 && 
        q.correctIndex >= 0
    );
}

function addQuestionWithData(questionData) {
    questionCount++;
    const container = document.getElementById('questions-container');
    
    const questionElement = document.createElement('div');
    questionElement.className = 'question-item';
    questionElement.dataset.questionId = questionCount;
    
    questionElement.innerHTML = `
        <div class="question-header">
            <span class="question-number">Question ${questionCount}</span>
            <div class="question-controls">
                <button type="button" class="btn btn-icon btn-secondary" onclick="moveQuestionUp(${questionCount})" title="Move Up">↑</button>
                <button type="button" class="btn btn-icon btn-secondary" onclick="moveQuestionDown(${questionCount})" title="Move Down">↓</button>
                <button type="button" class="btn btn-icon btn-warning" onclick="removeQuestion(${questionCount})" title="Remove">×</button>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Question Text *</label>
            <textarea class="form-input question-text" rows="2" required>${questionData.text}</textarea>
        </div>
        <div class="options-container">
            ${['A', 'B', 'C', 'D'].map((letter, index) => `
                <div class="option-group">
                    <label class="form-label">${letter}:</label>
                    <input type="text" class="option-input" value="${questionData.options[index] || ''}" required>
                    <label class="correct-marker">
                        <input type="radio" name="correct-${questionCount}" value="${index}" 
                               ${index === questionData.correctIndex ? 'checked' : ''}
                               onchange="markCorrectAnswer(${questionCount}, ${index})">
                        Correct
                    </label>
                </div>
            `).join('')}
        </div>
    `;
    
    container.appendChild(questionElement);
    setupQuestionAutosave(questionElement);
}

function saveDraft() {
    try {
        const formData = collectFormData();
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch (error) {
        console.error('Error saving draft:', error);
    }
}

function loadDraft() {
    try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (!draft) return;
        
        const formData = JSON.parse(draft);
        populateForm(formData);
        toast.success('Draft loaded', 2000);
    } catch (error) {
        console.error('Error loading draft:', error);
    }
}

function collectFormData() {
    const form = document.getElementById('passage-form');
    
    const formData = {
        title: form.querySelector('#title').value,
        source: form.querySelector('#source').value,
        subject: form.querySelector('#subject').value,
        category: form.querySelector('#category').value,
        difficulty: form.querySelector('#difficulty').value,
        timeLimit: form.querySelector('#timeLimit').value,
        tags: form.querySelector('#tags').value,
        passageText: form.querySelector('#passageText').value,
        questions: []
    };
    
    // Collect questions
    const questionElements = document.querySelectorAll('.question-item');
    questionElements.forEach(element => {
        const questionText = element.querySelector('.question-text').value;
        const options = Array.from(element.querySelectorAll('.option-input')).map(input => input.value);
        const correctRadio = element.querySelector('input[type="radio"]:checked');
        const answerIndex = correctRadio ? parseInt(correctRadio.value) : -1;
        
        if (questionText && options.every(opt => opt.trim()) && answerIndex >= 0) {
            formData.questions.push({
                q: questionText,
                options: options,
                answerIndex: answerIndex
            });
        }
    });
    
    return formData;
}

function populateForm(formData) {
    const form = document.getElementById('passage-form');
    
    // Populate basic fields
    form.querySelector('#title').value = formData.title || '';
    form.querySelector('#source').value = formData.source || '';
    form.querySelector('#subject').value = formData.subject || '';
    
    // Update categories and set category
    if (formData.subject) {
        updateCategoryOptions(formData.subject);
        setTimeout(() => {
            form.querySelector('#category').value = formData.category || '';
        }, 100);
    }
    
    form.querySelector('#difficulty').value = formData.difficulty || '';
    form.querySelector('#timeLimit').value = formData.timeLimit || '';
    form.querySelector('#tags').value = formData.tags || '';
    form.querySelector('#passageText').value = formData.passageText || '';
    
    // Clear existing questions
    document.getElementById('questions-container').innerHTML = '';
    questionCount = 0;
    
    // Add questions if they exist
    if (formData.questions && formData.questions.length > 0) {
        formData.questions.forEach(questionData => {
            addQuestionWithData(questionData);
        });
    } else {
        addQuestion(); // Add empty question if none exist
    }
}

function clearForm() {
    if (confirm('Are you sure you want to clear all form data? This action cannot be undone.')) {
        document.getElementById('passage-form').reset();
        document.getElementById('questions-container').innerHTML = '';
        questionCount = 0;
        addQuestion();
        localStorage.removeItem(DRAFT_KEY);
        toast.warning('Form cleared');
    }
}

function validateForm() {
    const formData = collectFormData();
    const errors = [];
    
    if (!formData.title.trim()) errors.push('Title is required');
    if (!formData.subject) errors.push('Subject is required');
    if (!formData.difficulty) errors.push('Difficulty is required');
    if (!formData.timeLimit || formData.timeLimit < 1) errors.push('Valid time limit is required');
    if (!formData.passageText.trim()) errors.push('Passage text is required');
    if (formData.questions.length === 0) errors.push('At least one question is required');
    
    // Validate questions
    formData.questions.forEach((q, index) => {
        if (!q.q.trim()) errors.push(`Question ${index + 1} text is required`);
        if (q.options.some(opt => !opt.trim())) errors.push(`Question ${index + 1} has empty options`);
        if (q.answerIndex < 0) errors.push(`Question ${index + 1} needs a correct answer`);
    });
    
    return errors;
}

function savePassage() {
    const errors = validateForm();
    
    if (errors.length > 0) {
        toast.error('Please fix the following errors:\n' + errors.join('\n'));
        return;
    }
    
    try {
        const formData = collectFormData();
        
        // Create passage object
        const passage = {
            id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: formData.title.trim(),
            source: formData.source.trim(),
            subject: formData.subject,
            category: formData.category.trim() || null,
            difficulty: formData.difficulty,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            text: formData.passageText.trim(),
            timeLimit: parseInt(formData.timeLimit),
            questions: formData.questions,
            createdAt: new Date().toISOString()
        };
        
        // Save to localStorage
        const passages = JSON.parse(localStorage.getItem('studysphere.passages.v1') || '[]');
        passages.push(passage);
        localStorage.setItem('studysphere.passages.v1', JSON.stringify(passages));
        
        // Download as JSON file
        downloadPassageFile(passage);
        
        // Try to save to file system if supported
        tryFileSystemSave(passage);
        
        // Clear draft and form
        localStorage.removeItem(DRAFT_KEY);
        
        toast.success('Passage saved successfully!');
        
        // Ask if user wants to create another passage
        setTimeout(() => {
            if (confirm('Passage saved! Would you like to create another passage?')) {
                clearForm();
            }
        }, 1000);
        
    } catch (error) {
        toast.error('Error saving passage: ' + error.message);
    }
}

function downloadPassageFile(passage) {
    const blob = new Blob([JSON.stringify(passage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${passage.subject}_${passage.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function tryFileSystemSave(passage) {
    if (!('showDirectoryPicker' in window)) return;
    
    try {
        // This is optional - user can choose to organize files
        const shouldOrganize = confirm('Would you like to save this passage to an organized folder structure?');
        if (!shouldOrganize) return;
        
        const dirHandle = await window.showDirectoryPicker();
        
        // Create subject subfolder if it doesn't exist
        let subjectDirHandle;
        try {
            subjectDirHandle = await dirHandle.getDirectoryHandle(passage.subject);
        } catch {
            subjectDirHandle = await dirHandle.getDirectoryHandle(passage.subject, { create: true });
        }
        
        // Create file
        const fileName = `${passage.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const fileHandle = await subjectDirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        
        await writable.write(JSON.stringify(passage, null, 2));
        await writable.close();
        
        toast.success('Passage also saved to chosen folder!');
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('File system save error:', error);
        }
    }
}

// Close modal when clicking outside
document.getElementById('paste-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closePasteModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePasteModal();
    }
    
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 's':
                e.preventDefault();
                savePassage();
                break;
            case 'd':
                e.preventDefault();
                saveDraft();
                toast.success('Draft saved');
                break;
        }
    }
});