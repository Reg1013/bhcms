document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is system admin
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.user_type || currentUser.user_type !== 'system_admin') {
        window.location.href = 'index.html';
        return;
    }

    // Initialize dashboard
    initDashboard();
});

// Initialize dashboard
function initDashboard() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.name}`;
    
    setupEventListeners();
    loadDashboardData();
}

// Set up event listeners
function setupEventListeners() {
    // Navigation buttons
    document.getElementById('userManagementBtn').addEventListener('click', () => {
        showContent('userManagement');
        loadUserManagementData();
    });

    document.getElementById('systemInfoBtn').addEventListener('click', () => {
        showContent('systemInfo');
        loadSystemInfo();
    });

    document.getElementById('systemSettingsBtn').addEventListener('click', () => {
        showContent('systemSettings');
        loadSystemSettings();
    });

    document.getElementById('auditLogsBtn').addEventListener('click', () => {
        showContent('auditLogs');
        loadAuditLogs();
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }
    });

    // Add user button
    document.getElementById('addUserBtn').addEventListener('click', openAddUserModal);

    // Save profile info button
    document.getElementById('saveProfileInfoBtn').addEventListener('click', saveProfileInfo);

    // Modal events
    setupModalEvents();

    // Save email configuration
    document.getElementById('saveEmailConfigBtn').addEventListener('click', saveEmailConfiguration);

    // System maintenance toggle
    document.getElementById('systemMaintenanceToggle').addEventListener('change', toggleSystemMaintenance);
}

// Show specific content area
function showContent(contentType) {
    const contentAreas = document.querySelectorAll('.management-content');
    contentAreas.forEach(content => content.style.display = 'none');
    
    const defaultContent = document.querySelector('.default-content');
    defaultContent.style.display = 'none';
    
    const contentMap = {
        'userManagement': 'userManagementContent',
        'systemInfo': 'systemInfoContent',
        'systemSettings': 'systemSettingsContent',
        'auditLogs': 'auditLogsContent',
        'default': 'default-content'
    };
    
    const contentId = contentMap[contentType] || 'default-content';
    document.getElementById(contentId).style.display = 'block';
}

// Load dashboard data
function loadDashboardData() {
    const allUsers = getAllUsers();
    const activeSessions = getActiveSessions();
    
    document.getElementById('totalUsersCount').textContent = allUsers.length;
    document.getElementById('activeSessions').textContent = activeSessions;
    
    // Update last backup time
    document.getElementById('lastBackup').textContent = 'Just now';
}

// Get all users from localStorage
function getAllUsers() {
    const users = [];
    
    // Get users from different user types
    const userTypes = ['system_admin', 'barangay_health', 'health_worker', 'patient'];
    
    userTypes.forEach(userType => {
        const userKey = `${userType}_users`;
        const storedUsers = JSON.parse(localStorage.getItem(userKey) || '[]');
        users.push(...storedUsers);
    });
    
    return users;
}

// Get active sessions (mock data for now)
function getActiveSessions() {
    return Math.floor(Math.random() * 10) + 1; // Random number between 1-10
}

// Load user management data
function loadUserManagementData() {
    const allUsers = getAllUsers();
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = '';
    
    if (allUsers.length > 0) {
        allUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td>${getUserRoleDisplay(user.user_type)}</td>
                <td><span class="status-indicator ${user.status === 'Active' ? 'online' : 'offline'}">${user.status || 'Active'}</span></td>
                <td>
                    <button class="action-btn delete delete-user" data-username="${user.username}" data-usertype="${user.user_type}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No users found</td></tr>';
    }

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const username = e.target.dataset.username;
            const userType = e.target.dataset.usertype;
            deleteUser(username, userType);
        });
    });
}

// Load system information
function loadSystemInfo() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const systemInfo = JSON.parse(localStorage.getItem('systemInfo') || '{}');
    
    // Set current values
    document.getElementById('adminName').value = systemInfo.name || currentUser.name || '';
    document.getElementById('adminEmail').value = systemInfo.email || '';
    document.getElementById('adminUsername').value = systemInfo.username || currentUser.username || '';
    document.getElementById('adminPhone').value = systemInfo.phone || '';
    document.getElementById('adminAddress').value = systemInfo.address || '';
    document.getElementById('systemName').value = systemInfo.systemName || 'Barangay Health Management System';
    document.getElementById('systemVersion').value = systemInfo.systemVersion || '1.0.0';
    document.getElementById('supportEmail').value = systemInfo.supportEmail || '';
    document.getElementById('supportPhone').value = systemInfo.supportPhone || '';
}

// Load system settings
function loadSystemSettings() {
    const systemSettings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    document.getElementById('systemMaintenanceToggle').checked = systemSettings.maintenanceMode || false;
    document.getElementById('smtpHost').value = systemSettings.smtpHost || '';
    document.getElementById('smtpPort').value = systemSettings.smtpPort || '587';
    document.getElementById('smtpUsername').value = systemSettings.smtpUsername || '';
}

// Load audit logs
function loadAuditLogs() {
    const auditLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
    const tableBody = document.getElementById('auditTableBody');
    tableBody.innerHTML = '';
    
    if (auditLogs.length > 0) {
        // Show latest 50 logs
        const recentLogs = auditLogs.slice(-50).reverse();
        
        recentLogs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.timestamp}</td>
                <td>${log.user}</td>
                <td>${log.action}</td>
                <td>${log.target}</td>
                <td>${log.ip}</td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No audit logs found</td></tr>';
    }
}

// Modal functionality
function setupModalEvents() {
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.close');
    const cancelBtns = document.querySelectorAll('.cancel-btn');

    closeBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
    cancelBtns.forEach(btn => btn.addEventListener('click', closeAllModals));
    
    window.addEventListener('click', (event) => {
        modals.forEach(modal => {
            if (event.target === modal) closeAllModals();
        });
    });

    document.getElementById('userForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveUser();
    });
}

// Open add user modal
function openAddUserModal() {
    const modal = document.getElementById('addUserModal');
    const form = document.getElementById('userForm');
    form.reset();
    modal.style.display = 'block';
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Save user
function saveUser() {
    const name = document.getElementById('fullName').value;
    const username = document.getElementById('userUsername').value;
    const role = document.getElementById('userRole').value;
    const status = document.getElementById('userStatus').value;

    if (!name || !username || !role || !status) {
        showNotification('All fields are required!', 'error');
        return;
    }

    // Check if username already exists
    if (isUsernameExists(username)) {
        showNotification('Username already exists! Please choose a different username.', 'error');
        return;
    }

    // Show loading state
    const submitBtn = document.querySelector('#userForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    // Create new user
    const newUser = {
        id: Date.now(),
        name: name,
        username: username,
        password: 'pass123', // Default password
        user_type: role,
        status: status,
        dateCreated: new Date().toISOString()
    };

    // Save to localStorage based on user type
    const userKey = `${role}_users`;
    const existingUsers = JSON.parse(localStorage.getItem(userKey) || '[]');
    existingUsers.push(newUser);
    localStorage.setItem(userKey, JSON.stringify(existingUsers));

    // Add to audit log
    addAuditLog('User Created', `User: ${username}`, 'system_admin');

    setTimeout(() => {
        showNotification(`User ${name} created successfully!`, 'success');
        closeAllModals();
        loadUserManagementData();
        loadDashboardData(); // Refresh dashboard stats
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 1000);
}

// Save profile and system information
function saveProfileInfo() {
    const name = document.getElementById('adminName').value;
    const email = document.getElementById('adminEmail').value;
    const username = document.getElementById('adminUsername').value;
    const phone = document.getElementById('adminPhone').value;
    const address = document.getElementById('adminAddress').value;
    const systemName = document.getElementById('systemName').value;
    const systemVersion = document.getElementById('systemVersion').value;
    const supportEmail = document.getElementById('supportEmail').value;
    const supportPhone = document.getElementById('supportPhone').value;

    if (!name || !username) {
        showNotification('Name and username are required!', 'error');
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById('saveProfileInfoBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    // Save system information
    const systemInfo = {
        name: name,
        email: email,
        username: username,
        phone: phone,
        address: address,
        systemName: systemName,
        systemVersion: systemVersion,
        supportEmail: supportEmail,
        supportPhone: supportPhone,
        lastUpdated: new Date().toISOString()
    };

    localStorage.setItem('systemInfo', JSON.stringify(systemInfo));

    // Update current user in localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUser.name = name;
    currentUser.username = username;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Update UI
    document.getElementById('userWelcome').textContent = `Welcome, ${name}`;

    // Add to audit log
    addAuditLog('System Information Updated', 'Profile and System Settings', 'system_admin');

    setTimeout(() => {
        showNotification('Profile and system information updated successfully!', 'success');
        
        // Reset button
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }, 1000);
}

// Check if username exists
function isUsernameExists(username) {
    const allUsers = getAllUsers();
    return allUsers.some(user => user.username === username);
}

// Delete user
function deleteUser(username, userType) {
    if (confirm(`Are you sure you want to delete user ${username}?`)) {
        const userKey = `${userType}_users`;
        const users = JSON.parse(localStorage.getItem(userKey) || '[]');
        const updatedUsers = users.filter(user => user.username !== username);
        localStorage.setItem(userKey, JSON.stringify(updatedUsers));

        // Add to audit log
        addAuditLog('User Deleted', `User: ${username}`, 'system_admin');

        showNotification(`User ${username} deleted successfully`, 'success');
        loadUserManagementData();
        loadDashboardData(); // Refresh dashboard stats
    }
}

// Save email configuration
function saveEmailConfiguration() {
    const smtpHost = document.getElementById('smtpHost').value;
    const smtpPort = document.getElementById('smtpPort').value;
    const smtpUsername = document.getElementById('smtpUsername').value;
    const smtpPassword = document.getElementById('smtpPassword').value;

    if (!smtpHost || !smtpPort || !smtpUsername) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const systemSettings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    systemSettings.smtpHost = smtpHost;
    systemSettings.smtpPort = smtpPort;
    systemSettings.smtpUsername = smtpUsername;
    if (smtpPassword) {
        systemSettings.smtpPassword = smtpPassword;
    }

    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));

    // Add to audit log
    addAuditLog('Email Configuration Updated', 'System Settings', 'system_admin');

    showNotification('Email configuration saved successfully!', 'success');
}

// Toggle system maintenance
function toggleSystemMaintenance() {
    const maintenanceMode = document.getElementById('systemMaintenanceToggle').checked;
    
    const systemSettings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    systemSettings.maintenanceMode = maintenanceMode;
    systemSettings.maintenanceToggleTime = new Date().toISOString();
    
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));

    // Add to audit log
    const action = maintenanceMode ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled';
    addAuditLog(action, 'System Settings', 'system_admin');

    showNotification(`System maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'}`, 'success');
}

// Add audit log
function addAuditLog(action, target, user) {
    const auditLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
    
    const newLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        user: user,
        action: action,
        target: target,
        ip: '192.168.1.100' // Mock IP for demo
    };
    
    auditLogs.push(newLog);
    localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
}

// Get user role display name
function getUserRoleDisplay(userType) {
    const roleMap = {
        'system_admin': 'System Administrator',
        'barangay_health': 'Barangay Health Personnel',
        'health_worker': 'Health Worker',
        'patient': 'Patient'
    };
    return roleMap[userType] || userType;
}

// Notification function
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
    setTimeout(() => {
        if (notification.parentNode) notification.remove();
    }, 5000);
    document.body.appendChild(notification);
}