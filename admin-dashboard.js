// admin-dashboard.js — COMPLETE FIXED VERSION WITH fetchJSON

// ==================== HELPER FUNCTIONS ====================
async function fetchJSON(url, options = {}) {
    try {
        const response = await fetch(url, {
            credentials: 'include',
            ...options
        });
        
        const text = await response.text();
        
        // Check if response is HTML error
        if (text.trim().startsWith('<') || text.includes('<br />')) {
            throw new Error('Server returned HTML error page');
        }
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse JSON:', text.substring(0, 200));
            throw new Error('Invalid JSON response from server');
        }
        
    } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        throw error;
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeJs(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

function formatTime(datetime) {
    if (!datetime) return '';
    try {
        const d = new Date(datetime);
        return d.toLocaleString();
    } catch {
        return datetime;
    }
}

function getRoleName(type) {
    const map = {
        system_admin: 'System Administrator',
        barangay_health: 'Barangay Health Worker',
        bhw: 'Barangay Health Worker',
        health_worker: 'Health Worker',
        patient: 'Patient'
    };
    return map[type] || type;
}

function showNotification(msg, type = 'success') {
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.innerHTML = `${escapeHtml(msg)}<button class="notification-close">×</button>`;
    
    const closeBtn = n.querySelector('button');
    if (closeBtn) {
        closeBtn.onclick = () => n.remove();
    }
    
    document.body.appendChild(n);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (n.parentNode) {
            n.remove();
        }
    }, 4000);
}

// ==================== MAIN DASHBOARD CODE ====================
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    try {
        // Check if user is authenticated and is system admin
        const response = await fetch('api/current_user.php', { 
            credentials: 'include' 
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (!data.success || data.user.user_type !== 'system_admin') {
            alert('Access denied. Only system administrators can access this dashboard.');
            window.location.href = 'index.html';
            return;
        }

        // SUCCESS → hide loader and start dashboard
        const loader = document.getElementById('loader');
        if (loader) loader.remove();
        
        window.currentUser = data.user;
        setupDashboard();
        
    } catch (error) {
        console.error('Initialization error:', error);
        const loader = document.getElementById('loader');
        if (loader) {
            loader.textContent = 'Session expired or network error';
            loader.style.color = '#dc3545';
        }
        setTimeout(() => window.location.href = 'index.html', 1500);
    }
}

function setupDashboard() {
    // Display welcome message
    const userWelcome = document.getElementById('userWelcome');
    if (userWelcome && window.currentUser) {
        userWelcome.textContent = `Welcome, ${window.currentUser.name || window.currentUser.username}`;
    }

    initNotifications();

    // Setup navigation buttons
    setupNavigation();
    
    // Setup other buttons
    setupActionButtons();
    
    // Load initial data
    loadDashboardData();
    loadRecentActivity();
    setupModalEvents();
    
    // Show default content
    showSection('default');
}

function setupNavigation() {
    // Navigation buttons
    const navButtons = [
        { id: 'userManagementBtn', section: 'userManagement', loader: loadUserManagementData },
        { id: 'systemInfoBtn', section: 'systemInfo', loader: loadSystemInfo },
        { id: 'systemSettingsBtn', section: 'systemSettings', loader: loadSystemSettings },
        { id: 'auditLogsBtn', section: 'auditLogs', loader: loadAuditLogs }
    ];
    
    navButtons.forEach(btn => {
        const element = document.getElementById(btn.id);
        if (element) {
            element.onclick = () => {
                showSection(btn.section);
                if (btn.loader) btn.loader();
            };
        }
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = handleLogout;
    }
}

function setupActionButtons() {

    const enablePushNotifications = document.getElementById('enablePushNotifications');
const enableSoundNotifications = document.getElementById('enableSoundNotifications');
const saveNotificationSettingsBtn = document.getElementById('saveNotificationSettingsBtn');

if (enablePushNotifications) {
    enablePushNotifications.addEventListener('change', saveNotificationSettings);
}
if (enableSoundNotifications) {
    enableSoundNotifications.addEventListener('change', saveNotificationSettings);
}
if (saveNotificationSettingsBtn) {
    saveNotificationSettingsBtn.addEventListener('click', saveNotificationSettings);
}

    // Add User button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', openAddUserModal);
    }
    
    // Save Profile Info button
    const saveProfileInfoBtn = document.getElementById('saveProfileInfoBtn');
    if (saveProfileInfoBtn) {
        saveProfileInfoBtn.addEventListener('click', saveProfileInfo);
    }
    
    // Maintenance toggle
    const maintenanceToggle = document.getElementById('systemMaintenanceToggle');
    if (maintenanceToggle) {
        maintenanceToggle.addEventListener('change', toggleSystemMaintenance);
    }


}

async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        const response = await fetch('api/logout.php', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            showNotification('Logged out successfully', 'success');
            setTimeout(() => window.location.href = 'index.html', 800);
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if logout fails
        window.location.href = 'index.html';
    }
}

