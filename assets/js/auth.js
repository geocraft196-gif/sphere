// Authentication system
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.updateNavigation();
        this.checkAuthRequirement();
    }

    loadCurrentUser() {
        const userData = localStorage.getItem('studysphere.user.v1');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
            } catch (error) {
                console.error('Error loading user data:', error);
                localStorage.removeItem('studysphere.user.v1');
            }
        }
    }

    saveCurrentUser() {
        if (this.currentUser) {
            localStorage.setItem('studysphere.user.v1', JSON.stringify(this.currentUser));
        } else {
            localStorage.removeItem('studysphere.user.v1');
        }
    }

    register(userData) {
        // Validate input
        if (!userData.email || !userData.password || !userData.fullName) {
            throw new Error('All required fields must be filled');
        }

        if (userData.password !== userData.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        if (userData.password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        // Check if user already exists
        const users = this.getAllUsers();
        if (users.find(u => u.email === userData.email)) {
            throw new Error('An account with this email already exists');
        }

        // Create new user
        const newUser = {
            id: 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            email: userData.email,
            fullName: userData.fullName,
            targetExam: userData.targetExam || null,
            password: this.hashPassword(userData.password), // Simple hash for demo
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
                defaultTimeLimit: 10,
                preferredDifficulty: '',
                emailNotifications: false,
                autoSubmit: true
            },
            stats: {
                totalQuizzes: 0,
                totalTime: 0,
                averageScore: 0,
                currentStreak: 0,
                lastStudyDate: null
            }
        };

        // Save user
        users.push(newUser);
        localStorage.setItem('studysphere.users.v1', JSON.stringify(users));

        // Set as current user
        this.currentUser = newUser;
        this.saveCurrentUser();

        return newUser;
    }

    login(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            throw new Error('No account found with this email');
        }

        if (user.password !== this.hashPassword(password)) {
            throw new Error('Incorrect password');
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        this.updateUser(user);

        // Set as current user
        this.currentUser = user;
        this.saveCurrentUser();

        return user;
    }

    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
        window.location.href = 'index.html';
    }

    getAllUsers() {
        return JSON.parse(localStorage.getItem('studysphere.users.v1') || '[]');
    }

    updateUser(userData) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === userData.id);
        
        if (index >= 0) {
            users[index] = userData;
            localStorage.setItem('studysphere.users.v1', JSON.stringify(users));
            
            // Update current user if it's the same
            if (this.currentUser && this.currentUser.id === userData.id) {
                this.currentUser = userData;
                this.saveCurrentUser();
            }
        }
    }

    hashPassword(password) {
        // Simple hash for demo purposes - in production use proper hashing
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    updateNavigation() {
        const userMenu = document.querySelector('.user-menu');
        const authLinks = document.querySelector('.auth-links');

        if (this.currentUser) {
            // Show user menu
            if (userMenu) {
                userMenu.style.display = 'block';
                const userName = document.getElementById('user-name');
                const userAvatar = document.getElementById('user-avatar');
                
                if (userName) userName.textContent = this.currentUser.fullName.split(' ')[0];
                if (userAvatar) userAvatar.textContent = this.currentUser.fullName.charAt(0).toUpperCase();
            }
            
            // Hide auth links
            if (authLinks) {
                authLinks.style.display = 'none';
            }
        } else {
            // Hide user menu
            if (userMenu) {
                userMenu.style.display = 'none';
            }
            
            // Show auth links
            if (authLinks) {
                authLinks.style.display = 'flex';
            }
        }
    }

    checkAuthRequirement() {
        const protectedPages = ['profile.html', 'progress.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage) && !this.currentUser) {
            window.location.href = 'login.html';
        }
    }

    recordQuizAttempt(passageId, score, timeElapsed, totalQuestions) {
        if (!this.currentUser) return;

        // Update user stats
        this.currentUser.stats.totalQuizzes++;
        this.currentUser.stats.totalTime += timeElapsed;
        
        // Calculate new average score
        const attempts = this.getQuizAttempts();
        const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0) + score;
        this.currentUser.stats.averageScore = Math.round(totalScore / (attempts.length + 1));

        // Update streak
        const today = new Date().toDateString();
        const lastStudyDate = this.currentUser.stats.lastStudyDate;
        
        if (lastStudyDate) {
            const lastDate = new Date(lastStudyDate).toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            
            if (lastDate === today) {
                // Already studied today, keep streak
            } else if (lastDate === yesterday) {
                // Studied yesterday, increment streak
                this.currentUser.stats.currentStreak++;
            } else {
                // Streak broken, reset to 1
                this.currentUser.stats.currentStreak = 1;
            }
        } else {
            // First study session
            this.currentUser.stats.currentStreak = 1;
        }
        
        this.currentUser.stats.lastStudyDate = new Date().toISOString();

        // Save quiz attempt
        const attempt = {
            id: 'qa_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId: this.currentUser.id,
            passageId: passageId,
            score: score,
            totalQuestions: totalQuestions,
            timeElapsed: timeElapsed,
            completedAt: new Date().toISOString()
        };

        const attempts = this.getQuizAttempts();
        attempts.push(attempt);
        localStorage.setItem('studysphere.quiz_attempts.v1', JSON.stringify(attempts));

        // Update user
        this.updateUser(this.currentUser);
    }

    getQuizAttempts(userId = null) {
        const attempts = JSON.parse(localStorage.getItem('studysphere.quiz_attempts.v1') || '[]');
        
        if (userId) {
            return attempts.filter(a => a.userId === userId);
        }
        
        if (this.currentUser) {
            return attempts.filter(a => a.userId === this.currentUser.id);
        }
        
        return [];
    }

    getUserProgress() {
        if (!this.currentUser) return null;

        const attempts = this.getQuizAttempts();
        const passages = JSON.parse(localStorage.getItem('studysphere.passages.v1') || '[]');
        
        // Group by subject
        const subjectProgress = {};
        const subjects = ['biology', 'physics', 'chemistry', 'geology', 'english'];
        
        subjects.forEach(subject => {
            const subjectAttempts = attempts.filter(attempt => {
                const passage = passages.find(p => p.id === attempt.passageId);
                return passage && passage.subject === subject;
            });
            
            subjectProgress[subject] = {
                attempts: subjectAttempts.length,
                averageScore: subjectAttempts.length > 0 
                    ? Math.round(subjectAttempts.reduce((sum, a) => sum + a.score, 0) / subjectAttempts.length)
                    : 0,
                totalTime: subjectAttempts.reduce((sum, a) => sum + a.timeElapsed, 0)
            };
        });

        return {
            overall: this.currentUser.stats,
            subjects: subjectProgress,
            recentAttempts: attempts.slice(-10).reverse()
        };
    }
}

// Global auth manager instance
window.auth = new AuthManager();

// Form handlers
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                auth.login(email, password);
                toast.success('Welcome back!');
                
                // Redirect to subjects page
                setTimeout(() => {
                    window.location.href = 'subjects.html';
                }, 1000);
                
            } catch (error) {
                toast.error(error.message);
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                confirmPassword: document.getElementById('confirmPassword').value,
                targetExam: document.getElementById('targetExam').value
            };
            
            try {
                auth.register(formData);
                toast.success('Account created successfully!');
                
                // Redirect to subjects page
                setTimeout(() => {
                    window.location.href = 'subjects.html';
                }, 1000);
                
            } catch (error) {
                toast.error(error.message);
            }
        });
    }
});

// User menu functionality
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown-menu');
    dropdown.classList.toggle('show');
}

function logout() {
    if (confirm('Are you sure you want to sign out?')) {
        auth.logout();
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const userMenu = document.querySelector('.user-dropdown');
    if (userMenu && !userMenu.contains(e.target)) {
        const dropdown = document.getElementById('user-dropdown-menu');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
});

// Redirect if already logged in
if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
    if (auth.currentUser) {
        window.location.href = 'subjects.html';
    }
}