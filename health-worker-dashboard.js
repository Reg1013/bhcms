document.addEventListener('DOMContentLoaded', async () => {
    let user = null;
    try {
        const r = await fetch('api/current_user.php', { credentials: 'include' });
        if (r.ok) {
            const d = await r.json();
            if (d.success) {
                user = d.user;
                if (!user.id || user.user_type !== 'health_worker') {
                    location.href = 'index.html';
                    return;
                }
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

    // Update UI based on role
    document.getElementById('userWelcome').textContent = `${user.name} | ${user.role}`;
    document.getElementById('sidebarRole').textContent = user.role;

    // Set role-specific content
    setupRoleSpecificContent(user.role);

    // Load dashboard data
    loadDashboardData();

    // Setup event listeners
    setupEventListeners();

    // Initialize navigation - show dashboard by default
    handleNavigation('my dashboard');
});

// Setup role-specific content
function setupRoleSpecificContent(role) {
    const servicesGrid = document.getElementById('servicesGrid');
    const dashboardTitle = document.getElementById('dashboardTitle');
    const servicesTitle = document.getElementById('servicesTitle');
    
    // Define services for each role
    const roleServices = {
        'Doctor': [
            {
                title: 'General Consultation',
                description: 'Comprehensive medical examination and diagnosis',
                icon: '🩺'
            },
            {
                title: 'Emergency Care',
                description: 'Immediate medical attention for urgent conditions',
                icon: '🚑'
            },
            {
                title: 'Chronic Disease Management',
                description: 'Ongoing care for chronic conditions',
                icon: '💊'
            },
            {
                title: 'Health Screening',
                description: 'Preventive health checks and early detection',
                icon: '🔍'
            }
        ],
        'Midwife': [
            {
                title: 'Prenatal Check-up',
                description: 'Regular check-ups for pregnant women',
                icon: '🤰'
            },
            {
                title: 'Family Planning Counseling',
                description: 'Guidance on contraceptive methods',
                icon: '💊'
            },
            {
                title: 'Postnatal Care',
                description: 'Care for mothers and newborns after delivery',
                icon: '👶'
            },
            {
                title: 'Immunization',
                description: 'Vaccination services for children and pregnant women',
                icon: '💉'
            }
        ],
        'Nurse': [
            {
                title: 'Vital Signs Monitoring',
                description: 'Regular checking of blood pressure, temperature, pulse',
                icon: '❤️'
            },
            {
                title: 'Medication Administration',
                description: 'Dispensing and monitoring patient medications',
                icon: '💊'
            },
            {
                title: 'Wound Care & Dressing',
                description: 'Professional wound cleaning and infection prevention',
                icon: '🩹'
            },
            {
                title: 'Patient Education',
                description: 'Health education and counseling for patients',
                icon: '📚'
            }
        ]
    };
    
    // Set titles
    dashboardTitle.textContent = `${role} Dashboard`;
    servicesTitle.textContent = `${role} Services`;
    
    // Load services
    const services = roleServices[role] || [];
    servicesGrid.innerHTML = services.map(service => `
        <div class="service-card">
            <h4>${service.icon} ${service.title}</h4>
            <p>${service.description}</p>
            <button class="btn btn-primary btn-sm view-schedule-btn" data-service="${service.title}">View Schedule</button>
        </div>
    `).join('');
    
    // Remove service filters for cleaner look (as requested)
    const serviceFilters = document.querySelector('.service-filters');
    if (serviceFilters) {
        serviceFilters.style.display = 'none';
    }
    
    // Add specialist filter button to top right if doctor
    if (role === 'Doctor') {
        const sectionHeader = document.querySelector('.services-section .section-header');
        if (sectionHeader) {
            const specialistBtn = document.createElement('button');
            specialistBtn.className = 'btn btn-primary specialist-filter-btn';
            specialistBtn.innerHTML = '🔍 Specialist Services';
            specialistBtn.style.marginLeft = 'auto';
            sectionHeader.appendChild(specialistBtn);
            
            specialistBtn.addEventListener('click', () => {
                showNotification('Showing specialist services filter', 'info');
            });
        }
    }
}

// Load dashboard data
function loadDashboardData() {
    setTimeout(() => {
        // Mock data - replace with API calls in production
        document.getElementById('todayAppointments').textContent = '8';
        document.getElementById('pendingConsultations').textContent = '5';
        document.getElementById('emergencyCases').textContent = '2';
        document.getElementById('totalPatients').textContent = '156';
        
        // Load consultations
        loadConsultations();
    }, 1000);
}

// Load consultations
function loadConsultations() {
    setTimeout(() => {
        // Mock data - replace with API calls in production
        const mockConsultations = [
            {
                patientName: 'Maria Santos',
                serviceType: 'General Consultation',
                time: '09:00 AM',
                priority: 'Medium',
                status: 'Pending'
            },
            {
                patientName: 'Juan Dela Cruz',
                serviceType: 'Emergency Care',
                time: '10:30 AM',
                priority: 'High',
                status: 'In Progress'
            },
            {
                patientName: 'Ana Reyes',
                serviceType: 'Follow-up',
                time: '02:00 PM',
                priority: 'Low',
                status: 'Completed'
            }
        ];
        
        const tableBody = document.getElementById('consultationsTableBody');
        tableBody.innerHTML = mockConsultations.map(consultation => `
            <tr class="${consultation.priority === 'High' ? 'priority-high' : ''}">
                <td>${consultation.patientName}</td>
                <td>${consultation.serviceType}</td>
                <td>${consultation.time}</td>
                <td>${consultation.priority === 'High' ? '🔴 High' : consultation.priority === 'Medium' ? '🟡 Medium' : '🟢 Low'}</td>
                <td><span class="status ${consultation.status.toLowerCase().replace(' ', '-')}">${consultation.status}</span></td>
                <td><button class="btn btn-primary view-consultation-btn" data-patient="${consultation.patientName}">View</button></td>
            </tr>
        `).join('');
    }, 1000);
}

// Set up event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const navText = link.textContent.toLowerCase().trim();
            if (navText !== '🚪 logout') {
                document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                handleNavigation(navText);
            }
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        fetch('api/logout.php', { method: 'POST', credentials: 'include' })
            .finally(() => {
                window.location.href = 'index.html';
            });
    }
});

    // Announcement modal
    document.getElementById('sendAnnouncementBtn').addEventListener('click', () => {
        document.getElementById('announcementModal').style.display = 'flex';
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('announcementModal').style.display = 'none';
        });
    });

    document.getElementById('announcementForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        // Mock send - replace with API call in production
        setTimeout(() => {
            showNotification('Announcement sent successfully!', 'success');
            document.getElementById('announcementModal').style.display = 'none';
            e.target.reset();
            
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 1000);
    });

    // Consultation filters
    document.querySelectorAll('.consultation-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.consultation-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterConsultations(btn.dataset.status);
        });
    });

    // Refresh consultations
    document.getElementById('refreshConsultationsBtn').addEventListener('click', () => {
        // Show loading state
        const refreshBtn = document.getElementById('refreshConsultationsBtn');
        const originalText = refreshBtn.textContent;
        refreshBtn.textContent = 'Refreshing...';
        refreshBtn.disabled = true;
        
        setTimeout(() => {
            loadConsultations();
            showNotification('Consultations refreshed', 'info');
            
            // Reset button
            refreshBtn.textContent = originalText;
            refreshBtn.disabled = false;
        }, 1000);
    });

    // View schedule buttons (dynamically added)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-schedule-btn')) {
            const service = e.target.dataset.service;
            viewServiceSchedule(service);
        }
        
        if (e.target.classList.contains('view-consultation-btn')) {
            const patientName = e.target.dataset.patient;
            viewConsultationDetails(patientName);
        }
        
        if (e.target.classList.contains('specialist-filter-btn')) {
            showSpecialistServices();
        }
    });

    // Close modal when clicking outside
    document.getElementById('announcementModal').addEventListener('click', (e) => {
        if (e.target.id === 'announcementModal') {
            document.getElementById('announcementModal').style.display = 'none';
        }
    });
}

