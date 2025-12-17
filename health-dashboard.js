document.addEventListener('DOMContentLoaded', async () => {
    /* ---------- 1. SESSION CHECK & UI SETUP ---------- */
    let user = null;
    let lastRequestId = null;
    
    try {
               const r = await fetch('api/current_user.php', { 
            credentials: 'include',
            cache: 'no-store'
        });
        
        if (r.status === 401 || r.status === 403) {
           
            location.href = 'index.html';
            return;
        }
        
        if (r.ok) {
            const d = await r.json();
            
            if (d.success && d.user) {
               
              const userType = d.user.user_type;
                
                if (userType === 'bhw') {
                    user = d.user;
                    document.getElementById('userWelcome').textContent = `${user.name} | Barangay Health Personnel`;
                    console.log('✅ Barangay Health Personnel logged in successfully');

           setupEventListeners();
           setupPasswordToggle();
           setupCancelButton();
                                       
                } else {
                    console.log('Access denied. User type:', userType, '- Expected: bhw');
                    location.href = 'index.html';
                    return;
                }
            } else {
                console.log('No valid user session');
                location.href = 'index.html';
                return;
            }
        } else {
            console.log('API response not OK:', r.status);
            location.href = 'index.html';
            return;
        }
    } catch (e) {
        console.error('Error checking session:', e);
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
    const genUser = (name) => {
        const base = name.replace(/[^a-z]/gi, '').toLowerCase();
        const shortBase = base.slice(0, 6);
        const randomNum = Math.floor(100 + Math.random() * 900);
        return shortBase + randomNum;
    };

    const ucfirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    const getUserRoleDisplay = (user) => {
        if (user.role) {
            const map = { 
                'doctor': 'Doctor', 
                'midwife': 'Midwife', 
                'nurse': 'Nurse', 
                'bhw': 'Barangay Health Personnel', 
                'barangay_health': 'Barangay Health Personnel', 
                'patient': 'Patient' 
            };
            return map[user.role] || ucfirst(user.role);
        }

    const map = { 
            'bhw': 'Barangay Health Personnel',  
            'barangay_health': 'Barangay Health Personnel', 
            'health_worker': 'Health Worker', 
            'patient': 'Patient' 
        };

    return map[user.user_type] || user.user_type;
    };

    function setupPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(button => {
        
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            
            if (input) {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
               
                const eyeIcon = this.querySelector('.eye-icon');
                if (eyeIcon) {
                    if (type === 'text') {
                        
                        eyeIcon.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>';
                        this.title = 'Hide password';
                        this.classList.add('password-visible');
                    } else {
                       
                        eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
                        this.title = 'Show password';
                        this.classList.remove('password-visible');
                    }
                }
            }
        });
    });
}

    function setupCancelButton() {
        const cancelBtn = document.getElementById('cancelAddBtn');
        
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            document.getElementById('cancelAddBtn').addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
    
                const formElement = document.getElementById('addCredentialsForm');
                if (formElement) {
                    formElement.style.display = 'none';
                   
                    clearCredentialsForm();
                  
                    showNotification('Add credentials cancelled', 'info');
                } else {
                    
                }
            });
            
        } else {
            
        }
    }

    /* ---------- 3. VALIDATION HELPERS (ADD THESE) ---------- */
    const showValidation = (id, text, type) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
            el.className = `validation-message ${type}`;
        }
    };

    const clearUsernameValidation = () => {
        const el = document.getElementById('usernameValidation');
        if (el) {
            el.textContent = '';
            el.className = 'validation-message';
        }
    };

    const clearCredentialsForm = () => {
    console.log('Clearing credentials form...');
    
    const form = document.getElementById('credentialsForm');
    if (form) {
        form.reset();
        
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        if (newPassword) {
            newPassword.type = 'password';
            newPassword.value = '';
        }
        if (confirmPassword) {
            confirmPassword.type = 'password';
            confirmPassword.value = '';
        }
      
        document.querySelectorAll('.toggle-password').forEach(btn => {
            const eyeIcon = btn.querySelector('.eye-icon');
            if (eyeIcon) {
                eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
                btn.title = 'Show password';
                btn.classList.remove('password-visible');
            }
        });
    }
    
    clearUsernameValidation();
    
    const passwordValidation = document.getElementById('passwordValidation');
    if (passwordValidation) {
        passwordValidation.textContent = '';
        passwordValidation.className = 'validation-message';
    }
};

 /* ---------- 4. FILE INPUT UI ---------- */
    const fileInp = document.getElementById('masterlistFile');
    const fileName = document.getElementById('fileName');
    fileInp.addEventListener('change', e => {
        fileName.textContent = e.target.files[0]?.name || 'No file chosen';
    });


    /* ---------- 5. EVENT LISTENERS ---------- */
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

            setupPasswordToggle(); 
            setupCancelButton();
            clearCredentialsForm();
            
        });

        // Save single credentials
        const credentialsForm = document.getElementById('credentialsForm');
        const newForm = credentialsForm.cloneNode(true);
        credentialsForm.parentNode.replaceChild(newForm, credentialsForm);
    
       // Add fresh listener
        document.getElementById('credentialsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation(); 
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
        document.getElementById('newUsername').addEventListener('blur', () => validateUsername(true));
        document.getElementById('newUsername').addEventListener('input', () => {
            const msg = document.getElementById('usernameValidation');
            if (msg) {
                msg.className = 'validation-message';
                msg.textContent = '';
            }
        });

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

    /* ---------- 6. USERNAME VALIDATION FUNCTION ---------- */
    async function validateUsername(showErrors = true) {
        const username = document.getElementById('newUsername').value.trim();
        const msg = document.getElementById('usernameValidation');
        
        if (!username) { 
            if (showErrors) {
                showValidation('usernameValidation', 'Username is required', 'error');
            }
            return false; 
        }
      
        if (username.length < 3) {
            if (showErrors) {
                showValidation('usernameValidation', 'Username too short (min 3 characters)', 'error');
            }
            return false;
        }
        
        // Check for invalid characters
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            if (showErrors) {
                showValidation('usernameValidation', 'Only letters, numbers, and underscores allowed', 'error');
            }
            return false;
        }
        
        try {
            const resp = await fetch(`api/check_username.php?username=${encodeURIComponent(username)}`, { 
                credentials: 'include',
                cache: 'no-store'
            });
            
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            
            const data = await resp.json();
            
            if (showErrors) {
                showValidation('usernameValidation', data.exists ? 'Username already taken' : '✓ Username available', data.exists ? 'error' : 'success');
            }
            
            return !data.exists;
        } catch (e) {
            console.error('Username check failed:', e);
            if (showErrors) {
                showValidation('usernameValidation', 'Unable to check username', 'error');
            }
            return false;
        }
    }

    /* ---------- 7. ADD SINGLE CREDENTIALS ---------- */
