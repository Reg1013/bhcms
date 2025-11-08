/* --------------------------------------------------------------
   patient-dashboard.js  –  Patient Dashboard (session + DB)
   -------------------------------------------------------------- */
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
        user = d.user;                     // {id, username, name, role, user_type}
    } catch (_) {
        location.href = 'index.html';
        return;
    }

    // Welcome line
    document.getElementById('userWelcome').textContent = `${user.name} | ${user.role}`;

    /* ---------- 2. GLOBAL HELPERS ---------- */
    const show = (msg, type = 'info') => {
        const old = document.querySelector('.notification');
        if (old) old.remove();

        const n = document.createElement('div');
        n.className = `notification notification-${type}`;
        n.innerHTML = `<span>${msg}</span><button class="notification-close">×</button>`;
        n.querySelector('.notification-close').onclick = () => n.remove();
        setTimeout(() => n.remove(), 5000);
        document.body.appendChild(n);
    };

    /* ---------- 3. LOAD DATA ---------- */
    await Promise.all([
        loadProfile(),
        loadAppointments(),
        loadChildren(),
        loadNotifications()
    ]);

    /* ---------- 4. EVENT LISTENERS ---------- */
    setupEventListeners();

    /* -----------------------------------------------------------------
       4.1  Profile (edit modal)
       ----------------------------------------------------------------- */
    async function loadProfile() {
        try {
            const r = await fetch('api/get_profile.php', { credentials: 'include' });
            const p = await r.json();
            if (p.success) {
                document.getElementById('editName').value      = p.name || '';
                document.getElementById('editEmail').value     = p.email || '';
                document.getElementById('editPhone').value     = p.phone || '';
                document.getElementById('editAddress').value  = p.address || '';
                document.getElementById('editDob').value       = p.dob || '';
                document.getElementById('editBloodType').value = p.blood_type || '';
            }
        } catch (_) { /* ignore – fields stay empty */ }
    }

    document.getElementById('profileForm').addEventListener('submit', async e => {
        e.preventDefault();
        const payload = {
            name:       document.getElementById('editName').value.trim(),
            email:      document.getElementById('editEmail').value.trim(),
            phone:      document.getElementById('editPhone').value.trim(),
            address:    document.getElementById('editAddress').value.trim(),
            dob:        document.getElementById('editDob').value,
            blood_type: document.getElementById('editBloodType').value
        };
        if (!payload.name) return show('Name is required', 'error');

        const btn = e.submitter;
        const txt = btn.textContent;
        btn.disabled = true; btn.textContent = 'Saving…';

        try {
            const r = await fetch('api/update_profile.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const d = await r.json();
            if (d.success) {
                show('Profile updated', 'success');
                document.getElementById('editProfileModal').style.display = 'none';
                // refresh welcome name
                user.name = payload.name;
                document.getElementById('userWelcome').textContent = `${user.name} | ${user.role}`;
            } else show(d.message || 'Update failed', 'error');
        } catch (_) { show('Network error', 'error'); }
        finally { btn.disabled = false; btn.textContent = txt; }
    });

    /* -----------------------------------------------------------------
       4.2  Children (add / list / delete)
       ----------------------------------------------------------------- */
    async function loadChildren() {
        try {
            const r = await fetch('api/get_children.php', { credentials: 'include' });
            const list = await r.json();
            const tbody = document.getElementById('childrenTableBody');
            tbody.innerHTML = '';
            list.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${c.name}</td>
                    <td>${c.dob}</td>
                    <td>${c.gender}</td>
                    <td><button class="btn btn-danger btn-sm delete-child-btn" data-id="${c.id}">Delete</button></td>`;
                tbody.appendChild(tr);
            });
        } catch (_) { show('Failed to load children', 'error'); }
    }

    // Add child modal
    document.getElementById('addChildBtn').addEventListener('click', () => {
        document.getElementById('addChildModal').style.display = 'flex';
    });
    document.getElementById('childForm').addEventListener('submit', async e => {
        e.preventDefault();
        const payload = {
            name:   document.getElementById('childName').value.trim(),
            dob:    document.getElementById('childDob').value,
            gender: document.getElementById('childGender').value
        };
        if (!payload.name || !payload.dob) return show('Fill required fields', 'error');

        const btn = e.submitter;
        const txt = btn.textContent;
        btn.disabled = true; btn.textContent = 'Adding…';

        try {
            const r = await fetch('api/add_child.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const d = await r.json();
            if (d.success) {
                show('Child added', 'success');
                document.getElementById('addChildModal').style.display = 'none';
                e.target.reset();
                loadChildren();
            } else show(d.message || 'Add failed', 'error');
        } catch (_) { show('Network error', 'error'); }
        finally { btn.disabled = false; btn.textContent = txt; }
    });

    // Delete child (event delegation)
    document.getElementById('childrenTableBody').addEventListener('click', async e => {
        const btn = e.target.closest('.delete-child-btn');
        if (!btn) return;
        const id = btn.dataset.id;
        if (!confirm('Delete this child record?')) return;

        try {
            const r = await fetch('api/delete_child.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const d = await r.json();
            if (d.success) {
                show('Child removed', 'success');
                loadChildren();
            } else show(d.message || 'Delete failed', 'error');
        } catch (_) { show('Network error', 'error'); }
    });

    /* -----------------------------------------------------------------
       4.3  Appointments (list / create / cancel)
       ----------------------------------------------------------------- */
    async function loadAppointments() {
        try {
            const r = await fetch('api/get_appointments.php', { credentials: 'include' });
            const list = await r.json();
            const tbody = document.getElementById('appointmentsTableBody');
            tbody.innerHTML = '';
            list.forEach(a => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${a.for_whom}</td>
                    <td>${a.type}</td>
                    <td>${a.appointment_date}</td>
                    <td>${a.appointment_time}</td>
                    <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
                    <td>
                        ${a.status === 'Scheduled' ?
                          `<button class="btn btn-danger btn-sm cancel-apt-btn" data-id="${a.id}">Cancel</button>` :
                          ''
                        }
                    </td>`;
                tbody.appendChild(tr);
            });
        } catch (_) { show('Failed to load appointments', 'error'); }
    }

    // Create appointment modal
    document.getElementById('createAppointmentBtn').addEventListener('click', () => {
        document.getElementById('appointmentModal').style.display = 'flex';
    });
    document.getElementById('appointmentForm').addEventListener('submit', async e => {
        e.preventDefault();
        const payload = {
            for_whom: document.getElementById('aptForWhom').value.trim(),
            type:     document.getElementById('aptType').value,
            date:     document.getElementById('aptDate').value,
            time:     document.getElementById('aptTime').value
        };
        if (!payload.for_whom || !payload.type || !payload.date || !payload.time) {
            return show('All fields required', 'error');
        }

        const btn = e.submitter;
        const txt = btn.textContent;
        btn.disabled = true; btn.textContent = 'Booking…';

        try {
            const r = await fetch('api/create_appointment.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const d = await r.json();
            if (d.success) {
                show('Appointment booked', 'success');
                document.getElementById('appointmentModal').style.display = 'none';
                e.target.reset();
                loadAppointments();
            } else show(d.message || 'Booking failed', 'error');
        } catch (_) { show('Network error', 'error'); }
        finally { btn.disabled = false; btn.textContent = txt; }
    });

    // Cancel appointment (delegated)
    document.getElementById('appointmentsTableBody').addEventListener('click', async e => {
        const btn = e.target.closest('.cancel-apt-btn');
        if (!btn) return;
        const id = btn.dataset.id;
        if (!confirm('Cancel this appointment?')) return;

        try {
            const r = await fetch('api/cancel_appointment.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const d = await r.json();
            if (d.success) {
                show('Appointment cancelled', 'success');
                loadAppointments();
            } else show(d.message || 'Cancel failed', 'error');
        } catch (_) { show('Network error', 'error'); }
    });

    /* -----------------------------------------------------------------
       4.4  Announcements (send)
       ----------------------------------------------------------------- */
    document.getElementById('sendAnnouncementBtn').addEventListener('click', () => {
        document.getElementById('announcementModal').style.display = 'flex';
    });
    document.getElementById('announcementForm').addEventListener('submit', async e => {
        e.preventDefault();
        const payload = {
            recipient_type: document.getElementById('recipientType').value,
            message:        document.getElementById('announcementMessage').value.trim()
        };
        if (!payload.message) return show('Message required', 'error');

        const btn = e.submitter;
        const txt = btn.textContent;
        btn.disabled = true; btn.textContent = 'Sending…';

        try {
            const r = await fetch('api/create_announcement.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const d = await r.json();
            if (d.success) {
                show('Announcement sent', 'success');
                document.getElementById('announcementModal').style.display = 'none';
                e.target.reset();
            } else show(d.message || 'Send failed', 'error');
        } catch (_) { show('Network error', 'error'); }
        finally { btn.disabled = false; btn.textContent = txt; }
    });

    /* -----------------------------------------------------------------
       4.5  Notifications (list – from DB)
       ----------------------------------------------------------------- */
    async function loadNotifications() {
        try {
            const r = await fetch('api/get_announcements.php', { credentials: 'include' });
            const list = await r.json();
            const container = document.getElementById('notificationsList');
            container.innerHTML = '';
            list.forEach(n => {
                const div = document.createElement('div');
                div.className = `notification-item ${n.read ? '' : 'unread'}`;
                div.innerHTML = `
                    <div class="notification-header">
                        <h4>${n.title || 'Announcement'}</h4>
                        <span class="notification-date">${n.date} ${n.time}</span>
                    </div>
                    <p class="notification-message">${n.message}</p>
                    <div class="notification-actions">
                        <span class="notification-type ${n.type}">${n.type}</span>
                        ${!n.read ? `<button class="btn btn-sm mark-read-btn" data-id="${n.id}">Mark Read</button>` : ''}
                    </div>`;
                container.appendChild(div);
            });
        } catch (_) { show('Failed to load notifications', 'error'); }
    }

    // Mark-read delegation
    document.getElementById('notificationsList').addEventListener('click', async e => {
        const btn = e.target.closest('.mark-read-btn');
        if (!btn) return;
        const id = btn.dataset.id;
        try {
            const r = await fetch('api/mark_announcement_read.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const d = await r.json();
            if (d.success) loadNotifications();
        } catch (_) { /* ignore */ }
    });

    /* -----------------------------------------------------------------
       4.6  Logout
       ----------------------------------------------------------------- */
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (!confirm('Logout?')) return;
        fetch('api/logout.php', { method: 'POST', credentials: 'include' })
            .finally(() => location.href = 'index.html');
    });

    /* -----------------------------------------------------------------
       4.7  Modal close buttons (generic)
       ----------------------------------------------------------------- */
    document.querySelectorAll('.close-modal').forEach(b => {
        b.addEventListener('click', () => {
            const modal = b.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    /* -----------------------------------------------------------------
       4.8  Navigation (sidebar)
       ----------------------------------------------------------------- */
    function handleNavigation(section) {
        // simple hide/show – you can expand later
        document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
        const target = document.querySelector(`.${section.replace(' ', '-').toLowerCase()}-section`);
        if (target) target.style.display = 'block';
    }
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const txt = a.textContent.trim().toLowerCase().replace(/[^a-z ]/g, '');
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            a.classList.add('active');
            handleNavigation(txt);
        });
    });
});

// Fixed logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        fetch('api/logout.php', { method: 'POST', credentials: 'include' })
            .finally(() => {
                localStorage.clear(); // Optional: clears mock data too
                window.location.href = 'index.html';
            });
    }
});