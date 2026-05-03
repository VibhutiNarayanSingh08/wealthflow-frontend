// ==================== DATA STORE ====================
const STORAGE_KEYS = { expenses: 'wf_expenses', investments: 'wf_investments', budgets: 'wf_budgets', recurring: 'wf_recurring', theme: 'wf_theme', token: 'wf_token' };

const EXPENSE_CATEGORIES = {
    food: { emoji: '🍔', label: 'Food & Dining', color: '#f97316' },
    transport: { emoji: '🚗', label: 'Transport', color: '#3b82f6' },
    shopping: { emoji: '🛍️', label: 'Shopping', color: '#a855f7' },
    bills: { emoji: '📄', label: 'Bills & Utilities', color: '#ef4444' },
    entertainment: { emoji: '🎬', label: 'Entertainment', color: '#ec4899' },
    health: { emoji: '💊', label: 'Health', color: '#22c55e' },
    education: { emoji: '📚', label: 'Education', color: '#6366f1' },
    other: { emoji: '📦', label: 'Other', color: '#64748b' }
};

const QUICK_PRESETS = {
    coffee: { description: 'Coffee', category: 'food' },
    lunch: { description: 'Lunch', category: 'food' },
    dinner: { description: 'Dinner', category: 'food' },
    petrol: { description: 'Petrol', category: 'transport' },
    groceries: { description: 'Groceries', category: 'food' },
    cab: { description: 'Cab / Auto', category: 'transport' },
    milk: { description: 'Milk', category: 'food' },
    recharge: { description: 'Mobile Recharge', category: 'bills' },
    movie: { description: 'Movie / OTT', category: 'entertainment' }
};

const SMART_KEYWORDS = {
    food: ['swiggy','zomato','dominos','pizza','burger','lunch','dinner','breakfast','coffee','tea','grocery','groceries','milk','bread','fruit','biryani','dosa','idli','samosa','chai','restaurant','cafe','hotel'],
    transport: ['uber','ola','rapido','auto','cab','taxi','bus','metro','train','flight','petrol','diesel','fuel','toll','parking'],
    shopping: ['amazon','flipkart','myntra','ajio','meesho','clothes','shoes','watch','bag','dress','shirt','pant','mall','market'],
    bills: ['rent','electricity','water','wifi','internet','broadband','recharge','bill','emi','loan','insurance','subscription','netflix','prime','spotify','youtube','disney','hotstar','gas','cylinder','maintenance'],
    entertainment: ['movie','theatre','pub','bar','club','game','concert','event','party','trip','travel','vacation','holiday'],
    health: ['medicine','pharmacy','medical','doctor','hospital','clinic','test','checkup','gym','fitness','yoga','therapy','dental'],
    education: ['book','course','class','tuition','coaching','exam','fee','school','college','university','certification','udemy','coursera']
};

const PAYMENT_METHODS = {
    upi: { label: 'UPI', icon: '📱' },
    cash: { label: 'Cash', icon: '💵' },
    credit_card: { label: 'Credit Card', icon: '💳' },
    debit_card: { label: 'Debit Card', icon: '💳' },
    netbanking: { label: 'Net Banking', icon: '🏦' }
};

const INVESTMENT_TYPES = {
    stocks: { label: 'Stocks', color: '#10b981' },
    crypto: { label: 'Crypto', color: '#f59e0b' },
    mutual_fund: { label: 'Mutual Fund', color: '#8b5cf6' },
    bonds: { label: 'Bonds', color: '#3b82f6' },
    real_estate: { label: 'Real Estate', color: '#ec4899' },
    other: { label: 'Other', color: '#64748b' }
};

let state = {
    expenses: [],
    investments: [],
    budgets: [],
    recurring: [],
    user: null,
    currentPage: 'dashboard',
    currentFilter: 'all',
    currentInvFilter: 'all',
    charts: {}
};

// ==================== AUTH ====================
function getToken() { return localStorage.getItem(STORAGE_KEYS.token); }
function setToken(t) { localStorage.setItem(STORAGE_KEYS.token, t); }
function clearToken() { localStorage.removeItem(STORAGE_KEYS.token); }

function toggleAuthMode() {
    document.getElementById('loginForm').classList.toggle('hidden');
    document.getElementById('registerForm').classList.toggle('hidden');
    document.getElementById('authError').classList.add('hidden');
}

function showAuthError(msg) {
    const el = document.getElementById('authError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function showAuthStatus(msg) {
    const el = document.getElementById('authStatus');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    showAuthStatus('Step 1/4: Sending login...');
    try {
        const form = e.target;
        console.log('[Auth] Logging in...');
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email.value, password: form.password.value })
        });
        const data = await res.json();
        if (!res.ok) {
            showAuthStatus('');
            showAuthError(data.detail || 'Login failed');
            return;
        }
        console.log('[Auth] Login success, token received');
        showAuthStatus('Step 2/4: Login OK, loading session...');
        setToken(data.token);
        await loadUserSession();
        console.log('[Auth] loadUserSession complete');
    } catch (err) {
        console.error('[Auth] Login error:', err);
        showAuthStatus('Error: ' + err.message);
        showAuthError('Something went wrong. Check console.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    showAuthStatus('Step 1/4: Creating account...');
    try {
        const form = e.target;
        console.log('[Auth] Registering...');
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email.value, password: form.password.value, name: form.name.value })
        });
        const data = await res.json();
        if (!res.ok) {
            showAuthStatus('');
            showAuthError(data.detail || 'Registration failed');
            return;
        }
        console.log('[Auth] Register success, token received');
        showAuthStatus('Step 2/4: Account created, loading session...');
        setToken(data.token);
        await loadUserSession();
        console.log('[Auth] loadUserSession complete');
    } catch (err) {
        console.error('[Auth] Register error:', err);
        showAuthStatus('Error: ' + err.message);
        showAuthError('Something went wrong. Check console.');
    }
}