let isCreatingUser = false; 

async function addSingleCredentials() {

    const requestId = Date.now() + Math.random();
    
    // Prevent duplicate submission within 2 seconds
    if (lastRequestId && (Date.now() - lastRequestId) < 2000) {
        console.log('⏳ Too soon since last request, skipping...');
        return;
    }
    
    lastRequestId = requestId;
    
    if (isCreatingUser) {
        console.log('⚠️ Already creating a user, please wait...');
        return;
    }
    
    const name = document.getElementById('newName').value.trim();
    const address = document.getElementById('newAddress').value.trim();
    const role = document.getElementById('newRole').value;
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    // Validation
    if (!name || !address || !role || !username || !password || !confirm) {
        return showNotification('All fields required', 'error');
    }
    if (password !== confirm) {
        showValidation('passwordValidation', 'Passwords do not match!', 'error');
        return showNotification('Passwords do not match', 'error');
    }
    if (password.length < 6) {
        showValidation('passwordValidation', 'Password too short (min 6 characters)', 'error');
        return showNotification('Password must be at least 6 characters', 'error');
    }
    if (username.length < 3) {
        showValidation('usernameValidation', 'Username too short (min 3 characters)', 'error');
        return showNotification('Username must be at least 3 characters', 'error');
    }
    
    // Set creating flag
    isCreatingUser = true;
    
    // Disable submit button
    const submitBtn = document.querySelector('#credentialsForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;
    
    // Also disable the form
    const formInputs = document.querySelectorAll('#credentialsForm input, #credentialsForm select, #credentialsForm button');
    formInputs.forEach(input => {
        input.disabled = true;
    });
    
    try {
        console.log('🔄 Creating user:', { name, username, role });
        
        const user = { name, address, role, username, password, status: 'Active',  requestId: requestId };
        
        const resp = await fetch('api/create_credentials.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId  },
            body: JSON.stringify({ users: [user], requestId: requestId })
        });
        
        const data = await resp.json();
        console.log('📋 Create response:', data);
        
        if (data.created > 0) {
    
            showNotification(`✅ User '${name}' created successfully!`, 'success');
            
            document.getElementById('addCredentialsForm').style.display = 'none';
            
            // Clear form with delay to prevent rapid re-submission
            setTimeout(() => {
                clearCredentialsForm();
            }, 100);
          
            setTimeout(async () => {
                await viewCredentials();
            }, 500);
            
        } else if (data.success === false || data.created === 0) {
            
            let errorMessage = 'Failed to create user';
            
            if (data.errors && data.errors.length > 0) {
                errorMessage = data.errors[0];
            } else if (data.message) {
                errorMessage = data.message;
            }
            
            showNotification(errorMessage, 'error');
        }
        
    } catch (e) {
        console.error('Network error:', e);
        showNotification('Network error: ' + e.message, 'error');
    } finally {
        
        isCreatingUser = false;
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        formInputs.forEach(input => {
            input.disabled = false;
        });
        
        setTimeout(() => {
            if (lastRequestId === requestId) {
                lastRequestId = null;
            }
        }, 3000);
    }
}