function showSection(section) {
    // Hide all content sections
    document.querySelectorAll('.management-content, .default-content').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show the target section
    const sections = {
        userManagement: 'userManagementContent',
        systemInfo: 'systemInfoContent',
        systemSettings: 'systemSettingsContent',
        auditLogs: 'auditLogsContent',
        default: 'default-content'
    };
    
    const targetId = sections[section];
    if (targetId) {
        const target = document.getElementById(targetId);
        if (target) {
            target.style.display = 'block';
        }
    } else {
        // Show default content if no section specified
        const defaultContent = document.getElementById('default-content');
        if (defaultContent) {
            defaultContent.style.display = 'block';
        }
    }
}

// ==================== LOADING FUNCTIONS ====================
async function loadDashboardData() {
    try {
        const users = await fetchJSON('api/get_users.php');
        
        const totalUsersCount = document.getElementById('totalUsersCount');
        if (totalUsersCount) {
            totalUsersCount.textContent = Array.isArray(users) ? users.length : '0';
        }
        
        // Load audit logs count
        const auditData = await fetchJSON('api/get_audit_logs.php');
        if (auditData.success) {
            const auditCount = document.getElementById('auditLogsCount');
            if (auditCount) {
                auditCount.textContent = auditData.count || '0';
            }
        }
        
        // Set random active sessions (for demo)
        const activeSessions = document.getElementById('activeSessions');
        const lastBackup = document.getElementById('lastBackup');
        
        if (activeSessions) activeSessions.textContent = Math.floor(Math.random() * 10) + 1;
        if (lastBackup) lastBackup.textContent = new Date().toLocaleTimeString();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        const totalUsersCount = document.getElementById('totalUsersCount');
        if (totalUsersCount) totalUsersCount.textContent = 'Error';
    }
}

