// Progress tracking functionality
document.addEventListener('DOMContentLoaded', function() {
    if (!auth.currentUser) {
        window.location.href = 'login.html';
        return;
    }

    loadProgressData();
});

function loadProgressData() {
    const progress = auth.getUserProgress();
    if (!progress) return;

    // Update overall stats
    document.getElementById('total-attempts').textContent = progress.overall.totalQuizzes;
    document.getElementById('overall-average').textContent = progress.overall.averageScore + '%';
    
    const totalHours = Math.floor(progress.overall.totalTime / 3600);
    const totalMinutes = Math.floor((progress.overall.totalTime % 3600) / 60);
    document.getElementById('total-time').textContent = totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;
    
    document.getElementById('current-streak').textContent = progress.overall.currentStreak;

    // Render subject progress
    renderSubjectProgress(progress.subjects);
    
    // Render recent activity
    renderRecentActivity(progress.recentAttempts);
    
    // Render achievements
    renderAchievements(progress);
}

function renderSubjectProgress(subjects) {
    const container = document.getElementById('subject-progress');
    const subjectNames = {
        biology: 'Biology',
        physics: 'Physics', 
        chemistry: 'Chemistry',
        geology: 'Geology',
        english: 'English'
    };
    
    const subjectIcons = {
        biology: '🧬',
        physics: '⚛️',
        chemistry: '⚗️',
        geology: '🌍',
        english: '📖'
    };

    container.innerHTML = Object.entries(subjects).map(([subject, data]) => {
        const percentage = data.averageScore;
        const color = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444';
        
        return `
            <div class="subject-progress-item">
                <div class="subject-progress-header">
                    <span class="subject-progress-icon">${subjectIcons[subject]}</span>
                    <div class="subject-progress-info">
                        <h4>${subjectNames[subject]}</h4>
                        <p>${data.attempts} attempt${data.attempts !== 1 ? 's' : ''}</p>
                    </div>
                    <div class="subject-progress-score">${percentage}%</div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%; background-color: ${color}"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderRecentActivity(attempts) {
    const container = document.getElementById('activity-timeline');
    const passages = JSON.parse(localStorage.getItem('studysphere.passages.v1') || '[]');
    
    if (attempts.length === 0) {
        container.innerHTML = `
            <div class="empty-activity">
                <div class="empty-icon">📊</div>
                <p>No quiz attempts yet</p>
                <a href="subjects.html" class="btn btn-primary btn-sm">Start Your First Quiz</a>
            </div>
        `;
        return;
    }

    container.innerHTML = attempts.slice(0, 10).map(attempt => {
        const passage = passages.find(p => p.id === attempt.passageId);
        const date = new Date(attempt.completedAt);
        const timeAgo = getTimeAgo(date);
        const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
        const scoreColor = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444';
        
        return `
            <div class="activity-item">
                <div class="activity-icon" style="background-color: ${scoreColor}">
                    ${percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '📚'}
                </div>
                <div class="activity-content">
                    <h4>${passage ? passage.title : 'Unknown Passage'}</h4>
                    <p>Score: ${attempt.score}/${attempt.totalQuestions} (${percentage}%)</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
                <div class="activity-score" style="color: ${scoreColor}">
                    ${percentage}%
                </div>
            </div>
        `;
    }).join('');
}

function renderAchievements(progress) {
    const container = document.getElementById('achievements-grid');
    const achievements = calculateAchievements(progress);
    
    container.innerHTML = achievements.map(achievement => `
        <div class="achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <h4>${achievement.title}</h4>
                <p>${achievement.description}</p>
                ${achievement.unlocked ? 
                    `<span class="achievement-date">Earned ${new Date(achievement.unlockedAt).toLocaleDateString()}</span>` :
                    `<span class="achievement-progress">${achievement.progress}</span>`
                }
            </div>
        </div>
    `).join('');
}

function calculateAchievements(progress) {
    const achievements = [
        {
            id: 'first_quiz',
            title: 'Getting Started',
            description: 'Complete your first quiz',
            icon: '🎯',
            unlocked: progress.overall.totalQuizzes >= 1,
            progress: progress.overall.totalQuizzes >= 1 ? 'Complete!' : '0/1 quizzes'
        },
        {
            id: 'quiz_master',
            title: 'Quiz Master',
            description: 'Complete 10 quizzes',
            icon: '🏆',
            unlocked: progress.overall.totalQuizzes >= 10,
            progress: `${Math.min(progress.overall.totalQuizzes, 10)}/10 quizzes`
        },
        {
            id: 'perfect_score',
            title: 'Perfect Score',
            description: 'Get 100% on any quiz',
            icon: '⭐',
            unlocked: auth.getQuizAttempts().some(a => (a.score / a.totalQuestions) === 1),
            progress: 'Get 100% on a quiz'
        },
        {
            id: 'study_streak',
            title: 'Consistent Learner',
            description: 'Study for 7 days in a row',
            icon: '🔥',
            unlocked: progress.overall.currentStreak >= 7,
            progress: `${Math.min(progress.overall.currentStreak, 7)}/7 days`
        },
        {
            id: 'all_subjects',
            title: 'Well Rounded',
            description: 'Complete quizzes in all 5 subjects',
            icon: '🌟',
            unlocked: Object.values(progress.subjects).filter(s => s.attempts > 0).length >= 5,
            progress: `${Object.values(progress.subjects).filter(s => s.attempts > 0).length}/5 subjects`
        },
        {
            id: 'speed_demon',
            title: 'Speed Demon',
            description: 'Complete a quiz in under 5 minutes',
            icon: '⚡',
            unlocked: auth.getQuizAttempts().some(a => a.timeElapsed < 300),
            progress: 'Complete a quiz quickly'
        }
    ];
    
    // Add unlock dates for unlocked achievements
    achievements.forEach(achievement => {
        if (achievement.unlocked && !achievement.unlockedAt) {
            achievement.unlockedAt = new Date().toISOString();
        }
    });
    
    return achievements;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}