async function loadUserSession() {
    try {
        const token = getToken();
        if (!token) { showAuthScreen(); return; }

        showAuthStatus('Step 3/4: Validating token...');
        console.log('[Auth] Validating token...');
        const meRes = await apiGet('/auth/me');
        if (!meRes || meRes.detail) {
            console.log('[Auth] Token invalid, showing login');
            clearToken();
            showAuthScreen();
            showAuthError('Session expired. Please sign in again.');
            return;
        }

        state.user = meRes;
        updateUserUI();
        console.log('[Auth] User loaded:', meRes.email);

        showAuthStatus('Step 3/4: Fetching your data...');
        console.log('[Auth] Fetching user data...');
        const [expRes, invRes, budRes, recRes] = await Promise.all([
            apiGet('/api/expenses'),
            apiGet('/api/investments'),
            apiGet('/api/budgets'),
            apiGet('/api/recurring')
        ]);

        if (expRes) state.expenses = expRes;
        if (invRes) state.investments = invRes.map(i => ({ ...i, currentValue: i.current_value }));
        if (budRes) state.budgets = budRes.map(b => ({ ...b, limit: b.limit_amount || b.limit }));
        if (recRes) state.recurring = recRes;
        console.log('[Auth] Data loaded:', state.expenses.length, 'expenses');

        if (state.expenses.length === 0 && state.investments.length === 0) {
            seedSampleData();
            await syncAllToBackend();
        }

        saveDataLocal();
        showAuthStatus('Step 4/4: Done! Loading app...');
        showAppScreen();
        initApp();
        showAuthStatus('');
        console.log('[Auth] App initialized');
    } catch (err) {
        console.error('[Auth] loadUserSession error:', err);
        showAuthStatus('Error: ' + err.message);
        showAuthScreen();
        showAuthError('Failed to load session. Check console.');
    }
}

function logout() {
    clearToken();
    state = { expenses: [], investments: [], budgets: [], recurring: [], user: null, currentPage: 'dashboard', currentFilter: 'all', currentInvFilter: 'all', charts: {} };
    localStorage.removeItem(STORAGE_KEYS.expenses);
    localStorage.removeItem(STORAGE_KEYS.investments);
    localStorage.removeItem(STORAGE_KEYS.budgets);
    localStorage.removeItem(STORAGE_KEYS.recurring);
    showAuthScreen();
}

function showAuthScreen() {
    const auth = document.getElementById('authScreen');
    const app = document.getElementById('app');
    if (auth) { auth.classList.remove('hidden'); auth.style.display = 'flex'; }
    if (app) { app.classList.add('hidden'); app.style.display = 'none'; }
}

function showAppScreen() {
    const auth = document.getElementById('authScreen');
    const app = document.getElementById('app');
    if (auth) { auth.classList.add('hidden'); auth.style.display = 'none'; }
    if (app) { app.classList.remove('hidden'); app.style.display = 'flex'; }
    console.log('[Auth] App screen shown');
}

function updateUserUI() {
    if (!state.user) return;
    const name = state.user.name || state.user.email.split('@')[0];
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('userName').textContent = name;
    document.getElementById('userEmail').textContent = state.user.email;
    document.getElementById('userAvatar').textContent = initials;
}

// ==================== API (with auth) ====================
// Change this to your production backend URL when deploying
const API_BASE = window.location.hostname === 'localhost' ? '' : 'https://wealthflow-api-rz5w.onrender.com';

function apiHeaders() {
    const h = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

async function apiGet(endpoint) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { headers: apiHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn('API GET failed:', endpoint, e);
        return null;
    }
}

async function apiPost(endpoint, data) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn('API POST failed:', endpoint, e);
        return null;
    }
}

async function apiDelete(endpoint) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: apiHeaders()
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn('API DELETE failed:', endpoint, e);
        return null;
    }
}

// ==================== BACKEND SYNC ====================
async function syncExpenseToBackend(expense) {
    const payload = { ...expense };
    if (payload.currentValue !== undefined) {
        payload.current_value = payload.currentValue;
        delete payload.currentValue;
    }
    return apiPost('/api/expenses', payload);
}

async function syncInvestmentToBackend(inv) {
    const payload = { ...inv };
    if (payload.currentValue !== undefined) {
        payload.current_value = payload.currentValue;
        delete payload.currentValue;
    }
    return apiPost('/api/investments', payload);
}

async function syncBudgetToBackend(budget) {
    return apiPost('/api/budgets', budget);
}

async function syncRecurringToBackend(rec) {
    return apiPost('/api/recurring', rec);
}

async function syncAllToBackend() {
    for (const exp of state.expenses) await syncExpenseToBackend(exp);
    for (const inv of state.investments) await syncInvestmentToBackend(inv);
    for (const bud of state.budgets) await syncBudgetToBackend(bud);
    for (const rec of state.recurring) await syncRecurringToBackend(rec);
}

// ==================== UTILITIES ====================
function saveDataLocal() {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(state.expenses));
    localStorage.setItem(STORAGE_KEYS.investments, JSON.stringify(state.investments));
    localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(state.budgets));
    localStorage.setItem(STORAGE_KEYS.recurring, JSON.stringify(state.recurring));
}

