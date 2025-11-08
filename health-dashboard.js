// health-dashboard.js - Updated to use backend APIs, session auth, keep new features like add single, search (client-side on fetched data)
document.addEventListener('DOMContentLoaded', async () => {
    /* ---------- 1. SESSION CHECK & UI SETUP ---------- */
    let user = null;
    try {
        const r = await fetch('api/current_user.php', { credentials: 'include' });
        if (r.ok) {
            const d = await r.json();
            if (d.success) {
                user = d.user;
                if (!user.id || user.user_type !== 'barangay_health') {
                    location.href = 'index.html';
                    return;
                }
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
        p += c[Math.floor(Math.random() * 26)];                // upper
        p += c[26 + Math.floor(Math.random() * 26)];           // lower
        p += c[52 + Math.floor(Math.random() * 10)];           // digit
        for (let i = 0; i < 5; i++) p += c[Math.floor(Math.random() * c.length)];
        return p.split('').sort(() => 0.5 - Math.random()).join('');
    };

    const ucfirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    const getUserRoleDisplay = (user) => {
    // If user has a specific role (from backend), use it
    if (user.role) {
        const roleMap = {
            'doctor': 'Doctor',
            'midwife': 'Midwife',
            'nurse': 'Nurse',
            'barangay_health': 'Barangay Health Personnel',
            'patient': 'Patient',
            'system_admin': 'System Administrator'
        };
        return roleMap[user.role] || ucfirst(user.role);
    }

    // Fallback to user_type (old behavior)
    const map = {
        'system_admin': 'System Administrator',
        'barangay_health': 'Barangay Health Personnel',
        'health_worker': 'Health Worker',
        'patient': 'Patient'
    };
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
            try {
                await fetch('api/logout.php', { method: 'POST', credentials: 'include' });
            } finally {
                location.href = 'index.html';
            }
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
    }

    /* ---------- 5. PROCESS MASTERLIST ---------- */
    async function processMasterlist() {
        const file = fileInp.files[0];
        if (!file) {
            showNotification('Please select a file first!', 'error');
            return;
        }

        try {
            const btn = document.getElementById('processMasterlistBtn');
            btn.textContent = 'Processing...';
            btn.disabled = true;

            const content = await file.text();
            const users = parseMasterlist(content);

            if (users.length === 0) {
                showNotification('No valid data found in the file. Please check the format.', 'error');
                return;
            }

            window.currentProcessedUsers = users;
            showCredentialsPreview(users);

            document.getElementById('credentialsPreview').style.display = 'block';
        } catch (error) {
            showNotification('Error reading file: ' + error.message, 'error');
            console.error('File reading error:', error);
        } finally {
            const btn = document.getElementById('processMasterlistBtn');
            btn.textContent = 'Process Master List';
            btn.disabled = false;
        }
    }

    function parseMasterlist(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const users = [];

        for (let line of lines) {
            line = line.trim();
            if (!line || (line.toLowerCase().includes('name') && line.toLowerCase().includes('address'))) continue;

            const separator = line.includes('|') ? '|' : ',';
            const parts = line.split(separator).map(part => part.trim());

            if (parts.length >= 3) {
                const name = parts[0];
                const address = parts[1];
                const roleRaw = parts[2].toLowerCase();

                if (name && address && roleRaw) {
                    const roleMap = {
                        'doctor': 'doctor',
                        'midwife': 'midwife',
                        'nurse': 'nurse',
                        'bhw': 'barangay_health',
                        'health worker': 'health_worker',
                        'patient': 'patient',
                        'health personnel': 'barangay_health'
                    };
                    const role = roleMap[roleRaw] || roleRaw;

                    const username = genUser(name);
                    const password = genPass(); // Or 'pass123' if preferred

                    users.push({
                        name,
                        address,
                        role,
                        username,
                        password,
                        status: 'Active',
                        user_type: role === 'barangay_health' ? 'barangay_health' : (role === 'patient' ? 'patient' : 'health_worker')
                    });
                }
            }
        }
        return users;
    }

    /* ---------- 6. PREVIEW ---------- */
    function showCredentialsPreview(users) {
        const tbody = document.getElementById('previewTableBody');
        tbody.innerHTML = '';
        users.forEach((u, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.name}</td>
                <td>${u.role}</td>
                <td>${u.address}</td>
                <td>${u.username}</td>
                <td>${u.password}</td>
                <td><button class="delete-btn" data-index="${index}">Remove</button></td>
            `;
            tbody.appendChild(tr);
        });

        // Remove handler
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const index = parseInt(e.target.dataset.index);
                window.currentProcessedUsers.splice(index, 1);
                showCredentialsPreview(window.currentProcessedUsers);
            });
        });
    }

    /* ---------- 7. SAVE ALL ---------- */
    async function saveAllCredentials() {
        if (!window.currentProcessedUsers || window.currentProcessedUsers.length === 0) {
            showNotification('No credentials to save!', 'error');
            return;
        }

        const btn = document.getElementById('saveCredentialsBtn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const resp = await fetch('api/create_credentials.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users: window.currentProcessedUsers })
            });
            const data = await resp.json();

            if (data.success) {
                showNotification(`Saved ${data.created} account(s)`, 'success');
                document.getElementById('credentialsPreview').style.display = 'none';
                fileInp.value = '';
                fileName.textContent = 'No file chosen';
                delete window.currentProcessedUsers;
            } else {
                showNotification(data.message || 'Save failed', 'error');
            }
        } catch (e) {
            showNotification('Network error', 'error');
        } finally {
            btn.textContent = 'Save Credentials';
            btn.disabled = false;
        }
    }

    /* ---------- 8. VIEW CREDENTIALS ---------- */
    let allCredentials = []; // Cache for search

    async function viewCredentials() {
        try {
            const resp = await fetch('api/get_credentials.php', { credentials: 'include' });
            if (!resp.ok) throw new Error('Failed to fetch');
            allCredentials = await resp.json();
            displayUsersInTable(allCredentials, document.getElementById('credentialsTableBody'));
            document.getElementById('credentialsView').style.display = 'block';
        } catch (e) {
            showNotification('Failed to load credentials', 'error');
        }
    }

    function displayUsersInTable(users, tbody) {
        tbody.innerHTML = '';
        if (users.length > 0) {
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.role}</td>
                    <td>${user.address || 'Not specified'}</td>
                    <td>${user.username}</td>
                    <td><span class="status-indicator ${user.status === 'Active' ? 'online' : 'offline'}">${user.status || 'Active'}</span></td>
                    <td><button class="delete-btn" data-id="${user.id}">Delete</button></td>
                `;
                tbody.appendChild(tr);
            });

            // Delete handlers
            tbody.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const id = e.target.dataset.id;
                    if (confirm('Delete this user?')) {
                        await deleteUser(id);
                        await viewCredentials(); // Refresh
                    }
                });
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No users found</td></tr>';
        }
    }

    async function deleteUser(id) {
        try {
            const resp = await fetch('api/delete_user.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await resp.json();
            if (data.success) {
                showNotification('User deleted', 'success');
            } else {
                showNotification(data.message || 'Delete failed', 'error');
            }
        } catch (e) {
            showNotification('Network error', 'error');
        }
    }

    /* ---------- 9. SEARCH ---------- */
    function searchCredentials() {
        const searchTerm = document.getElementById('searchCredentialsInput').value.toLowerCase().trim();
        const tbody = document.getElementById('credentialsTableBody');

        if (!searchTerm) {
            displayUsersInTable(allCredentials, tbody);
            return;
        }

        const filtered = allCredentials.filter(user => 
            user.name.toLowerCase().includes(searchTerm) ||
            user.username.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm) ||
            (user.address && user.address.toLowerCase().includes(searchTerm))
        );

        displayUsersInTable(filtered, tbody);
    }

    /* ---------- 10. ADD SINGLE ---------- */
