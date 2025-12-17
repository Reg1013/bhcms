document.addEventListener('DOMContentLoaded', async () => {
    /* ---------- 1. SESSION CHECK & USER INFO ---------- */
    let user = null;
    try {
        const r = await fetch('api/current_user.php', { credentials: 'include' });
        const d = await r.json();
        if (!d.success || d.user.user_type !== 'patient') {
            location.href = 'index.html';
            return;
        }
        user = d.user;
    } catch (_) {
        location.href = 'index.html';
        return;
    }

    /* ===== WEB NOTIFICATIONS API INTEGRATION ===== */
    
    async function requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.log("This browser does not support notifications");
            return false;
        }
        
        if (Notification.permission === "granted") {
            return true;
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
        
        return false;
    }

    function showBrowserNotification(title, message) {
        if (Notification.permission === "granted") {
            const notification = new Notification(title, {
                body: message,
                tag: 'health-notification'
            });
            
            notification.onclick = function() {
                window.focus();
                notification.close();
            };
            
            return notification;
        }
        return null;
    }

    async function checkForNewNotifications() {
        try {
            const response = await fetch('api/get_notifications.php', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                const unreadNotifications = data.notifications.filter(n => !n.is_read);
                
                document.getElementById('notificationsCount').textContent = data.unread_count;
                
                if (unreadNotifications.length > 0) {
                    unreadNotifications.forEach(notification => {
                        if (Notification.permission === "granted") {
                            showBrowserNotification(notification.title, notification.message);
                        }
                    });
                }
                
                return data.notifications;
            }
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
        return [];
    }

    document.getElementById('userWelcome').textContent = `${user.name} | Patient`;

    /* ---------- 2. GLOBAL HELPERS ---------- */
    const showNotification = (message, type = 'info') => {
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
    };

    function calculateAge(dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age + ' years';
    }
    
function formatDisplayTime(timeString) {
    if (!timeString) {
        return 'Scheduled';
    }
    
    console.log('Formatting time for display:', timeString);
    
    // Handle corrupted times like "00:00:13"
    if (timeString === '00:00:13' || timeString === '00:00:15') {
        console.warn('Detected corrupted time:', timeString);
        // These are actually 13:00 and 15:00 (1:00 PM and 3:00 PM)
        // Extract the seconds which is actually the hour
        const parts = timeString.split(':');
        if (parts.length >= 3) {
            const hourFromSeconds = parseInt(parts[2], 10);
            if (hourFromSeconds >= 0 && hourFromSeconds <= 23) {
                // Convert to 12-hour format
                const ampm = hourFromSeconds >= 12 ? 'PM' : 'AM';
                let displayHour = hourFromSeconds % 12;
                displayHour = displayHour === 0 ? 12 : displayHour;
                return `${displayHour}:00 ${ampm}`;
            }
        }
        return 'Scheduled';
    }
    
    try {
        // Split the time
        const parts = timeString.split(':');
        
        if (parts.length < 2) {
            console.warn('Invalid time format - not enough parts:', timeString);
            return 'Scheduled';
        }
        
        let hour = parseInt(parts[0], 10);
        const minute = parseInt(parts[1], 10);
        
        // Check if values are valid
        if (isNaN(hour) || isNaN(minute)) {
            console.warn('Invalid time values - hour or minute is NaN:', timeString);
            return 'Scheduled';
        }
        
        // Convert to 12-hour format
        const ampm = hour >= 12 ? 'PM' : 'AM';
        
        // Adjust hour for 12-hour format
        if (hour === 0) {
            hour = 12; // 0 becomes 12 AM
        } else if (hour > 12) {
            hour = hour - 12;
        }
      
        const minuteStr = minute.toString().padStart(2, '0');
        
        const result = `${hour}:${minuteStr} ${ampm}`;
        console.log('Formatted result:', result);
        return result;
        
    } catch (error) {
        console.error('Error formatting time:', error, 'for time:', timeString);
        return 'Scheduled';
    }
}

    async function loadChildrenForAppointment() {
        try {
            const response = await fetch('api/get_children.php', { credentials: 'include' });
            const children = await response.json();
            const appointmentForSelect = document.getElementById('appointmentFor');
            
            appointmentForSelect.innerHTML = '<option value="">Select Person</option>';
            
            const patientName = document.getElementById('userWelcome').textContent.split('|')[0].trim();
            const selfOption = document.createElement('option');
            selfOption.value = patientName;
            selfOption.textContent = patientName;
            appointmentForSelect.appendChild(selfOption);
            
            children.forEach(child => {
                const option = document.createElement('option');
                option.value = child.name;
                option.textContent = `My Child - ${child.name}`;
                appointmentForSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Failed to load children for appointment form:', error);
        }
    }

    /* ---------- 3. LOAD INITIAL DATA ---------- */
    await loadDashboardData();
    loadAppointments();
    setupEventListeners();

    /* ---------- 4. DATA LOADING FUNCTIONS ---------- */
    async function loadDashboardData() {
        try {
            const appointmentsResponse = await fetch('api/get_appointments.php', { credentials: 'include' });
            const appointmentsData = await appointmentsResponse.json();
            
            let appointments = [];
            if (Array.isArray(appointmentsData)) {
                appointments = appointmentsData;
            } else if (appointmentsData.appointments && Array.isArray(appointmentsData.appointments)) {
                appointments = appointmentsData.appointments;
            } else if (appointmentsData.success && Array.isArray(appointmentsData.appointments)) {
                appointments = appointmentsData.appointments;
            } else {
                console.warn('Unexpected appointments response format:', appointmentsData);
            }

            const childrenResponse = await fetch('api/get_children.php', { credentials: 'include' });
            const childrenData = await childrenResponse.json();
            
            let children = [];
            if (Array.isArray(childrenData)) {
                children = childrenData;
            } else if (childrenData.children && Array.isArray(childrenData.children)) {
                children = childrenData.children;
            } else if (childrenData.success && Array.isArray(childrenData.children)) {
                children = childrenData.children;
            } else {
                console.warn('Unexpected children response format:', childrenData);
            }

            const notificationsResponse = await fetch('api/get_notifications.php', { 
                credentials: 'include' 
            });
            const notificationsData = await notificationsResponse.json();
            
            let unreadCount = 0;
            if (notificationsData.success) {
                unreadCount = notificationsData.unread_count;
            } else {
                console.warn('Unexpected notifications response format:', notificationsData);
            }

            const upcomingAppointments = appointments.filter(a => a.status === 'Scheduled');
            const completedAppointments = appointments.filter(a => a.status === 'Completed');
            
            document.getElementById('upcomingCount').textContent = upcomingAppointments.length;
            document.getElementById('recordsCount').textContent = completedAppointments.length;
            document.getElementById('childrenCount').textContent = children.length;
            document.getElementById('notificationsCount').textContent = unreadCount;
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            document.getElementById('upcomingCount').textContent = '0';
            document.getElementById('recordsCount').textContent = '0';
            document.getElementById('childrenCount').textContent = '0';
            document.getElementById('notificationsCount').textContent = '0';
        }
    }

async function loadAppointments() {
    try {
        const r = await fetch('api/get_appointments.php', { credentials: 'include' });
        const responseData = await r.json();
        
        console.log('Full appointments response:', responseData); // DEBUG
        
        let appointments = [];
        if (Array.isArray(responseData)) {
            appointments = responseData;
        } else if (responseData.appointments && Array.isArray(responseData.appointments)) {
            appointments = responseData.appointments;
        } else if (responseData.success && Array.isArray(responseData.appointments)) {
            appointments = responseData.appointments;
        } else {
            console.warn('Unexpected appointments response format:', responseData);
            appointments = [];
        }

        const tableBody = document.getElementById('upcomingTableBody');
        tableBody.innerHTML = '';

        console.log('Processed appointments:', appointments); // DEBUG

        const upcomingAppointments = appointments.filter(a => a.status === 'Scheduled');

        if (upcomingAppointments.length > 0) {
            upcomingAppointments.forEach(appt => {
                const row = document.createElement('tr');
                // DEBUG each appointment's time
                console.log('Appointment time raw:', appt.appointment_time || appt.time, 'for', appt.for_whom);
                
                const displayTime = formatDisplayTime(appt.appointment_time || appt.time || '');
                row.innerHTML = `
                    <td>${appt.for_whom || appt.patientName || 'Myself'}</td>
                    <td>${appt.type || appt.procedure || 'Consultation'}</td>
                    <td>${appt.appointment_date || appt.date} ${displayTime}</td>
                    <td><span class="status ${(appt.status || '').toLowerCase()}">${appt.status}</span></td>
                    <td>
                        <button class="btn btn-danger cancel-btn" data-id="${appt.id}">Cancel</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            document.getElementById('noUpcoming').style.display = 'none';
        } else {
            document.getElementById('noUpcoming').style.display = 'block';
        }

        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => cancelAppointment(parseInt(btn.dataset.id)));
        });
    } catch (error) {
        console.error('Error loading appointments:', error);
        showNotification('Failed to load appointments', 'error');
    }
}

async function loadHistory() {
    try {
        const r = await fetch('api/get_appointments.php', { credentials: 'include' });
        const responseData = await r.json();
        
        let appointments = [];
        if (Array.isArray(responseData)) {
            appointments = responseData;
        } else if (responseData.appointments && Array.isArray(responseData.appointments)) {
            appointments = responseData.appointments;
        } else if (responseData.success && Array.isArray(responseData.appointments)) {
            appointments = responseData.appointments;
        } else {
            console.warn('Unexpected appointments response format:', responseData);
            appointments = [];
        }

        const tableBody = document.getElementById('historyTableBody');
        tableBody.innerHTML = '';

        const historyAppointments = appointments.filter(a => a.status !== 'Scheduled');

        if (historyAppointments.length > 0) {
            historyAppointments.forEach(appt => {
                const row = document.createElement('tr');
                const displayTime = formatDisplayTime(appt.appointment_time || appt.time || '');
                const hasNotes = appt.notes && appt.notes.trim().length > 0;
                const statusClass = (appt.status || '').toLowerCase();
                
                row.innerHTML = `
                    <td data-label="Patient">
                        <div class="appointment-cell">
                            <div class="patient-name">
                                <span class="patient-icon">👤</span>
                                <strong>${appt.for_whom || 'Myself'}</strong>
                            </div>
                        </div>
                    </td>
                    <td data-label="Service">
                        <div class="appointment-cell">
                            <span class="service-type">${appt.type || 'Consultation'}</span>
                        </div>
                    </td>
                    <td data-label="Date & Time">
                        <div class="appointment-cell">
                            <div class="datetime">
                                <div class="date">${appt.appointment_date || appt.date}</div>
                                <div class="time">${displayTime}</div>
                            </div>
                        </div>
                    </td>
                    <td data-label="Status">
                        <div class="appointment-cell">
                            <span class="status ${statusClass}">${appt.status}</span>
                        </div>
                    </td>
                    <td data-label="Notes">
                        <div class="appointment-cell">
                            ${hasNotes ? 
                                `<div class="notes-action">
                                    <button class="btn-notes" data-notes="${encodeURIComponent(appt.notes)}">
                                        <span class="notes-icon">📝</span>
                                        View Notes
                                    </button>
                                </div>` : 
                                `<div class="no-notes">
                                    <span class="no-notes-icon">—</span>
                                    <span class="no-notes-text">No notes</span>
                                </div>`}
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            document.getElementById('noHistory').style.display = 'none';
            
            // Add click handlers
            document.querySelectorAll('.btn-notes').forEach(btn => {
                btn.addEventListener('click', function() {
                    const notes = decodeURIComponent(this.getAttribute('data-notes'));
                    showNotesModal(notes);
                });
            });
            
        } else {
            document.getElementById('noHistory').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading appointment history:', error);
        showNotification('Failed to load appointment history', 'error');
    }
}

function showNotesModal(notes) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Appointment Notes</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                <div style="white-space: pre-wrap; line-height: 1.6; background: #f8f9fa; padding: 20px; border-radius: 5px; font-family: 'Courier New', monospace; border-left: 4px solid #007bff;">
                    ${notes}
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary close-modal">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
    async function loadChildren() {
        try {
            const r = await fetch('api/get_children.php', { credentials: 'include' });
            const children = await r.json();
            const tableBody = document.getElementById('childrenTableBody');
            tableBody.innerHTML = '';

            children.forEach(child => {
                const age = calculateAge(child.dob);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${child.name}</td>
                    <td>${child.dob}</td>
                    <td>${child.gender}</td>
                    <td>${age}</td>
                    <td>
                        <button class="btn btn-danger delete-child-btn" data-id="${child.id}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            document.querySelectorAll('.delete-child-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteChild(parseInt(btn.dataset.id)));
            });
        } catch (error) {
            showNotification('Failed to load children', 'error');
        }
    }

    async function loadProfile() {
        try {
            const r = await fetch('api/get_profile.php', { credentials: 'include' });
            const profile = await r.json();
            
            console.log('Profile data received:', profile);
            
            if (profile.success) {
                document.getElementById('profileName').textContent = profile.name || 'Not set';
                document.getElementById('profileUsername').textContent = user.username || 'Not set';
                document.getElementById('profilePhone').textContent = profile.phone || 'Not set';
                document.getElementById('profileAddress').textContent = profile.address || 'Not set';
                document.getElementById('profileDob').textContent = profile.dob || 'Not set';
                document.getElementById('profileGender').textContent = profile.gender || 'Not set';
                document.getElementById('profileBloodType').textContent = profile.blood_type || 'Not set';

                document.getElementById('editName').value = profile.name || '';
                document.getElementById('editPhone').value = profile.phone || '';
                document.getElementById('editAddress').value = profile.address || '';
                document.getElementById('editDob').value = profile.dob || '';
                document.getElementById('editGender').value = profile.gender || '';
                document.getElementById('editBloodType').value = profile.blood_type || '';
                
                console.log('Gender value set to:', profile.gender);
            } else {
                showNotification(profile.message || 'Failed to load profile', 'error');
            }
        } catch (error) {
            console.error('Profile load error:', error);
            showNotification('Network error loading profile', 'error');
        }
    }

async function loadNotifications() {
    try {
        const response = await fetch('api/get_notifications.php', {
            credentials: 'include'
        });
        const data = await response.json();
        
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = '';
        
        if (data.success && data.notifications.length > 0) {
            data.notifications.forEach(notification => {
                const notificationElement = document.createElement('div');
                notificationElement.className = `notification-item ${notification.is_read ? '' : 'unread'}`;
                notificationElement.dataset.notificationId = notification.id;
                
                notificationElement.innerHTML = `
                    <div class="notification-header">
                        <div class="notification-title">
                            <h4>${notification.title}</h4>
                            ${notification.type === 'announcement' ? 
                                '<span class="notification-type-badge announcement">Announcement</span>' : ''}
                        </div>
                        <span class="notification-date">${formatDate(notification.created_at)}</span>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                    <div class="notification-actions">
                        <div>
                            <span class="notification-type ${notification.type}">${notification.type.replace('_', ' ')}</span>
                            ${!notification.is_read ? 
                                `<button class="btn btn-sm mark-read-btn" data-id="${notification.id}">Mark as Read</button>` : 
                                ''}
                        </div>
                        <div class="notification-actions-right">
                            ${notification.type === 'announcement' ? 
                                `<button class="btn btn-sm btn-danger delete-notification-btn" data-id="${notification.id}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>` : 
                                ''}
                        </div>
                    </div>
                `;
                notificationsList.appendChild(notificationElement);
            });
            
            // Add event listeners for mark as read buttons
            document.querySelectorAll('.mark-read-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const notificationId = parseInt(btn.dataset.id);
                    await markNotificationAsRead(notificationId);
                    loadNotifications();
                    loadDashboardData();
                });
            });
            
            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-notification-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const notificationId = parseInt(btn.dataset.id);
                    if (confirm('Are you sure you want to delete this announcement?')) {
                        await deleteNotification(notificationId);
                    }
                });
            });
            
            document.getElementById('noNotifications').style.display = 'none';
        } else {
            document.getElementById('noNotifications').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        showNotification('Failed to load notifications', 'error');
    }
}

// Add this new function for deleting notifications
async function deleteNotification(notificationId) {
    try {
        const response = await fetch('api/delete_notification.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification_id: notificationId })
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification('Announcement deleted successfully', 'success');
            // Remove the notification from the DOM immediately
            const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.style.opacity = '0';
                notificationElement.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    notificationElement.remove();
                }, 300);
            }
            // Update the notifications count
            loadDashboardData();
        } else {
            showNotification(data.message || 'Failed to delete announcement', 'error');
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        showNotification('Error deleting announcement', 'error');
    }
}

    async function markNotificationAsRead(notificationId) {
        try {
            const response = await fetch('api/mark_notification_read.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notification_id: notificationId })
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }

    async function markAllNotificationsAsRead() {
        try {
            const response = await fetch('api/mark_notification_read.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await response.json();
            
            if (data.success) {
                showNotification('All notifications marked as read', 'success');
                loadNotifications();
                loadDashboardData();
            }
        } catch (error) {
            showNotification('Error marking notifications as read', 'error');
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // Function to delete all read notifications
async function deleteAllReadNotifications() {
    if (!confirm('Are you sure you want to delete all read notifications? This action cannot be undone.')) {
        return;
    }
    
    try {
        // First, get all notifications
        const response = await fetch('api/get_notifications.php', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            const readNotifications = data.notifications.filter(n => n.is_read);
            let deletedCount = 0;
            
            // Delete each read notification
            for (const notification of readNotifications) {
                const deleteResponse = await fetch('api/delete_notification.php', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notification_id: notification.id })
                });
                const deleteData = await deleteResponse.json();
                if (deleteData.success) {
                    deletedCount++;
                }
            }
            
            if (deletedCount > 0) {
                showNotification(`Deleted ${deletedCount} read notifications`, 'success');
                loadNotifications();
                loadDashboardData();
            } else {
                showNotification('No read notifications to delete', 'info');
            }
        }
    } catch (error) {
        console.error('Error deleting read notifications:', error);
        showNotification('Error deleting notifications', 'error');
    }
}

    /* ---------- 5. EVENT HANDLERS ---------- */
    function setupEventListeners() {
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const section = link.getAttribute('data-section');
                handleNavigation(section);
            });
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                fetch('api/logout.php', { method: 'POST', credentials: 'include' })
                    .finally(() => {
                        localStorage.clear();
                        window.location.href = 'index.html';
                    });
            }
        });

        document.getElementById('bookAppointmentBtn').addEventListener('click', () => {
            document.getElementById('bookAppointmentModal').style.display = 'flex';
            loadChildrenForAppointment();
        });

        document.getElementById('bookAppointmentBtn2').addEventListener('click', () => {
            document.getElementById('bookAppointmentModal').style.display = 'flex';
            loadChildrenForAppointment();
        });

        document.getElementById('addChildBtn').addEventListener('click', () => {
            document.getElementById('addChildModal').style.display = 'flex';
        });

        document.getElementById('editProfileBtn').addEventListener('click', () => {
            document.getElementById('editProfileModal').style.display = 'flex';
        });

        document.getElementById('markAllReadBtn').addEventListener('click', markAllNotificationsAsRead);
        document.getElementById('deleteAllReadBtn').addEventListener('click', deleteAllReadNotifications);

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });

        document.getElementById('appointmentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            bookAppointment();
        });

        document.getElementById('childForm').addEventListener('submit', (e) => {
            e.preventDefault();
            addChild();
        });

        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            saveProfile();
        });
    }

    function handleNavigation(section) {
        document.querySelectorAll('.dashboard-section, .history-section, .children-section, .profile-section, .notifications-section').forEach(sec => {
            sec.style.display = 'none';
        });

        switch (section) {
            case 'dashboard':
                document.getElementById('dashboardSection').style.display = 'block';
                loadAppointments();
                break;
            case 'appointments':
                document.getElementById('appointmentsSection').style.display = 'block';
                loadHistory();
                break;
            case 'children':
                document.getElementById('childrenSection').style.display = 'block';
                loadChildren();
                break;
            case 'profile':
                document.getElementById('profileSection').style.display = 'block';
                loadProfile();
                break;
            case 'notifications':
                document.getElementById('notificationsSection').style.display = 'block';
                loadNotifications();
                break;
            default:
                document.getElementById('dashboardSection').style.display = 'block';
                break;
        }
    }

    /* ---------- 6. CRUD OPERATIONS ---------- */
async function bookAppointment() {
    try {
        // Get form values
        const forWhom = document.getElementById('appointmentFor').value.trim();
        const type = document.getElementById('appointmentType').value.trim();
        const date = document.getElementById('appointmentDate').value;
        const timeInput = document.getElementById('appointmentTime');
        const timeValue = timeInput.value;
        
        console.log('=== FORM VALUES ===');
        console.log('For Whom:', forWhom);
        console.log('Type:', type);
        console.log('Date:', date);
        console.log('Time Input:', timeInput);
        console.log('Raw time value:', timeValue);
        console.log('Time value length:', timeValue.length);
        console.log('Time value split:', timeValue.split(''));
        
        // Show the actual character codes
        console.log('Character codes:');
        for (let i = 0; i < timeValue.length; i++) {
            console.log(`  [${i}] '${timeValue[i]}' = ${timeValue.charCodeAt(i)}`);
        }
        
        // Validation
        if (!forWhom || !type || !date || !timeValue) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        // Check if it looks like a valid time
        if (!timeValue.includes(':')) {
            console.error('No colon in time:', timeValue);
            showNotification('Please select a valid time', 'error');
            return;
        }
        
        // Force format to HH:MM:SS
        const parts = timeValue.split(':');
        let hour = parseInt(parts[0], 10);
        let minute = parts[1] ? parseInt(parts[1], 10) : 0;
        
        // Validate hour and minute
        if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
            console.error('Invalid hour/minute:', hour, minute);
            showNotification('Please select a valid time between 00:00 and 23:59', 'error');
            return;
        }
        
        // Format to HH:MM:SS
        const formattedTime = 
            hour.toString().padStart(2, '0') + ':' + 
            minute.toString().padStart(2, '0') + ':00';
        
        console.log('Formatted time for DB:', formattedTime);
        
        // Prepare request data
        const requestData = {
            for_whom: forWhom,
            type: type,
            date: date,
            time: formattedTime
        };
        
        console.log('Sending JSON to server:', JSON.stringify(requestData));
        
        // Disable submit button
        const submitBtn = document.querySelector('#appointmentForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Booking...';
        submitBtn.disabled = true;
        
        // Send to server
        const response = await fetch('api/create_appointment.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        console.log('Server response:', result);
        
        if (result.success) {
            showNotification('Appointment booked successfully!', 'success');
            
            // Close modal and reset form
            document.getElementById('bookAppointmentModal').style.display = 'none';
            document.getElementById('appointmentForm').reset();
            
            // Reload data
            setTimeout(() => {
                loadAppointments();
                loadDashboardData();
            }, 500);
        } else {
            showNotification(result.message || 'Failed to book appointment', 'error');
        }
        
    } catch (error) {
        console.error('Error booking appointment:', error);
        showNotification('Error: ' + error.message, 'error');
    } finally {
        // Re-enable submit button
        const submitBtn = document.querySelector('#appointmentForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Book Appointment';
            submitBtn.disabled = false;
        }
    }
}

    async function cancelAppointment(id) {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;

        try {
            const r = await fetch('api/cancel_appointment.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const d = await r.json();
            
            if (d.success) {
                showNotification('Appointment cancelled successfully', 'success');
                loadAppointments();
                loadDashboardData();
            } else {
                showNotification(d.message || 'Cancel failed', 'error');
            }
        } catch (error) {
            showNotification('Network error', 'error');
        }
    }

    async function addChild() {
        const name = document.getElementById('childName').value;
        const dob = document.getElementById('childDob').value;
        const gender = document.getElementById('childGender').value;

        if (!name || !dob || !gender) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        const submitBtn = document.querySelector('#childForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Adding...';
        submitBtn.disabled = true;

        try {
            const r = await fetch('api/add_child.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, dob, gender })
            });
            const d = await r.json();
            
            if (d.success) {
                showNotification('Child added successfully!', 'success');
                document.getElementById('addChildModal').style.display = 'none';
                document.getElementById('childForm').reset();
                loadChildren();
                loadDashboardData();
            } else {
                showNotification(d.message || 'Add failed', 'error');
            }
        } catch (error) {
            showNotification('Network error', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async function deleteChild(id) {
        if (!confirm('Are you sure you want to delete this child record?')) return;

        try {
            const r = await fetch('api/delete_child.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const d = await r.json();
            
            if (d.success) {
                showNotification('Child record deleted successfully', 'success');
                loadChildren();
                loadDashboardData();
            } else {
                showNotification(d.message || 'Delete failed', 'error');
            }
        } catch (error) {
            showNotification('Network error', 'error');
        }
    }

    async function saveProfile() {
        const name = document.getElementById('editName').value;
        const phone = document.getElementById('editPhone').value;
        const address = document.getElementById('editAddress').value;
        const dob = document.getElementById('editDob').value;
        const gender = document.getElementById('editGender').value;
        const bloodType = document.getElementById('editBloodType').value;

        if (!name) {
            showNotification('Name is required', 'error');
            return;
        }

        const submitBtn = document.querySelector('#profileForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const r = await fetch('api/update_profile.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    phone: phone,
                    address: address,
                    dob: dob,
                    gender: gender, 
                    blood_type: bloodType
                })
            });
            const d = await r.json();
            
            if (d.success) {
                showNotification('Profile updated successfully!', 'success');
                document.getElementById('editProfileModal').style.display = 'none';
                
                user.name = name;
                document.getElementById('userWelcome').textContent = `${name} | Patient`;
                loadProfile();
            } else {
                showNotification(d.message || 'Update failed', 'error');
            }
        } catch (error) {
            showNotification('Network error', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
   
    /* ---------- 7. INITIALIZE NOTIFICATION SYSTEM ---------- */
    async function initializeNotifications() {
        await requestNotificationPermission();
        setInterval(checkForNewNotifications, 30000);
        checkForNewNotifications();
    }

    initializeNotifications();
});

window.debugProfileData = async function() {
    console.log('=== DEBUG PROFILE DATA ===');
    try {
        const response = await fetch('api/get_profile.php', { credentials: 'include' });
        const profile = await response.json();
        console.log('Full profile API response:', profile);
        
        if (profile.success) {
            console.log('Gender field in response:', profile.gender);
            console.log('All profile fields:', Object.keys(profile));
        }
    } catch (error) {
        console.error('Debug error:', error);
    }
};