function saveData() {
    saveDataLocal();
    // Also sync to backend in background
    syncAllToBackend();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMonthName(idx) {
    return new Date(2026, idx, 1).toLocaleDateString('en-US', { month: 'short' });
}

function getMonthLabel(d) {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function generateId() {
    return Date.now() + Math.random();
}

// ==================== THEME ====================
function isDark() {
    return document.documentElement.classList.contains('dark');
}

function getChartColors() {
    const style = getComputedStyle(document.body);
    return {
        grid: style.getPropertyValue('--chart-grid').trim() || 'rgba(148, 163, 184, 0.2)',
        text: style.getPropertyValue('--chart-text').trim() || '#64748b',
        pointBorder: style.getPropertyValue('--chart-point-border').trim() || '#ffffff'
    };
}

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDarkMode = isDark();
    localStorage.setItem(STORAGE_KEYS.theme, isDarkMode ? 'dark' : 'light');
    renderPage(state.currentPage);
}

async function loadBrokerPortfolio() {
    const btn = document.getElementById('brokerSyncBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '↻ Loading...'; }
    
    const data = await apiGet('/api/portfolio');
    
    if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Sync from Broker'; }
    
    if (!data || !data.holdings || data.holdings.status !== 'success') {
        alert('Could not load broker portfolio. Make sure INDSTOCKS_TOKEN is set in .env and the server is running.');
        return;
    }
    
    // Remove old broker entries
    state.investments = state.investments.filter(i => i.source !== 'broker');
    
    const holdings = (data.holdings.data || []).map(h => ({
        id: generateId(), name: h.symbol || h.scrip_code || 'Unknown', type: 'stocks',
        invested: h.investment_value || 0, currentValue: h.holding_value || h.current_value || 0,
        date: new Date().toISOString().split('T')[0], note: 'From broker', source: 'broker'
    }));
    
    const positions = (data.positions && data.positions.data ? data.positions.data : []).map(p => ({
        id: generateId(), name: p.symbol || p.scrip_code || 'Unknown Position', type: 'stocks',
        invested: p.position_value || 0, currentValue: p.position_value || 0,
        date: new Date().toISOString().split('T')[0], note: 'Position from broker', source: 'broker'
    }));
    
    state.investments.push(...holdings, ...positions);
    saveDataLocal();
    renderInvestments();
    for (const inv of state.investments.slice(-(holdings.length + positions.length))) {
        syncInvestmentToBackend(inv);
    }
    alert(`Loaded ${holdings.length + positions.length} holdings from broker.`);
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
    console.log('[Nav] Navigating to:', page);
    state.currentPage = page;
    document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
        pageEl.classList.remove('hidden');
    } else {
        console.error('[Nav] Page element not found:', `page-${page}`);
    }
    
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('nav-active');
        el.classList.add('text-secondary');
    });
    const activeNav = document.getElementById(`nav-${page}`);
    if (activeNav) {
        activeNav.classList.add('nav-active');
        activeNav.classList.remove('text-secondary');
    }
    
    const titles = {
        dashboard: ['Dashboard', 'Your financial overview at a glance'],
        expenses: ['Expenses', 'Track and manage your spending'],
        investments: ['Investments', 'Monitor your portfolio performance'],
        budgets: ['Budgets', 'Set and track spending limits'],
        analytics: ['Analytics', 'Deep dive into your finances']
    };
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');
    if (titles[page]) {
        if (titleEl) titleEl.textContent = titles[page][0];
        if (subtitleEl) subtitleEl.textContent = titles[page][1];
    }
    
    renderPage(page);
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        document.getElementById('mobileOverlay').classList.add('hidden');
    }
}

function renderPage(page) {
    switch(page) {
        case 'dashboard': renderDashboard(); break;
        case 'expenses': renderExpenses(); renderRecurringExpenses(); break;
        case 'investments': renderInvestments(); break;
        case 'budgets': renderBudgets(); break;
        case 'analytics': renderAnalytics(); break;
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
    document.getElementById('mobileOverlay').classList.toggle('hidden');
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthExpenses = state.expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const totalInvestValue = state.investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalInvested = state.investments.reduce((sum, inv) => sum + inv.invested, 0);
    const netWorth = totalInvestValue + (10000 - monthlyTotal);
    
    document.getElementById('totalBalance').textContent = formatCurrency(netWorth + totalInvestValue);
    document.getElementById('monthlyExpenses').textContent = formatCurrency(monthlyTotal);
    document.getElementById('investmentValue').textContent = formatCurrency(totalInvestValue);
    document.getElementById('netWorth').textContent = formatCurrency(netWorth);
    
    renderRecentTransactions();
    renderBudgetOverview();
    updateCharts();
}

function renderRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    const sorted = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-8">No transactions yet</p>';
        return;
    }
    
    container.innerHTML = sorted.map(exp => {
        const cat = EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.other;
        return `
            <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-hover transition-colors">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style="background: ${cat.color}20">${cat.emoji}</div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">${exp.description}</p>
                    <p class="text-xs text-muted">${formatDate(exp.date)}</p>
                </div>
                <span class="font-semibold text-sm text-rose-400">-${formatCurrency(exp.amount)}</span>
            </div>
        `;
    }).join('');
}

