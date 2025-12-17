// Global variables
let currentConsultations = [];
let currentServices = [];
let currentPatients = [];
let currentAppointments = [];
let currentUser = null;

// ===== ERROR CHECKING =====
console.log('=== HEALTH WORKER DASHBOARD LOADING ===');

// Check if essential elements exist
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking essential elements...');
    
    const essentialElements = [
        'dashboardTitle',
        'userWelcome', 
        'sidebarRole',
        'appointmentsList',
        'patientsGrid'
    ];
    
    essentialElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        console.log(`${elementId}:`, element ? 'FOUND' : 'MISSING');
    });
});

document.addEventListener('DOMContentLoaded', async function() {
    let user = null;
    try {
        const r = await fetch('api/current_user.php', { credentials: 'include' });
        if (r.ok) {
            const d = await r.json();
            if (d.success && d.user) {
                user = d.user;
                currentUser = user;
               
                const isHealthWorker = (user.user_type === 'health_worker') || (user.db_role === 'health_worker');
                
                if (!user.id || !isHealthWorker) {
                    console.log('User not authorized for health worker dashboard:', user);
                    location.href = 'index.html';
                    return;
                }
                
                console.log('Health worker user loaded:', user);
            } else {
                console.log('No valid user session');
                location.href = 'index.html';
                return;
            }
        } else {
            console.log('Failed to fetch user data');
            location.href = 'index.html';
            return;
        }
    } catch (e) {
        console.error('Error loading user:', e);
        location.href = 'index.html';
        return;
    }

    initializeDashboard(user);
});

function detectUserRole(user) {
    console.log('🔍 Detecting role for user:', user);
    
    // Check if user has specialty directly
    if (user.specialty) {
        const specialty = user.specialty.toLowerCase();
        console.log('Specialty from user object:', specialty);
        
        if (specialty.includes('doctor')) {
            console.log('✅ Detected: Doctor');
            return 'Doctor';
        } else if (specialty.includes('nurse')) {
            console.log('✅ Detected: Nurse');
            return 'Nurse';
        } else if (specialty.includes('midwife')) {
            console.log('✅ Detected: Midwife');
            return 'Midwife';
        }
    }
    
    // Check healthWorkerProfile
    if (user.healthWorkerProfile && user.healthWorkerProfile.specialty) {
        const specialty = user.healthWorkerProfile.specialty.toLowerCase();
        console.log('Health worker profile specialty:', specialty);
        
        if (specialty.includes('doctor')) return 'Doctor';
        if (specialty.includes('nurse')) return 'Nurse';
        if (specialty.includes('midwife')) return 'Midwife';
    }
    
    // Check user_type as fallback
    if (user.user_type) {
        const userType = user.user_type.toLowerCase();
        console.log('User type:', userType);
        
        if (userType.includes('doctor')) return 'Doctor';
        if (userType.includes('nurse')) return 'Nurse';
        if (userType.includes('midwife')) return 'Midwife';
    }
    
    console.log('⚠️ Could not detect specific role, defaulting to "Doctor" for dashboard');
    return 'Doctor'; 
}

// Function to set role-specific theme
function setRoleTheme(role) {
    console.log('🎨 Setting theme for role:', role);
   
    document.body.classList.remove('doctor-theme', 'nurse-theme', 'midwife-theme');
    
    document.body.classList.add(role.toLowerCase() + '-theme');
    
    console.log('🎨 Current body classes:', document.body.className);
}

// UNIFIED FUNCTION TO UPDATE ALL TITLES
function updateAllTitles(role) {
    const roleConfig = {
        'Doctor': {
            dashboard: 'Doctor Dashboard',
            patients: 'Patient Management',
            appointments: 'Appointment Schedule',
            settings: 'Settings',
            services: 'Medical Services',
            consultations: "Today's Consultations",
            sidebar: 'Doctor'
        },
        'Nurse': {
            dashboard: 'Nurse Dashboard',
            patients: 'Patient Management',
            appointments: 'Appointment Schedule',
            settings: 'Settings',
            services: 'Nursing Services',
            consultations: "Today's Patient Rounds",
            sidebar: 'Nurse'
        },
        'Midwife': {
            dashboard: 'Midwife Dashboard',
            patients: 'Patient Management',
            appointments: 'Appointment Schedule',
            settings: 'Settings',
            services: 'Midwifery Services',
            consultations: "Today's Appointments",
            sidebar: 'Midwife'
        }
    };

    const config = roleConfig[role] || roleConfig['Nurse'];
 
    window.dynamicPageTitles = {
        dashboard: config.dashboard,
        patients: config.patients,
        appointments: config.appointments,
        settings: config.settings
    };

    // dashboard title
    document.getElementById('dashboardTitle').textContent = config.dashboard;
    document.getElementById('sidebarRole').textContent = config.sidebar;
    document.getElementById('servicesTitle').textContent = config.services;
    document.getElementById('consultationsTitle').textContent = config.consultations;
    
    // form labels for settings
    const nameLabel = document.querySelector('label[for="healthWorkerName"]');
    const licenseLabel = document.querySelector('label[for="healthWorkerLicense"]');
    const specializationLabel = document.querySelector('label[for="healthWorkerSpecialization"]');
    
    if (role.toLowerCase() === 'doctor') {
        nameLabel.textContent = 'Doctor Name';
        licenseLabel.textContent = 'Medical License';
        specializationLabel.textContent = 'Medical Specialty';
    } else if (role.toLowerCase() === 'midwife') {
        nameLabel.textContent = 'Midwife Name';
        licenseLabel.textContent = 'Midwifery License';
        specializationLabel.textContent = 'Midwifery Specialty';
    } else {
        nameLabel.textContent = 'Nurse Name';
        licenseLabel.textContent = 'Nursing License';
        specializationLabel.textContent = 'Nursing Specialty';
    }
}

// Update service filters based on role
function updateServiceFilters(role) {
    const serviceFilters = document.querySelector('.service-filters');
    
    const filterConfigs = {
        'Doctor': [
            { filter: 'all', label: 'All Services' },
            { filter: 'consultation', label: 'Consultation' },
            { filter: 'emergency', label: 'Emergency' },
            { filter: 'care', label: 'Disease Management' },
            { filter: 'screening', label: 'Screening' }
        ],
        'Nurse': [
            { filter: 'all', label: 'All Services' },
            { filter: 'vitals', label: 'Vital Signs' },
           { filter: 'diagnostic', label: 'Diagnostic Tests' },
            { filter: 'care', label: 'Wound Care' },
            { filter: 'education', label: 'Patient Education' }
        ],
        'Midwife': [
            { filter: 'all', label: 'All Services' },
            { filter: 'prenatal', label: 'Prenatal Care' },
            { filter: 'counseling', label: 'Family Planning' },
            { filter: 'postnatal', label: 'Postnatal Care' },
            { filter: 'immunization', label: 'Immunization' }
        ]
    };

    const filters = filterConfigs[role] || filterConfigs['Nurse'];
    serviceFilters.innerHTML = '';

    filters.forEach((filterConfig, index) => {
        const button = document.createElement('button');
        button.className = `filter-btn ${index === 0 ? 'active' : ''}`;
        button.dataset.filter = filterConfig.filter;
        button.textContent = filterConfig.label;
        serviceFilters.appendChild(button);
    });
}

