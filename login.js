document.addEventListener('DOMContentLoaded', () => {
    const userTypeSelect   = document.getElementById('userType');
    const usernameInput    = document.getElementById('username');
    const passwordInput    = document.getElementById('password');
    const showUsersLink    = document.getElementById('showUsers');
    const userList         = document.getElementById('userList');
    const forgotPasswordLink = document.getElementById('forgotPassword');

     setupPasswordToggle();

    forgotPasswordLink.addEventListener('click', e => {
        e.preventDefault();
        showNotification('Contact your Barangay Health Office for password reset.', 'info');
    });

    // ---- Login submission -------------------------------------------
    document.getElementById('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        const userType = userTypeSelect.value;
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!userType || !username || !password) {
            showNotification('Please fill in all fields.', 'error');
            return;
        }

        try {
            const resp = await fetch('api/login.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, userType })
            });
            const data = await resp.json();

            if (data.success) {
                showNotification(`Welcome, ${data.user.name || data.user.username}!`, 'success');

                const map = {
                    system_admin:    'admin-dashboard.html',
                    barangay_health: 'health-dashboard.html',
                    health_worker:   'health-worker-dashboard.html',
                    patient:         'patient-dashboard.html'
                };
                setTimeout(() => window.location.href = map[userType] || 'index.html', 800);
            } else {
                showNotification(data.message || 'Login failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification('Network error. Try again.', 'error');
        }
    });

    // ---- Check if already logged in (redirect) --------------------
    (async () => {
        try {
            const r = await fetch('api/current_user.php', { credentials: 'include' });
            if (r.ok) {
                const d = await r.json();
                if (d.success) {
                    const map = {
                        system_admin:    'admin-dashboard.html',
                        barangay_health: 'health-dashboard.html',
                        health_worker:   'health-worker-dashboard.html',
                        patient:         'patient-dashboard.html'
                    };
                    const url = map[d.user.user_type];
                    if (url) window.location.href = url;
                }
            }
        } catch (_) { /* stay on login page */ }
    })();

    // ---- Password toggle function ---------------------------------
        function setupPasswordToggle() {
        const toggleBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const eyeIcon = this.querySelector('.eye-icon');
                if (eyeIcon) {
                    if (type === 'text') {
                      
                        eyeIcon.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>';
                        this.title = 'Hide password';
                        this.classList.add('password-visible');
                    } else {
                    
                        eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
                        this.title = 'Show password';
                        this.classList.remove('password-visible');
                    }
                }
            });
        }
    }

    // ---- Notification helper ----------------------------------------
    function showNotification(msg, type = 'info') {
        const old = document.querySelector('.notification');
        if (old) old.remove();

        const n = document.createElement('div');
        n.className = `notification notification-${type}`;
        n.innerHTML = `<span>${msg}</span><button class="notification-close">x</button>`;
        n.querySelector('.notification-close').onclick = () => n.remove();
        setTimeout(() => n.remove(), 5000);
        document.body.appendChild(n);
    }
});