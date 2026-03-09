/**
 * Campus Connect - Frontend Application Logic (LocalStorage Mock Backend)
 */

const app = {
    state: {
        user: null, // {id, fullName, role, email}
        token: null,
        currentView: 'home',
        resources: [],
        currentCategory: 'All',
        searchTerm: ''
    },

    // Mock API Base URL removed to prevent "Failed to fetch"

    // Initialization
    init() {
        this.initMockDB();

        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            this.state.token = storedToken;
            this.state.user = JSON.parse(storedUser);
            this.updateNavUI();
            this.navigate('home');
        } else {
            this.navigate('auth');
        }

        // Delay attach image uploads drag-drop logic slightly to ensure DOM is ready
        setTimeout(() => this.initImageUploads(), 100);
    },

    initMockDB() {
        if (!localStorage.getItem('users_db')) {
            const users = [
                { id: 1, fullName: 'System Admin', email: 'admin@campus.edu', password: 'admin', role: 'admin' },
                { id: 2, fullName: 'Student User', email: 'student@campus.edu', password: 'password', role: 'student' }
            ];
            localStorage.setItem('users_db', JSON.stringify(users));
        }

        if (!localStorage.getItem('resources_db')) {
            const resources = [
                { id: 1, title: 'Engineering Mathematics Vol 1', category: 'Books', item_condition: 'Good', ownership_type: 'sell', price: 450, owner_name: 'Student User', owner_id: 2, status: 'available' },
                { id: 2, title: 'Casio Scientific Calculator FX-991', category: 'Electronics', item_condition: 'Like New', ownership_type: 'sell', price: 800, owner_name: 'System Admin', owner_id: 1, status: 'available' },
                { id: 3, title: 'Data Structures Handwritten Notes', category: 'Notes', item_condition: 'Fair', ownership_type: 'share', price: 0, owner_name: 'Student User', owner_id: 2, status: 'available' }
            ];
            localStorage.setItem('resources_db', JSON.stringify(resources));
        }

        if (!localStorage.getItem('requests_db')) {
            localStorage.setItem('requests_db', JSON.stringify([]));
        }

        if (!localStorage.getItem('notifications_db')) {
            localStorage.setItem('notifications_db', JSON.stringify([]));
        }

        if (!localStorage.getItem('favorites_db')) {
            localStorage.setItem('favorites_db', JSON.stringify([]));
        }
    },

    // Navigation and Routing
    navigate(viewId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

        if ((viewId === 'create' || viewId === 'home') && !this.state.user) {
            this.showToast('Please login to access this page', 'error');
            viewId = 'auth';
        }

        if (viewId === 'admin') {
            if (!this.state.user || this.state.user.role !== 'admin') {
                this.showToast('Admin access required', 'error');
                viewId = 'home';
            } else {
                this.loadAdminData('users');
            }
        }

        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        this.state.currentView = viewId;

        if (viewId === 'home') this.loadResources();

        this.updateNavUI();
    },

    updateNavUI() {
        const { user } = this.state;
        const searchBar = document.getElementById('nav-search');
        const sellBtn = document.getElementById('nav-sell-btn');
        const adminBtn = document.getElementById('nav-admin-btn');
        const profileInfo = document.getElementById('nav-profile');
        const navNotifications = document.getElementById('nav-notifications');
        const loginBtn = document.getElementById('nav-login-btn');

        if (user) {
            searchBar.classList.remove('hidden');
            sellBtn.classList.remove('hidden');
            profileInfo.classList.remove('hidden');
            if (navNotifications) navNotifications.classList.remove('hidden');
            document.getElementById('nav-username') && (document.getElementById('nav-username').textContent = user.fullName);
            loginBtn.classList.add('hidden');

            if (user.role === 'admin') adminBtn.classList.remove('hidden');
            else adminBtn.classList.add('hidden');

            if (user.profile_picture_url) {
                profileInfo.innerHTML = `<img src="http://localhost:5000${user.profile_picture_url}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`;
            } else {
                profileInfo.innerHTML = `<i class="fa-regular fa-user"></i>`;
            }

            this.updateNotificationBadge();
        } else {
            searchBar.classList.add('hidden');
            sellBtn.classList.add('hidden');
            adminBtn.classList.add('hidden');
            profileInfo.classList.add('hidden');
            if (navNotifications) navNotifications.classList.add('hidden');
            loginBtn.classList.remove('hidden');
        }
    },

    updateNotificationBadge() {
        if (!this.state.user) return;
        const notifications = JSON.parse(localStorage.getItem('notifications_db')) || [];
        const myUnread = notifications.filter(n => n.user_id === this.state.user.id && !n.is_read);
        const dot = document.getElementById('notification-dot');
        if (dot) {
            if (myUnread.length > 0) {
                dot.classList.remove('hidden');
            } else {
                dot.classList.add('hidden');
            }
        }
    },

    toggleNotificationPanel() {
        if (!this.state.user) return;

        const panel = document.getElementById('notification-side-panel');
        const overlay = document.getElementById('notification-panel-overlay');

        if (panel.classList.contains('hidden')) {
            // Open panel
            panel.classList.remove('hidden');
            overlay.classList.remove('hidden');
            this.renderNotifications();
        } else {
            // Close panel
            panel.classList.add('hidden');
            overlay.classList.add('hidden');
        }
    },

    renderNotifications() {
        const list = document.getElementById('notification-list');
        const notifications = JSON.parse(localStorage.getItem('notifications_db')) || [];
        const myNotifs = notifications.filter(n => n.user_id === this.state.user.id).sort((a, b) => b.id - a.id);

        if (myNotifs.length === 0) {
            list.innerHTML = `
                <div class="empty-notifications">
                    <i class="fa-regular fa-bell-slash"></i>
                    <p>No new notifications</p>
                </div>
            `;
        } else {
            list.innerHTML = '';
            myNotifs.forEach(notif => {
                const card = document.createElement('div');
                card.className = 'notification-card';

                if (notif.type === 'request') {
                    card.innerHTML = `
                        <div class="notif-header">
                            <div class="notif-icon"><i class="fa-solid fa-code-pull-request"></i></div>
                            <span>New request for your listing: <strong>${notif.listing_title}</strong></span>
                        </div>
                        <div class="notif-body">
                            <p><strong>Requester:</strong> ${notif.requester_name}</p>
                            <p><strong>Phone:</strong> ${notif.requester_phone}</p>
                            <div style="display:flex; gap:0.5rem; margin-top: 0.2rem; margin-bottom: 0.5rem;">
                              <span class="req-badge badge-pending" style="font-size: 0.75rem; background: rgba(59,130,246,0.1); color: var(--primary); padding: 0.1rem 0.4rem;">${notif.requester_department || 'Dept N/A'}</span>
                              <span class="req-badge badge-approved" style="font-size: 0.75rem; padding: 0.1rem 0.4rem;">${notif.requester_year || 'Year N/A'}</span>
                            </div>
                        </div>
                        ${notif.status === 'pending' ? `
                            <div class="notif-actions">
                                <button class="btn btn-pill btn-success" onclick="app.acceptRequest(${notif.id})">Accept & Contact</button>
                                <button class="btn btn-pill btn-secondary" onclick="app.declineRequest(${notif.id})">Decline</button>
                            </div>
                        ` : `
                            <div class="notif-actions" style="justify-content:center; color: var(--text-muted); font-size:0.85rem; background: #F1F5F9; padding: 0.5rem; border-radius: 50px;">
                                This request has been ${notif.status}.
                            </div>
                        `}
                    `;
                } else {
                    card.innerHTML = `
                        <div class="notif-header">
                            <div class="notif-icon"><i class="fa-solid fa-info"></i></div>
                            <span>System Notification</span>
                        </div>
                        <div class="notif-body">
                            <p>${notif.message}</p>
                        </div>
                    `;
                }
                list.appendChild(card);
            });
            // Mark all as read when rendered
            const updatedNotifs = notifications.map(n => n.user_id === this.state.user.id ? { ...n, is_read: true } : n);
            localStorage.setItem('notifications_db', JSON.stringify(updatedNotifs));
            this.updateNotificationBadge();
        }
    },

    async acceptRequest(notifId) {
        let notifications = JSON.parse(localStorage.getItem('notifications_db')) || [];
        let notifIndex = notifications.findIndex(n => n.id === notifId);
        if (notifIndex > -1) {
            const notif = notifications[notifIndex];
            notif.status = 'accepted';
            localStorage.setItem('notifications_db', JSON.stringify(notifications));

            // Link status back to the actual request in localStorage
            let requests = JSON.parse(localStorage.getItem('requests_db')) || [];
            let reqIndex = -1;
            if (notif.request_id) {
                reqIndex = requests.findIndex(r => r.id === notif.request_id);
            } else {
                // Fallback for existing old mock objects
                reqIndex = requests.findIndex(r => r.resource_title === notif.listing_title && r.requester_name === notif.requester_name && r.status === 'pending');
            }
            if (reqIndex > -1) {
                requests[reqIndex].status = 'accepted';
                localStorage.setItem('requests_db', JSON.stringify(requests));
            }

            // Optional Backend call 
            if (this.state.token && this.state.token.split('.').length === 3) {
                try {
                    await fetch(`http://localhost:5000/api/requests/${notif.request_id || (requests[reqIndex] ? requests[reqIndex].id : 0)}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.state.token}` },
                        body: JSON.stringify({ status: 'accepted' })
                    });
                } catch (e) { console.error("Backend sync failed:", e); }
            }

            const phone = notif.requester_phone;
            this.showToast('Request accepted! You can now contact them.', 'success');
            this.renderNotifications();

            // Simulating opening WhatsApp link or email using a timeout
            setTimeout(() => {
                const message = encodeURIComponent(`Hi ${notif.requester_name}, I saw your request for my listing "${notif.listing_title}" on Campus Connect.`);
                alert(`Simulating contact link:\nhttps://wa.me/${phone}?text=${message}`);
            }, 500);
        }
    },

    async declineRequest(notifId) {
        let notifications = JSON.parse(localStorage.getItem('notifications_db')) || [];
        let notifIndex = notifications.findIndex(n => n.id === notifId);
        if (notifIndex > -1) {
            const notif = notifications[notifIndex];
            notif.status = 'declined';
            localStorage.setItem('notifications_db', JSON.stringify(notifications));

            // Link status back to actual request
            let requests = JSON.parse(localStorage.getItem('requests_db')) || [];
            let reqIndex = -1;
            if (notif.request_id) {
                reqIndex = requests.findIndex(r => r.id === notif.request_id);
            } else {
                reqIndex = requests.findIndex(r => r.resource_title === notif.listing_title && r.requester_name === notif.requester_name && r.status === 'pending');
            }
            if (reqIndex > -1) {
                requests[reqIndex].status = 'declined';
                localStorage.setItem('requests_db', JSON.stringify(requests));
            }

            // Optional Backend call
            if (this.state.token && this.state.token.split('.').length === 3) {
                try {
                    await fetch(`http://localhost:5000/api/requests/${notif.request_id || (requests[reqIndex] ? requests[reqIndex].id : 0)}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.state.token}` },
                        body: JSON.stringify({ status: 'declined' })
                    });
                } catch (e) { console.error("Backend sync failed:", e); }
            }

            this.showToast('Request declined.', 'info');
            this.renderNotifications();
        }
    },

    /* ==================== AUTHENTICATION ==================== */
    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.tab-btn[onclick="app.switchAuthTab('${tab}')"]`).classList.add('active');

        if (tab === 'login') {
            document.getElementById('form-login').classList.remove('hidden');
            document.getElementById('form-signup').classList.add('hidden');
            // reset signup flow
            document.getElementById('signup-step-1').classList.remove('hidden');
            document.getElementById('signup-step-2').classList.add('hidden');
            if (this._resendInterval) clearInterval(this._resendInterval);
        } else {
            document.getElementById('form-login').classList.add('hidden');
            document.getElementById('form-signup').classList.remove('hidden');
        }
    },

    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const users = JSON.parse(localStorage.getItem('users_db'));
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            this.setSession('mock_token_' + Date.now(), {
                id: user.id,
                fullName: user.fullName,
                role: user.role,
                email: user.email,
                department: user.department,
                year_of_study: user.year_of_study,
                profile_picture_url: user.profile_picture_url
            });
            localStorage.setItem('userAvatar', user.profile_picture_url || '');

            this.showToast('Login successful!', 'success');
            this.navigate('home');
        } else {
            this.showToast('Invalid email or password', 'error');
        }
    },

    async handleSignup(e) {
        e.preventDefault();
        const fullName = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const department = document.getElementById('signup-dept').value;
        const yearOfStudy = document.getElementById('signup-year').value;

        // Front-end Domain Validation
        const emailError = document.getElementById('email-error');
        if (!email.toLowerCase().endsWith('@cea.ac.in')) {
            emailError.classList.remove('hidden');
            return;
        } else {
            emailError.classList.add('hidden');
        }

        const users = JSON.parse(localStorage.getItem('users_db'));
        if (users.find(u => u.email === email)) {
            this.showToast('Email already registered', 'error');
            return;
        }

        const btn = document.getElementById('btn-send-otp');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';
        btn.disabled = true;

        try {
            // Trigger Real Backend OTP 
            const response = await fetch('http://localhost:5000/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send OTP');
            }

            this.showToast('OTP verification code sent to your email', 'info');

            // Advance UI
            document.getElementById('signup-step-1').classList.add('hidden');
            document.getElementById('signup-step-2').classList.remove('hidden');

            // Store temporarily for verify payload
            this.state._tempSignupEmail = email;
            this.state._tempSignupName = fullName;
            this.state._tempSignupPass = password;
            this.state._tempSignupDept = department;
            this.state._tempSignupYear = yearOfStudy;

            this.startResendTimer();
        } catch (error) {
            this.showToast(error.message, 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    backToSignupStep1() {
        document.getElementById('signup-step-1').classList.remove('hidden');
        document.getElementById('signup-step-2').classList.add('hidden');
        if (this._resendInterval) clearInterval(this._resendInterval);
        document.getElementById('btn-send-otp').disabled = false;
        document.getElementById('btn-send-otp').textContent = "Send Verification OTP";
    },

    startResendTimer() {
        let timeLeft = 60;
        const resendContainer = document.getElementById('resend-container');
        resendContainer.innerHTML = `<span style="color:var(--text-muted); font-size:0.85rem;">Wait ${timeLeft}s before resending</span>`;

        if (this._resendInterval) clearInterval(this._resendInterval);

        this._resendInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(this._resendInterval);
                resendContainer.innerHTML = `<button type="button" class="btn-text" onclick="app.resendOTP()" style="color:var(--primary); padding:0;">Re-send Code</button>`;
            } else {
                resendContainer.innerHTML = `<span style="color:var(--text-muted); font-size:0.85rem;">Wait ${timeLeft}s before resending</span>`;
            }
        }, 1000);
    },

    async resendOTP() {
        const email = this.state._tempSignupEmail;
        const fullName = this.state._tempSignupName;
        const password = this.state._tempSignupPass;

        this.showToast('Resending OTP...', 'info');

        try {
            const response = await fetch('http://localhost:5000/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password })
            });

            if (!response.ok) throw new Error('Failed to resend');

            this.showToast('New OTP sent', 'success');
            this.startResendTimer();
        } catch (error) {
            this.showToast('Error resending OTP', 'error');
        }
    },

    async verifyOTP(e) {
        e.preventDefault();
        const otp = document.getElementById('signup-otp').value;
        const email = this.state._tempSignupEmail;

        const btn = document.getElementById('btn-verify-otp');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying...';
        btn.disabled = true;

        try {
            const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Invalid verification code');
            }

            // Also mock-add them locally so they can log in seamlessly
            const users = JSON.parse(localStorage.getItem('users_db')) || [];
            users.push({
                id: Date.now(),
                fullName: this.state._tempSignupName,
                email: this.state._tempSignupEmail,
                password: this.state._tempSignupPass,
                department: this.state._tempSignupDept,
                year_of_study: this.state._tempSignupYear,
                role: 'student'
            });
            localStorage.setItem('users_db', JSON.stringify(users));

            this.showToast('Account verified and created successfully!', 'success');

            // Clean up
            delete this.state._tempSignupEmail;
            delete this.state._tempSignupName;
            delete this.state._tempSignupPass;
            delete this.state._tempSignupDept;
            delete this.state._tempSignupYear;
            delete this.state._tempSignupPass;

            // Switch back to login view smoothly
            document.getElementById('signup-step-1').classList.remove('hidden');
            document.getElementById('signup-step-2').classList.add('hidden');
            document.getElementById('form-signup').reset();
            this.switchAuthTab('login');
            // prefill email
            document.getElementById('login-email').value = email;

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    setSession(token, user) {
        this.state.token = token;
        this.state.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    toggleProfilePanel() {
        if (!this.state.user) return;

        const panel = document.getElementById('profile-side-panel');
        const overlay = document.getElementById('profile-panel-overlay');

        if (panel.classList.contains('hidden')) {
            // Open panel
            document.getElementById('panel-user-name').textContent = this.state.user.fullName;
            document.getElementById('panel-user-email').textContent = this.state.user.email;
            document.getElementById('panel-user-role').textContent = this.state.user.role;

            const deptEl = document.getElementById('panel-user-dept');
            const yearEl = document.getElementById('panel-user-year');
            if (deptEl) deptEl.textContent = this.state.user.department || 'Dept N/A';
            if (yearEl) yearEl.textContent = this.state.user.year_of_study || 'Year N/A';

            if (this.state.user.profile_picture_url) {
                document.getElementById('panel-user-avatar-icon').style.display = 'none';
                document.getElementById('panel-user-avatar-img').style.display = 'block';
                document.getElementById('panel-user-avatar-img').src = `http://localhost:5000${this.state.user.profile_picture_url}`;
            } else {
                document.getElementById('panel-user-avatar-icon').style.display = 'flex';
                document.getElementById('panel-user-avatar-img').style.display = 'none';
            }

            // Reset to default view
            this.showDefaultProfileView();

            panel.classList.remove('hidden');
            overlay.classList.remove('hidden');
        } else {
            // Close panel
            panel.classList.add('hidden');
            overlay.classList.add('hidden');
        }
    },

    openEditProfileModal() {
        if (!this.state.user) return;

        document.getElementById('edit-profile-email').value = this.state.user.email;
        document.getElementById('edit-profile-name').value = this.state.user.fullName;
        document.getElementById('edit-profile-dept').value = this.state.user.department || '';
        document.getElementById('edit-profile-year').value = this.state.user.year_of_study || '1st Year';

        const previewImg = document.getElementById('edit-profile-preview');
        const placeholderIcon = document.getElementById('edit-profile-placeholder-icon');

        if (this.state.user.profile_picture_url) {
            previewImg.src = `http://localhost:5000${this.state.user.profile_picture_url}`;
            previewImg.style.display = 'block';
            placeholderIcon.style.display = 'none';
        } else {
            previewImg.src = '';
            previewImg.style.display = 'none';
            placeholderIcon.style.display = 'block';
        }

        document.getElementById('edit-profile-modal').classList.remove('hidden');
    },

    closeEditProfileModal() {
        document.getElementById('edit-profile-modal').classList.add('hidden');
        document.getElementById('form-edit-profile').reset();
        document.getElementById('edit-profile-image').value = '';
    },

    previewProfileImage(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImg = document.getElementById('edit-profile-preview');
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                document.getElementById('edit-profile-placeholder-icon').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    },

    async submitEditProfile(e) {
        e.preventDefault();

        const btn = document.getElementById('btn-save-profile');
        const btnText = document.getElementById('btn-save-profile-text');
        const spinner = document.getElementById('btn-save-profile-spinner');

        btn.disabled = true;
        btnText.textContent = 'Saving...';
        spinner.classList.remove('hidden');

        try {
            const formData = new FormData();
            formData.append('fullName', document.getElementById('edit-profile-name').value);
            formData.append('department', document.getElementById('edit-profile-dept').value);
            formData.append('yearOfStudy', document.getElementById('edit-profile-year').value);

            const fileInput = document.getElementById('edit-profile-image');
            if (fileInput.files.length > 0) {
                formData.append('profile_picture', fileInput.files[0]);
            }

            const response = await fetch('http://localhost:5000/api/users/me/edit', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                },
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update profile');
            }

            const result = await response.json();

            // Re-fetch user profile to get fully updated session
            this.state.user.fullName = result.user.full_name;
            this.state.user.department = result.user.department;
            this.state.user.year_of_study = result.user.year_of_study;
            if (result.user.profile_picture_url) {
                this.state.user.profile_picture_url = result.user.profile_picture_url;
                localStorage.setItem('userAvatar', result.user.profile_picture_url);
            }
            this.setSession(this.state.token, this.state.user);
            this.updateNavUI();

            // Also update local users_db cache for seamless mock testing elsewhere
            const users = JSON.parse(localStorage.getItem('users_db')) || [];
            const userIndex = users.findIndex(u => u.email === this.state.user.email);
            if (userIndex !== -1) {
                users[userIndex].fullName = result.user.full_name;
                users[userIndex].department = result.user.department;
                users[userIndex].year_of_study = result.user.year_of_study;
                if (result.user.profile_picture_url) {
                    users[userIndex].profile_picture_url = result.user.profile_picture_url;
                }
                localStorage.setItem('users_db', JSON.stringify(users));
            }

            this.showToast('Profile updated successfully!', 'success');
            this.closeEditProfileModal();
            this.toggleProfilePanel(); // close and reopen to refresh UI visually
            setTimeout(() => this.toggleProfilePanel(), 300);

        } catch (error) {
            console.error(error);
            this.showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Save Changes';
            spinner.classList.add('hidden');
        }
    },

    showDefaultProfileView() {
        document.getElementById('profile-header-title').textContent = 'User Profile';
        document.getElementById('profile-default-view').classList.remove('hidden');
        document.getElementById('profile-requests-view').classList.add('hidden');
        document.getElementById('profile-favorites-view').classList.add('hidden');
        document.getElementById('profile-mylist-view').classList.add('hidden');
        document.getElementById('menu-btn-requests').classList.remove('active');
        if (document.getElementById('menu-btn-mylist')) {
            document.getElementById('menu-btn-mylist').classList.remove('active');
        }
    },

    showRequestedItems() {
        document.getElementById('profile-header-title').textContent = 'Requested Items';
        document.getElementById('profile-default-view').classList.add('hidden');
        document.getElementById('profile-favorites-view').classList.add('hidden');
        document.getElementById('profile-mylist-view').classList.add('hidden');
        document.getElementById('profile-requests-view').classList.remove('hidden');
        document.getElementById('menu-btn-requests').classList.add('active');
        if (document.getElementById('menu-btn-mylist')) {
            document.getElementById('menu-btn-mylist').classList.remove('active');
        }

        this.renderRequestedItems();
    },

    showMyList() {
        document.getElementById('profile-header-title').textContent = 'My List';
        document.getElementById('profile-default-view').classList.add('hidden');
        document.getElementById('profile-favorites-view').classList.add('hidden');
        document.getElementById('profile-requests-view').classList.add('hidden');
        document.getElementById('profile-mylist-view').classList.remove('hidden');

        document.getElementById('menu-btn-requests').classList.remove('active');
        if (document.getElementById('menu-btn-mylist')) {
            document.getElementById('menu-btn-mylist').classList.add('active');
        }

        this.renderMyList();
    },

    renderRequestedItems() {
        const list = document.getElementById('requested-items-list');
        const requests = JSON.parse(localStorage.getItem('requests_db')) || [];
        const resources = JSON.parse(localStorage.getItem('resources_db')) || [];
        const users = JSON.parse(localStorage.getItem('users_db')) || [];

        // Conceptual JOIN: Filtering requests by user, then mapping to resource and owner info
        const myRequests = requests
            .filter(req => req.requester_id === this.state.user.id)
            .map(req => {
                const resource = resources.find(r => r.id === req.resource_id) || {};
                const owner = users.find(u => u.id === resource.owner_id) || {};
                return {
                    ...req,
                    item_category: resource.category || 'Item',
                    owner_name: owner.fullName || 'Unknown',
                    owner_phone: owner.phone || 'N/A' // Fallback if phone isn't in mock DB directly on user
                };
            })
            .sort((a, b) => b.id - a.id);

        if (myRequests.length === 0) {
            list.innerHTML = `
                <div class="empty-notifications" style="padding: 1rem 0;">
                    <i class="fa-solid fa-ghost"></i>
                    <p>You haven't requested any items yet.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = '';
        myRequests.forEach(req => {
            const dateStr = new Date(req.id).toLocaleDateString(); // id is timestamp
            const isDeclined = req.status === 'declined';
            let statusBadge = '';
            let actionHtml = '';

            const icons = { 'Books': 'fa-book', 'Electronics': 'fa-laptop', 'Notes': 'fa-file-lines', 'Sports': 'fa-basketball', 'Other': 'fa-box-open' };
            const iconClass = icons[req.item_category] || 'fa-box';

            if (req.status === 'pending') {
                statusBadge = `<span class="req-badge badge-pending">Pending</span>`;
                actionHtml = `<button class="btn-cancel-req" onclick="app.cancelRequest(${req.id})">Cancel Request</button>`;
            } else if (req.status === 'accepted') {
                statusBadge = `<span class="req-badge badge-approved">Approved</span>`;
                actionHtml = `<button class="btn-contact-owner" onclick="app.contactOwner('${req.owner_name}', '${req.owner_phone}')">Contact Owner</button>`;
            } else if (req.status === 'declined') {
                statusBadge = `<span class="req-badge badge-declined">Declined</span>`;
            }

            const cardHtml = `
                <div class="request-tracking-card ${isDeclined ? 'status-declined' : ''}">
                    <div class="req-card-header">
                        <div class="req-item-info">
                            <div class="req-thumb"><i class="fa-solid ${iconClass}"></i></div>
                            <div class="req-details">
                                <h5 title="${req.resource_title}">${req.resource_title}</h5>
                                <p>${req.item_category}</p>
                            </div>
                        </div>
                        ${statusBadge}
                    </div>
                    
                    <div class="req-meta">
                        Owner: <strong>${req.owner_name}</strong> &bull; Requested on ${dateStr}
                    </div>

                    ${actionHtml ? `<div class="req-actions">${actionHtml}</div>` : ''}
                </div>
            `;
            list.insertAdjacentHTML('beforeend', cardHtml);
        });
    },

    cancelRequest(reqId) {
        if (!confirm('Are you sure you want to cancel this request?')) return;

        let requests = JSON.parse(localStorage.getItem('requests_db')) || [];
        const reqIndex = requests.findIndex(r => r.id === reqId);
        if (reqIndex > -1) {
            const resourceId = requests[reqIndex].resource_id;
            requests.splice(reqIndex, 1);
            localStorage.setItem('requests_db', JSON.stringify(requests));

            // Revert resource status if it was requested
            let resources = JSON.parse(localStorage.getItem('resources_db')) || [];
            let resIndex = resources.findIndex(r => r.id === resourceId);
            if (resIndex > -1) {
                resources[resIndex].status = 'available';
                localStorage.setItem('resources_db', JSON.stringify(resources));
                this.loadResources(); // refresh home view if needed
            }

            this.showToast('Request cancelled successfully', 'info');
            this.renderRequestedItems();
        }
    },

    contactOwner(ownerName, ownerPhone) {
        const message = encodeURIComponent(`Hi ${ownerName}, my request for your item on Campus Connect was approved!`);
        alert(`Simulating contact link:\nhttps://wa.me/${ownerPhone}?text=${message}`);
    },

    showFavorites() {
        if (!this.state.user) return;
        document.getElementById('profile-header-title').textContent = 'My Favorites';
        document.getElementById('profile-default-view').classList.add('hidden');
        document.getElementById('profile-requests-view').classList.add('hidden');
        document.getElementById('profile-mylist-view').classList.add('hidden');
        document.getElementById('profile-favorites-view').classList.remove('hidden');
        this.renderFavorites();
    },

    renderMyList() {
        const list = document.getElementById('mylist-items-list');
        const resources = JSON.parse(localStorage.getItem('resources_db')) || [];
        const myItems = resources.filter(r => r.owner_id === this.state.user.id).sort((a, b) => b.id - a.id);

        if (myItems.length === 0) {
            list.innerHTML = `
                <div class="empty-notifications" style="padding: 1rem 0;">
                    <i class="fa-solid fa-box-open"></i>
                    <p>You haven't listed any items yet.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = '';
        myItems.forEach(item => {
            const isSell = item.ownership_type === 'sell';
            const badgeClass = isSell ? 'badge-sell' : 'badge-share';
            const icons = { 'Books': 'fa-book', 'Electronics': 'fa-laptop', 'Notes': 'fa-file-lines', 'Sports': 'fa-basketball', 'Other': 'fa-box-open' };
            const iconClass = icons[item.category] || 'fa-box';

            const cardHtml = `
                <div class="request-tracking-card">
                    <div class="req-card-header">
                        <div class="req-item-info">
                            <div class="req-thumb"><i class="fa-solid ${iconClass}"></i></div>
                            <div class="req-details">
                                <h5 title="${item.title}">${item.title}</h5>
                                <p>${item.category} • ${item.item_condition}</p>
                            </div>
                        </div>
                        <span class="req-badge ${badgeClass}">${isSell ? '₹' + item.price : 'Share'}</span>
                    </div>
                    
                    <div class="req-meta">
                        Status: <strong>${item.status}</strong>
                    </div>

                    <div class="req-actions" style="display: flex; gap: 0.5rem; width: 100%;">
                        <button class="btn btn-primary" style="padding: 0.4rem 1rem; flex: 1;" onclick="app.openEditResourceModal(${item.id})">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        <button class="btn btn-outline" style="padding: 0.4rem 1rem; flex: 0 0 auto; border-color: #ef4444; color: #ef4444;" onclick="app.deleteResource(${item.id})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', cardHtml);
        });
    },

    async deleteResource(resourceId) {
        if (!confirm('Are you sure you want to permanently delete this listing?')) return;

        try {
            // If the app is connected to the real backend
            if (this.state.token && this.state.token.split('.').length === 3) { // rudimentary JWT check
                const response = await fetch(`http://localhost:5000/api/resources/${resourceId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.state.token}`
                    }
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to delete from server');
                }
            }
        } catch (err) {
            console.error('API Delete Error:', err);
            // We proceed to delete from local storage anyway for the mock UI to work.
        }

        // Delete from LocalStorage (Mock DB)
        let resources = JSON.parse(localStorage.getItem('resources_db')) || [];
        resources = resources.filter(r => r.id !== resourceId);
        localStorage.setItem('resources_db', JSON.stringify(resources));

        // Delete from related mocks
        let favorites = JSON.parse(localStorage.getItem('favorites_db')) || [];
        favorites = favorites.filter(f => f.listing_id !== resourceId);
        localStorage.setItem('favorites_db', JSON.stringify(favorites));

        let requests = JSON.parse(localStorage.getItem('requests_db')) || [];
        requests = requests.filter(r => r.resource_id !== resourceId);
        localStorage.setItem('requests_db', JSON.stringify(requests));

        this.showToast('Listing deleted completely', 'success');

        // Refresh UI
        this.loadResources();

        // Re-render My List
        this.renderMyList();
    },

    openEditResourceModal(resourceId) {
        const resources = JSON.parse(localStorage.getItem('resources_db')) || [];
        const item = resources.find(r => r.id === resourceId);

        if (!item) return;

        document.getElementById('edit-resource-id').value = item.id;
        document.getElementById('edit-listing-title').value = item.title;
        document.getElementById('edit-listing-category').value = item.category;
        document.getElementById('edit-listing-condition').value = item.item_condition;
        document.getElementById('edit-listing-type').value = item.ownership_type;
        document.getElementById('edit-listing-price').value = item.price || 0;
        document.getElementById('edit-listing-desc').value = item.description || '';

        this.toggleEditPriceField();

        // Ensure side panel overlay is closed properly if we want modal on top cleanly
        document.getElementById('profile-side-panel').classList.add('hidden');
        document.getElementById('profile-panel-overlay').classList.add('hidden');

        document.getElementById('edit-resource-modal').classList.remove('hidden');
    },

    closeEditResourceModal() {
        document.getElementById('edit-resource-modal').classList.add('hidden');
        document.getElementById('form-edit-resource').reset();
    },

    toggleEditPriceField() {
        const type = document.getElementById('edit-listing-type').value;
        const priceGroup = document.getElementById('edit-price-group');
        const priceInput = document.getElementById('edit-listing-price');
        if (type === 'share') {
            priceGroup.classList.add('hidden');
            priceInput.value = 0;
        } else {
            priceGroup.classList.remove('hidden');
        }
    },

    submitEditResource(e) {
        e.preventDefault();
        const resourceId = parseInt(document.getElementById('edit-resource-id').value);
        const resources = JSON.parse(localStorage.getItem('resources_db')) || [];
        const index = resources.findIndex(r => r.id === resourceId);

        if (index > -1) {
            resources[index].title = document.getElementById('edit-listing-title').value;
            resources[index].category = document.getElementById('edit-listing-category').value;
            resources[index].item_condition = document.getElementById('edit-listing-condition').value;
            resources[index].ownership_type = document.getElementById('edit-listing-type').value;
            resources[index].price = document.getElementById('edit-listing-price').value || 0;
            resources[index].description = document.getElementById('edit-listing-desc').value;

            localStorage.setItem('resources_db', JSON.stringify(resources));
            this.showToast('Listing updated successfully!', 'success');

            this.closeEditResourceModal();
            this.loadResources(); // Refresh global resources

            // Re-open list view to see saved changes
            this.toggleProfilePanel();
            this.showMyList();
        }
    },

    renderFavorites() {
        const list = document.getElementById('favorites-list');
        const favorites = JSON.parse(localStorage.getItem('favorites_db')) || [];
        const resources = JSON.parse(localStorage.getItem('resources_db')) || [];

        const myFavorites = favorites
            .filter(f => f.user_id === this.state.user.id)
            .map(f => {
                const resource = resources.find(r => r.id === f.listing_id);
                return { ...f, resource };
            })
            .filter(f => f.resource && f.resource.status === 'available')
            .sort((a, b) => b.created_at - a.created_at);

        if (myFavorites.length === 0) {
            list.innerHTML = `
                <div class="empty-favorites">
                    <i class="fa-regular fa-heart"></i>
                    <p>No saved items yet.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = '';
        myFavorites.forEach(fav => {
            const item = fav.resource;
            const isSell = item.ownership_type === 'sell';
            const priceDisplay = isSell ? `₹${item.price}` : 'Free / Share';
            const badgeClass = isSell ? 'badge-sell' : 'badge-share';
            const icons = { 'Books': 'fa-book', 'Electronics': 'fa-laptop', 'Notes': 'fa-file-lines', 'Sports': 'fa-basketball', 'Other': 'fa-box-open' };
            const iconClass = icons[item.category] || 'fa-box';

            let imageHtml = '';
            if (item.image_url) {
                imageHtml = `<img src="${item.image_url}" class="resource-image" alt="Item Image">`;
            } else {
                imageHtml = `<div class="resource-icon" style="width: 40px; height: 40px; font-size: 1.2rem; margin-bottom: 0.5rem;"><i class="fa-solid ${iconClass}"></i></div>`;
            }

            const cardHtml = `
                <div class="floating-card resource-card" style="padding: 1rem; position: relative; border: 1px solid #f1f5f9;">
                    <button class="favorite-btn active" onclick="event.stopPropagation(); app.toggleFavorite(${item.id}); app.renderFavorites();">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                    ${imageHtml}
                    <div class="resource-badge ${badgeClass}" style="top: -10px; right: 1rem; position: absolute;">${isSell ? 'For Sale' : 'To Share'}</div>
                    <div class="resource-category" style="font-size: 0.7rem; margin-bottom: 0.2rem;">${item.category} • ${item.item_condition}</div>
                    <h3 class="resource-title" style="font-size: 1rem; margin-bottom: 0.2rem;" title="${item.title}">${item.title}</h3>
                    <div class="resource-price" style="font-size: 1.1rem; margin-bottom: 0.8rem;">${priceDisplay}</div>
                    <div class="resource-meta" style="margin-bottom: 0.8rem; font-size: 0.8rem;">
                        <span><i class="fa-solid fa-user"></i> ${item.owner_name}</span>
                    </div>
                    <div class="resource-actions" style="margin-top: auto;">
                        <button class="btn btn-primary full-width" style="padding: 0.4rem; font-size: 0.85rem;" onclick='app.openCheckoutModal(${JSON.stringify(item)})'>
                            Request Item
                        </button>
                    </div>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', cardHtml);
        });
    },

    showChangePassword() {
        this.toggleProfilePanel();
        document.getElementById('change-password-modal').classList.remove('hidden');
    },

    closeChangePasswordModal() {
        document.getElementById('change-password-modal').classList.add('hidden');
        document.getElementById('form-change-password').reset();
    },

    changePassword(e) {
        e.preventDefault();
        const currentPass = document.getElementById('cp-current').value;
        const newPass = document.getElementById('cp-new').value;
        const confirmPass = document.getElementById('cp-confirm').value;

        const users = JSON.parse(localStorage.getItem('users_db'));
        const userIndex = users.findIndex(u => u.id === this.state.user.id);

        if (userIndex === -1) return;

        if (users[userIndex].password !== currentPass) {
            this.showToast('Incorrect current password', 'error');
            return;
        }

        if (newPass !== confirmPass) {
            this.showToast('New passwords do not match', 'error');
            return;
        }

        // update password
        users[userIndex].password = newPass;
        localStorage.setItem('users_db', JSON.stringify(users));

        this.showToast('Password updated successfully', 'success');
        this.closeChangePasswordModal();
    },

    logout() {
        this.state.token = null;
        this.state.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // ensure side panel is closed
        const panel = document.getElementById('profile-side-panel');
        const overlay = document.getElementById('profile-panel-overlay');
        if (panel && overlay) {
            panel.classList.add('hidden');
            overlay.classList.add('hidden');
        }

        this.navigate('auth');
    },

    /* ==================== RESOURCES ==================== */
    loadResources() {
        const allResources = JSON.parse(localStorage.getItem('resources_db')) || [];

        this.state.resources = allResources.filter(r => {
            const matchesCategory = this.state.currentCategory === 'All' || r.category === this.state.currentCategory;
            const matchesSearch = !this.state.searchTerm || r.title.toLowerCase().includes(this.state.searchTerm.toLowerCase());
            const isAvailable = r.status === 'available';
            return matchesCategory && matchesSearch && isAvailable;
        });

        this.renderResources();
    },

    renderResources() {
        const grid = document.getElementById('resources-grid');
        const emptyState = document.getElementById('empty-state');
        grid.innerHTML = '';

        if (this.state.resources.length === 0) {
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            grid.classList.remove('hidden');
            emptyState.classList.add('hidden');

            this.state.resources.forEach(item => {
                const isSell = item.ownership_type === 'sell';
                const priceDisplay = isSell ? `₹${item.price}` : 'Free / Share';
                const badgeClass = isSell ? 'badge-sell' : 'badge-share';

                const icons = { 'Books': 'fa-book', 'Electronics': 'fa-laptop', 'Notes': 'fa-file-lines', 'Sports': 'fa-basketball', 'Other': 'fa-box-open' };
                const iconClass = icons[item.category] || 'fa-box';

                const favorites = JSON.parse(localStorage.getItem('favorites_db')) || [];
                const isFavorited = this.state.user ? favorites.some(f => f.listing_id === item.id && f.user_id === this.state.user.id) : false;
                const heartClass = isFavorited ? 'fa-solid' : 'fa-regular';
                const activeClass = isFavorited ? 'active' : '';

                let imageHtml = '';
                if (item.image_url) {
                    imageHtml = `<img src="${item.image_url}" class="resource-image" alt="Item Image">`;
                } else {
                    imageHtml = `<div class="resource-icon"><i class="fa-solid ${iconClass}"></i></div>`;
                }

                const card = document.createElement('div');
                card.className = 'floating-card resource-card';
                card.style.cursor = 'pointer';
                card.style.position = 'relative';
                card.onclick = () => app.openProductDetailsModal(item);
                card.innerHTML = `
                    <button class="favorite-btn ${activeClass}" onclick="event.stopPropagation(); app.toggleFavorite(${item.id})">
                        <i class="${heartClass} fa-heart"></i>
                    </button>
                    <div class="resource-badge ${badgeClass}">${isSell ? 'For Sale' : 'To Share'}</div>
                    ${imageHtml}
                    <div class="resource-category">${item.category} • ${item.item_condition}</div>
                    <h3 class="resource-title" title="${item.title}">${item.title}</h3>
                    <div class="resource-price">${priceDisplay}</div>
                    <div class="resource-meta">
                        <span><i class="fa-solid fa-user"></i> ${item.owner_name}</span>
                    </div>
                    <div class="resource-actions">
                        <button class="btn btn-primary full-width" onclick='event.stopPropagation(); app.openCheckoutModal(${JSON.stringify(item)})'>
                            Request Item
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    },

    filterCategory(category, el) {
        document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        this.state.currentCategory = category;
        this.loadResources();
    },

    toggleFavorite(resourceId) {
        if (!this.state.user) {
            this.showToast('Please login to save favorites', 'error');
            return;
        }

        let favorites = JSON.parse(localStorage.getItem('favorites_db')) || [];
        const index = favorites.findIndex(f => f.listing_id === resourceId && f.user_id === this.state.user.id);

        let isFavorited = false;
        if (index > -1) {
            favorites.splice(index, 1);
            isFavorited = false;
        } else {
            favorites.push({
                favorite_id: Date.now(),
                user_id: this.state.user.id,
                listing_id: resourceId,
                created_at: Date.now()
            });
            isFavorited = true;
        }

        localStorage.setItem('favorites_db', JSON.stringify(favorites));

        if (this.state.currentView === 'home') {
            this.loadResources();
        }
    },

    performSearch() {
        this.state.searchTerm = document.getElementById('global-search').value;
        this.loadResources();
    },

    /* ==================== CREATE LISTING ==================== */
    togglePriceField() {
        const type = document.getElementById('listing-type').value;
        const priceGroup = document.getElementById('price-group');
        const priceInput = document.getElementById('listing-price');
        if (type === 'share') {
            priceGroup.classList.add('hidden');
            priceInput.value = 0;
        } else {
            priceGroup.classList.remove('hidden');
        }
    },

    handleCreateListing(e) {
        e.preventDefault();

        const resources = JSON.parse(localStorage.getItem('resources_db'));

        const payload = {
            id: Date.now(),
            owner_id: this.state.user.id,
            owner_name: this.state.user.fullName,
            title: document.getElementById('listing-title').value,
            category: document.getElementById('listing-category').value,
            item_condition: document.getElementById('listing-condition').value,
            ownership_type: document.getElementById('listing-type').value,
            price: document.getElementById('listing-price').value || 0,
            description: document.getElementById('listing-desc').value,
            image_url: this.pendingImages.length > 0 ? this.pendingImages[0] : null,
            status: 'available'
        };

        resources.push(payload);
        localStorage.setItem('resources_db', JSON.stringify(resources));

        this.showToast('Listing published successfully!', 'success');
        e.target.reset();
        this.pendingImages = [];
        this.renderImagePreviews();
        this.navigate('home');
    },

    /* ==================== IMAGE UPLOADS ==================== */
    pendingImages: [],

    initImageUploads() {
        const uploadZone = document.getElementById('upload-zone');
        if (!uploadZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'), false);
        });

        uploadZone.addEventListener('drop', (e) => this.handleImageSelection({ target: { files: e.dataTransfer.files } }), false);
    },

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    handleImageSelection(e) {
        const files = Array.from(e.target.files);
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        files.forEach(file => {
            if (!validTypes.includes(file.type)) {
                this.showToast('Invalid file format. Only JPG, PNG and WEBP allowed.', 'error');
                return;
            }
            if (file.size > maxSize) {
                this.showToast('File too large. Max size is 5MB.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const imgData = e.target.result;
                this.pendingImages.push(imgData);
                this.renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });

        // reset input so same file can be selected again if deleted
        const input = document.getElementById('listing-images');
        if (input) input.value = '';
    },

    renderImagePreviews() {
        const container = document.getElementById('image-previews-container');
        if (!container) return;

        container.innerHTML = '';
        this.pendingImages.forEach((imgData, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'image-preview-wrapper';
            wrapper.innerHTML = `
                <img src="${imgData}" alt="Preview">
                <button type="button" class="remove-image-btn" onclick="event.stopPropagation(); app.removePendingImage(${index});">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
            container.appendChild(wrapper);
        });
    },

    removePendingImage(index) {
        this.pendingImages.splice(index, 1);
        this.renderImagePreviews();
    },

    /* ==================== PRODUCT DETAILS MODAL ==================== */
    openProductDetailsModal(item) {
        document.getElementById('pd-title').textContent = item.title;

        const badge = document.getElementById('pd-badge');
        const isSell = item.ownership_type === 'sell';
        badge.textContent = isSell ? 'For Sale' : 'To Share';
        badge.className = `resource-badge ${isSell ? 'badge-sell' : 'badge-share'}`;

        document.getElementById('pd-category').textContent = item.category;
        document.getElementById('pd-condition').textContent = item.item_condition;
        document.getElementById('pd-price').textContent = isSell ? `₹${item.price}` : 'Free / Share';
        document.getElementById('pd-owner').textContent = item.owner_name;

        document.getElementById('pd-description').textContent = item.description || 'No description provided.';

        const reqBtn = document.getElementById('pd-request-btn');
        reqBtn.onclick = () => {
            this.closeProductDetailsModal();
            this.openCheckoutModal(item);
        };

        document.getElementById('product-details-modal').classList.remove('hidden');
    },

    closeProductDetailsModal() {
        document.getElementById('product-details-modal').classList.add('hidden');
    },

    /* ==================== CHECKOUT / MODAL ==================== */
    openCheckoutModal(item) {
        document.getElementById('modal-resource-id').value = item.id;
        document.getElementById('modal-request-type').value = item.ownership_type;

        let users = JSON.parse(localStorage.getItem('users_db')) || [];
        let owner = users.find(u => u.id === item.owner_id);
        let ownerDept = owner && owner.department ? owner.department : 'Dept N/A';
        let ownerYear = owner && owner.year_of_study ? owner.year_of_study : 'Year N/A';

        const summary = document.getElementById('modal-item-summary');
        summary.innerHTML = `
            <h4>${item.title}</h4>
            <div style="margin-top:0.5rem; display:flex; flex-direction:column; gap:0.2rem;">
              <p><strong>Owner:</strong> ${item.owner_name}</p>
              <div style="display:flex; gap:0.5rem; margin-top: 0.2rem;">
                <span class="req-badge badge-pending" style="font-size: 0.75rem; background: rgba(59,130,246,0.1); color: var(--primary); padding: 0.1rem 0.4rem;">${ownerDept}</span>
                <span class="req-badge badge-approved" style="font-size: 0.75rem; padding: 0.1rem 0.4rem;">${ownerYear}</span>
              </div>
            </div>
            <p style="margin-top:0.75rem;"><strong>Price:</strong> ${item.ownership_type === 'sell' ? '₹' + item.price : 'Free'}</p>
        `;

        document.getElementById('checkout-modal').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('checkout-modal').classList.add('hidden');
        document.getElementById('form-checkout').reset();
    },

    submitRequest(e) {
        e.preventDefault();

        const requests = JSON.parse(localStorage.getItem('requests_db'));
        const resources = JSON.parse(localStorage.getItem('resources_db'));

        const resourceId = parseInt(document.getElementById('modal-resource-id').value);

        // Update resource status
        const resourceIndex = resources.findIndex(r => r.id === resourceId);
        if (resourceIndex > -1) {
            resources[resourceIndex].status = 'requested';
            localStorage.setItem('resources_db', JSON.stringify(resources));
        }

        const payload = {
            id: Date.now(),
            resource_id: resourceId,
            resource_title: resources[resourceIndex]?.title,
            requester_id: this.state.user.id,
            requester_name: this.state.user.fullName,
            request_type: document.getElementById('modal-request-type').value,
            phone_number: document.getElementById('checkout-phone').value,
            department: document.getElementById('checkout-dept').value,
            status: 'pending'
        };

        requests.push(payload);
        localStorage.setItem('requests_db', JSON.stringify(requests));

        // Create Notification for the Owner
        const ownerId = resources[resourceIndex]?.owner_id;
        if (ownerId && ownerId !== this.state.user.id) {
            const notifications = JSON.parse(localStorage.getItem('notifications_db')) || [];
            notifications.push({
                id: Date.now() + 1,
                request_id: payload.id, // Explicit link to the request
                resource_id: resourceId,
                user_id: ownerId,
                type: 'request',
                listing_title: resources[resourceIndex]?.title,
                requester_name: this.state.user.fullName,
                requester_phone: document.getElementById('checkout-phone').value,
                requester_department: document.getElementById('checkout-dept').value,
                requester_year: this.state.user.year_of_study || 'Year N/A',
                status: 'pending',
                is_read: false
            });
            localStorage.setItem('notifications_db', JSON.stringify(notifications));
            this.updateNotificationBadge();
        }

        this.showToast('Request sent successfully!', 'success');
        this.closeModal();
        this.loadResources(); // refresh
    },

    /* ==================== ADMIN DASHBOARD ==================== */
    switchAdminTab(tab, el) {
        document.querySelectorAll('.admin-menu-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');

        // Show/hide Action buttons
        const addUserBtn = document.getElementById('admin-add-user-btn');
        const addResourceBtn = document.getElementById('admin-add-resource-btn');

        if (addUserBtn) addUserBtn.classList.add('hidden');
        if (addResourceBtn) addResourceBtn.classList.add('hidden');

        if (tab === 'users' && addUserBtn) {
            addUserBtn.classList.remove('hidden');
        } else if (tab === 'resources' && addResourceBtn) {
            addResourceBtn.classList.remove('hidden');
        }

        this.loadAdminData(tab);
    },

    loadAdminData(type) {
        document.getElementById('admin-view-title').textContent = `Manage ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const tHead = document.getElementById('admin-table-head');
        const tBody = document.getElementById('admin-table-body');
        tHead.innerHTML = ''; tBody.innerHTML = '';

        let data = [];
        if (type === 'users') data = JSON.parse(localStorage.getItem('users_db')) || [];
        else if (type === 'resources') data = JSON.parse(localStorage.getItem('resources_db')) || [];
        else data = JSON.parse(localStorage.getItem('requests_db')) || [];

        this.renderAdminTable(type, data);
    },

    renderAdminTable(type, data) {
        const tHead = document.getElementById('admin-table-head');
        const tBody = document.getElementById('admin-table-body');

        if (type === 'users') {
            tHead.innerHTML = '<tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr>';
            data.forEach(u => {
                const disableDelete = u.email === 'admin@campus.edu' ? 'disabled' : '';
                tBody.innerHTML += `<tr><td>${u.id}</td><td>${u.fullName}</td><td>${u.email}</td><td>${u.role}</td>
                    <td>
                        <button class="btn btn-outline" style="padding:4px 8px;font-size:0.8rem;margin-right:4px;" onclick="app.notifyUser(${u.id})">Notify</button>
                        <button class="btn btn-outline" style="padding:4px 8px;font-size:0.8rem" onclick="app.removeUser(${u.id})" ${disableDelete}>Remove</button>
                    </td></tr>`;
            });
        } else if (type === 'resources') {
            tHead.innerHTML = '<tr><th>ID</th><th>Title</th><th>Owner</th><th>Status</th><th>Action</th></tr>';
            data.forEach(r => {
                tBody.innerHTML += `<tr><td>${r.id}</td><td>${r.title}</td><td>${r.owner_name}</td><td>${r.status}</td>
                    <td><button class="btn btn-outline" style="padding:4px 8px;font-size:0.8rem" onclick="app.removeResource(${r.id})">Remove</button></td></tr>`;
            });
        } else {
            tHead.innerHTML = '<tr><th>Req ID</th><th>Resource</th><th>Requester</th><th>Status</th><th>Action</th></tr>';
            data.forEach(req => {
                tBody.innerHTML += `<tr><td>${req.id}</td><td>${req.resource_title || 'Item'}</td><td>${req.requester_name || 'User'}</td><td>${req.status}</td>
                    <td><button class="btn btn-outline" style="padding:4px 8px;font-size:0.8rem">Resolve</button></td></tr>`;
            });
        }
    },

    openAddUserModal() {
        document.getElementById('add-user-modal').classList.remove('hidden');
    },

    closeAddUserModal() {
        document.getElementById('add-user-modal').classList.add('hidden');
        document.getElementById('form-admin-add-user').reset();
    },

    adminAddUser(e) {
        e.preventDefault();

        const fullName = document.getElementById('admin-new-user-name').value;
        const email = document.getElementById('admin-new-user-email').value;
        const role = document.getElementById('admin-new-user-role').value;
        const password = document.getElementById('admin-new-user-password').value;

        const users = JSON.parse(localStorage.getItem('users_db')) || [];
        if (users.find(u => u.email === email)) {
            this.showToast('Email already exists', 'error');
            return;
        }

        const newUser = { id: Date.now(), fullName, email, password, role };
        users.push(newUser);
        localStorage.setItem('users_db', JSON.stringify(users));

        this.showToast('User added successfully!', 'success');
        this.closeAddUserModal();
        this.loadAdminData('users'); // refresh table
    },

    removeUser(userId) {
        if (!confirm('Are you sure you want to remove this user?')) return;

        let users = JSON.parse(localStorage.getItem('users_db')) || [];
        users = users.filter(u => u.id !== userId);
        localStorage.setItem('users_db', JSON.stringify(users));

        this.showToast('User removed successfully', 'success');
        this.loadAdminData('users'); // refresh table
    },

    notifyUser(userId) {
        let users = JSON.parse(localStorage.getItem('users_db')) || [];
        let user = users.find(u => u.id === userId);
        if (!user) return;

        const msg = prompt(`Enter notification message for ${user.fullName}:`);
        if (msg && msg.trim() !== '') {
            this.showToast(`Notification sent to ${user.fullName}`, 'success');
            // Mock storing the notification for the user
            let notifications = JSON.parse(localStorage.getItem('notifications_db')) || [];
            notifications.push({
                id: Date.now(),
                userId: userId,
                message: msg,
                date: new Date().toISOString(),
                read: false
            });
            localStorage.setItem('notifications_db', JSON.stringify(notifications));
        }
    },

    openAddResourceModal() {
        document.getElementById('add-resource-modal').classList.remove('hidden');
    },

    closeAddResourceModal() {
        document.getElementById('add-resource-modal').classList.add('hidden');
        document.getElementById('form-admin-add-resource').reset();
    },

    adminAddResource(e) {
        e.preventDefault();

        const resources = JSON.parse(localStorage.getItem('resources_db')) || [];

        const payload = {
            id: Date.now(),
            owner_id: this.state.user.id,
            owner_name: this.state.user.fullName,
            title: document.getElementById('admin-resource-title').value,
            category: document.getElementById('admin-resource-category').value,
            item_condition: document.getElementById('admin-resource-condition').value,
            ownership_type: document.getElementById('admin-resource-type').value,
            price: document.getElementById('admin-resource-price').value || 0,
            status: 'available'
        };

        resources.push(payload);
        localStorage.setItem('resources_db', JSON.stringify(resources));

        this.showToast('Resource added successfully!', 'success');
        this.closeAddResourceModal();
        this.loadAdminData('resources'); // refresh table
    },

    removeResource(resourceId) {
        if (!confirm('Are you sure you want to remove this resource?')) return;

        let resources = JSON.parse(localStorage.getItem('resources_db')) || [];
        resources = resources.filter(r => r.id !== resourceId);
        localStorage.setItem('resources_db', JSON.stringify(resources));

        this.showToast('Resource removed successfully', 'success');
        this.loadAdminData('resources'); // refresh table
    },

    /* ==================== UTILS ==================== */
    showToast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'times-circle';

        toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${msg}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    app.init();

    // Global search listener
    document.getElementById('global-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') app.performSearch();
    });
});