async function loadRecentActivity() {
    try {
        const data = await fetchJSON('api/get_audit_logs.php?limit=5');
        
        const container = document.querySelector('.activity-list');
        if (!container) return;
        
        if (data.success && Array.isArray(data.logs) && data.logs.length > 0) {
            container.innerHTML = data.logs.map(log => `
                <div class="activity-item">
                    <span class="activity-text">${escapeHtml(log.action)} - ${escapeHtml(log.target || 'System')}</span>
                    <span class="activity-time">${formatTime(log.timestamp)}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="activity-item">No recent activity</div>';
        }
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        const container = document.querySelector('.activity-list');
        if (container) {
            container.innerHTML = '<div class="activity-item">Unable to load recent activity</div>';
        }
    }
}

async function loadUserManagementData() {
    try {
        const users = await fetchJSON('api/get_users.php');
        
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!Array.isArray(users)) {
            tbody.innerHTML = '<tr><td colspan="5">Error loading users</td></tr>';
            return;
        }
        
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.username)}</td>
                <td>${getRoleName(u.user_type)}</td>
                <td><span class="status ${u.status ? u.status.toLowerCase() : ''}">${u.status || 'Unknown'}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editUser(${u.id}, '${escapeJs(u.name)}', '${escapeJs(u.username)}', '${escapeJs(u.user_type)}', '${escapeJs(u.status)}')">Edit</button>
                    <button class="action-btn delete" onclick="deleteUser(${u.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        const tbody = document.getElementById('userTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5">Error loading users</td></tr>';
    }
}

async function loadSystemInfo() {
    try {
        const data = await fetchJSON('api/get_system_info.php');
        
        if (data.success) {
            const u = data.user || {};
            const s = data.system || {};
            
            // Set values
            const setValue = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.value = value || '';
            };
            
            setValue('adminName', u.name);
            setValue('adminEmail', u.email);
            setValue('adminUsername', u.username);
            setValue('systemName', s.system_name);
            setValue('systemVersion', s.system_version);
            setValue('supportEmail', s.support_email);
        } else {
            showNotification(data.message || 'Failed to load system info', 'error');
        }
        
    } catch (error) {
        console.error('Error loading system info:', error);
        showNotification('System information feature not available', 'warning');
    }
}

async function loadSystemSettings() {
    try {
        const settings = await fetchJSON('api/get_system_settings.php');
        
        const maintenanceToggle = document.getElementById('systemMaintenanceToggle');
        if (maintenanceToggle) {
            maintenanceToggle.checked = settings.maintenance_mode === '1' || settings.maintenance_mode === 'true';
        }
        
        const pushToggle = document.getElementById('enablePushNotifications');
        if (pushToggle) {
            pushToggle.checked = settings.enable_push_notifications === '1' || settings.enable_push_notifications === 'true';
        }
        
        const soundToggle = document.getElementById('enableSoundNotifications');
        if (soundToggle) {
            soundToggle.checked = settings.enable_sound_notifications === '1' || settings.enable_sound_notifications === 'true';
        }
        
    } catch (error) {
        console.error('Error loading system settings:', error);
        showNotification('Unable to load system settings', 'error');
    }
}

async function loadAuditLogs() {
    try {
        const data = await fetchJSON('api/get_audit_logs.php');
        
        const tbody = document.getElementById('auditTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (data.success && Array.isArray(data.logs) && data.logs.length > 0) {
            data.logs.forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatTime(log.timestamp)}</td>
                    <td>${escapeHtml(log.user || 'System')}</td>
                    <td>${escapeHtml(log.action)}</td>
                    <td>${escapeHtml(log.target || '-')}</td>
                    <td>${log.ip || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No audit logs found</td></tr>';
        }
        
    } catch (error) {
        console.error('Error loading audit logs:', error);
        const tbody = document.getElementById('auditTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5">Error loading audit logs</td></tr>';
        }
    }
}

async function saveNotificationSettings() {
    const data = {
        pushNotifications: document.getElementById('enablePushNotifications')?.checked || false,
        soundNotifications: document.getElementById('enableSoundNotifications')?.checked || false
    };
    
    try {
        const res = await fetchJSON('api/update_notification_settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.success) {
            showNotification('Notification settings saved', 'success');
        } else {
            showNotification(res.message || 'Save failed', 'error');
        }
    } catch (error) {
        console.error('Error saving notification settings:', error);
        showNotification('Network error occurred', 'error');
    }
}

// Web Notification API functions
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("This browser does not support notifications");
        return false;
    }
    
    if (Notification.permission === "granted") {
        return true;
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("Notification permission granted");
                return true;
            }
        });
    }
    return false;
}

function showBrowserNotification(title, options = {}) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return false;
    }
    
    // Check if notifications are enabled in settings
    const pushToggle = document.getElementById('enablePushNotifications');
    if (pushToggle && !pushToggle.checked) {
        return false;
    }
    
    const notification = new Notification(title, {
        icon: 'bhcmslogo.png',
        badge: 'bhcmslogo.png',
        ...options
    });
    
    notification.onclick = () => {
        window.focus();
        notification.close();
    };
    
    // Play sound if enabled
    const soundToggle = document.getElementById('enableSoundNotifications');
    if (soundToggle && soundToggle.checked) {
        playNotificationSound();
    }
    
    return true;
}

function playNotificationSound() {
    // Simple notification sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log("Could not play notification sound:", e);
    }
}

// Initialize notifications when dashboard loads
function initNotifications() {
    requestNotificationPermission();
    
    // Example: Show welcome notification
    setTimeout(() => {
        showBrowserNotification('Admin Dashboard', {
            body: 'System administrator dashboard loaded successfully',
            tag: 'welcome'
        });
    }, 2000);
}

// ==================== CRUD FUNCTIONS ====================
function openAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (!modal) return;
    
    modal.style.display = 'block';
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Add New User';
    
    const form = document.getElementById('userForm');
    if (form) {
        form.reset();
        delete form.dataset.id;
    }
}

function editUser(id, name, username, role, status) {
    openAddUserModal();
    
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('userForm');
    
    if (modalTitle) modalTitle.textContent = 'Edit User';
    
    if (form) {
        form.dataset.id = id;
        document.getElementById('fullName').value = name;
        document.getElementById('userUsername').value = username;
        document.getElementById('userRole').value = role;
        document.getElementById('userStatus').value = status;
    }
}

function setupModalEvents() {
    const modal = document.getElementById('addUserModal');
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const form = document.getElementById('userForm');
    
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    if (cancelBtn) cancelBtn.onclick = () => modal.style.display = 'none';
    
    window.onclick = (e) => { 
        if (e.target === modal) modal.style.display = 'none'; 
    };
    
    if (form) {
        form.onsubmit = async function (e) {
            e.preventDefault();
            const isEdit = !!this.dataset.id;
            
            const payload = {
                fullName: document.getElementById('fullName').value.trim(),
                username: document.getElementById('userUsername').value.trim(),
                role: document.getElementById('userRole').value,
                status: document.getElementById('userStatus').value
            };
            
            if (isEdit) {
                payload.id = parseInt(this.dataset.id);
            } else {
                payload.password = payload.username + '123'; // default password
            }
            
            const url = isEdit ? 'api/update_user.php' : 'api/create_user.php';
            
            try {
                const res = await fetchJSON(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.success) {
                    showNotification(`User ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                    modal.style.display = 'none';
                    loadUserManagementData();
                    loadDashboardData();
                } else {
                    showNotification(res.message || 'Operation failed', 'error');
                }
            } catch (error) {
                console.error('Error saving user:', error);
                showNotification('Network error occurred', 'error');
            }
        };
    }
}

