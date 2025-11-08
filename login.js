// login.js - Fixed session check, redirect mapping, and removed unnecessary localStorage for user_type (now relying on session)
document.addEventListener('DOMContentLoaded', () => {
    const userTypeSelect   = document.getElementById('userType');
    const usernameInput    = document.getElementById('username');
    const passwordInput    = document.getElementById('password');
    const showUsersLink    = document.getElementById('showUsers');
    const userList         = document.getElementById('userList');
    const forgotPasswordLink = document.getElementById('forgotPassword');

    // ---- UI helpers -------------------------------------------------
    showUsersLink.addEventListener('click', e => {
        e.preventDefault();
        userList.style.display = userList.style.display === 'block' ? 'none' : 'block';
    });

    forgotPasswordLink.addEventListener('click', e => {
        e.preventDefault();
        showNotification('Contact your Barangay Health Office for password reset.', 'info');
    });

    // ---- Test-account auto-fill ------------------------------------
    const testAccounts = {
        system_admin:    { username: "admin_user",      password: "admin123" },
        barangay_health:{ username: "health_personnel",password: "bhw123" },
        health_worker:   { username: "doctor_user",     password: "doctor123" },
        patient:         { username: "patient_juan",    password: "patient123" }
    };
    userTypeSelect.addEventListener('change', () => {
        const t = userTypeSelect.value;
        if (testAccounts[t]) {
            usernameInput.value = testAccounts[t].username;
            passwordInput.value = testAccounts[t].password;
        } else {
            usernameInput.value = passwordInput.value = '';
        }
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