async function loadStats() {
    try {
        console.log('📊 Loading dashboard statistics...');
        
        const response = await fetch('api/health_worker_stats.php', { 
            credentials: 'include' 
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('❌ Response is not JSON');
            const text = await response.text();
            console.error('Response text:', text.substring(0, 200));
            setDefaultStats();
            return;
        }
        
        const data = await response.json();
        console.log('📈 Stats API response:', data);
        
        if (data.success) {
            displayRoleSpecificStats(data);
            console.log('✅ Stats updated successfully');
        } else {
            console.error('❌ Stats API returned error:', data.message);
            setDefaultStats();
        }
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        setDefaultStats();
    }
}

function displayRoleSpecificStats(data) {
    console.log('🎯 Displaying stats:', data);
    
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length === 0) {
        console.error('❌ No stat cards found!');
        return;
    }
    
    // Define what data to show based on role
    const statsConfig = {
        'Doctor': [
            { label: "Today's Patients", value: data.todayPatients || 0 },
            { label: "Consultations", value: data.consultations || 0 },
            { label: "Emergency Cases", value: data.emergencyCases || 0 },
            { label: "Pending Tasks", value: data.pendingTasks || 0 }
        ],
        'Nurse': [
            { label: "Today's Patients", value: data.todayPatients || 0 },
            { label: "Vitals Recorded", value: data.vitalsRecorded || 0 },
            { label: "Procedures", value: data.procedures || 0 },
            { label: "Pending Tasks", value: data.pendingTasks || 0 }
        ],
        'Midwife': [
            { label: "Today's Patients", value: data.todayPatients || 0 },
            { label: "Prenatal Checks", value: data.prenatalChecks || 0 },
            { label: "Postnatal Care", value: data.postnatalCare || 0 },
            { label: "Family Planning", value: data.familyPlanning || 0 }
        ]
    };

    const userRole = data.userRole || 'Health Worker';
    const config = statsConfig[userRole] || statsConfig['Nurse'];

    config.forEach((statConfig, index) => {
        if (statCards[index]) {
            const numberElement = statCards[index].querySelector('.number');
            const labelElement = statCards[index].querySelector('h3');
            
            if (numberElement) {
                numberElement.textContent = statConfig.value;
            }
            if (labelElement) {
                labelElement.textContent = statConfig.label;
            }
        }
    });
    
    console.log('📊 Displayed stats for:', userRole);
}

// Fallback function
function setDefaultStats(userRole) {
    console.log('🔄 Using fallback stats for role:', userRole);
    
    const fallbackConfig = {
        'Doctor': [
            { label: "Today's Patients", value: currentConsultations.length },
            { label: "Consultations", value: currentConsultations.length },
            { label: "Emergency Cases", value: 0 },
            { label: "Pending Tasks", value: currentConsultations.filter(c => c.status === 'pending' || c.status === 'in-progress').length }
        ],
        'Nurse': [
            { label: "Today's Patients", value: currentConsultations.length },
            { label: "Vitals Recorded", value: 0 },
            { label: "Procedures", value: currentConsultations.length },
            { label: "Pending Tasks", value: currentConsultations.filter(c => c.status === 'pending' || c.status === 'in-progress').length }
        ],
        'Midwife': [
            { label: "Today's Patients", value: currentConsultations.length },
            { label: "Prenatal Checks", value: currentConsultations.filter(c => c.serviceType && c.serviceType.toLowerCase().includes('prenatal')).length },
            { label: "Postnatal Care", value: currentConsultations.filter(c => c.serviceType && c.serviceType.toLowerCase().includes('postnatal')).length },
            { label: "Family Planning", value: currentConsultations.filter(c => c.serviceType && (c.serviceType.toLowerCase().includes('family') || c.serviceType.toLowerCase().includes('planning'))).length }
        ]
    };

    const config = fallbackConfig[userRole] || fallbackConfig['Nurse'];
    
    const statCards = document.querySelectorAll('.stat-card');
    
    config.forEach((statConfig, index) => {
        if (statCards[index]) {
            const numberElement = statCards[index].querySelector('.number');
            const labelElement = statCards[index].querySelector('h3');
            
            if (numberElement) {
                numberElement.textContent = statConfig.value;
            }
            if (labelElement) {
                labelElement.textContent = statConfig.label;
            }
        }
    });
    
    console.log('📊 Fallback stats set for:', userRole);
}

function startStatsAutoRefresh() {
    setInterval(() => {
       
        if (document.getElementById('dashboard-page').classList.contains('active')) {
            console.log('🔄 Auto-refreshing dashboard stats...');
            loadStats();
            loadConsultations(); 
        }
    }, 300000); 
    
    console.log('✅ Stats auto-refresh started (every 5 minutes)');
}