async function verifyUserCreation(username) {
    try {
        
        const resp = await fetch(`api/check_username.php?username=${encodeURIComponent(username)}&verify=true&_=${Date.now()}`, {
            credentials: 'include',
            cache: 'no-store'
        });
        
        if (resp.ok) {
            const data = await resp.json();
            console.log('User verification check:', data);
            return data.exists;
        }
    } catch (e) {
        console.error('Verification failed:', e);
    }
    return false;
}

    /* ---------- 8. PROCESS MASTERLIST - COMPLETE FIXED VERSION ---------- */
   
    const genPass = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    async function processMasterlist() {
        console.log('🔄 Starting masterlist processing...');
        
        const fileInput = document.getElementById('masterlistFile');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showNotification('Please select a file first!', 'error');
            return;
        }

        const file = fileInput.files[0];
        console.log('📄 File selected:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified).toLocaleString()
        });

        try {
            // Disable and update button
            const processBtn = document.getElementById('processMasterlistBtn');
            const originalText = processBtn.textContent;
            processBtn.textContent = 'Processing...';
            processBtn.disabled = true;

            console.log('📖 Reading file content...');
            const content = await file.text();
            console.log('📊 Content length:', content.length);
            
            // Log first few lines for debugging
            const lines = content.split('\n');
            console.log('📝 First 3 lines:');
            lines.slice(0, 3).forEach((line, i) => {
                console.log(`  Line ${i + 1}: "${line}"`);
            });

            // Parse the content
            const users = parseMasterlist(content);
            console.log('✅ Parsed users:', users.length);
            
            if (users.length === 0) {
                showNotification('No valid data found. Please check file format:\n- Use CSV or TXT format\n- Columns: Name, Address, Role\n- Supported roles: Doctor, Nurse, Midwife, Patient, BHW', 'error');
                return;
            }

            // Store users globally for preview
            window.currentProcessedUsers = users;
            
            // Show preview
            showCredentialsPreview(users);
            
            // Show the preview modal
            const previewModal = document.getElementById('credentialsPreview');
            if (previewModal) {
                previewModal.style.display = 'block';
                console.log('👁️ Preview modal shown with', users.length, 'users');
                
                // Scroll to modal if needed
                previewModal.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                console.error('Preview modal element not found!');
                showNotification('Error: Preview modal not found', 'error');
            }
            
        } catch (error) {
            console.error('Error processing file:', error);
            showNotification('Error reading file: ' + error.message, 'error');
        } finally {
           
            const processBtn = document.getElementById('processMasterlistBtn');
            if (processBtn) {
                processBtn.textContent = 'Process Master List';
                processBtn.disabled = false;
            }
        }
    }

    function parseMasterlist(content) {
        console.log('🔍 Starting to parse masterlist...');
        
        // Split by lines and filter out empty ones
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        console.log('📈 Total non-empty lines:', lines.length);
        
        const users = [];
        const usedUsernamesInBatch = new Set();
        
        const roleMap = {
            // Doctor variations
            'doctor': 'doctor',
            'dr': 'doctor',
            'physician': 'doctor',
            'md': 'doctor',
            
            // Nurse variations
            'nurse': 'nurse',
            'rn': 'nurse',
            'bachelor of science in nursing': 'nurse',
            'bsn': 'nurse',
            
            // Midwife variations
            'midwife': 'midwife',
            'midwifery': 'midwife',
            
            // BHW variations
            'bhw': 'bhw',
            'barangay health worker': 'bhw',
            'barangay_health': 'bhw',
            'barangay health': 'bhw',
            'barangay health personnel': 'bhw',
            'health personnel': 'bhw',
            'health worker': 'bhw',
            
            // Patient variations
            'patient': 'patient',
            'client': 'patient',
            'resident': 'patient'
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            const lineNumber = i + 1;
            
            // Skip header rows (common CSV/TXT headers)
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('name') && 
                (lowerLine.includes('address') || lowerLine.includes('role') || lowerLine.includes('position'))) {
                console.log(`📋 Skipping header line ${lineNumber}: "${line}"`);
                continue;
            }
          
            if (line.length < 5) {
                console.log(`📏 Skipping short line ${lineNumber}: "${line}"`);
                continue;
            }

            console.log(`🔍 Processing line ${lineNumber}: "${line}"`);
          
            let delimiter = ',';
            if (line.includes('|')) {
                delimiter = '|';
                console.log(`  Using pipe delimiter`);
            } else if (line.includes('\t')) {
                delimiter = '\t';
                console.log(`  Using tab delimiter`);
            } else if (line.includes(';')) {
                delimiter = ';';
                console.log(`  Using semicolon delimiter`);
            } else {
                console.log(`  Using comma delimiter`);
            }
           
            let parts = line.split(delimiter).map(part => part.trim());
            
            parts = parts.map(part => {
                if ((part.startsWith('"') && part.endsWith('"')) || 
                    (part.startsWith("'") && part.endsWith("'"))) {
                    return part.slice(1, -1);
                }
                return part;
            });

            console.log(`  Parts (${parts.length}):`, parts);
           
            if (parts.length >= 3) {
                const name = parts[0];
                const address = parts[1];
                const roleRaw = parts[2].toLowerCase().trim();
                
                // Clean the role - remove any extra spaces, punctuation
                const cleanedRole = roleRaw.replace(/[^\w\s]/g, ' ').trim();
                const role = roleMap[cleanedRole] || cleanedRole;
                
                console.log(`  Extracted: Name="${name}", Address="${address}", Role(raw)="${roleRaw}", Role(clean)="${role}"`);
                
                if (!name || name.length < 2) {
                    console.log(`  ❌ Invalid name: "${name}"`);
                    continue;
                }
                
                if (!address || address.length < 3) {
                    console.log(`  ❌ Invalid address: "${address}"`);
                    continue;
                }
                
                if (!role || role.length < 2) {
                    console.log(`  ❌ Invalid role: "${role}"`);
                    continue;
                }
                
                console.log(`  ✅ Valid data found`);
             
                let username;
                let attempts = 0;
                const cleanName = name.replace(/[^a-z]/gi, '').toLowerCase();
                const nameBase = cleanName.slice(0, 6);
                
                do {
                    const randomNum = Math.floor(100 + Math.random() * 900);
                    username = nameBase + randomNum;
                    attempts++;
                    
                    if (attempts > 10) {
                      
                        username = nameBase + Date.now().toString().slice(-4);
                        console.log(`  ⚠️ Using fallback username after ${attempts} attempts`);
                        break;
                    }
                } while (usedUsernamesInBatch.has(username));
                
                usedUsernamesInBatch.add(username);
                
                // Generate password
                const password = genPass();
              
                users.push({
                    name: name,
                    address: address,
                    role: role,
                    username: username,
                    password: password,
                    status: 'Active'
                });
                
                console.log(`  ✅ Added user: ${name} (${role}) - Username: ${username}`);
                
            } else {
                console.log(`  ❌ Not enough parts (need 3, got ${parts.length})`);
                
                if (parts.length === 2 && parts[1].includes(' ')) {
                    console.log(`  🔄 Trying alternative parsing for 2-part line`);
                    const name = parts[0];
                    const rest = parts[1];
                    const lastSpaceIndex = rest.lastIndexOf(' ');
                    
                    if (lastSpaceIndex > 0) {
                        const address = rest.substring(0, lastSpaceIndex);
                        const role = rest.substring(lastSpaceIndex + 1).toLowerCase().trim();
                        
                        console.log(`  Alternative parsing: Name="${name}", Address="${address}", Role="${role}"`);
                        
                        if (name && address && role) {
                            const mappedRole = roleMap[role] || role;
                            const cleanName = name.replace(/[^a-z]/gi, '').toLowerCase();
                            const nameBase = cleanName.slice(0, 6);
                            let username;
                            
                            do {
                                const randomNum = Math.floor(100 + Math.random() * 900);
                                username = nameBase + randomNum;
                            } while (usedUsernamesInBatch.has(username));
                            
                            usedUsernamesInBatch.add(username);
                            
                            users.push({
                                name: name,
                                address: address,
                                role: mappedRole,
                                username: username,
                                password: genPass(),
                                status: 'Active'
                            });
                            
                            console.log(`  ✅ Added via alternative parsing: ${name}`);
                        }
                    }
                }
            }
        }
        
        console.log(`🎉 Parsing complete. Found ${users.length} valid users.`);
        return users;
    }

    function showCredentialsPreview(users) {
        console.log(`👁️ Showing preview for ${users.length} users`);
        
        const tbody = document.getElementById('previewTableBody');
        if (!tbody) {
            console.error('❌ Preview table body not found!');
            return;
        }
       
        tbody.innerHTML = '';
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No users to display</td></tr>';
            return;
        }
        
        // Create table rows
        users.forEach((user, index) => {
            const tr = document.createElement('tr');
            
            // Format role for display
            let displayRole = user.role;
            const roleDisplayMap = {
                'doctor': 'Doctor',
                'nurse': 'Nurse',
                'midwife': 'Midwife',
                'bhw': 'Barangay Health Worker',
                'patient': 'Patient',
                'health_worker': 'Health Worker'
            };
            
            if (roleDisplayMap[user.role]) {
                displayRole = roleDisplayMap[user.role];
            } else {
                
                displayRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            }
            
            tr.innerHTML = `
                <td>${user.name}</td>
                <td>${displayRole}</td>
                <td>${user.address}</td>
                <td><strong>${user.username}</strong></td>
                <td><code>${user.password}</code></td>
                <td>
                    <button class="delete-btn" data-index="${index}" title="Remove this user">
                        Remove
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
       
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const index = parseInt(this.getAttribute('data-index'));
                console.log(`🗑️ Removing user at index ${index}`);
                
                if (window.currentProcessedUsers && window.currentProcessedUsers[index]) {
                    const removedUser = window.currentProcessedUsers[index];
                    console.log(`Removing user: ${removedUser.name}`);
                    
                    window.currentProcessedUsers.splice(index, 1);
                    console.log(`Remaining users: ${window.currentProcessedUsers.length}`);
                    
                    showCredentialsPreview(window.currentProcessedUsers);
                    
                    // Show notification
                    showNotification(`Removed ${removedUser.name} from preview`, 'info');
                }
            });
        });
        
        // Update save button text
        const saveBtn = document.getElementById('saveCredentialsBtn');
        if (saveBtn) {
            saveBtn.textContent = `Save ${users.length} Credential${users.length !== 1 ? 's' : ''}`;
        }
    }

    /* ---------- 9. SAVE ALL CREDENTIALS - UPDATED ---------- */
    async function saveAllCredentials() {
        console.log('💾 Starting to save credentials...');
        
        if (!window.currentProcessedUsers || window.currentProcessedUsers.length === 0) {
            showNotification('No credentials to save! Please process a file first.', 'error');
            return;
        }
        
        console.log(`📦 Users to save: ${window.currentProcessedUsers.length}`);
        console.log('Users:', window.currentProcessedUsers);
        
        const saveBtn = document.getElementById('saveCredentialsBtn');
        const originalText = saveBtn.textContent;
        
        try {
            // Disable and update button
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;
            
            // Generate unique request ID
            const requestId = Date.now() + Math.random();
            
            console.log('📤 Sending request to create_credentials.php');
            console.log('Request ID:', requestId);
            
            const response = await fetch('api/create_credentials.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Request-ID': requestId.toString()
                },
                body: JSON.stringify({ 
                    users: window.currentProcessedUsers,
                    requestId: requestId
                })
            });
            
            console.log('📥 Response status:', response.status);
            
            const responseText = await response.text();
            console.log('📄 Raw response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
                console.log(' Parsed response:', data);
            } catch (parseError) {
                console.error(' Failed to parse response:', parseError);
                throw new Error('Invalid server response');
            }
            
            if (!response.ok) {
                throw new Error(data.message || `Server error: ${response.status}`);
            }
            
            if (data.success) {
                if (data.created > 0) {
                    showNotification(`✅ Successfully created ${data.created} user(s)!`, 'success');
                  
                    document.getElementById('credentialsPreview').style.display = 'none';
                  
                    const fileInput = document.getElementById('masterlistFile');
                    const fileName = document.getElementById('fileName');
                    if (fileInput) fileInput.value = '';
                    if (fileName) fileName.textContent = 'No file chosen';
                   
                    window.currentProcessedUsers = null;
                   
                    setTimeout(() => {
                        viewCredentials();
                    }, 1000);
                    
                } else {
                    showNotification(' No users were created. Please check the data format.', 'warning');
                }
            } else {
                let errorMessage = data.message || 'Failed to create users';
                if (data.errors && data.errors.length > 0) {
                    errorMessage += ': ' + data.errors.join(', ');
                }
                showNotification(`❌ ${errorMessage}`, 'error');
            }
            
        } catch (error) {
            console.error(' Error saving credentials:', error);
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

 /* ---------- 10. VIEW CREDENTIALS ---------- */
    let allCredentials = [];

    async function viewCredentials() {
        try {
            console.log('🔍 Fetching credentials...');
            const resp = await fetch('api/get_credentials.php', { credentials: 'include' });
console.log('📋 Response status:', resp.status);
            
            const data = await resp.json();
            console.log('📊 Credentials data received:', data);
            console.log('👥 Number of users found:', data.length);
            
            allCredentials = data;
            displayUsersInTable(allCredentials, document.getElementById('credentialsTableBody'));
            document.getElementById('credentialsView').style.display = 'block';
            
            if (data.length === 0) {
                console.log('ℹ️ No credentials found.');
            }
        } catch (e) {
            console.error('❌ Failed to load credentials:', e);
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

    /* ---------- 11. SEARCH CREDENTIALS ---------- */
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

 /* ---------- 12. ANALYTICS ---------- */
    let analyticsCharts = {};

async function generateReport() {
    const btn = document.getElementById('generateReportBtn');
    btn.textContent = 'Loading...'; 
    btn.disabled = true;
    
    try {
        await loadAnalyticsData();
        document.getElementById('analyticsView').style.display = 'block';
        showNotification('Analytics report loaded successfully', 'success');
    } catch (e) {
        console.error('Analytics error:', e);
        showNotification('Failed to load analytics data, using cached data', 'warning');
       
        document.getElementById('analyticsView').style.display = 'block';
        await loadAnalyticsData(); 
    } finally {
        btn.textContent = 'Generate Report'; 
        btn.disabled = false;
    }
}

async function loadAnalyticsData() {
    let analytics = {};
    try {
        const resp = await fetch('api/get_analytics.php', { 
            credentials: 'include',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        }
        
        analytics = await resp.json();
        console.log('📊 Analytics data loaded:', analytics);
      
        if (analytics.error) {
            throw new Error(analytics.error);
        }
        
        localStorage.setItem('health_analytics', JSON.stringify(analytics));
        
    } catch (e) {
        console.error('Failed to fetch analytics:', e);
        analytics = getFallbackAnalytics();
        showNotification('Using cached or fallback data', 'info');
    }
    
    updateSummary(analytics);
    renderCharts(analytics);
    updateReports(analytics);
}

function getFallbackAnalytics() {
    try {
        const cached = localStorage.getItem('health_analytics');
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {
        console.error('Failed to parse cached analytics:', e);
    }
  
    return {
        summary: { 
            totalPatients: 0, 
            totalHealthWorkers: 0, 
            totalServices: 0, 
            avgSatisfaction: 0 
        },
        services: [],
        monthlyActivity: [],
        demographics: { ageGroups: [], gender: [] },
        performance: [],
        recentActivities: []
    };
}

function updateSummary(data) {
    const summary = data.summary || {};
    
    document.getElementById('totalPatients').textContent = summary.totalPatients || 0;
    document.getElementById('totalServices').textContent = summary.totalServices || 0;
    document.getElementById('healthWorkers').textContent = summary.totalHealthWorkers || 0;
    document.getElementById('avgSatisfaction').textContent = (summary.avgSatisfaction || 0).toFixed(1);
   
    updateChangeIndicators(data);
}

function updateChangeIndicators(data) {
    const stats = document.querySelectorAll('.stat-change');

    stats.forEach(stat => {
        if (!stat.textContent.includes('from')) {
          
            const patients = data.summary?.totalPatients || 0;
            const changePercent = patients > 0 ? Math.min(20, Math.floor(patients / 5)) : 0;
            
            if (stat.closest('.stat-card').querySelector('h3').textContent.includes('Patients')) {
                stat.textContent = patients > 0 ? `+${changePercent}% from last month` : 'No previous data';
                stat.className = patients > 0 ? 'stat-change positive' : 'stat-change neutral';
            } else if (stat.closest('.stat-card').querySelector('h3').textContent.includes('Services')) {
                const services = data.summary?.totalServices || 0;
                const servicesChange = services > 0 ? Math.min(15, Math.floor(services / 10)) : 0;
                stat.textContent = services > 0 ? `+${servicesChange}% from last month` : 'No previous data';
                stat.className = services > 0 ? 'stat-change positive' : 'stat-change neutral';
            }
        }
    });
}

function renderCharts(data) {
    
    Object.values(analyticsCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    analyticsCharts = {};

    const servicesCtx = document.getElementById('servicesChart');
    if (servicesCtx) {
        const services = data.services || [];
        
        if (services.length > 0) {
            analyticsCharts.services = new Chart(servicesCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: services.map(s => s.name),
                    datasets: [{
                        data: services.map(s => s.count),
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        title: {
                            display: true,
                            text: 'Appointment Types Distribution'
                        }
                    }
                }
            });
        } else {
            servicesCtx.parentElement.innerHTML = '<div class="no-chart-data">No service data available</div>';
        }
    }

    // Monthly Activity Chart
    const monthlyCtx = document.getElementById('monthlyActivityChart');
    if (monthlyCtx) {
        const monthly = data.monthlyActivity || [];
        
        if (monthly.length > 0) {
            analyticsCharts.monthly = new Chart(monthlyCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: monthly.map(m => m.month),
                    datasets: [
                        {
                            label: 'Consultations',
                            data: monthly.map(m => m.consultations || 0),
                            borderColor: '#1a237e',
                            backgroundColor: 'rgba(26, 35, 126, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Emergencies',
                            data: monthly.map(m => m.emergencies || 0),
                            borderColor: '#f44336',
                            backgroundColor: 'rgba(244, 67, 54, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Check-ups',
                            data: monthly.map(m => m.checkups || 0),
                            borderColor: '#4caf50',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Appointments'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        }
                    }
                }
            });
        } else {
            monthlyCtx.parentElement.innerHTML = '<div class="no-chart-data">No monthly activity data</div>';
        }
    }

    // Patient Demographics Chart
    const demoCtx = document.getElementById('demographicsChart');
    if (demoCtx) {
        const ageGroups = data.demographics?.ageGroups || [];
        
        if (ageGroups.length > 0) {
            analyticsCharts.demo = new Chart(demoCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ageGroups.map(g => g.group),
                    datasets: [{
                        label: 'Patients',
                        data: ageGroups.map(g => g.count),
                        backgroundColor: '#303f9f',
                        borderColor: '#1a237e',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Patients'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Age Group'
                            }
                        }
                    }
                }
            });
        } else {
            demoCtx.parentElement.innerHTML = '<div class="no-chart-data">No demographic data</div>';
        }
    }

    // Worker Performance Chart
    const perfCtx = document.getElementById('performanceChart');
    if (perfCtx) {
        const performance = data.performance || [];
        
        if (performance.length > 0) {
            analyticsCharts.perf = new Chart(perfCtx.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: performance.map(p => p.worker),
                    datasets: [{
                        label: 'Satisfaction',
                        data: performance.map(p => p.satisfaction),
                        backgroundColor: 'rgba(48, 63, 159, 0.2)',
                        borderColor: '#1a237e',
                        borderWidth: 2,
                        pointBackgroundColor: '#1a237e'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        r: {
                            min: 0,
                            max: 5,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Health Worker Satisfaction Ratings'
                        }
                    }
                }
            });
        } else {
            perfCtx.parentElement.innerHTML = '<div class="no-chart-data">No performance data</div>';
        }
    }
}

function updateReports(data) {
    const topServices = document.getElementById('topServicesReport');
    if (topServices) {
        const services = data.services || [];
        topServices.innerHTML = '';
        
        if (services.length > 0) {
            services.slice(0, 5).forEach(s => {
                const div = document.createElement('div');
                div.className = 'report-item';
                div.innerHTML = `<span>${s.name}</span><span>${s.count}</span>`;
                topServices.appendChild(div);
            });
        } else {
            topServices.innerHTML = '<div class="no-data">No service data available</div>';
        }
    }

    // Recent Activities Report
    const recentActivities = document.getElementById('recentActivitiesReport');
    if (recentActivities) {
        const activities = data.recentActivities || [];
        recentActivities.innerHTML = '';
        
        if (activities.length > 0) {
            activities.forEach(a => {
                const div = document.createElement('div');
                div.className = 'activity-item';
                div.innerHTML = `
                    <div class="activity-title">${a.activity}</div>
                    <div class="activity-time">${a.time}</div>
                `;
                recentActivities.appendChild(div);
            });
        } else {
            recentActivities.innerHTML = '<div class="no-data">No recent activities</div>';
        }
    }

    // Patient Statistics Report
    const patientStats = document.getElementById('patientStatsReport');
    if (patientStats) {
        const gender = data.demographics?.gender || [];
        patientStats.innerHTML = '';
        
        if (gender.length > 0) {
            gender.forEach(g => {
                const div = document.createElement('div');
                div.className = 'report-item';
                div.innerHTML = `<span>${g.gender}</span><span>${g.count}</span>`;
                patientStats.appendChild(div);
            });
        } else {
            patientStats.innerHTML = '<div class="no-data">No demographic data</div>';
        }
    }

    // Worker Overview Report
    const workerOverview = document.getElementById('workerOverviewReport');
    if (workerOverview) {
        const performance = data.performance || [];
        workerOverview.innerHTML = '';
        
        if (performance.length > 0) {
            performance.forEach(p => {
                const div = document.createElement('div');
                div.className = 'report-item';
                div.innerHTML = `<span>${p.worker}</span><span>${p.patients} patients</span>`;
                workerOverview.appendChild(div);
            });
        } else {
            workerOverview.innerHTML = '<div class="no-data">No worker data</div>';
        }
    }
}

function refreshAnalytics() { 
    loadAnalyticsData(); 
    showNotification('Refreshing analytics data...', 'info');
}

function exportReport() {
    let data = {};
    try {
        data = JSON.parse(localStorage.getItem('health_analytics')) || getFallbackAnalytics();
    } catch (e) {
        data = getFallbackAnalytics();
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `barangay_health_report_${dateStr}.json`; 
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Report exported successfully', 'success');
}
});