async function deleteUser(id) {
    if (!confirm('Delete this user permanently?')) return;
    
    if (window.currentUser && id === window.currentUser.id) {
        showNotification('Cannot delete your own account', 'error');
        return;
    }
    
    try {
        const res = await fetchJSON('api/delete_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        
        if (res.success) {
            showNotification('User deleted successfully', 'success');
            loadUserManagementData();
            loadDashboardData();
        } else {
            showNotification(res.message || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Network error occurred', 'error');
    }
}

async function saveProfileInfo() {
    const data = {
        adminName: document.getElementById('adminName')?.value.trim() || '',
        adminEmail: document.getElementById('adminEmail')?.value.trim() || '',
        adminUsername: document.getElementById('adminUsername')?.value.trim() || '',
        systemName: document.getElementById('systemName')?.value.trim() || '',
        systemVersion: document.getElementById('systemVersion')?.value.trim() || '',
        supportEmail: document.getElementById('supportEmail')?.value.trim() || '',
    };
    
    try {
        const res = await fetchJSON('api/update_system_info.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.success) {
            showNotification('Profile updated successfully!', 'success');
            const userWelcome = document.getElementById('userWelcome');
            if (userWelcome && data.adminName) {
                userWelcome.textContent = `Welcome, ${data.adminName}`;
            }
            if (window.currentUser) {
                window.currentUser.name = data.adminName;
            }
        } else {
            showNotification(res.message || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Network error occurred', 'error');
    }
}

async function saveEmailConfiguration() {
    const data = {
        smtpHost: document.getElementById('smtpHost')?.value.trim() || '',
        smtpPort: document.getElementById('smtpPort')?.value || '',
        smtpUsername: document.getElementById('smtpUsername')?.value.trim() || '',
        smtpPassword: document.getElementById('smtpPassword')?.value || ''
    };
    
    try {
        const res = await fetchJSON('api/update_email_config.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.success) {
            showNotification('Email settings saved successfully', 'success');
            const smtpPassword = document.getElementById('smtpPassword');
            if (smtpPassword) smtpPassword.value = '';
        } else {
            showNotification(res.message || 'Save failed', 'error');
        }
    } catch (error) {
        console.error('Error saving email config:', error);
        showNotification('Network error occurred', 'error');
    }
}

async function toggleSystemMaintenance() {
    const mode = this.checked ? 1 : 0;
    
    try {
        const res = await fetchJSON('api/update_maintenance.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maintenance: mode })
        });
        
        const message = res.success ? 
            `Maintenance mode ${mode ? 'enabled' : 'disabled'}` : 
            'Failed to update maintenance mode';
        const type = res.success ? 'success' : 'error';
        showNotification(message, type);
    } catch (error) {
        console.error('Error toggling maintenance:', error);
        showNotification('Network error occurred', 'error');
    }
}

// ==================== GLOBAL FUNCTIONS ====================
// Make functions available globally
window.editUser = editUser;
window.deleteUser = deleteUser;