async function addSingleCredentials() {
    const name = document.getElementById('newName').value.trim();
    const address = document.getElementById('newAddress').value.trim();
    const role = document.getElementById('newRole').value;
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!name || !address || !role || !username || !password || !confirmPassword) {
        showNotification('All fields are required', 'error');
        return;
    }

    if (password !== confirmPassword) {
        document.getElementById('passwordValidation').textContent = 'Passwords do not match!';
        document.getElementById('passwordValidation').className = 'validation-message error';
        return;
    }

    if (password.length < 6) {
        document.getElementById('passwordValidation').textContent = 'Password must be at least 6 characters';
        document.getElementById('passwordValidation').className = 'validation-message error';
        return;
    }

    if (!await validateUsername(true)) {
        showNotification('Username is invalid or already taken', 'error');
        return;
    }

    const user = {
        name,
        address,
        role,
        username,
        password,  // Plain text – will be hashed in PHP
        status: 'Active'
    };

    try {
        const resp = await fetch('api/create_credentials.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: [user] })
        });
        const data = await resp.json();

        if (data.success) {
            showNotification('Credentials added successfully', 'success');
            document.getElementById('addCredentialsForm').style.display = 'none';
            document.getElementById('credentialsForm').reset();
            clearUsernameValidation();
            document.getElementById('passwordValidation').textContent = '';
            document.getElementById('passwordValidation').className = 'validation-message';
        } else {
            showNotification(data.message || 'Failed to add credentials', 'error');
        }
    } catch (e) {
        showNotification('Network error', 'error');
    }
}

    async function validateUsername(forceShow = false) {
        const usernameInput = document.getElementById('newUsername');
        const username = usernameInput.value.trim();
        const validationMessage = document.getElementById('usernameValidation');

        if (!username) {
            clearUsernameValidation();
            return false;
        }

        try {
            const resp = await fetch(`api/check_username.php?username=${encodeURIComponent(username)}`, { credentials: 'include' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (data.exists) {
               showValidationMessage('Username already exists!', 'error');
               return false;
            } else {
               showValidationMessage('Username is available!', 'success');
               return true;
            }
        } catch (e) {
             console.error('Username check failed:', e);
             showValidationMessage('Could not check username (check connection)', 'error');
             return false;
        }
    }

    function showValidationMessage(message, type) {
        const validationMessage = document.getElementById('usernameValidation');
        validationMessage.textContent = message;
        validationMessage.className = `validation-message ${type}`;
    }

    function clearUsernameValidation() {
        const validationMessage = document.getElementById('usernameValidation');
        validationMessage.textContent = '';
        validationMessage.className = 'validation-message';
    }
});