// Filter consultations
function filterConsultations(status) {
    const tableRows = document.querySelectorAll('#consultationsTableBody tr');
    let visibleCount = 0;
    
    tableRows.forEach(row => {
        const statusElement = row.querySelector('.status');
        const rowStatus = statusElement.textContent.toLowerCase().replace(' ', '-');
        let shouldShow = false;
        
        switch(status) {
            case 'all':
                shouldShow = true;
                break;
            case 'pending':
                shouldShow = rowStatus === 'pending';
                break;
            case 'in-progress':
                shouldShow = rowStatus === 'in-progress';
                break;
            case 'completed':
                shouldShow = rowStatus === 'completed';
                break;
            default:
                shouldShow = true;
        }
        
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
    });
    
    showNotification(`Showing ${visibleCount} consultations filtered by: ${status}`, 'info');
}

// Show specialist services (for doctors)
function showSpecialistServices() {
    const specialistServices = [
        {
            title: 'Cardiology Consultation',
            description: 'Heart and cardiovascular system specialist care',
            icon: '❤️'
        },
        {
            title: 'Neurology Assessment',
            description: 'Brain and nervous system specialist evaluation',
            icon: '🧠'
        },
        {
            title: 'Orthopedic Surgery',
            description: 'Bone, joint and muscle surgical procedures',
            icon: '🦴'
        },
        {
            title: 'Pediatric Specialist',
            description: 'Specialized care for children and adolescents',
            icon: '👶'
        }
    ];
    
    const servicesGrid = document.getElementById('servicesGrid');
    servicesGrid.innerHTML = specialistServices.map(service => `
        <div class="service-card">
            <h4>${service.icon} ${service.title}</h4>
            <p>${service.description}</p>
            <button class="btn btn-primary btn-sm view-schedule-btn" data-service="${service.title}">View Schedule</button>
        </div>
    `).join('');
    
    showNotification('Showing specialist services', 'info');
}