function renderBudgetOverview() {
    const container = document.getElementById('budgetOverview');
    if (state.budgets.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-8">No budgets set yet</p>';
        return;
    }
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    container.innerHTML = state.budgets.slice(0, 4).map(budget => {
        const cat = EXPENSE_CATEGORIES[budget.category] || EXPENSE_CATEGORIES.other;
        const spent = state.expenses
            .filter(e => {
                const d = new Date(e.date);
                return e.category === budget.category && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, e) => sum + e.amount, 0);
        
        const pct = Math.min((spent / budget.limit) * 100, 100);
        const isOver = spent > budget.limit;
        const color = isOver ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500';
        
        return `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span>${cat.emoji}</span>
                        <span class="text-sm font-medium">${cat.label}</span>
                    </div>
                    <span class="text-xs ${isOver ? 'text-rose-400' : 'text-muted'}">${formatCurrency(spent)} / ${formatCurrency(budget.limit)}</span>
                </div>
                <div class="w-full h-2 progress-track rounded-full overflow-hidden">
                    <div class="h-full rounded-full progress-bar ${color}" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== CHARTS ====================
function updateCharts() {
    const months = parseInt(document.getElementById('chartPeriod')?.value || 6);
    const now = new Date();
    const labels = [], data = [];
    const colors = getChartColors();
    
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(getMonthLabel(d));
        const total = state.expenses
            .filter(e => {
                const ed = new Date(e.date + 'T00:00:00');
                return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
            })
            .reduce((sum, e) => sum + e.amount, 0);
        data.push(total);
    }
    
    if (state.charts.spending) state.charts.spending.destroy();
    if (state.charts.category) state.charts.category.destroy();
    
    const spendingCtx = document.getElementById('spendingChart').getContext('2d');
    state.charts.spending = new Chart(spendingCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Monthly Expenses',
                data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: colors.pointBorder,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: colors.grid }, ticks: { color: colors.text, autoSkip: true, maxTicksLimit: 6, maxRotation: 0 } },
                y: { grid: { color: colors.grid }, ticks: { color: colors.text, callback: v => 'Rs. ' + v } }
            }
        }
    });
    
    const categoryTotals = {};
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    state.expenses.forEach(exp => {
        const d = new Date(exp.date + 'T00:00:00');
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        }
    });
    
    const catLabels = Object.keys(categoryTotals).map(k => EXPENSE_CATEGORIES[k]?.label || k);
    const catData = Object.values(categoryTotals);
    const catColors = Object.keys(categoryTotals).map(k => EXPENSE_CATEGORIES[k]?.color || '#64748b');
    
    const catCtx = document.getElementById('categoryChart').getContext('2d');
    state.charts.category = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{ data: catData, backgroundColor: catColors, borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { color: colors.text, padding: 12, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 } } }
            }
        }
    });
}

// ==================== EXPENSES ====================
function renderExpenses() {
    const container = document.getElementById('expensesTable');
    const emptyEl = document.getElementById('emptyExpenses');
    
    let filtered = state.expenses;
    if (state.currentFilter !== 'all') filtered = filtered.filter(e => e.category === state.currentFilter);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
    }
    
    emptyEl.classList.add('hidden');
    container.innerHTML = filtered.map(exp => {
        const cat = EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.other;
        return `
            <tr class="hover:bg-hover transition-colors">
                <td class="px-4 py-3 text-sm text-muted whitespace-nowrap">${formatDate(exp.date)}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${cat.emoji}</span>
                        <span class="font-medium text-sm">${exp.description}</span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-lg text-xs font-medium" style="background: ${cat.color}20; color: ${cat.color}">${cat.label}</span>
                </td>
                <td class="px-4 py-3 text-sm text-muted">${PAYMENT_METHODS[exp.payment_method]?.label || 'UPI'}</td>
                <td class="px-4 py-3 text-right font-semibold text-rose-400">${formatCurrency(exp.amount)}</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="editExpense(${exp.id})" class="p-1.5 rounded-lg hover:bg-hover transition-colors tooltip" data-tip="Edit">
                            <svg class="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button onclick="deleteExpense(${exp.id})" class="p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors tooltip" data-tip="Delete">
                            <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterExpenses(category) {
    state.currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === category) {
            btn.classList.remove('bg-hover', 'text-secondary');
            btn.classList.add('bg-brand-600', 'text-white');
        } else {
            btn.classList.add('bg-hover', 'text-secondary');
            btn.classList.remove('bg-brand-600', 'text-white');
        }
    });
    renderExpenses();
}

function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        state.expenses = state.expenses.filter(e => e.id !== id);
        saveDataLocal();
        renderExpenses();
        if (state.currentPage === 'dashboard') renderDashboard();
        apiDelete(`/api/expenses/${id}`);
    }
}

function smartAddExpense() {
    const input = document.getElementById('smartExpenseInput');
    const text = input.value.trim();
    if (!text) return;
    
    // Parse: description + amount + optional category override
    // Patterns: "Swiggy 450", "Petrol 1020 transport", "Dinner 850 food"
    const parts = text.split(/\s+/);
    let amount = null;
    let amountIdx = -1;
    
    for (let i = 0; i < parts.length; i++) {
        const num = parseFloat(parts[i]);
        if (!isNaN(num) && num > 0) {
            amount = num;
            amountIdx = i;
            break;
        }
    }
    
    if (!amount) {
        alert('Please include an amount (e.g., "Swiggy 450")');
        return;
    }
    
    // Description is everything before the amount
    const description = parts.slice(0, amountIdx).join(' ') || 'Expense';
    
    // Check for explicit category after amount
    let category = 'other';
    const explicitCat = parts[amountIdx + 1];
    if (explicitCat && EXPENSE_CATEGORIES[explicitCat]) {
        category = explicitCat;
    } else {
        // Auto-detect from keywords
        const lowerText = text.toLowerCase();
        for (const [cat, keywords] of Object.entries(SMART_KEYWORDS)) {
            if (keywords.some(kw => lowerText.includes(kw))) {
                category = cat;
                break;
            }
        }
    }
    
    const expense = {
        id: generateId(),
        description: description.charAt(0).toUpperCase() + description.slice(1),
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        category: category,
        payment_method: 'upi',
        note: ''
    };
    
    state.expenses.push(expense);
    saveDataLocal();
    input.value = '';
    renderExpenses();
    if (state.currentPage === 'dashboard') renderDashboard();
    syncExpenseToBackend(expense);
}

function quickAddPreset(key, defaultAmount) {
    const preset = QUICK_PRESETS[key];
    if (!preset) return;
    openModal('expense', null, { description: preset.description, category: preset.category, amount: defaultAmount });
}

