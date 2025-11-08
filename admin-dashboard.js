document.addEventListener('DOMContentLoaded', function () {
    // Existing code...

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            try {
                const response = await fetch('api/logout.php', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    // Redirect to login page
                    window.location.href = 'index.html';
                } else {
                    // Still redirect even if server error (session might be invalid)
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Logout error:', error);
                // Force redirect anyway
                window.location.href = 'index.html';
            }
        });
    }

    // Remove admin management event listener (if it exists)
    const adminBtn = document.getElementById('adminManagementBtn');
    if (adminBtn) {
        adminBtn.remove(); // Optional: remove from DOM if accidentally left
    }
});
// Updated loadUserManagementData function
async function loadUserManagementData() {
    try {
        const response = await fetch('api/get_users.php', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        const users = await response.json();
        const tableBody = document.getElementById('userTableBody');
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            // Map database roles to display names
            const roleMap = {
                'system_admin': 'System Administrator',
                'bhw': 'Barangay Health Personnel',
                'health_worker': 'Health Worker',
                'patient': 'Patient'
            };
            
            const displayRole = roleMap[user.role] || user.role;
            
            row.innerHTML = `
                <td>${user.name || 'N/A'}</td>
                <td>${user.username}</td>
                <td>${displayRole}</td>
                <td><span class="status-indicator ${user.status === 'Active' ? 'online' : 'offline'}">${user.status}</span></td>
                <td>
                    <button class="action-btn edit-user" data-id="${user.id}">Edit</button>
                    <button class="action-btn delete delete-user" data-id="${user.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.id;
                showNotification(`Edit user ${userId} - Feature coming soon`, 'info');
            });
        });

        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this user?')) {
                    deleteUser(userId);
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

// Updated loadAuditLogs function
async function loadAuditLogs() {
    try {
        const response = await fetch('api/get_audit_logs.php', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch audit logs');
        }
        
        const logs = await response.json();
        const auditTableBody = document.getElementById('auditTableBody');
        auditTableBody.innerHTML = '';
        
        logs.forEach(log => {
            const row = document.createElement('tr');
            const timestamp = new Date(log.timestamp).toLocaleString();
            
            row.innerHTML = `
                <td>${timestamp}</td>
                <td>${log.username}</td>
                <td>${log.action}</td>
                <td>${log.target || 'N/A'}</td>
                <td>${log.ip_address}</td>
            `;
            auditTableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading audit logs:', error);
        showNotification('Error loading audit logs', 'error');
    }
}

// Delete user function
async function deleteUser(userId) {
    try {
        const response = await fetch('api/delete_user.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: userId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('User deleted successfully', 'success');
            loadUserManagementData();
        } else {
            showNotification('Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}