// View service schedule
function viewServiceSchedule(serviceName) {
    // Mock schedule data
    const scheduleData = {
        'General Consultation': ['Mon: 9:00 AM - 12:00 PM', 'Wed: 2:00 PM - 5:00 PM', 'Fri: 9:00 AM - 12:00 PM'],
        'Emergency Care': ['24/7 Available'],
        'Chronic Disease Management': ['Tue: 1:00 PM - 4:00 PM', 'Thu: 1:00 PM - 4:00 PM'],
        'Health Screening': ['Mon: 8:00 AM - 11:00 AM', 'Wed: 8:00 AM - 11:00 AM'],
        'Prenatal Check-up': ['Mon: 9:00 AM - 12:00 PM', 'Thu: 9:00 AM - 12:00 PM'],
        'Family Planning Counseling': ['Tue: 10:00 AM - 12:00 PM', 'Fri: 10:00 AM - 12:00 PM'],
        'Postnatal Care': ['Wed: 1:00 PM - 4:00 PM'],
        'Immunization': ['Mon-Fri: 8:00 AM - 3:00 PM'],
        'Vital Signs Monitoring': ['Daily: 8:00 AM - 5:00 PM'],
        'Medication Administration': ['Daily: 8:00 AM - 5:00 PM'],
        'Wound Care & Dressing': ['Mon-Fri: 9:00 AM - 4:00 PM'],
        'Patient Education': ['Tue: 2:00 PM - 4:00 PM', 'Thu: 2:00 PM - 4:00 PM'],
        'Cardiology Consultation': ['Tue: 9:00 AM - 12:00 PM', 'Thu: 9:00 AM - 12:00 PM'],
        'Neurology Assessment': ['Mon: 1:00 PM - 4:00 PM', 'Wed: 1:00 PM - 4:00 PM'],
        'Orthopedic Surgery': ['Fri: 8:00 AM - 2:00 PM'],
        'Pediatric Specialist': ['Mon: 9:00 AM - 12:00 PM', 'Wed: 9:00 AM - 12:00 PM', 'Fri: 9:00 AM - 12:00 PM']
    };
    
    const schedule = scheduleData[serviceName] || ['Schedule not available'];
    const scheduleText = schedule.join('\n• ');
    
    showNotification(`📅 ${serviceName} Schedule:\n• ${scheduleText}`, 'info', 8000);
}

