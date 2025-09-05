// Quiz functionality
let currentPassage = null;
let startTime = null;
let timerInterval = null;
let timeLimit = 0;
let userAnswers = {};

// Initialize quiz
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const passageId = urlParams.get('passage');
    
    if (!passageId) {
        toast.error('No passage specified');
        setTimeout(() => {
            window.location.href = 'subjects.html';
        }, 2000);
        return;
    }
    
    loadQuiz(passageId);
});

function loadQuiz(passageId) {
    const passages = JSON.parse(localStorage.getItem('studysphere.passages.v1') || '[]');
    currentPassage = passages.find(p => p.id === passageId);
    
    if (!currentPassage) {
        toast.error('Passage not found');
        setTimeout(() => {
            window.location.href = 'subjects.html';
        }, 2000);
        return;
    }
    
    // Initialize quiz data
    timeLimit = currentPassage.timeLimit * 60; // Convert to seconds
    startTime = Date.now();
    userAnswers = {};
    
    // Populate quiz UI
    document.getElementById('quiz-title').textContent = currentPassage.title;
    document.getElementById('quiz-difficulty').textContent = currentPassage.difficulty;
    document.getElementById('quiz-difficulty').className = `difficulty-badge ${currentPassage.difficulty.toLowerCase()}`;
    document.getElementById('quiz-subject').textContent = currentPassage.subject.charAt(0).toUpperCase() + currentPassage.subject.slice(1);
    
    // Show category if it exists
    const categoryElement = document.getElementById('quiz-category');
    if (currentPassage.category) {
        categoryElement.textContent = currentPassage.category;
        categoryElement.style.display = 'inline-block';
    } else {
        categoryElement.style.display = 'none';
    }
    
    document.getElementById('passage-text').textContent = currentPassage.text;
    document.getElementById('questions-count').textContent = `${currentPassage.questions.length} questions`;
    
    // Render questions
    renderQuestions();
    
    // Start timer
    startTimer();
}

function renderQuestions() {
    const container = document.getElementById('questions-container');
    
    container.innerHTML = currentPassage.questions.map((question, index) => `
        <div class="question-block" data-question="${index}">
            <div class="question-text">${index + 1}. ${question.q}</div>
            <div class="question-options">
                ${question.options.map((option, optionIndex) => `
                    <label class="option-label">
                        <input type="radio" name="question-${index}" value="${optionIndex}" 
                               onchange="selectAnswer(${index}, ${optionIndex})">
                        <span>${String.fromCharCode(65 + optionIndex)}. ${option}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function selectAnswer(questionIndex, answerIndex) {
    userAnswers[questionIndex] = answerIndex;
    
    // Update UI
    const questionBlock = document.querySelector(`[data-question="${questionIndex}"]`);
    const labels = questionBlock.querySelectorAll('.option-label');
    
    labels.forEach((label, index) => {
        label.classList.toggle('selected', index === answerIndex);
    });
    
    // Check if all questions are answered
    updateSubmitButton();
}

function updateSubmitButton() {
    const totalQuestions = currentPassage.questions.length;
    const answeredQuestions = Object.keys(userAnswers).length;
    const submitBtn = document.getElementById('submit-btn');
    
    if (answeredQuestions === totalQuestions) {
        submitBtn.textContent = 'Submit Quiz';
        submitBtn.classList.remove('btn-outline');
        submitBtn.classList.add('btn-primary');
    } else {
        submitBtn.textContent = `Submit (${answeredQuestions}/${totalQuestions})`;
        submitBtn.classList.add('btn-outline');
        submitBtn.classList.remove('btn-primary');
    }
}

function startTimer() {
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, timeLimit - elapsed);
        
        updateTimerDisplay(remaining);
        
        if (remaining === 0) {
            submitQuiz(true); // Auto-submit when time runs out
        }
    }, 1000);
}