// Initialize dashboard data
async function initializeDashboard(user) {
    console.log('=== DASHBOARD INITIALIZATION STARTED ===');

    try {

        await loadUserSettings(user);
        
        const userRole = detectUserRole(currentUser || user);
        console.log('🎯 Final detected role:', userRole);
        
        setRoleTheme(userRole);
        
        document.getElementById('userWelcome').textContent = `Welcome, ${user.name} | ${userRole}`;
        document.getElementById('sidebarRole').textContent = userRole;

        updateAllTitles(userRole);
        updateServiceFilters(userRole);

        document.querySelectorAll('.page-section').forEach(section => {
            if (section.id !== 'dashboard-page') {
                section.classList.remove('active');
            }
        });
        
        document.getElementById('dashboard-page').classList.add('active');

        await loadStats();
        
        loadServices(userRole);
        loadConsultations();
        loadPatients();
        loadAppointments();

        setupEventListeners();
        startStatsAutoRefresh();
        
        console.log('=== DASHBOARD INITIALIZATION COMPLETED ===');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

async function loadUserSettings(user) {
    try {
        const response = await fetch('api/get_health_worker_profile.php', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Health worker profile response:', data);
            
            if (data.success) {
                const healthWorker = data.healthWorker;
                
                // Update currentUser with health worker profile
                if (currentUser) {
                    currentUser.healthWorkerProfile = healthWorker;
                    currentUser.specialty = healthWorker.specialty;
                    console.log('✅ Set user specialty to:', healthWorker.specialty);
                }
                
                // Fill form fields
                document.getElementById('healthWorkerName').value = healthWorker.name || user.name || '';
                document.getElementById('healthWorkerEmail').value = healthWorker.email || user.email || `${user.username}@healthcenter.com`;
                document.getElementById('healthWorkerLicense').value = healthWorker.license_number || 'Not specified';
                document.getElementById('healthWorkerPhone').value = healthWorker.phone || 'Not specified';
                document.getElementById('healthWorkerShift').value = healthWorker.shift || 'morning';
                document.getElementById('healthWorkerSpecialization').value = healthWorker.specialty || 'General';
                return;
            }
        }
    } catch (error) {
        console.error('Failed to load health worker profile:', error);
    }

    // Fallback
    document.getElementById('healthWorkerName').value = user.name || '';
    document.getElementById('healthWorkerEmail').value = user.email || `${user.username}@healthcenter.com`;
    document.getElementById('healthWorkerLicense').value = user.license_number || 'Not specified';
    document.getElementById('healthWorkerPhone').value = user.phone || 'Not specified';
    document.getElementById('healthWorkerShift').value = user.shift || 'morning';
    document.getElementById('healthWorkerSpecialization').value = user.specialty || 'General';
}

function setupAnnouncementRecipient() {
    console.log("🔧 Setting up announcement recipient functionality...");
    
    const recipientType = document.getElementById('recipientType');
    const patientSearchSection = document.getElementById('patientSearchSection');
    const patientSearch = document.getElementById('patientSearch');
    const patientSearchResults = document.getElementById('patientSearchResults');
    
    if (!recipientType || !patientSearchSection) {
        console.error("❌ Required elements not found!");
        return;
    }
    
    console.log("✅ All elements found, setting up event listeners...");
 
    function togglePatientSearch() {
        const showSearch = recipientType.value === 'specific_patient';
        console.log("Toggling patient search:", showSearch);
        
        patientSearchSection.style.display = showSearch ? 'block' : 'none';
        
        if (!showSearch) {
            patientSearchResults.style.display = 'none';
            document.getElementById('selectedPatientId').value = '';
            patientSearch.value = '';
        } else {
            patientSearch.focus();
        }
    }
    
    recipientType.addEventListener('change', togglePatientSearch);

    recipientType.addEventListener('click', function() {
        console.log("Recipient type clicked, current value:", this.value);
    });

    let searchTimeout;
    patientSearch.addEventListener('input', function() {
        console.log("Patient search input:", this.value);
        clearTimeout(searchTimeout);
        const searchTerm = this.value.trim();
        
        if (searchTerm.length < 2) {
            patientSearchResults.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchPatients(searchTerm);
        }, 300);
    });
   
    document.addEventListener('click', function(e) {
        if (!patientSearchSection.contains(e.target)) {
            patientSearchResults.style.display = 'none';
        }
    });
    
    togglePatientSearch();
    
    console.log("✅ Announcement recipient setup complete - current value:", recipientType.value);
}

async function searchPatients(searchTerm) {
    try {
        console.log("🔍 Searching patients with term:", searchTerm);
        
        const response = await fetch(`api/search_patients.php?q=${encodeURIComponent(searchTerm)}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("📋 Search results:", data);
        
        const patientSearchResults = document.getElementById('patientSearchResults');
        
        if (data.success && data.patients && data.patients.length > 0) {
            patientSearchResults.innerHTML = '';
            patientSearchResults.style.display = 'block';
            
            data.patients.forEach(patient => {
                const patientItem = document.createElement('div');
                patientItem.className = 'patient-search-item';
                patientItem.style.padding = '10px';
                patientItem.style.borderBottom = '1px solid #eee';
                patientItem.style.cursor = 'pointer';
                patientItem.style.transition = 'background-color 0.2s';
                patientItem.innerHTML = `
                    <strong>${patient.name || 'Unknown Patient'}</strong>
                    <br>
                    <small>${patient.email || 'No email'} | ${patient.phone || 'No phone'}</small>
                `;
                
                patientItem.addEventListener('click', () => {
                    console.log("✅ Patient selected:", patient);
                    selectPatient(patient.id, patient.name);
                });
                
                patientItem.addEventListener('mouseenter', () => {
                    patientItem.style.backgroundColor = '#f5f5f5';
                });
                
                patientItem.addEventListener('mouseleave', () => {
                    patientItem.style.backgroundColor = 'white';
                });
                
                patientSearchResults.appendChild(patientItem);
            });
        } else {
            patientSearchResults.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">No patients found</div>';
            patientSearchResults.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Error searching patients:', error);
        const patientSearchResults = document.getElementById('patientSearchResults');
        patientSearchResults.innerHTML = '<div style="padding: 10px; color: #dc3545; text-align: center;">Error searching patients</div>';
        patientSearchResults.style.display = 'block';
    }
}

function selectPatient(patientId, patientName) {
    document.getElementById('selectedPatientId').value = patientId;
    document.getElementById('patientSearch').value = patientName;
    document.getElementById('patientSearchResults').style.display = 'none';
    showNotification(`Selected patient: ${patientName}`, 'success');
}

function getRecipientDisplayName(recipientType, selectedPatientName = '') {
    const recipientNames = {
        'all_patients': 'All Patients',
        'specific_patient': selectedPatientName ? `Patient: ${selectedPatientName}` : 'Specific Patient',
        'emergency_cases': 'Emergency Cases'
    };
    
    return recipientNames[recipientType] || recipientType;
}

// Setup event listeners
function setupEventListeners() {
    // Main buttons
    document.getElementById('sendAnnouncementBtn').addEventListener('click', openAnnouncementModal);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Modal event listeners
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Event delegation for filters
    document.querySelector('.service-filters').addEventListener('click', handleServiceFilter);
    document.querySelector('.consultation-filters').addEventListener('click', handleConsultationFilter);

    document.getElementById('announcementForm').addEventListener('submit', handleAnnouncementSubmit);

    document.querySelectorAll('.nav-links a[data-page]').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Page-specific buttons
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// Modal functions
function openAnnouncementModal() {
    console.log("📧 Opening announcement modal...");
    document.getElementById('announcementModal').style.display = 'flex';
 
    document.getElementById('recipientType').value = 'all_patients';
    document.getElementById('patientSearchSection').style.display = 'none';
    document.getElementById('selectedPatientId').value = '';
    document.getElementById('patientSearch').value = '';
    document.getElementById('announcementMessage').value = '';
  
    initializeAnnouncementModal();
}

function initializeAnnouncementModal() {
    console.log("🔄 Initializing announcement modal functionality...");
    
    const recipientType = document.getElementById('recipientType');
    const patientSearchSection = document.getElementById('patientSearchSection');
    
    if (!recipientType || !patientSearchSection) {
        console.error("❌ Required elements not found!");
        return;
    }
    
    console.log("✅ Elements found, setting up event listeners...");
 
    handleRecipientChange(recipientType.value);

    recipientType.addEventListener('change', function() {
        console.log("🎯 CHANGE EVENT FIRED! Value:", this.value);
        handleRecipientChange(this.value);
    });
  
    setupPatientSearch();
    
    console.log("✅ Announcement modal initialized successfully");
}

function handleRecipientChange(selectedValue) {
    console.log("🔄 Handling recipient change:", selectedValue);
    
    const patientSearchSection = document.getElementById('patientSearchSection');
    const showSearch = selectedValue === 'specific_patient';
    
    console.log("Should show patient search:", showSearch);
    
    patientSearchSection.style.display = showSearch ? 'block' : 'none';
    
    if (!showSearch) {
      
        document.getElementById('patientSearchResults').style.display = 'none';
        document.getElementById('selectedPatientId').value = '';
        document.getElementById('patientSearch').value = '';
    } else {
        
        document.getElementById('patientSearch').focus();
    }
}

function setupPatientSearch() {
    const patientSearch = document.getElementById('patientSearch');
    let searchTimeout;
    
    patientSearch.addEventListener('input', function() {
        console.log("Patient search input:", this.value);
        clearTimeout(searchTimeout);
        const searchTerm = this.value.trim();
        
        if (searchTerm.length < 2) {
            document.getElementById('patientSearchResults').style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchPatients(searchTerm);
        }, 300);
    });
   
    document.addEventListener('click', function(e) {
        const patientSearchSection = document.getElementById('patientSearchSection');
        if (patientSearchSection && !patientSearchSection.contains(e.target)) {
            document.getElementById('patientSearchResults').style.display = 'none';
        }
    });
}

function openEmergencyModal() {
    document.getElementById('emergencyModal').style.display = 'flex';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Filter functions
function handleServiceFilter(event) {
    if (!event.target.classList.contains('filter-btn')) return;
    
    const filter = event.target.dataset.filter;
    if (!filter) return;

    document.querySelectorAll('.service-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    const serviceCards = document.querySelectorAll('.service-card');
    let visibleCount = 0;
    
    serviceCards.forEach(card => {
        if (filter === 'all' || card.dataset.type === filter) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    showNotification(`Services filtered: ${filter} (${visibleCount} visible)`, 'info');
}

function handleConsultationFilter(event) {
    if (!event.target.classList.contains('filter-btn')) return;
    
    const status = event.target.dataset.status;
    document.querySelectorAll('.consultation-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const rows = document.querySelectorAll('#consultationsTableBody tr');
    rows.forEach(row => {
        if (status === 'all' || row.dataset.status === status) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// NAVIGATION FUNCTION 
// NAVIGATION FUNCTION - SIMPLE AND EFFECTIVE
function handleNavigation(event) {
    event.preventDefault();
    const pageName = event.target.dataset.page;
    
    console.log('🔗 Switching to:', pageName);
    
    // 1. Update active nav link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 2. Hide ALL pages (force hide)
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
        section.style.visibility = 'hidden';
        section.style.opacity = '0';
        section.style.height = '0';
        section.style.overflow = 'hidden';
    });
    
    // 3. Show ONLY the selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        // Force show with inline styles
        targetPage.style.display = 'block';
        targetPage.style.visibility = 'visible';
        targetPage.style.opacity = '1';
        targetPage.style.height = 'auto';
        targetPage.style.overflow = 'visible';
        
        // Add active class after a tiny delay
        setTimeout(() => {
            targetPage.classList.add('active');
        }, 10);
        
        console.log('✅ Now showing:', pageName);
        
        // Load page data
        switch(pageName) {
            case 'patients':
                loadPatients();
                break;
            case 'appointments':
                loadAppointments();
                break;
            case 'dashboard':
                loadStats();
                loadConsultations();
                break;
        }
        
        // Update title
        if (window.dynamicPageTitles && window.dynamicPageTitles[pageName]) {
            document.getElementById('dashboardTitle').textContent = window.dynamicPageTitles[pageName];
        }
    }
}

function loadServices(role) {
    const roleServices = {
        'Doctor': [
            { id: 1, name: 'Medical Consultation', description: 'Comprehensive medical examination and diagnosis', type: 'consultation', schedule: 'As scheduled' },
            { id: 2, name: 'Emergency Care', description: 'Immediate medical attention for urgent conditions', type: 'emergency', schedule: '24/7 Available' },
            { id: 3, name: 'Chronic Disease Management', description: 'Ongoing care for chronic health conditions', type: 'care', schedule: 'Follow-up visits' },
            { id: 4, name: 'Health Screening', description: 'Preventive health checks and early detection', type: 'screening', schedule: 'By appointment' }
        ],
        'Nurse': [
            { id: 1, name: 'Vital Signs Monitoring', description: 'Regular checking of blood pressure, temperature, pulse, and respiratory rate', type: 'vitals', schedule: 'Every 4 hours' },
            { id: 2, name: 'Diagnostic Test', description: 'Conducting and interpreting laboratory tests and screenings', type: 'diagnostic', schedule: 'As ordered' },
            { id: 3, name: 'Wound Care & Dressing', description: 'Professional wound cleaning, dressing changes, and infection prevention', type: 'care', schedule: 'Daily or as needed' },
            { id: 4, name: 'Patient Education', description: 'Health education and counseling for patients and families', type: 'education', schedule: 'During patient interactions' }
        ],
        'Midwife': [
            { id: 1, name: 'Prenatal Check-up', description: 'Regular check-ups for pregnant women and fetal monitoring', type: 'prenatal', schedule: 'Monthly visits' },
            { id: 2, name: 'Family Planning Counseling', description: 'Guidance on contraceptive methods and reproductive health', type: 'counseling', schedule: 'By appointment' },
            { id: 3, name: 'Postnatal Care', description: 'Care for mothers and newborns after delivery', type: 'postnatal', schedule: 'Follow-up visits' },
            { id: 4, name: 'Immunization', description: 'Vaccination services for children and pregnant women', type: 'immunization', schedule: 'Scheduled appointments' }
        ]
    };

    const services = roleServices[role] || roleServices['Nurse'];
    currentServices = services;
    const servicesGrid = document.getElementById('servicesGrid');
    servicesGrid.innerHTML = '';

    services.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        serviceCard.dataset.type = service.type;
     
        serviceCard.innerHTML = `
            <h4>${service.name}</h4>
            <p>${service.description}</p>
            <p><strong>Schedule:</strong> ${service.schedule}</p>
            <!-- REMOVED: Perform Service button -->
        `;
        servicesGrid.appendChild(serviceCard);
    });
}

// ===== FIXED CONSULTATIONS FUNCTIONS =====
async function loadConsultations() {
    console.log('Loading consultations...');
    
    try {
        const response = await fetch('api/get_appointments.php?today=true', {
            credentials: 'include'
        });
        
        // First check response
        console.log('Response status:', response.status, response.statusText);
        
        const text = await response.text();
        console.log('Raw response (first 500 chars):', text.substring(0, 500));
        
        let data;
        try {
            data = JSON.parse(text);
            console.log('Parsed data:', data);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            console.error('Full response:', text);
            currentConsultations = [];
            renderConsultations([]);
            showNotification('Server error - invalid response format', 'error');
            return;
        }
        
        let appointments = [];
        if (data.success && data.appointments) {
            appointments = data.appointments;
            console.log('Found appointments:', appointments.length);
        } else if (Array.isArray(data)) {
            appointments = data;
            console.log('Found array appointments:', appointments.length);
        } else {
            console.warn('Unexpected data format:', data);
        }
        
        if (appointments.length > 0) {
            const todayRounds = appointments.map(apt => ({
                id: apt.id,
                patientName: apt.for_whom || apt.patient_name || 'Patient',
                serviceType: apt.type || 'Consultation',
                roomBed: 'Room - Bed',
                time: apt.appointment_time ? formatTime(apt.appointment_time) : 'Scheduled',
                status: mapAppointmentToConsultationStatus(apt.status),
                originalStatus: apt.status,
                assignedRole: apt.assigned_health_worker_role
            }));
            
            currentConsultations = todayRounds;
            renderConsultations(todayRounds);
            console.log(`Today's consultations loaded: ${todayRounds.length} appointments`);
        } else {
            currentConsultations = [];
            renderConsultations([]);
            console.log('No appointments found for today');
        }
        
    } catch (error) {
        console.error('Error loading consultations:', error);
        currentConsultations = [];
        renderConsultations([]);
        showNotification('Error loading today\'s schedule: ' + error.message, 'error');
    }
}

function mapAppointmentToConsultationStatus(appointmentStatus) {
    const statusMap = {
        'Scheduled': 'pending',
        'In Progress': 'in-progress', 
        'Completed': 'completed',
        'Canceled': 'canceled'
    };
    return statusMap[appointmentStatus] || 'pending';
}

function renderConsultations(consultations) {
    const tableBody = document.getElementById('consultationsTableBody');
    
    if (!tableBody) {
        console.error('Consultations table body not found!');
        return;
    }
    
    if (!consultations || consultations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state"> <!-- REDUCED from 6 to 5 columns -->
                    <div>No patient rounds scheduled for today</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';

    consultations.forEach(consultation => {
        const row = document.createElement('tr');
        row.dataset.status = consultation.status;
        
        const statusClass = consultation.status;

        row.innerHTML = `
            <td><strong>${consultation.patientName}</strong></td>
            <td>${consultation.serviceType}</td>
            <td>${consultation.roomBed}</td>
            <td>${consultation.time}</td>
            <td><span class="status ${statusClass}">${consultation.status.replace('-', ' ')}</span></td>
            <!-- REMOVED: Priority column and Action buttons -->
        `;
        tableBody.appendChild(row);
    });
}

// Load other data functions
async function loadPatients() {
    try {
        const response = await fetch('api/patients.php', { credentials: 'include' });
        
        if (response.ok) {
            let patients = await response.json();
           
            if (patients.error) {
                console.error('Patients API error:', patients.error);
                showNotification('Error loading patients: ' + patients.error, 'error');
                currentPatients = [];
                renderPatients([]);
                return;
            }
          
            patients = enhancePatientDataForHealthWorker(patients);
            
            currentPatients = patients;
            renderPatients(patients);
            
            if (patients.length === 0) {
                showNotification('No patients found', 'info');
            }
        } else {
            currentPatients = [];
            renderPatients([]);
            showNotification('Failed to load patients', 'error');
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        currentPatients = [];
        renderPatients([]);
        showNotification('Error loading patients', 'error');
    }
}

function renderPatients(patients) {
    const patientsGrid = document.getElementById('patientsGrid');
    
    if (!patients || patients.length === 0) {
        patientsGrid.innerHTML = `
            <div class="empty-state">
                <div>No patients found</div>
                <p>There are no patients assigned to you yet.</p>
            </div>
        `;
        return;
    }
    
    patientsGrid.innerHTML = '';

    patients.forEach((patient) => {
        const patientCard = document.createElement('div');
        patientCard.className = 'patient-card';
       
        if (patient._isPlaceholder) {
            patientCard.style.borderLeft = '4px solid #ffc107'; 
        }
        
        patientCard.innerHTML = `
            <h4>${patient.name} ${patient._isPlaceholder ? '<small style="color: #666; font-size: 0.8em;">(Basic Info)</small>' : ''}</h4>
            <p><strong>Age:</strong> ${patient.age}</p>
            <p><strong>Gender:</strong> ${patient.gender}</p>
            <p><strong>Condition:</strong> ${patient.condition}</p>
            <p><strong>Last Visit:</strong> ${patient.admissionDate}</p>
            <p><strong>Status:</strong> ${patient.appointmentStatus}</p>
            <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="viewPatient(${patient.id})">View Chart</button>
            </div>
        `;
        patientsGrid.appendChild(patientCard);
    });
}

function enhancePatientDataForHealthWorker(patients) {
    return patients.map((patient, index) => {
       
        const name = patient.name || 
                    patient.patient_name || 
                    `Patient ${index + 1}`;
        
        const placeholderAge = 25 + (index * 5) % 50; // 25-75 range
        const placeholderGender = index % 2 === 0 ? 'Male' : 'Female';
        
        return {
            id: patient.id || index,
            name: name,
            age: patient.age || (placeholderAge + ' years'),
            gender: patient.gender || placeholderGender,
            condition: patient.condition || patient.medical_condition || 'General checkup',
            admissionDate: patient.admissionDate || patient.last_visit || 'Recent',
            appointmentStatus: patient.appointmentStatus || patient.status || 'Active',
            _isPlaceholder: !patient.age || patient.age === 'Not specified'
        };
    });
}

// ===== APPOINTMENT FUNCTIONS =====
async function loadAppointments() {
    try {
        const response = await fetch('api/get_appointments.php', { 
            credentials: 'include' 
        });
        
        if (response.ok) {
            const data = await response.json();
            
            let appointments = [];
            if (data.success && data.appointments) {
                appointments = data.appointments;
            } else if (Array.isArray(data)) {
                appointments = data;
            }
            
            const userRole = data.userRole || detectUserRole(currentUser);
            
            const formattedAppointments = appointments.map(apt => ({
                id: apt.id,
                patientName: apt.for_whom || apt.patient_name || 'Patient',
                patientPhone: apt.patient_phone || 'Not provided',
                procedure: apt.type || 'Consultation',
                date: apt.appointment_date,
                time: apt.appointment_time ? formatTime(apt.appointment_time) : 'Scheduled',
                status: apt.status || 'Scheduled',
                priority: 'Medium', 
                notes: '', 
                assignedRole: apt.assigned_health_worker_role || userRole,
                healthWorkerId: apt.health_worker_id
            }));
            
            currentAppointments = formattedAppointments;
            renderAppointments(formattedAppointments, userRole);
            
        } else {
            currentAppointments = [];
            renderAppointments([]);
            showNotification('Failed to load appointments', 'error');
        }
    } catch (error) {
        currentAppointments = [];
        renderAppointments([]);
        showNotification('Error loading appointments', 'error');
    }
}

function mapConsultationToAppointmentStatus(consultationStatus) {
    const statusMap = {
        'pending': 'Scheduled',
        'in-progress': 'In Progress', 
        'completed': 'Completed',
        'canceled': 'Canceled'
    };
    return statusMap[consultationStatus] || 'Scheduled';
}

// ===== NEW APPOINTMENT FUNCTIONS =====

function createAppointmentItem(appointment, userRole, isCompleted = false) {
    const appointmentItem = document.createElement('div');
    appointmentItem.className = 'appointment-record';
    appointmentItem.dataset.appointmentId = appointment.id;
    
    const statusClass = appointment.status.toLowerCase().replace(' ', '-');
    const isToday = new Date(appointment.date).toDateString() === new Date().toDateString();
    
    const roleIcons = {
        'Doctor': '👨‍⚕️',
        'Nurse': '👩‍⚕️', 
        'Midwife': '🤰'
    };
    
    const roleIcon = roleIcons[userRole] || '👤';
    const hasPhone = appointment.patientPhone && appointment.patientPhone !== 'Not provided';
    const hasNotes = appointment.notes && appointment.notes.trim().length > 0;

    // ONLY show action buttons based on current status
    let actionButtons = '';
    
    switch(appointment.status) {
        case 'Scheduled':
            actionButtons = `
                <button class="btn btn-success" onclick="updateAppointmentStatus(${appointment.id}, 'In Progress')">
                    Start Appointment
                </button>
                <button class="btn btn-secondary" onclick="showRescheduleModal(${appointment.id})">
                    Reschedule
                </button>
                <button class="btn btn-danger" onclick="cancelAppointment(${appointment.id})">
                    Cancel
                </button>
            `;
            break;
            
        case 'In Progress':
            actionButtons = `
                <button class="btn btn-warning" onclick="updateAppointmentStatus(${appointment.id}, 'Completed')">
                    Complete Appointment
                </button>
                <button class="btn btn-secondary" onclick="addAppointmentDetails(${appointment.id})">
            Add Details
        </button>
            `;
            break;
            
        case 'Completed':
            // No reschedule/cancel for completed appointments
            actionButtons = `
                <button class="btn btn-info" onclick="viewAppointmentSummary(${appointment.id})">
                    View Summary
                </button>
                <button class="btn btn-secondary" onclick="addAppointmentDetails(${appointment.id})">
                    ${hasNotes ? 'Edit Notes' : 'Add Notes'}
                </button>
                <button class="btn btn-outline" onclick="scheduleFollowup(${appointment.id})">
            Schedule Follow-up
        </button>
            `;
            break;
            
        case 'Canceled':
            // Only show rebook option for canceled appointments
            actionButtons = `
                <button class="btn btn-outline" onclick="rebookAppointment(${appointment.id})">
                    Rebook
                </button>
            `;
            break;
    }

    appointmentItem.innerHTML = `
        <div class="appointment-header">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2em;">${roleIcon}</span>
                <h4>${appointment.patientName}</h4>
            </div>
            <span class="appointment-status ${statusClass}">${appointment.status}</span>
        </div>
        <div class="appointment-details">
            <p><strong>Service:</strong> ${appointment.procedure || appointment.type || 'Consultation'}</p>
            <p><strong>Date:</strong> ${appointment.date} ${isToday ? '<span class="today-badge">TODAY</span>' : ''}</p>
            <p><strong>Time:</strong> ${appointment.time ? formatTime(appointment.time) : 'Scheduled'}</p>
            
            <div class="contact-info">
                ${hasPhone ? `<p><strong>Phone:</strong> ${appointment.patientPhone}</p>` : ''}
                ${appointment.patientAddress ? `<p><strong>Address:</strong> ${appointment.patientAddress}</p>` : ''}
                ${appointment.patientDob ? `<p><strong>Date of Birth:</strong> ${appointment.patientDob}</p>` : ''}
                ${appointment.patientGender ? `<p><strong>Gender:</strong> ${appointment.patientGender}</p>` : ''}
                ${appointment.patientBloodType ? `<p><strong>Blood Type:</strong> ${appointment.patientBloodType}</p>` : ''}
                
                ${!hasPhone && !appointment.patientAddress ? 
                    `<p style="color: #666; font-style: italic;">No contact information available</p>` : ''}
            </div>
                ${hasNotes ? `
                <div class="notes-preview" style="margin-top: 10px; padding: 10px; background: #f0f8ff; border-radius: 5px; border-left: 3px solid #007bff;">
                    <strong>📝 Notes:</strong>
                    <p style="margin-top: 5px; font-size: 0.9em; white-space: pre-wrap; max-height: 100px; overflow: hidden; text-overflow: ellipsis;">
                        ${appointment.notes.substring(0, 200)}${appointment.notes.length > 200 ? '...' : ''}
                    </p>
                    ${appointment.notes.length > 200 ? 
                        `<small style="color: #007bff; cursor: pointer;" onclick="showFullNotes(${appointment.id})">View full notes</small>` : ''}
                </div>
            ` : ''}
        </div>
        ${actionButtons ? `
            <div class="appointment-actions" style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                ${actionButtons}
            </div>
        ` : ''}
    `;
    
    return appointmentItem;
}

function createMissedAppointmentItem(appointment, userRole) {
    const appointmentItem = document.createElement('div');
    appointmentItem.className = 'appointment-record missed';
    appointmentItem.dataset.appointmentId = appointment.id;
    
    const isToday = new Date(appointment.date).toDateString() === new Date().toDateString();
    
    const roleIcons = {
        'Doctor': '👨‍⚕️',
        'Nurse': '👩‍⚕️', 
        'Midwife': '🤰'
    };
    
    const roleIcon = roleIcons[userRole] || '👤';
    const hasPhone = appointment.patientPhone && appointment.patientPhone !== 'Not provided';

    // For missed appointments - these SHOULD be reschedulable!
    const actionButtons = `
        <button class="btn btn-warning" onclick="markAppointmentAsCompleted(${appointment.id})">
            Mark as Done
        </button>
        <button class="btn btn-primary" onclick="showRescheduleModal(${appointment.id})">
            Reschedule
        </button>
        <button class="btn btn-danger" onclick="cancelAppointment(${appointment.id})">
            Cancel
        </button>
    `;

    appointmentItem.innerHTML = `
        <div class="appointment-header">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2em;">${roleIcon}</span>
                <h4 style="color: #856404;">${appointment.patientName}</h4>
            </div>
            <span class="appointment-status missed" style="background: #fff3cd; color: #856404;">
                ⚠️ Missed
            </span>
        </div>
        <div class="appointment-details">
            <p><strong>Service:</strong> ${appointment.procedure || appointment.type || 'Consultation'}</p>
            <p><strong>Date:</strong> ${appointment.date} <span style="color: #dc3545; font-weight: bold;">(PAST DUE)</span></p>
            <p><strong>Time:</strong> ${appointment.time ? formatTime(appointment.time) : 'Scheduled'}</p>
            
            <div class="contact-info">
                ${hasPhone ? `<p><strong>Phone:</strong> ${appointment.patientPhone}</p>` : ''}
                ${appointment.patientAddress ? `<p><strong>Address:</strong> ${appointment.patientAddress}</p>` : ''}
                ${appointment.patientDob ? `<p><strong>Date of Birth:</strong> ${appointment.patientDob}</p>` : ''}
                ${appointment.patientGender ? `<p><strong>Gender:</strong> ${appointment.patientGender}</p>` : ''}
                ${appointment.patientBloodType ? `<p><strong>Blood Type:</strong> ${appointment.patientBloodType}</p>` : ''}
                
                ${!hasPhone && !appointment.patientAddress ? 
                    `<p style="color: #666; font-style: italic;">No contact information available</p>` : ''}
            </div>
        </div>
        <div class="appointment-actions" style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
            ${actionButtons}
        </div>
    `;
    
    return appointmentItem;
}

function renderAppointments(appointments, userRole = 'Health Worker') {
    const appointmentsList = document.getElementById('appointmentsList');
    
    if (appointments.length === 0) {
        appointmentsList.innerHTML = `
            <div class="empty-state">
                <div>No Appointments Scheduled</div>
                <p>When patients book appointments for <strong>${userRole}</strong>, they will appear here.</p>
            </div>
        `;
        return;
    }
    
    appointmentsList.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    const upcomingAppointments = appointments.filter(apt => {
        const appointmentDate = new Date(apt.date);
        
        // Past appointments that are still "Scheduled" should be treated as missed/overdue
        if (apt.status === 'Scheduled' && appointmentDate < today) {
            return false; 
        }
        
        // Only show in upcoming if status is Scheduled or In Progress AND date is today or future
        return (apt.status === 'Scheduled' || apt.status === 'In Progress');
    });
    
    const completedAppointments = appointments.filter(apt => 
        apt.status === 'Completed'
    );
    
    const canceledAppointments = appointments.filter(apt => 
        apt.status === 'Canceled'
    );
    
    // Past appointments that are still "Scheduled" (missed appointments)
    const missedAppointments = appointments.filter(apt => {
        if (apt.status === 'Scheduled') {
            const appointmentDate = new Date(apt.date);
            return appointmentDate < today;
        }
        return false;
    });

    // Show upcoming appointments first
    if (upcomingAppointments.length > 0) {
        const upcomingSection = document.createElement('div');
        upcomingSection.className = 'appointments-section';
        upcomingSection.innerHTML = `
            <h3 style="color: var(--primary); margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--primary);">
                📋 Upcoming Appointments (${upcomingAppointments.length})
            </h3>
        `;
        appointmentsList.appendChild(upcomingSection);
        
        upcomingAppointments.forEach(appointment => {
            const appointmentItem = createAppointmentItem(appointment, userRole, false);
            upcomingSection.appendChild(appointmentItem);
        });
    }

    // Show missed appointments (past appointments still marked as Scheduled)
    if (missedAppointments.length > 0) {
        const missedSection = document.createElement('details');
        missedSection.className = 'missed-appointments';
        missedSection.innerHTML = `
            <summary style="cursor: pointer; padding: 10px; background: #fff3cd; border-radius: 5px; margin-top: 20px; border: 1px solid #ffeaa7;">
                <h3 style="display: inline; color: #856404; margin: 0;">
                    ⚠️ Missed Appointments (${missedAppointments.length})
                </h3>
                <small style="color: #999; margin-left: 10px;">Click to expand</small>
            </summary>
            <div style="margin-top: 10px;"></div>
        `;
        
        const missedContent = missedSection.querySelector('div');
        
        missedAppointments.forEach(appointment => {
            const appointmentItem = createMissedAppointmentItem(appointment, userRole);
            missedContent.appendChild(appointmentItem);
        });
        
        appointmentsList.appendChild(missedSection);
    }

    // Show completed appointments
    if (completedAppointments.length > 0) {
        const completedSection = document.createElement('details');
        completedSection.className = 'completed-appointments';
        completedSection.innerHTML = `
            <summary style="cursor: pointer; padding: 10px; background: #f8f9fa; border-radius: 5px; margin-top: 20px;">
                <h3 style="display: inline; color: #6c757d; margin: 0;">
                    ✅ Completed Appointments (${completedAppointments.length})
                </h3>
                <small style="color: #999; margin-left: 10px;">Click to expand</small>
            </summary>
            <div style="margin-top: 10px;"></div>
        `;
        
        const completedContent = completedSection.querySelector('div');
        
        completedAppointments.forEach(appointment => {
            const appointmentItem = createAppointmentItem(appointment, userRole, true);
            completedContent.appendChild(appointmentItem);
        });
        
        appointmentsList.appendChild(completedSection);
    }
    
    // Show canceled appointments
    if (canceledAppointments.length > 0) {
        const canceledSection = document.createElement('details');
        canceledSection.className = 'canceled-appointments';
        canceledSection.innerHTML = `
            <summary style="cursor: pointer; padding: 10px; background: #f8f9fa; border-radius: 5px; margin-top: 20px;">
                <h3 style="display: inline; color: #dc3545; margin: 0;">
                    ❌ Canceled Appointments (${canceledAppointments.length})
                </h3>
                <small style="color: #999; margin-left: 10px;">Click to expand</small>
            </summary>
            <div style="margin-top: 10px;"></div>
        `;
        
        const canceledContent = canceledSection.querySelector('div');
        
        canceledAppointments.forEach(appointment => {
            const appointmentItem = createAppointmentItem(appointment, userRole, true);
            canceledContent.appendChild(appointmentItem);
        });
        
        appointmentsList.appendChild(canceledSection);
    }
}

// Add event delegation for appointment buttons
document.addEventListener('click', function(event) {
    if (event.target.matches('.appointment-actions button[data-action]')) {
        const button = event.target;
        const action = button.getAttribute('data-action');
        const appointmentId = button.getAttribute('data-appointment-id');
        
        console.log('Appointment button clicked:', { action, appointmentId });
        
        if (!appointmentId) {
            console.error('No appointment ID found');
            return;
        }
        
        switch(action) {
            case 'view':
                viewAppointmentDetails(parseInt(appointmentId));
                break;
            case 'start':
                startAppointment(parseInt(appointmentId));
                break;
            case 'complete':
                completeAppointment(parseInt(appointmentId));
                break;
            case 'reschedule':
                rescheduleAppointment(parseInt(appointmentId));
                break;
            case 'cancel':
                cancelAppointment(parseInt(appointmentId));
                break;
        }
    }
});

async function createAppointmentNotification(appointmentId, patientId, message) {
    try {
        const response = await fetch('api/create_appointment_notification.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                appointment_id: appointmentId,
                patient_id: patientId,
                message: message
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Error creating appointment notification:', error);
        return { success: false };
    }
}

async function updateAppointmentStatus(appointmentId, newStatus) {
    console.log('=== UPDATE APPOINTMENT STATUS ===');
    
    try {
        const response = await fetch('api/update_appointment_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                appointment_id: appointmentId,
                status: newStatus
            })
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Appointment status updated to ${newStatus}`, 'success');
          
            if (newStatus === 'In Progress' || newStatus === 'Completed') {
                const appointment = currentAppointments.find(a => a.id == appointmentId);
                if (appointment && appointment.patientId) { 
                    let notificationMessage = '';
                    if (newStatus === 'In Progress') {
                        notificationMessage = `Your appointment for ${appointment.procedure} has been approved and is in progress`;
                    } else if (newStatus === 'Completed') {
                        notificationMessage = `Your appointment for ${appointment.procedure} has been completed`;
                    }
                    
                    await createAppointmentNotification(appointmentId, appointment.patientId, notificationMessage);
                }
            }
         
            await loadConsultations();
            await loadAppointments();
        } else {
            showNotification(`Failed: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error updating appointment status:', error);
        showNotification('Error updating appointment status', 'error');
    }
}

function cancelAppointment(appointmentId) {
    const appointment = currentAppointments.find(a => a.id == appointmentId);
    if (appointment) {
        if (confirm(`Are you sure you want to cancel the appointment with ${appointment.patientName}?`)) {
            updateAppointmentStatus(appointmentId, 'Canceled');
        }
    }
}

function showCompletionModal(appointmentId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Complete Appointment</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="completionForm">
                <div class="form-group">
                    <label for="completionNotes">Appointment Notes:</label>
                    <textarea id="completionNotes" placeholder="Enter notes about the appointment..." rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label for="followUpRequired">Follow-up Required?</label>
                    <select id="followUpRequired">
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn btn-success">Save & Complete</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);

    modal.querySelector('#completionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const notes = document.getElementById('completionNotes').value;
        const followUp = document.getElementById('followUpRequired').value;
        
        showNotification('Appointment completed with notes', 'success');
        modal.remove();
    });
 
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
}

// Update the handleAnnouncementSubmit function
function handleAnnouncementSubmit(event) {
    event.preventDefault();
    const recipientType = document.getElementById('recipientType').value;
    const message = document.getElementById('announcementMessage').value;
    const selectedPatientId = document.getElementById('selectedPatientId').value;
    
    console.log("Sending announcement:", { recipientType, message, selectedPatientId });
    
    if (!message.trim()) {
        showNotification('Please enter a message for the announcement.', 'error');
        return;
    }
  
    if (recipientType === 'specific_patient' && !selectedPatientId) {
        showNotification('Please select a patient from the search results.', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    fetch('api/create_announcement.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
            recipient_type: recipientType, 
            message: message,
            patient_id: selectedPatientId || null
        })
    })
    .then(response => {
        console.log("Response status:", response.status);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log("Response data:", data);
        if (data.success) {
            const selectedPatientName = document.getElementById('patientSearch').value;
            const displayName = getRecipientDisplayName(recipientType, selectedPatientName);
            showNotification(`Announcement sent successfully to ${displayName}!`, 'success');
            closeAllModals();

            document.getElementById('announcementMessage').value = '';
            document.getElementById('selectedPatientId').value = '';
            document.getElementById('patientSearch').value = '';
        } else {
            showNotification('Failed to send announcement: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        showNotification('Error sending announcement: ' + error.message, 'error');
    })
    .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

// consultation and appointment status
async function updateConsultationStatus(consultationId, consultationStatus, appointmentStatus) {
    const consultation = currentConsultations.find(c => c.id === consultationId);
    if (!consultation) {
        showNotification('Consultation not found', 'error');
        return;
    }

    try {
        const response = await fetch('api/update_appointment_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                appointment_id: consultationId,
                status: appointmentStatus
            })
        });

        const data = await response.json();
        
        if (data.success) {
            consultation.status = consultationStatus;
            renderConsultations(currentConsultations);
            showNotification(`Appointment status updated to ${appointmentStatus}`, 'success');
        
            loadConsultations();
            if (document.getElementById('appointments-page').classList.contains('active')) {
                loadAppointments();
            }
        } else {
            showNotification(data.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error updating appointment status', 'error');
    }
}

// Patient Management Functions
async function viewPatient(patientId) {
    try {
        const response = await fetch(`api/get_patient_details.php?id=${patientId}`, { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            openPatientChartModal(data.patient, data.appointments);
        } else {
            showNotification('Failed to load patient data: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Error loading patient chart', 'error');
    }
}

function viewAppointment(appointmentId) {
    showNotification(`Viewing appointment #${appointmentId}`, 'info');
}

// Settings Functions
async function saveSettings() {
    const userData = {
        name: document.getElementById('healthWorkerName').value,
        email: document.getElementById('healthWorkerEmail').value,
        license: document.getElementById('healthWorkerLicense').value,
        phone: document.getElementById('healthWorkerPhone').value,
        shift: document.getElementById('healthWorkerShift').value,
        specialization: document.getElementById('healthWorkerSpecialization').value
    };

    try {
        const response = await fetch('api/update_profile.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Profile settings saved successfully!', 'success');
            document.getElementById('userWelcome').textContent = `Welcome, ${userData.name} | ${data.role}`;
            document.getElementById('sidebarRole').textContent = data.role;
        } else {
            showNotification('Failed to save settings: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('Error saving settings', 'error');
    }
}

// Logout
function handleLogout(event) {
    event.preventDefault();
    
    if (confirm('Are you sure you want to logout?')) {
        const logoutBtn = event.target;
        const originalText = logoutBtn.textContent;
        logoutBtn.textContent = 'Logging out...';
        logoutBtn.disabled = true;

        fetch('api/logout.php', { 
            method: 'POST', 
            credentials: 'include' 
        })
        .finally(() => {
            showNotification('You have been successfully logged out.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }
}

// ===== UTILITY FUNCTIONS =====
function formatTime(timeString) {
    if (!timeString) return 'Scheduled';
    try {
        // Handle both "HH:MM:SS" and "HH:MM" formats
        let timePart = timeString;
        if (timeString.includes(' ')) {
            timePart = timeString.split(' ')[0];
        }
        
        const timeParts = timePart.split(':');
        if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0]);
            const minutes = timeParts[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes} ${ampm}`;
        }
        return timeString;
    } catch (e) {
        console.error('Error formatting time:', e, 'for time:', timeString);
        return timeString;
    }
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.custom-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: slideInRight 0.3s ease;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        ${type === 'success' ? 'background: #28a745;' :
          type === 'error' ? 'background: #dc3545;' :
          type === 'warning' ? 'background: #ffc107; color: #212529;' :
          'background: #17a2b8;'}
    `;

    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close" style="
            background: none;
            border: none;
            color: ${type === 'warning' ? '#212529' : 'white'};
            font-size: 18px;
            cursor: pointer;
            margin-left: 15px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">&times;</button>
    `;

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });

    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);

    document.body.appendChild(notification);
}

function openPatientChartModal(patient, appointments) {
    // Sort appointments: upcoming first, then past
    const sortedAppointments = [...appointments].sort((a, b) => {
        const dateA = new Date(a.appointment_date + ' ' + (a.appointment_time || ''));
        const dateB = new Date(b.appointment_date + ' ' + (b.appointment_time || ''));
        return dateB - dateA; 
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.id = 'patientChartModal';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; width: 95%;">
            <div class="modal-header">
                <h2>Patient Chart: ${patient.name || 'Unknown Patient'}</h2>
                <button class="close-modal">&times;</button>
            </div>

            <div class="patient-chart-body" style="max-height: 75vh; overflow-y: auto; padding: 10px 0;">
                <!-- Personal Information -->
                <div class="section" style="margin-bottom: 30px;">
                    <h3 style="color: var(--primary); border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 15px;">
                        Personal Information
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                        <p><strong>Age:</strong> ${patient.age || 'Not specified'}</p>
                        <p><strong>Gender:</strong> ${patient.gender || 'Not specified'}</p>
                        <p><strong>Phone:</strong> ${patient.phone || 'Not provided'}</p>
                        <p><strong>Address:</strong> ${patient.address || 'Not specified'}</p>
                        <p><strong>Blood Type:</strong> ${patient.blood_type || 'Unknown'}</p>
                        <p><strong>Date of Birth:</strong> ${patient.dob || 'Not specified'}</p>
                        <p><strong>Status:</strong> <span style="color: #28a745; font-weight: 600;">${patient.patient_status || 'Active'}</span></p>
                    </div>
                </div>

                <!-- Appointment History -->
                <div class="section">
                    <h3 style="color: var(--primary); border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 15px;">
                        Appointment History
                    </h3>
                    ${sortedAppointments.length === 0 ? `
                        <div class="empty-state" style="padding: 40px; text-align: center; color: #666;">
                            <p>No appointment history found for this patient.</p>
                            <small>You can manage appointments from the Appointments tab.</small>
                        </div>
                    ` : `
                        <table class="consultation-table" style="width: 100%; margin-top: 10px;">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Service</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedAppointments.map(apt => {
                                    const statusClass = apt.status.toLowerCase().replace(' ', '-');
                                    const isUpcoming = new Date(apt.appointment_date) >= new Date().setHours(0,0,0,0);
                                    const timeDisplay = apt.appointment_time ? formatTime(apt.appointment_time) : 'Not set';
                                    const inProgressNote = apt.status === 'In Progress' 
                                        ? `<br><small style="color: #d39e00; font-weight: 600;">→ Complete from Appointments tab</small>` 
                                        : '';

                                    return `
                                        <tr ${isUpcoming ? 'style="background: #f8f9ff;"' : ''}>
                                            <td>${apt.appointment_date || 'N/A'}</td>
                                            <td>${timeDisplay}</td>
                                            <td>${apt.type || 'Consultation'}</td>
                                            <td>
                                                <span class="appointment-status ${statusClass}">${apt.status}</span>
                                                ${inProgressNote}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        <div style="margin-top: 15px; padding: 10px; background: #f0f8ff; border-radius: 6px; font-size: 0.9rem; color: #333;">
                            <strong>Note:</strong> To start, complete, or cancel appointments, please use the <strong>Appointments</strong> tab.
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
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

    showNotification(`Patient chart opened: ${patient.name}`, 'info');
}

// Nuclear option - global event listener
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'recipientType') {
        console.log("🌍 GLOBAL CHANGE EVENT - Value:", e.target.value);
        const showSearch = e.target.value === 'specific_patient';
        const patientSearchSection = document.getElementById('patientSearchSection');
        
        if (patientSearchSection) {
            patientSearchSection.style.display = showSearch ? 'block' : 'none';
            console.log("Search section display set to:", patientSearchSection.style.display);
        }
    }
});

// ===== ADDITIONAL UTILITY FUNCTIONS =====

function rebookAppointment(appointmentId) {
    const appointment = currentAppointments.find(a => a.id == appointmentId);
    if (appointment) {
        showNotification(`Rebooking appointment with ${appointment.patientName}...`, 'info');
    }
}

function viewAppointmentSummary(appointmentId) {
    const appointment = currentAppointments.find(a => a.id == appointmentId);
    if (appointment) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Appointment Summary</h2>
                </div>
                <div style="max-height: 60vh; overflow-y: auto; padding: 10px;">
                    <h3>${appointment.patientName}</h3>
                    <p><strong>Service Type:</strong> ${appointment.procedure || appointment.type || 'Consultation'}</p>
                    <p><strong>Date:</strong> ${appointment.date}</p>
                    <p><strong>Time:</strong> ${appointment.time ? formatTime(appointment.time) : 'Scheduled'}</p>
                    <p><strong>Status:</strong> ${appointment.status}</p>
                    
                    <h4 style="margin-top: 20px; color: var(--dark);">Patient Information:</h4>
                    ${appointment.patientPhone && appointment.patientPhone !== 'Not provided' ? 
                        `<p><strong>Phone:</strong> ${appointment.patientPhone}</p>` : ''}
                    ${appointment.patientAddress ? 
                        `<p><strong>Address:</strong> ${appointment.patientAddress}</p>` : ''}
                    ${appointment.patientDob ? 
                        `<p><strong>Date of Birth:</strong> ${appointment.patientDob}</p>` : ''}
                    ${appointment.patientGender ? 
                        `<p><strong>Gender:</strong> ${appointment.patientGender}</p>` : ''}
                    ${appointment.patientBloodType ? 
                        `<p><strong>Blood Type:</strong> ${appointment.patientBloodType}</p>` : ''}
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary close-modal">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
    }
}

function showRescheduleModal(appointmentId) {
    const appointment = currentAppointments.find(a => a.id == appointmentId);
    if (appointment) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Reschedule Appointment</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <form id="rescheduleForm">
                    <input type="hidden" id="rescheduleAppointmentId" value="${appointmentId}">
                    <div class="form-group">
                        <label for="newDate">New Date:</label>
                        <input type="date" id="newDate" required>
                    </div>
                    <div class="form-group">
                        <label for="newTime">New Time:</label>
                        <input type="time" id="newTime" required>
                    </div>
                    <div class="form-group">
                        <p style="color: #666; font-size: 0.9rem; margin-top: 10px;">
                            <strong>Note:</strong> Rescheduling will update the appointment to "Scheduled" status.
                        </p>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Reschedule</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
      
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('newDate').min = today;
      
        const appointmentDate = new Date(appointment.date);
        const todayDate = new Date();
        let defaultDate = today;
        
        if (appointmentDate < todayDate) {
            defaultDate = today;
        } else {
            defaultDate = appointment.date;
        }
        
        document.getElementById('newDate').value = defaultDate;
        document.getElementById('newTime').value = appointment.time || '09:00';
        
        modal.querySelector('#rescheduleForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const newDate = document.getElementById('newDate').value;
            const newTime = document.getElementById('newTime').value;
            
            try {
                const response = await fetch('api/reschedule_appointment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        appointment_id: appointmentId,
                        new_date: newDate,
                        new_time: newTime
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    showNotification('Appointment rescheduled successfully', 'success');
                    modal.remove();
                    loadAppointments(); // Refresh the list
                } else {
                    showNotification(data.message || 'Failed to reschedule', 'error');
                }
            } catch (error) {
                console.error('Error rescheduling:', error);
                showNotification('Error rescheduling appointment', 'error');
            }
        });
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

    function markAppointmentAsMissed(appointmentId) {
    const appointment = currentAppointments.find(a => a.id == appointmentId);
    if (appointment) {
        if (confirm(`Mark appointment with ${appointment.patientName} as missed?`)) {
    
            showNotification(`Appointment with ${appointment.patientName} marked as missed`, 'warning');

        }
    }
}

function rescheduleMissedAppointment(appointmentId) {
    showRescheduleModal(appointmentId);
}

function markAppointmentAsCompleted(appointmentId) {
    const appointment = currentAppointments.find(a => a.id == appointmentId);
    if (appointment) {
        if (confirm(`Mark appointment with ${appointment.patientName} as completed? This will close the missed appointment.`)) {
            updateAppointmentStatus(appointmentId, 'Completed');
        }
    }
}

function scheduleFollowup(appointmentId) {
    const appointment = currentAppointments.find(a => a.id == appointmentId);
    if (appointment) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Schedule Follow-up</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <form id="followupForm">
                    <input type="hidden" id="followupAppointmentId" value="${appointmentId}">
                    <input type="hidden" id="patientUserId" value="${appointment.patient_user_id || ''}">
                    
                    <div class="form-group">
                        <label for="patientName">Patient:</label>
                        <input type="text" id="patientName" value="${appointment.patientName}" disabled>
                    </div>
                    
                    <div class="form-group">
                        <label for="followupDate">Follow-up Date:</label>
                        <input type="date" id="followupDate" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="followupTime">Follow-up Time:</label>
                        <input type="time" id="followupTime" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="followupType">Appointment Type:</label>
                        <input type="text" id="followupType" value="${(appointment.procedure || appointment.type || 'Consultation') + ' Follow-up'}" required>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Schedule Follow-up</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set minimum date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        document.getElementById('followupDate').min = minDate;
        
        // Default to one week from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        document.getElementById('followupDate').value = defaultDate.toISOString().split('T')[0];
        document.getElementById('followupTime').value = '09:00';
        
        modal.querySelector('#followupForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const followupDate = document.getElementById('followupDate').value;
            const followupTime = document.getElementById('followupTime').value;
            const followupType = document.getElementById('followupType').value;
            const patientUserId = document.getElementById('patientUserId').value;
            
            if (!patientUserId) {
                showNotification('Error: Patient information missing', 'error');
                return;
            }
            
            try {
                const response = await fetch('api/create_health_worker_appointment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        patient_user_id: patientUserId,
                        for_whom: appointment.patientName,
                        type: followupType,
                        appointment_date: followupDate,
                        appointment_time: followupTime
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    showNotification('Follow-up appointment scheduled successfully', 'success');
                    modal.remove();
                    loadAppointments(); 
                } else {
                    showNotification(data.message || 'Failed to schedule follow-up', 'error');
                }
            } catch (error) {
                console.error('Error scheduling follow-up:', error);
                showNotification('Error scheduling follow-up', 'error');
            }
        });
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

function addAppointmentDetails(appointmentId) {
    const appointment = currentAppointments.find(a => a.id == appointmentId);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Add Appointment Notes</h2>
                <button class="close-modal">&times;</button>
            </div>
            <form id="notesForm">
                <input type="hidden" id="notesAppointmentId" value="${appointmentId}">
                
                <div class="form-group">
                    <label for="patientNameDisplay">Patient:</label>
                    <input type="text" id="patientNameDisplay" value="${appointment.patientName}" disabled>
                </div>
                
                <div class="form-group">
                    <label for="appointmentNotes">Clinical Notes:</label>
                    <textarea id="appointmentNotes" rows="10" placeholder="Enter clinical observations, diagnosis, treatment provided, medications prescribed, follow-up instructions, etc...">${appointment.notes || ''}</textarea>
                </div>
                
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">Save Notes</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#notesForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const notes = document.getElementById('appointmentNotes').value;
        
        try {
            const response = await fetch('api/update_appointment_notes.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    appointment_id: appointmentId,
                    notes: notes
                })
            });
            
            const data = await response.json();
            if (data.success) {
                showNotification('Appointment notes saved successfully', 'success');
                modal.remove();
                
                // Update the appointment in the current list
                if (appointment) {
                    appointment.notes = notes;
                }
                
                // Refresh appointments display
                const userRole = detectUserRole(currentUser);
                renderAppointments(currentAppointments, userRole);
            } else {
                showNotification(data.message || 'Failed to save notes', 'error');
            }
        } catch (error) {
            console.error('Error saving notes:', error);
            showNotification('Error saving appointment notes', 'error');
        }
    });
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
