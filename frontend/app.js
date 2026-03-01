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
                            <p><strong>Department:</strong> ${notif.requester_department}</p>
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

    acceptRequest(notifId) {
        let notifications = JSON.parse(localStorage.getItem('notifications_db')) || [];
        let notifIndex = notifications.findIndex(n => n.id === notifId);
        if (notifIndex > -1) {
            notifications[notifIndex].status = 'accepted';
            localStorage.setItem('notifications_db', JSON.stringify(notifications));

            const phone = notifications[notifIndex].requester_phone;
            this.showToast('Request accepted! You can now contact them.', 'success');
            this.renderNotifications();

            // Simulating opening WhatsApp link or email using a timeout
            setTimeout(() => {
                const message = encodeURIComponent(`Hi ${notifications[notifIndex].requester_name}, I saw your request for my listing "${notifications[notifIndex].listing_title}" on Campus Connect.`);
                alert(`Simulating contact link:\nhttps://wa.me/${phone}?text=${message}`);
            }, 500);
        }
    },

    declineRequest(notifId) {
        let notifications = JSON.parse(localStorage.getItem('notifications_db')) || [];
        let notifIndex = notifications.findIndex(n => n.id === notifId);
        if (notifIndex > -1) {
            notifications[notifIndex].status = 'declined';
            localStorage.setItem('notifications_db', JSON.stringify(notifications));
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
            this.setSession('mock_token_' + Date.now(), { id: user.id, fullName: user.fullName, role: user.role, email: user.email });
            this.showToast('Login successful!', 'success');
            this.navigate('home');
        } else {
            this.showToast('Invalid email or password', 'error');
        }
    },

    handleSignup(e) {
        e.preventDefault();
        const fullName = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        const users = JSON.parse(localStorage.getItem('users_db'));
        if (users.find(u => u.email === email)) {
            this.showToast('Email already exists', 'error');
            return;
        }

        const newUser = { id: Date.now(), fullName, email, password, role: 'student' };
        users.push(newUser);
        localStorage.setItem('users_db', JSON.stringify(users));

        this.showToast('Registration successful! Please login.', 'success');
        this.switchAuthTab('login');
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

    showDefaultProfileView() {
        document.getElementById('profile-header-title').textContent = 'User Profile';
        document.getElementById('profile-default-view').classList.remove('hidden');
        document.getElementById('profile-requests-view').classList.add('hidden');
        document.getElementById('profile-favorites-view').classList.add('hidden');
        document.getElementById('menu-btn-requests').classList.remove('active');
    },

    showRequestedItems() {
        document.getElementById('profile-header-title').textContent = 'Requested Items';
        document.getElementById('profile-default-view').classList.add('hidden');
        document.getElementById('profile-favorites-view').classList.add('hidden');
        document.getElementById('profile-requests-view').classList.remove('hidden');
        document.getElementById('menu-btn-requests').classList.add('active');

        this.renderRequestedItems();
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
        document.getElementById('profile-favorites-view').classList.remove('hidden');
        this.renderFavorites();
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

            const cardHtml = `
                <div class="floating-card resource-card" style="padding: 1rem; position: relative; border: 1px solid #f1f5f9;">
                    <button class="favorite-btn active" onclick="event.stopPropagation(); app.toggleFavorite(${item.id}); app.renderFavorites();">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                    <div class="resource-badge ${badgeClass}" style="top: -10px; right: 1rem; position: absolute;">${isSell ? 'For Sale' : 'To Share'}</div>
                    <div class="resource-icon" style="width: 40px; height: 40px; font-size: 1.2rem; margin-bottom: 0.5rem;"><i class="fa-solid ${iconClass}"></i></div>
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
                    <div class="resource-icon"><i class="fa-solid ${iconClass}"></i></div>
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
            status: 'available'
        };

        resources.push(payload);
        localStorage.setItem('resources_db', JSON.stringify(resources));

        this.showToast('Listing published successfully!', 'success');
        e.target.reset();
        this.navigate('home');
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

        const summary = document.getElementById('modal-item-summary');
        summary.innerHTML = `
            <h4>${item.title}</h4>
            <p><strong>Owner:</strong> ${item.owner_name}</p>
            <p><strong>Price:</strong> ${item.ownership_type === 'sell' ? '₹' + item.price : 'Free'}</p>
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
                user_id: ownerId,
                type: 'request',
                listing_title: resources[resourceIndex]?.title,
                requester_name: this.state.user.fullName,
                requester_phone: document.getElementById('checkout-phone').value,
                requester_department: document.getElementById('checkout-dept').value,
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