function renderRecurringExpenses() {
    const container = document.getElementById('recurringExpensesList');
    const emptyEl = document.getElementById('emptyRecurring');
    if (!container) return;
    
    const active = state.recurring.filter(r => r.active);
    if (active.length === 0) {
        container.innerHTML = '';
        emptyEl?.classList.remove('hidden');
        return;
    }
    emptyEl?.classList.add('hidden');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    container.innerHTML = active.map(rec => {
        const cat = EXPENSE_CATEGORIES[rec.category] || EXPENSE_CATEGORIES.other;
        const isPaidThisMonth = rec.last_paid && rec.last_paid.startsWith(todayStr.slice(0, 7));
        const statusClass = isPaidThisMonth 
            ? 'bg-emerald-500/10 border-emerald-500/20' 
            : (rec.day_of_month <= today.getDate() ? 'bg-amber-500/10 border-amber-500/20' : 'bg-hover border-transparent');
        const statusText = isPaidThisMonth ? 'Paid' : (rec.day_of_month <= today.getDate() ? 'Due' : `Due ${rec.day_of_month}`);
        const statusColor = isPaidThisMonth ? 'text-emerald-400' : (rec.day_of_month <= today.getDate() ? 'text-amber-400' : 'text-muted');
        
        return `
            <div class="rounded-xl border p-4 ${statusClass} transition-all">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${cat.emoji}</span>
                        <span class="font-medium text-sm">${rec.name}</span>
                    </div>
                    <span class="text-xs font-medium ${statusColor}">${statusText}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-lg font-bold">${formatCurrency(rec.amount)}</span>
                    <div class="flex gap-1">
                        ${!isPaidThisMonth ? `<button onclick="markRecurringPaid(${rec.id})" class="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all">Mark Paid</button>` : ''}
                        <button onclick="deleteRecurring(${rec.id})" class="p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors" title="Delete">
                            <svg class="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function markRecurringPaid(id) {
    const rec = state.recurring.find(r => r.id === id);
    if (!rec) return;
    
    const today = new Date().toISOString().split('T')[0];
    rec.last_paid = today;
    
    // Also add as an expense for today
    const expense = {
        id: generateId(),
        description: rec.name,
        amount: rec.amount,
        date: today,
        category: rec.category,
        payment_method: 'upi',
        note: 'Recurring payment'
    };
    state.expenses.push(expense);
    
    saveDataLocal();
    renderRecurringExpenses();
    renderExpenses();
    if (state.currentPage === 'dashboard') renderDashboard();
    
    apiPost(`/api/recurring/${id}/paid`, {});
    syncExpenseToBackend(expense);
}

function deleteRecurring(id) {
    if (confirm('Delete this recurring expense?')) {
        state.recurring = state.recurring.filter(r => r.id !== id);
        saveDataLocal();
        renderRecurringExpenses();
        apiDelete(`/api/recurring/${id}`);
    }
}

function toggleCsvImport() {
    document.getElementById('csvImportPanel').classList.toggle('hidden');
}

function importExpensesCsv() {
    const textarea = document.getElementById('csvImportInput');
    const lines = textarea.value.trim().split('\n');
    let added = 0;
    
    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 2) continue;
        
        const description = parts[0];
        const amount = parseFloat(parts[1]);
        const date = parts[2] || new Date().toISOString().split('T')[0];
        const category = parts[3] || 'other';
        const note = parts[4] || '';
        
        if (isNaN(amount) || amount <= 0) continue;
        
        state.expenses.push({
            id: generateId(),
            description,
            amount,
            date,
            category: EXPENSE_CATEGORIES[category] ? category : 'other',
            payment_method: 'upi',
            note
        });
        added++;
    }
    
    saveDataLocal();
    textarea.value = '';
    toggleCsvImport();
    renderExpenses();
    if (state.currentPage === 'dashboard') renderDashboard();
    // Sync all imported to backend
    for (const exp of state.expenses.slice(-added)) {
        syncExpenseToBackend(exp);
    }
    alert(`Imported ${added} expense${added !== 1 ? 's' : ''}`);
}

// ==================== INVESTMENTS ====================
function toggleImportSection() {
    document.getElementById('importSection').classList.toggle('hidden');
}

function filterInvestments(type) {
    state.currentInvFilter = type;
    document.querySelectorAll('.inv-filter-btn').forEach(btn => {
        if (btn.dataset.filter === type) {
            btn.classList.remove('bg-hover', 'text-secondary');
            btn.classList.add('bg-brand-600', 'text-white');
        } else {
            btn.classList.add('bg-hover', 'text-secondary');
            btn.classList.remove('bg-brand-600', 'text-white');
        }
    });
    renderInvestments();
}

function renderInvestments() {
    const container = document.getElementById('investmentsTable');
    const emptyEl = document.getElementById('emptyInvestments');
    
    let filtered = state.investments;
    if (state.currentInvFilter !== 'all') filtered = filtered.filter(i => i.type === state.currentInvFilter);
    
    const totalInvested = state.investments.reduce((sum, inv) => sum + inv.invested, 0);
    const totalCurrent = state.investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalRet = totalCurrent - totalInvested;
    
    document.getElementById('totalInvested').textContent = formatCurrency(totalInvested);
    document.getElementById('currentInvestValue').textContent = formatCurrency(totalCurrent);
    document.getElementById('totalReturns').textContent = formatCurrency(totalRet);
    document.getElementById('totalReturns').className = `text-2xl font-bold ${totalRet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    
    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
    }
    
    emptyEl.classList.add('hidden');
    container.innerHTML = filtered.map(inv => {
        const type = INVESTMENT_TYPES[inv.type] || INVESTMENT_TYPES.other;
        const retPercent = ((inv.currentValue - inv.invested) / inv.invested * 100).toFixed(2);
        const isPositive = inv.currentValue >= inv.invested;
        const brokerBadge = inv.source === 'broker' ? '<span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-500/20 text-brand-500 border border-brand-500/30">BROKER</span>' : '';
        
        return `
            <tr class="hover:bg-hover transition-colors">
                <td class="px-4 py-3">
                    <span class="font-medium text-sm">${inv.name}</span>${brokerBadge}
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-lg text-xs font-medium" style="background: ${type.color}20; color: ${type.color}">${type.label}</span>
                </td>
                <td class="px-4 py-3 text-right text-sm text-muted">${formatCurrency(inv.invested)}</td>
                <td class="px-4 py-3 text-right font-semibold text-sm">${formatCurrency(inv.currentValue)}</td>
                <td class="px-4 py-3 text-right">
                    <span class="text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">${isPositive ? '+' : ''}${retPercent}%</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="editInvestment(${inv.id})" class="p-1.5 rounded-lg hover:bg-hover transition-colors">
                            <svg class="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button onclick="deleteInvestment(${inv.id})" class="p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors">
                            <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    renderInvestmentChart();
    renderAllocationChart();
}

function renderInvestmentChart() {
    if (state.charts.investment) state.charts.investment.destroy();
    const colors = getChartColors();
    
    let data = state.investments;
    if (state.currentInvFilter !== 'all') data = data.filter(i => i.type === state.currentInvFilter);
    const sorted = [...data].sort((a, b) => b.currentValue - a.currentValue).slice(0, 8);
    
    const ctx = document.getElementById('investmentChart').getContext('2d');
    state.charts.investment = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(i => i.name),
            datasets: [
                { label: 'Invested', data: sorted.map(i => i.invested), backgroundColor: 'rgba(99, 102, 241, 0.6)', borderRadius: 4 },
                { label: 'Current Value', data: sorted.map(i => i.currentValue), backgroundColor: 'rgba(16, 185, 129, 0.6)', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: colors.text, usePointStyle: true } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: colors.text, autoSkip: true, maxTicksLimit: 6, maxRotation: 0 } },
                y: { grid: { color: colors.grid }, ticks: { color: colors.text, callback: v => 'Rs. ' + v } }
            }
        }
    });
}

function renderAllocationChart() {
    if (state.charts.allocation) state.charts.allocation.destroy();
    const colors = getChartColors();
    
    let data = state.investments;
    if (state.currentInvFilter !== 'all') data = data.filter(i => i.type === state.currentInvFilter);
    
    const typeTotals = {};
    data.forEach(inv => { typeTotals[inv.type] = (typeTotals[inv.type] || 0) + inv.currentValue; });
    
    const labels = Object.keys(typeTotals).map(k => INVESTMENT_TYPES[k]?.label || k);
    const values = Object.values(typeTotals);
    const chartColors = Object.keys(typeTotals).map(k => INVESTMENT_TYPES[k]?.color || '#64748b');
    
    const ctx = document.getElementById('allocationChart').getContext('2d');
    state.charts.allocation = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: chartColors, borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { color: colors.text, padding: 12, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 } } }
            }
        }
    });
}

function importMutualFundsFromJson() {
    const input = document.getElementById('mfJsonInput');
    if (!input) return;
    
    const raw = input.value.trim();
    if (!raw) { alert('Please paste JSON data first.'); return; }
    
    let parsed;
    try { parsed = JSON.parse(raw); } catch { alert('Invalid JSON format.'); return; }
    if (!Array.isArray(parsed) || parsed.length === 0) { alert('Please provide a JSON array.'); return; }
    
    const today = new Date().toISOString().split('T')[0];
    const imported = [];
    
    for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const name = String(item.name || '').trim();
        const invested = Number(item.invested);
        const currentValue = Number(item.currentValue);
        if (!name || !isFinite(invested) || !isFinite(currentValue) || invested < 0 || currentValue < 0) continue;
        
        imported.push({
            id: generateId(), name, type: 'mutual_fund', invested, currentValue,
            date: /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : today,
            note: item.note ? String(item.note) : 'Imported from JSON'
        });
    }
    
    if (imported.length === 0) { alert('No valid mutual fund items found.'); return; }
    
    state.investments.push(...imported);
    saveDataLocal();
    renderInvestments();
    if (state.currentPage === 'dashboard') renderDashboard();
    input.value = '';
    for (const inv of state.investments.slice(-imported.length)) {
        syncInvestmentToBackend(inv);
    }
    alert(`Imported ${imported.length} mutual fund entries successfully.`);
}

function deleteInvestment(id) {
    if (confirm('Are you sure you want to delete this investment?')) {
        state.investments = state.investments.filter(i => i.id !== id);
        saveDataLocal();
        renderInvestments();
        apiDelete(`/api/investments/${id}`);
    }
}

// ==================== BUDGETS ====================
function renderBudgets() {
    const container = document.getElementById('budgetCards');
    const emptyEl = document.getElementById('emptyBudgets');
    
    if (state.budgets.length === 0) {
        container.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
    }
    
    emptyEl.classList.add('hidden');
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    container.innerHTML = state.budgets.map(budget => {
        const cat = EXPENSE_CATEGORIES[budget.category] || EXPENSE_CATEGORIES.other;
        const spent = state.expenses
            .filter(e => {
                const d = new Date(e.date);
                return e.category === budget.category && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, e) => sum + e.amount, 0);
        
        const pct = Math.min((spent / budget.limit) * 100, 100);
        const isOver = spent > budget.limit;
        const color = isOver ? 'from-rose-500 to-red-600' : pct > 75 ? 'from-amber-500 to-orange-600' : 'from-emerald-500 to-green-600';
        const remaining = budget.limit - spent;
        
        return `
            <div class="glass rounded-2xl p-5 card-hover">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style="background: ${cat.color}20">${cat.emoji}</div>
                        <div>
                            <h4 class="font-semibold">${cat.label}</h4>
                            <p class="text-xs text-muted">Monthly Budget</p>
                        </div>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="editBudget(${budget.id})" class="p-1.5 rounded-lg hover:bg-hover transition-colors">
                            <svg class="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button onclick="deleteBudget(${budget.id})" class="p-1.5 rounded-lg hover:bg-rose-500/20 transition-colors">
                            <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-medium">${formatCurrency(spent)} spent</span>
                        <span class="text-xs text-muted">${formatCurrency(budget.limit)}</span>
                    </div>
                    <div class="w-full h-3 progress-track rounded-full overflow-hidden">
                        <div class="h-full rounded-full bg-gradient-to-r ${color} progress-bar" style="width: ${pct}%"></div>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs ${isOver ? 'text-rose-400' : 'text-muted'}">
                        ${isOver ? `Over by ${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)} remaining`}
                    </span>
                    <span class="text-xs font-medium ${isOver ? 'text-rose-400' : 'text-emerald-400'}">${pct.toFixed(0)}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function deleteBudget(id) {
    if (confirm('Are you sure you want to delete this budget?')) {
        state.budgets = state.budgets.filter(b => b.id !== id);
        saveDataLocal();
        renderBudgets();
        if (state.currentPage === 'dashboard') renderDashboard();
        apiDelete(`/api/budgets/${id}`);
    }
}

// ==================== ANALYTICS ====================
function renderAnalytics() {
    const months = [], expenseData = [], incomeData = [], savingsData = [];
    const now = new Date();
    const monthlyIncome = 5000;
    const colors = getChartColors();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(getMonthName(d.getMonth()));
        const exp = state.expenses
            .filter(e => { const ed = new Date(e.date); return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear(); })
            .reduce((sum, e) => sum + e.amount, 0);
        expenseData.push(exp);
        incomeData.push(monthlyIncome);
        savingsData.push(monthlyIncome - exp);
    }
    
    if (state.charts.incomeExpense) state.charts.incomeExpense.destroy();
    if (state.charts.savings) state.charts.savings.destroy();
    
    const ieCtx = document.getElementById('incomeExpenseChart').getContext('2d');
    state.charts.incomeExpense = new Chart(ieCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Income', data: incomeData, backgroundColor: 'rgba(16, 185, 129, 0.6)', borderRadius: 4 },
                { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(244, 63, 94, 0.6)', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: colors.text, usePointStyle: true } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: colors.text, autoSkip: true, maxTicksLimit: 6, maxRotation: 0 } },
                y: { grid: { color: colors.grid }, ticks: { color: colors.text, callback: v => 'Rs. ' + v } }
            }
        }
    });
    
    const savCtx = document.getElementById('savingsChart').getContext('2d');
    state.charts.savings = new Chart(savCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Savings', data: savingsData, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2, fill: true, tension: 0.4,
                pointBackgroundColor: '#10b981', pointBorderColor: colors.pointBorder, pointBorderWidth: 2, pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: colors.grid }, ticks: { color: colors.text, autoSkip: true, maxTicksLimit: 6, maxRotation: 0 } },
                y: { grid: { color: colors.grid }, ticks: { color: colors.text, callback: v => 'Rs. ' + v } }
            }
        }
    });
    
    const breakdownContainer = document.getElementById('categoryBreakdown');
    const categoryTotals = {};
    state.expenses.forEach(exp => { categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount; });
    const totalAll = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    
    breakdownContainer.innerHTML = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => {
            const catInfo = EXPENSE_CATEGORIES[cat] || EXPENSE_CATEGORIES.other;
            const pct = ((amount / totalAll) * 100).toFixed(1);
            return `
                <div class="text-center p-4 rounded-xl hover:bg-hover transition-colors">
                    <div class="text-3xl mb-2">${catInfo.emoji}</div>
                    <p class="text-xs text-muted mb-1">${catInfo.label}</p>
                    <p class="text-sm font-semibold">${formatCurrency(amount)}</p>
                    <p class="text-xs text-brand-400 mt-1">${pct}%</p>
                </div>
            `;
        }).join('');
}

