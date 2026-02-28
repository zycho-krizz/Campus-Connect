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
        const loginBtn = document.getElementById('nav-login-btn');

        if (user) {
            searchBar.classList.remove('hidden');
            sellBtn.classList.remove('hidden');
            profileInfo.classList.remove('hidden');
            document.getElementById('nav-username') && (document.getElementById('nav-username').textContent = user.fullName);
            loginBtn.classList.add('hidden');

            if (user.role === 'admin') adminBtn.classList.remove('hidden');
            else adminBtn.classList.add('hidden');
        } else {
            searchBar.classList.add('hidden');
            sellBtn.classList.add('hidden');
            adminBtn.classList.add('hidden');
            profileInfo.classList.add('hidden');
            loginBtn.classList.remove('hidden');
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

            panel.classList.remove('hidden');
            overlay.classList.remove('hidden');
        } else {
            // Close panel
            panel.classList.add('hidden');
            overlay.classList.add('hidden');
        }
    },

    showFavorites() {
        this.toggleProfilePanel();
        this.showToast('Favorites feature coming soon!', 'info');
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

                const card = document.createElement('div');
                card.className = 'floating-card resource-card';
                card.style.cursor = 'pointer';
                card.onclick = () => app.openProductDetailsModal(item);
                card.innerHTML = `
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
                    <td><button class="btn btn-outline" style="padding:4px 8px;font-size:0.8rem" onclick="app.removeUser(${u.id})" ${disableDelete}>Remove</button></td></tr>`;
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