// View consultation details
function viewConsultationDetails(patientName) {
    // Mock consultation details
    const consultationDetails = {
        'Maria Santos': {
            age: '32 years',
            condition: 'Hypertension follow-up',
            notes: 'Blood pressure monitoring required',
            medications: 'Lisinopril 10mg daily'
        },
        'Juan Dela Cruz': {
            age: '45 years',
            condition: 'Chest pain',
            notes: 'Emergency case - requires immediate attention',
            medications: 'Aspirin 81mg, Nitroglycerin as needed'
        },
        'Ana Reyes': {
            age: '28 years',
            condition: 'Diabetes management',
            notes: 'Follow-up on insulin adjustment',
            medications: 'Metformin 500mg twice daily, Insulin glargine'
        }
    };
    
    const details = consultationDetails[patientName] || {
        age: 'Not specified',
        condition: 'Not specified',
        notes: 'No additional notes',
        medications: 'None prescribed'
    };
    
    const detailText = `
Patient: ${patientName}
Age: ${details.age}
Condition: ${details.condition}
Notes: ${details.notes}
Medications: ${details.medications}
    `.trim();
    
    showNotification(`👤 Consultation Details:\n${detailText}`, 'info', 8000);
}

// Handle navigation
function handleNavigation(navItem) {
    // Create section mapping
    const sectionMap = {
        'my dashboard': 'dashboardSection',
        'patients': 'patientsSection',
        'appointments': 'appointmentsSection',
        'services': 'servicesSection',
        'reports': 'reportsSection',
        'settings': 'settingsSection'
    };
    
    // Hide all sections first
    Object.values(sectionMap).forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Show selected section or create it
    const targetSectionId = sectionMap[navItem];
    let targetSection = document.getElementById(targetSectionId);
    
    if (!targetSection) {
        targetSection = createNavigationSection(navItem, targetSectionId);
    }
    
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Update main title based on navigation
    const dashboardTitle = document.getElementById('dashboardTitle');
    if (dashboardTitle && navItem !== 'my dashboard') {
        dashboardTitle.textContent = `${navItem.charAt(0).toUpperCase() + navItem.slice(1)}`;
    }
}

