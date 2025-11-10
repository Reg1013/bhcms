document.addEventListener('DOMContentLoaded', async () => {
    /* ---------- 1. SESSION CHECK & UI SETUP ---------- */
    let user = null;
    try {
        const r = await fetch('api/current_user.php', { credentials: 'include' });
        if (r.ok) {
            const d = await r.json();
            if (d.success && d.user.user_type === 'barangay_health') {
                user = d.user;
                document.getElementById('userWelcome').textContent = `${user.name} | ${user.role}`;
            } else {
                location.href = 'index.html';
                return;
            }
        } else {
            location.href = 'index.html';
            return;
        }
    } catch (e) {
        location.href = 'index.html';
        return;
    }

    /* ---------- 2. GLOBAL HELPERS ---------- */
    const showNotification = (msg, type = 'info') => {
        const div = document.createElement('div');
        div.className = `notification notification-${type}`;
        div.innerHTML = `<span>${msg}</span><button class="notification-close">×</button>`;
        div.querySelector('.notification-close').onclick = () => div.remove();
        setTimeout(() => div.remove(), 5000);
        document.body.appendChild(div);
    };

    const genUser = name => name.replace(/[^a-z]/gi, '').toLowerCase().slice(0, 8) + Math.floor(100 + Math.random() * 900);
    const genPass = () => {
        const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let p = '';
        p += c[Math.floor(Math.random() * 26)];
        p += c[26 + Math.floor(Math.random() * 26)];
        p += c[52 + Math.floor(Math.random() * 10)];
        for (let i = 0; i < 5; i++) p += c[Math.floor(Math.random() * c.length)];
        return p.split('').sort(() => 0.5 - Math.random()).join('');
    };

    const ucfirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    const getUserRoleDisplay = (user) => {
        if (user.role) {
            const map = { 'doctor': 'Doctor', 'midwife': 'Midwife', 'nurse': 'Nurse', 'barangay_health': 'Barangay Health Personnel', 'patient': 'Patient' };
            return map[user.role] || ucfirst(user.role);
        }
        const map = { 'barangay_health': 'Barangay Health Personnel', 'health_worker': 'Health Worker', 'patient': 'Patient' };
        return map[user.user_type] || user.user_type;
    };

    /* ---------- 3. FILE INPUT UI ---------- */
    const fileInp = document.getElementById('masterlistFile');
    const fileName = document.getElementById('fileName');
    fileInp.addEventListener('change', e => {
        fileName.textContent = e.target.files[0]?.name || 'No file chosen';
    });

    /* ---------- 4. EVENT LISTENERS ---------- */
    setupEventListeners();

    function setupEventListeners() {
        // Process masterlist
        document.getElementById('processMasterlistBtn').addEventListener('click', processMasterlist);

        // View credentials
        document.getElementById('viewCredentialsBtn').addEventListener('click', viewCredentials);

        // Add credentials
        document.getElementById('addCredentialsBtn').addEventListener('click', () => {
            document.getElementById('addCredentialsForm').style.display = 'block';
            document.getElementById('credentialsPreview').style.display = 'none';
            document.getElementById('credentialsView').style.display = 'none';
            document.getElementById('analyticsView').style.display = 'none';
        });

        // Cancel add
        document.getElementById('cancelAddBtn').addEventListener('click', () => {
            document.getElementById('addCredentialsForm').style.display = 'none';
            document.getElementById('credentialsForm').reset();
            clearUsernameValidation();
        });

        // Save single credentials
        document.getElementById('credentialsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            addSingleCredentials();
        });

        // Save all from preview
        document.getElementById('saveCredentialsBtn').addEventListener('click', saveAllCredentials);

        // Cancel preview
        document.getElementById('cancelProcessBtn').addEventListener('click', () => {
            document.getElementById('credentialsPreview').style.display = 'none';
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            if (!confirm('Logout?')) return;
            try { await fetch('api/logout.php', { method: 'POST', credentials: 'include' }); } finally { location.href = 'index.html'; }
        });

        // Close view
        document.getElementById('closeCredentialsView').addEventListener('click', () => {
            document.getElementById('credentialsView').style.display = 'none';
            document.getElementById('searchCredentialsInput').value = '';
        });

        // Search
        document.getElementById('searchCredentialsBtn').addEventListener('click', searchCredentials);
        document.getElementById('searchCredentialsInput').addEventListener('input', searchCredentials);
        document.getElementById('searchCredentialsInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchCredentials();
        });

        // Username validation
        document.getElementById('newUsername').addEventListener('input', validateUsername);

        // Close modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', e => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });
        
        // Generate Report
        document.getElementById('generateReportBtn').addEventListener('click', generateReport);

        // Analytics controls
        document.getElementById('refreshReportBtn').addEventListener('click', refreshAnalytics);
        document.getElementById('exportReportBtn').addEventListener('click', exportReport);
        document.getElementById('reportPeriod').addEventListener('change', refreshAnalytics);
        document.getElementById('closeAnalyticsView').addEventListener('click', () => {
          document.getElementById('analyticsView').style.display = 'none';
        });
    }

    /* ---------- 5. PROCESS MASTERLIST ---------- */
    async function processMasterlist() {
        const file = fileInp.files[0];
        if (!file) return showNotification('Please select a file first!', 'error');

        try {
            const btn = document.getElementById('processMasterlistBtn');
            btn.textContent = 'Processing...'; btn.disabled = true;

            const content = await file.text();
            const users = parseMasterlist(content);
            if (users.length === 0) return showNotification('No valid data found.', 'error');

            window.currentProcessedUsers = users;
            showCredentialsPreview(users);
            document.getElementById('credentialsPreview').style.display = 'block';
        } catch (error) {
            showNotification('Error reading file: ' + error.message, 'error');
        } finally {
            const btn = document.getElementById('processMasterlistBtn');
            btn.textContent = 'Process Master List'; btn.disabled = false;
        }
    }

    function parseMasterlist(content) {
        const lines = content.split('\n').filter(l => l.trim());
        const users = [];
        const roleMap = { 'doctor': 'doctor', 'midwife': 'midwife', 'nurse': 'nurse', 'bhw': 'barangay_health', 'patient': 'patient' };

        for (let line of lines) {
            line = line.trim();
            if (!line || line.toLowerCase().includes('name')) continue;
            const parts = line.includes('|') ? line.split('|') : line.split(',');
            if (parts.length >= 3) {
                const name = parts[0].trim();
                const address = parts[1].trim();
                const roleRaw = parts[2].trim().toLowerCase();
                const role = roleMap[roleRaw] || roleRaw;
                if (name && address && role) {
                    users.push({
                        name, address, role,
                        username: genUser(name),
                        password: genPass(),
                        status: 'Active'
                    });
                }
            }
        }
        return users;
    }

    function showCredentialsPreview(users) {
        const tbody = document.getElementById('previewTableBody');
        tbody.innerHTML = '';
        users.forEach((u, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${u.name}</td><td>${u.role}</td><td>${u.address}</td><td>${u.username}</td><td>${u.password}</td><td><button class="delete-btn" data-index="${i}">Remove</button></td>`;
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const idx = parseInt(e.target.dataset.index);
                window.currentProcessedUsers.splice(idx, 1);
                showCredentialsPreview(window.currentProcessedUsers);
            });
        });
    }

    /* ---------- 6. SAVE ALL ---------- */
    async function saveAllCredentials() {
        if (!window.currentProcessedUsers?.length) return showNotification('No credentials to save!', 'error');
        const btn = document.getElementById('saveCredentialsBtn');
        btn.textContent = 'Saving...'; btn.disabled = true;

        try {
            const resp = await fetch('api/create_credentials.php', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users: window.currentProcessedUsers })
            });
            const data = await resp.json();
            if (data.success) {
                showNotification(`Saved ${data.created} account(s)`, 'success');
                document.getElementById('credentialsPreview').style.display = 'none';
                fileInp.value = ''; fileName.textContent = 'No file chosen';
                delete window.currentProcessedUsers;
            } else {
                showNotification(data.message || 'Save failed', 'error');
            }
        } catch (e) {
            showNotification('Network error', 'error');
        } finally {
            btn.textContent = 'Save Credentials'; btn.disabled = false;
        }
    }

    /* ---------- 7. VIEW CREDENTIALS ---------- */
    let allCredentials = [];

    async function viewCredentials() {
        try {
            const resp = await fetch('api/get_credentials.php', { credentials: 'include' });
            if (!resp.ok) throw new Error('Failed');
            allCredentials = await resp.json();
            displayUsersInTable(allCredentials, document.getElementById('credentialsTableBody'));
            document.getElementById('credentialsView').style.display = 'block';
        } catch (e) {
            showNotification('Failed to load credentials', 'error');
        }
    }

    function displayUsersInTable(users, tbody) {
        tbody.innerHTML = users.length ? '' : '<tr><td colspan="6" class="no-data">No users found</td></tr>';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.name}</td>
                <td>${user.role}</td>
                <td>${user.address || '—'}</td>
                <td>${user.username}</td>
                <td><span class="status-indicator ${user.status === 'Active' ? 'online' : 'offline'}">${user.status || 'Active'}</span></td>
                <td><button class="delete-btn" data-id="${user.id}">Delete</button></td>
            `;
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                const id = e.target.dataset.id;
                if (confirm('Delete this user?')) {
                    await deleteUser(id);
                    await viewCredentials();
                }
            });
        });
    }

    async function deleteUser(id) {
        try {
            const resp = await fetch('api/delete_user.php', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await resp.json();
            showNotification(data.success ? 'User deleted' : data.message || 'Delete failed', data.success ? 'success' : 'error');
        } catch (e) {
            showNotification('Network error', 'error');
        }
    }

    /* ---------- 8. SEARCH ---------- */
    function searchCredentials() {
        const term = document.getElementById('searchCredentialsInput').value.toLowerCase().trim();
        const filtered = term ? allCredentials.filter(u =>
            u.name.toLowerCase().includes(term) ||
            u.username.toLowerCase().includes(term) ||
            u.role.toLowerCase().includes(term) ||
            (u.address && u.address.toLowerCase().includes(term))
        ) : allCredentials;
        displayUsersInTable(filtered, document.getElementById('credentialsTableBody'));
    }

    /* ---------- 9. ADD SINGLE ---------- */
    async function addSingleCredentials() {
        const name = document.getElementById('newName').value.trim();
        const address = document.getElementById('newAddress').value.trim();
        const role = document.getElementById('newRole').value;
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;

        if (!name || !address || !role || !username || !password || !confirm) return showNotification('All fields required', 'error');
        if (password !== confirm) return showValidation('passwordValidation', 'Passwords do not match!', 'error');
        if (password.length < 6) return showValidation('passwordValidation', 'Password too short', 'error');
        if (!await validateUsername(true)) return showNotification('Username invalid', 'error');

        const user = { name, address, role, username, password, status: 'Active' };
        try {
            const resp = await fetch('api/create_credentials.php', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users: [user] })
            });
            const data = await resp.json();
            if (data.success) {
                showNotification('Credentials added', 'success');
                document.getElementById('addCredentialsForm').style.display = 'none';
                document.getElementById('credentialsForm').reset();
                clearUsernameValidation();
            } else {
                showNotification(data.message || 'Failed', 'error');
            }
        } catch (e) {
            showNotification('Network error', 'error');
        }
    }

    async function validateUsername() {
        const username = document.getElementById('newUsername').value.trim();
        const msg = document.getElementById('usernameValidation');
        if (!username) { msg.className = 'validation-message'; msg.textContent = ''; return false; }
        try {
            const resp = await fetch(`api/check_username.php?username=${encodeURIComponent(username)}`, { credentials: 'include' });
            const data = await resp.json();
            showValidation('usernameValidation', data.exists ? 'Username taken' : 'Available!', data.exists ? 'error' : 'success');
            return !data.exists;
        } catch (e) {
            showValidation('usernameValidation', 'Check failed', 'error');
            return false;
        }
    }

    function showValidation(id, text, type) {
        const el = document.getElementById(id);
        el.textContent = text;
        el.className = `validation-message ${type}`;
    }

    function clearUsernameValidation() {
        const el = document.getElementById('usernameValidation');
        el.textContent = ''; el.className = 'validation-message';
    }

    /* ---------- 10. ANALYTICS (REAL + SAFE) ---------- */
    let analyticsCharts = {};

    async function generateReport() {
        const btn = document.getElementById('generateReportBtn');
        btn.textContent = 'Loading...'; btn.disabled = true;
        try {
            await loadAnalyticsData();
            document.getElementById('analyticsView').style.display = 'block';
        } catch (e) {
            showNotification('Analytics failed', 'error');
        } finally {
            btn.textContent = 'Generate Report'; btn.disabled = false;
        }
    }

    async function loadAnalyticsData() {
        let analytics = {};
        try {
            const resp = await fetch('api/get_analytics.php', { credentials: 'include' });
            analytics = resp.ok ? await resp.json() : getFallbackAnalytics();
        } catch (e) {
            analytics = getFallbackAnalytics();
        }
        updateSummary(analytics);
        renderCharts(analytics);
        updateReports(analytics);
    }

    function getFallbackAnalytics() {
        return JSON.parse(localStorage.getItem('health_analytics') || '{}');
    }

    function updateSummary(data) {
        document.getElementById('totalPatients').textContent = data.summary?.totalPatients || 0;
        document.getElementById('totalServices').textContent = data.summary?.totalServices || 0;
        document.getElementById('healthWorkers').textContent = data.summary?.totalHealthWorkers || 0;
        document.getElementById('avgSatisfaction').textContent = (data.summary?.avgSatisfaction || 0).toFixed(1);
    }

    function renderCharts(data) {
        Object.values(analyticsCharts).forEach(c => c?.destroy());
        analyticsCharts = {};

        // Services
        analyticsCharts.services = new Chart(document.getElementById('servicesChart').getContext('2d'), {
            type: 'pie',
            data: { labels: data.services.map(s => s.name), datasets: [{ data: data.services.map(s => s.count), backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40'] }] },
            options: { responsive: true }
        });

        // Monthly
        analyticsCharts.monthly = new Chart(document.getElementById('monthlyActivityChart').getContext('2d'), {
            type: 'line',
            data: { labels: data.monthlyActivity.map(m => m.month), datasets: [
                { label: 'Consultations', data: data.monthlyActivity.map(m => m.consultations), borderColor: '#1a237e' },
                { label: 'Emergencies', data: data.monthlyActivity.map(m => m.emergencies), borderColor: '#f44336' },
                { label: 'Check-ups', data: data.monthlyActivity.map(m => m.checkups), borderColor: '#4caf50' }
            ]},
            options: { responsive: true }
        });

        // Demographics
        analyticsCharts.demo = new Chart(document.getElementById('demographicsChart').getContext('2d'), {
            type: 'bar',
            data: { labels: data.demographics.ageGroups.map(g => g.group), datasets: [{ label: 'Patients', data: data.demographics.ageGroups.map(g => g.count), backgroundColor: '#303f9f' }] },
            options: { responsive: true }
        });

        // Performance
        analyticsCharts.perf = new Chart(document.getElementById('performanceChart').getContext('2d'), {
            type: 'radar',
            data: { labels: data.performance.map(p => p.worker), datasets: [{ label: 'Satisfaction', data: data.performance.map(p => p.satisfaction), backgroundColor: 'rgba(48,63,159,0.2)', borderColor: '#1a237e' }] },
            options: { responsive: true, scales: { r: { max: 5 } } }
        });
    }

    function updateReports(data) {
        const top = document.getElementById('topServicesReport'); top.innerHTML = ''; data.services.slice(0,5).forEach(s => top.innerHTML += `<div class="report-item"><span>${s.name}</span><span>${s.count}</span></div>`);
        const recent = document.getElementById('recentActivitiesReport'); recent.innerHTML = ''; data.recentActivities.forEach(a => recent.innerHTML += `<div class="activity-item"><div>${a.activity}</div><div class="activity-time">${a.time}</div></div>`);
        const gender = document.getElementById('patientStatsReport'); gender.innerHTML = ''; data.demographics.gender.forEach(g => gender.innerHTML += `<div class="report-item"><span>${g.gender}</span><span>${g.count}</span></div>`);
        const workers = document.getElementById('workerOverviewReport'); workers.innerHTML = ''; data.performance.forEach(p => workers.innerHTML += `<div class="report-item"><span>${p.worker}</span><span>${p.patients} patients</span></div>`);
    }

    function refreshAnalytics() { loadAnalyticsData(); }

    function exportReport() {
        const data = getFallbackAnalytics();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'health_report.json'; a.click();
        URL.revokeObjectURL(url);
    }

    // Initialize fallback
    if (!localStorage.getItem('health_analytics')) {
        localStorage.setItem('health_analytics', JSON.stringify({
            services: [], monthlyActivity: [], demographics: { ageGroups: [], gender: [] }, performance: [], recentActivities: [], summary: {}
        }));
    }
});