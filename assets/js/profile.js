// Profile page functionality
document.addEventListener('DOMContentLoaded', function() {
    if (!auth.currentUser) {
        window.location.href = 'login.html';
        return;
    }

    loadProfileData();
    setupProfileForms();
});

function loadProfileData() {
    const user = auth.currentUser;
    
    // Update profile display
    document.getElementById('profile-name').textContent = user.fullName;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-avatar-large').textContent = user.fullName.charAt(0).toUpperCase();
    
    // Update stats
    document.getElementById('total-quizzes').textContent = user.stats.totalQuizzes;
    document.getElementById('avg-score').textContent = user.stats.averageScore + '%';
    document.getElementById('study-streak').textContent = user.stats.currentStreak;
    
    // Populate form fields
    document.getElementById('edit-name').value = user.fullName;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-target-exam').value = user.targetExam || '';
    
    // Load preferences
    const prefs = user.preferences || {};
    document.getElementById('default-time-limit').value = prefs.defaultTimeLimit || 10;
    document.getElementById('preferred-difficulty').value = prefs.preferredDifficulty || '';
    document.getElementById('email-notifications').checked = prefs.emailNotifications || false;
    document.getElementById('auto-submit').checked = prefs.autoSubmit !== false; // Default true
}

function setupProfileForms() {
    // Profile update form
    document.getElementById('profile-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('edit-name').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const targetExam = document.getElementById('edit-target-exam').value;
        
        if (!name || !email) {
            toast.error('Name and email are required');
            return;
        }
        
        // Check if email is already taken by another user
        const users = auth.getAllUsers();
        const existingUser = users.find(u => u.email === email && u.id !== auth.currentUser.id);
        if (existingUser) {
            toast.error('This email is already taken');
            return;
        }
        
        // Update user data
        auth.currentUser.fullName = name;
        auth.currentUser.email = email;
        auth.currentUser.targetExam = targetExam;
        
        auth.updateUser(auth.currentUser);
        auth.updateNavigation();
        loadProfileData();
        
        toast.success('Profile updated successfully');
    });
    
    // Password change form
    document.getElementById('password-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;
        
        if (auth.hashPassword(currentPassword) !== auth.currentUser.password) {
            toast.error('Current password is incorrect');
            return;
        }
        
        if (newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        
        // Update password
        auth.currentUser.password = auth.hashPassword(newPassword);
        auth.updateUser(auth.currentUser);
        
        // Clear form
        this.reset();
        
        toast.success('Password changed successfully');
    });
    
    // Preferences form
    document.getElementById('preferences-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const preferences = {
            defaultTimeLimit: parseInt(document.getElementById('default-time-limit').value),
            preferredDifficulty: document.getElementById('preferred-difficulty').value,
            emailNotifications: document.getElementById('email-notifications').checked,
            autoSubmit: document.getElementById('auto-submit').checked
        };
        
        auth.currentUser.preferences = preferences;
        auth.updateUser(auth.currentUser);
        
        toast.success('Preferences saved');
    });
}