// Create navigation section dynamically
function createNavigationSection(navItem, sectionId) {
    const mainContent = document.querySelector('.main-content');
    
    const section = document.createElement('div');
    section.id = sectionId;
    section.className = 'services-section';
    
    const sectionTitles = {
        'patients': 'Patient Management',
        'appointments': 'Appointment Schedule',
        'services': 'Medical Services',
        'reports': 'Reports & Analytics',
        'settings': 'Settings & Preferences'
    };
    
    const sectionContent = {
        'patients': `
            <div class="section-header">
                <h2>${sectionTitles[navItem]}</h2>
                <button class="btn btn-primary" onclick="showNotification('New patient form opened', 'info')">+ Add Patient</button>
            </div>
            <div class="stats-cards">
                <div class="stat-card">
                    <h3>Active Patients</h3>
                    <div class="number">142</div>
                </div>
                <div class="stat-card">
                    <h3>New This Month</h3>
                    <div class="number">23</div>
                </div>
                <div class="stat-card">
                    <h3>Follow-ups Due</h3>
                    <div class="number">18</div>
                </div>
            </div>
            <p style="margin-top: 20px; color: #666;">Patient records and management interface would be displayed here.</p>
        `,
        'appointments': `
            <div class="section-header">
                <h2>${sectionTitles[navItem]}</h2>
                <button class="btn btn-primary" onclick="showNotification('New appointment scheduling opened', 'info')">+ Schedule Appointment</button>
            </div>
            <div class="stats-cards">
                <div class="stat-card">
                    <h3>Today</h3>
                    <div class="number">8</div>
                </div>
                <div class="stat-card">
                    <h3>This Week</h3>
                    <div class="number">34</div>
                </div>
                <div class="stat-card">
                    <h3>Waiting List</h3>
                    <div class="number">12</div>
                </div>
            </div>
            <p style="margin-top: 20px; color: #666;">Appointment calendar and scheduling interface would be displayed here.</p>
        `,
        'services': `
            <div class="section-header">
                <h2>${sectionTitles[navItem]}</h2>
            </div>
            <p style="margin-bottom: 20px; color: #666;">Service management and configuration interface would be displayed here.</p>
            <div class="services-grid">
                <div class="service-card">
                    <h4>📋 Service Catalog</h4>
                    <p>Manage available medical services and procedures</p>
                    <button class="btn btn-primary btn-sm" onclick="showNotification('Service catalog opened', 'info')">Manage</button>
                </div>
                <div class="service-card">
                    <h4>⏰ Schedule Setup</h4>
                    <p>Configure service schedules and availability</p>
                    <button class="btn btn-primary btn-sm" onclick="showNotification('Schedule setup opened', 'info')">Configure</button>
                </div>
            </div>
        `,
        'reports': `
            <div class="section-header">
                <h2>${sectionTitles[navItem]}</h2>
                <button class="btn btn-primary" onclick="showNotification('Generating report...', 'info')">Generate Report</button>
            </div>
            <div class="stats-cards">
                <div class="stat-card">
                    <h3>Monthly Visits</h3>
                    <div class="number">324</div>
                </div>
                <div class="stat-card">
                    <h3>Success Rate</h3>
                    <div class="number">94%</div>
                </div>
                <div class="stat-card">
                    <h3>Patient Satisfaction</h3>
                    <div class="number">4.8/5</div>
                </div>
            </div>
            <p style="margin-top: 20px; color: #666;">Analytics and reporting dashboard would be displayed here.</p>
        `,
        'settings': `
            <div class="section-header">
                <h2>${sectionTitles[navItem]}</h2>
            </div>
            <div style="display: grid; gap: 15px; max-width: 500px;">
                <div class="setting-item">
                    <h4>👤 Profile Settings</h4>
                    <p>Update your personal information and preferences</p>
                    <button class="btn btn-primary btn-sm" onclick="showNotification('Profile settings opened', 'info')">Edit</button>
                </div>
                <div class="setting-item">
                    <h4>🔔 Notifications</h4>
                    <p>Configure alert and notification preferences</p>
                    <button class="btn btn-primary btn-sm" onclick="showNotification('Notification settings opened', 'info')">Configure</button>
                </div>
                <div class="setting-item">
                    <h4>🔒 Security</h4>
                    <p>Update password and security settings</p>
                    <button class="btn btn-primary btn-sm" onclick="showNotification('Security settings opened', 'info')">Update</button>
                </div>
            </div>
        `
    };
    
    section.innerHTML = sectionContent[navItem] || `
        <div class="section-header">
            <h2>${navItem.charAt(0).toUpperCase() + navItem.slice(1)}</h2>
        </div>
        <p>This is the ${navItem} section. Content would be displayed here.</p>
    `;
    
    mainContent.appendChild(section);
    return section;
}

// Enhanced notification function
function showNotification(message, type = 'info', duration = 5000) {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.whiteSpace = 'pre-line';
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
    
    setTimeout(() => {
        if (notification.parentNode) notification.remove();
    }, duration);
    
    document.body.appendChild(notification);
}

// Add CSS for cleaner design and notifications
if (!document.querySelector('#enhanced-styles')) {
    const style = document.createElement('style');
    style.id = 'enhanced-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: slideIn 0.3s ease;
        }
        
        .notification-info {
            background: #17a2b8;
        }
        
        .notification-success {
            background: #28a745;
        }
        
        .notification-warning {
            background: #ffc107;
            color: #212529;
        }
        
        .notification-error {
            background: #dc3545;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: inherit;
            font-size: 1.2rem;
            cursor: pointer;
            margin-left: 15px;
            opacity: 0.8;
        }
        
        .notification-close:hover {
            opacity: 1;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .priority-high {
            background-color: #fff5f5 !important;
        }
        
        .setting-item {
            background: var(--light);
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid var(--primary);
        }
        
        .setting-item h4 {
            margin-bottom: 8px;
            color: var(--dark);
        }
        
        .setting-item p {
            color: #666;
            margin-bottom: 15px;
            font-size: 0.9rem;
        }
        
        /* Cleaner service section */
        .services-section .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .specialist-filter-btn {
            font-size: 0.9rem;
            padding: 8px 16px;
        }
    `;
    document.head.appendChild(style);
}