// ==================== MODALS ====================
function openModal(type, editId = null, prefill = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('modalForm');
    overlay.classList.remove('hidden');
    
    const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-input border border-input text-sm transition-colors';
    
    if (type === 'expense') {
        title.textContent = editId ? 'Edit Expense' : 'Add Expense';
        const exp = editId ? state.expenses.find(e => e.id === editId) : null;
        const p = prefill || {};
        form.innerHTML = `
            <input type="hidden" name="type" value="expense">
            <input type="hidden" name="id" value="${editId || ''}">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1.5 text-secondary">Description</label>
                    <input type="text" name="description" value="${exp?.description || p.description || ''}" required class="${inputClass}" placeholder="e.g., Grocery Shopping">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Amount (Rs.)</label>
                        <input type="number" name="amount" step="0.01" min="0" value="${exp?.amount || p.amount || ''}" required class="${inputClass}" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Date</label>
                        <input type="date" name="date" value="${exp?.date || new Date().toISOString().split('T')[0]}" required class="${inputClass}">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Category</label>
                        <select name="category" required class="${inputClass}">
                            ${Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => `<option value="${key}" ${(exp?.category || p.category) === key ? 'selected' : ''}>${val.emoji} ${val.label}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Payment Method</label>
                        <select name="payment_method" required class="${inputClass}">
                            ${Object.entries(PAYMENT_METHODS).map(([key, val]) => `<option value="${key}" ${(exp?.payment_method || 'upi') === key ? 'selected' : ''}>${val.icon} ${val.label}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1.5 text-secondary">Note (optional)</label>
                    <input type="text" name="note" value="${exp?.note || ''}" class="${inputClass}" placeholder="Add a note...">
                </div>
                <button type="submit" class="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 font-medium text-sm transition-all shadow-lg shadow-brand-600/25 text-white">${editId ? 'Update Expense' : 'Add Expense'}</button>
            </div>
        `;
    } else if (type === 'investment') {
        title.textContent = editId ? 'Edit Investment' : 'Add Investment';
        const inv = editId ? state.investments.find(i => i.id === editId) : null;
        form.innerHTML = `
            <input type="hidden" name="type" value="investment">
            <input type="hidden" name="id" value="${editId || ''}">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1.5 text-secondary">Asset Name</label>
                    <input type="text" name="name" value="${inv?.name || ''}" required class="${inputClass}" placeholder="e.g., Apple Inc.">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1.5 text-secondary">Type</label>
                    <select name="investType" required class="${inputClass}">
                        ${Object.entries(INVESTMENT_TYPES).map(([key, val]) => `<option value="${key}" ${inv?.type === key ? 'selected' : ''}>${val.label}</option>`).join('')}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Amount Invested (Rs.)</label>
                        <input type="number" name="invested" step="0.01" min="0" value="${inv?.invested || ''}" required class="${inputClass}" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Current Value (Rs.)</label>
                        <input type="number" name="currentValue" step="0.01" min="0" value="${inv?.currentValue || ''}" required class="${inputClass}" placeholder="0.00">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1.5 text-secondary">Date</label>
                    <input type="date" name="date" value="${inv?.date || new Date().toISOString().split('T')[0]}" required class="${inputClass}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1.5 text-secondary">Note (optional)</label>
                    <input type="text" name="note" value="${inv?.note || ''}" class="${inputClass}" placeholder="Add a note...">
                </div>
                <button type="submit" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium text-sm transition-all shadow-lg shadow-emerald-600/25 text-white">${editId ? 'Update Investment' : 'Add Investment'}</button>
            </div>
        `;
    } else if (type === 'budget') {
        title.textContent = editId ? 'Edit Budget' : 'Set Budget';
        const budget = editId ? state.budgets.find(b => b.id === editId) : null;
        form.innerHTML = `
            <input type="hidden" name="type" value="budget">
            <input type="hidden" name="id" value="${editId || ''}">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1.5 text-secondary">Category</label>
                    <select name="category" required class="${inputClass}">
                        ${Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => `<option value="${key}" ${budget?.category === key ? 'selected' : ''}>${val.emoji} ${val.label}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1.5 text-secondary">Monthly Limit (Rs.)</label>
                    <input type="number" name="limit" step="0.01" min="0" value="${budget?.limit || ''}" required class="${inputClass}" placeholder="0.00">
                </div>
                <button type="submit" class="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 font-medium text-sm transition-all shadow-lg shadow-amber-600/25 text-white">${editId ? 'Update Budget' : 'Set Budget'}</button>
            </div>
        `;
    } else if (type === 'recurring') {
        title.textContent = 'Add Recurring Expense';
        form.innerHTML = `
            <input type="hidden" name="type" value="recurring">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1.5 text-secondary">Name</label>
                    <input type="text" name="name" required class="${inputClass}" placeholder="e.g., House Rent">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Amount (Rs.)</label>
                        <input type="number" name="amount" step="0.01" min="0" required class="${inputClass}" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Due Day (1-31)</label>
                        <input type="number" name="day_of_month" min="1" max="31" value="1" required class="${inputClass}">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Category</label>
                        <select name="category" required class="${inputClass}">
                            ${Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => `<option value="${key}">${val.emoji} ${val.label}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1.5 text-secondary">Frequency</label>
                        <select name="frequency" required class="${inputClass}">
                            <option value="monthly">Monthly</option>
                            <option value="weekly">Weekly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 font-medium text-sm transition-all shadow-lg shadow-brand-600/25 text-white">Add Recurring</button>
            </div>
        `;
    }
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }
function openQuickAdd() { document.getElementById('quickAddOverlay').classList.remove('hidden'); }
function closeQuickAdd() { document.getElementById('quickAddOverlay').classList.add('hidden'); }
function quickAddType(type) { closeQuickAdd(); setTimeout(() => openModal(type), 200); }

function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const type = formData.get('type');
    const id = formData.get('id');
    
    if (type === 'expense') {
        const expense = {
            id: id ? parseFloat(id) : generateId(),
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            date: formData.get('date'),
            category: formData.get('category'),
            payment_method: formData.get('payment_method') || 'upi',
            note: formData.get('note')
        };
        if (id) {
            const idx = state.expenses.findIndex(e => e.id === parseFloat(id));
            if (idx !== -1) state.expenses[idx] = expense;
        } else {
            state.expenses.push(expense);
        }
        saveDataLocal();
        renderExpenses();
        syncExpenseToBackend(expense);
    } else if (type === 'investment') {
        const investment = {
            id: id ? parseFloat(id) : generateId(),
            name: formData.get('name'),
            type: formData.get('investType'),
            invested: parseFloat(formData.get('invested')),
            currentValue: parseFloat(formData.get('currentValue')),
            date: formData.get('date'),
            note: formData.get('note')
        };
        if (id) {
            const idx = state.investments.findIndex(i => i.id === parseFloat(id));
            if (idx !== -1) state.investments[idx] = investment;
        } else {
            state.investments.push(investment);
        }
        saveDataLocal();
        renderInvestments();
        syncInvestmentToBackend(investment);
    } else if (type === 'budget') {
        const budget = {
            id: id ? parseFloat(id) : generateId(),
            category: formData.get('category'),
            limit: parseFloat(formData.get('limit'))
        };
        if (id) {
            const idx = state.budgets.findIndex(b => b.id === parseFloat(id));
            if (idx !== -1) state.budgets[idx] = budget;
        } else {
            const existing = state.budgets.findIndex(b => b.category === budget.category);
            if (existing !== -1) state.budgets[existing] = budget;
            else state.budgets.push(budget);
        }
        saveDataLocal();
        renderBudgets();
        syncBudgetToBackend(budget);
    } else if (type === 'recurring') {
        const recurring = {
            id: generateId(),
            name: formData.get('name'),
            amount: parseFloat(formData.get('amount')),
            category: formData.get('category'),
            frequency: formData.get('frequency'),
            day_of_month: parseInt(formData.get('day_of_month')),
            active: 1,
            last_paid: ''
        };
        state.recurring.push(recurring);
        saveDataLocal();
        renderRecurringExpenses();
        syncRecurringToBackend(recurring);
    }
    
    closeModal();
    if (state.currentPage === 'dashboard') renderDashboard();
}

function editExpense(id) { openModal('expense', id); }
function editInvestment(id) { openModal('investment', id); }
function editBudget(id) { openModal('budget', id); }

// ==================== INIT ====================
function init() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }

    // Check auth on load
    const token = getToken();
    if (token) {
        loadUserSession();
    } else {
        showAuthScreen();
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
}

function initApp() {
    try {
        navigateTo('dashboard');
    } catch (err) {
        console.error('[Init] initApp error:', err);
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeQuickAdd(); }
});
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});
document.getElementById('quickAddOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeQuickAdd();
});

init();