function updateTimerDisplay(remaining = timeLimit) {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    
    document.getElementById('time-remaining').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update progress bar
    const progress = ((timeLimit - remaining) / timeLimit) * 100;
    document.getElementById('timer-progress').style.width = `${progress}%`;
    
    // Change color when time is running low
    const timerDisplay = document.getElementById('time-remaining');
    if (remaining < 60) {
        timerDisplay.style.color = '#ef4444';
    } else if (remaining < 300) {
        timerDisplay.style.color = '#f59e0b';
    } else {
        timerDisplay.style.color = '#3b82f6';
    }
}

function submitQuiz(autoSubmit = false) {
    clearInterval(timerInterval);
    
    if (!autoSubmit) {
        const totalQuestions = currentPassage.questions.length;
        const answeredQuestions = Object.keys(userAnswers).length;
        
        if (answeredQuestions < totalQuestions) {
            const confirmSubmit = confirm(`You've only answered ${answeredQuestions} out of ${totalQuestions} questions. Submit anyway?`);
            if (!confirmSubmit) {
                startTimer(); // Restart timer
                return;
            }
        }
    }
    
    // Calculate score
    const results = calculateScore();
    showResults(results, autoSubmit);
}

function calculateScore() {
    let correct = 0;
    const total = currentPassage.questions.length;
    const breakdown = [];
    
    currentPassage.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.answerIndex;
        const isCorrect = userAnswer === correctAnswer;
        
        if (isCorrect) correct++;
        
        breakdown.push({
            question: question.q,
            userAnswer: userAnswer !== undefined ? question.options[userAnswer] : 'Not answered',
            correctAnswer: question.options[correctAnswer],
            isCorrect: isCorrect
        });
    });
    
    const percentage = Math.round((correct / total) * 100);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    return {
        correct,
        total,
        percentage,
        timeElapsed: elapsed,
        breakdown
    };
}

function showResults(results, autoSubmit) {
    // Populate results modal
    document.getElementById('score-percentage').textContent = `${results.percentage}%`;
    document.getElementById('score-fraction').textContent = `${results.correct}/${results.total}`;
    
    const minutes = Math.floor(results.timeElapsed / 60);
    const seconds = results.timeElapsed % 60;
    document.getElementById('time-taken').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Show breakdown
    const breakdownContainer = document.getElementById('results-breakdown');
    breakdownContainer.innerHTML = `
        <h4>Question Breakdown</h4>
        ${results.breakdown.map((item, index) => `
            <div class="result-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-question">${index + 1}. ${item.question}</div>
                <div class="result-answer">
                    Your answer: ${item.userAnswer}<br>
                    Correct answer: ${item.correctAnswer}
                </div>
            </div>
        `).join('')}
    `;
    
    // Show modal
    document.getElementById('results-modal').classList.add('show');
    
    if (autoSubmit) {
        toast.warning('Time expired! Quiz submitted automatically.');
    }
    
    // Record quiz attempt if user is logged in
    if (auth.currentUser) {
        const score = results.correct;
        const timeElapsed = results.timeElapsed;
        const totalQuestions = results.total;
        
        auth.recordQuizAttempt(currentPassage.id, score, timeElapsed, totalQuestions);
    }
}

function retakeQuiz() {
    document.getElementById('results-modal').classList.remove('show');
    
    // Reset quiz state
    userAnswers = {};
    startTime = Date.now();
    
    // Clear selections
    document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.checked = false;
    });
    
    document.querySelectorAll('.option-label').forEach(label => {
        label.classList.remove('selected');
    });
    
    // Restart timer
    startTimer();
    updateSubmitButton();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
    clearInterval(timerInterval);
    window.location.href = `subject-passages.html?subject=${currentPassage.subject}`;
}

// Close modal when clicking outside
document.getElementById('results-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        // Don't allow closing results modal by clicking outside
    }
});

// Prevent navigation away without confirmation
window.addEventListener('beforeunload', function(e) {
    if (timerInterval && Object.keys(userAnswers).length > 0) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your progress will be lost.';
        return e.returnValue;
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        submitQuiz();
    }
});