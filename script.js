const APP_KEY = 'pocketLikhi_final_v4';

// ডিফল্ট ডাটা স্ট্রাকচার
let data = {
    balance: 0,
    transactions: [],
    budget: 0, // মাসিক বাজেট
    notes: { 'General': [''] }, // গ্রুপ ভিত্তিক নোট
    settings: { 
        pin: null, 
        lastOpened: '',
        theme: 'light', // 'light' or 'dark'
        firstTime: true // প্রথমবার চালু হলে গাইড দেখাবে
    },
    // জাদু ক্যালকুলেটরের জন্য নতুন ডাটা
    zadu: {
        friends: [],
        transactions: []
    }
};

// ক্যাটাগরি লিস্ট
const categories = [
    { id: 'food', name: 'খাবার', icon: '🍔', color: '#FF6B6B' },
    { id: 'transport', name: 'যাতায়াত', icon: '🚍', color: '#4ECDC4' },
    { id: 'rent', name: 'মেস ভাড়া', icon: '🏠', color: '#45B7D1' },
    { id: 'recharge', name: 'রিচার্জ', icon: '📱', color: '#96CEB4' },
    { id: 'shopping', name: 'শপিং', icon: '🛍️', color: '#FECA57' },
    { id: 'study', name: 'পড়াশোনা', icon: '📚', color: '#6C63FF' },
    { id: 'health', name: 'চিকিৎসা', icon: '💊', color: '#E45757' },
    { id: 'others', name: 'অন্যান্য', icon: '📦', color: '#BDC3C7' }
];

let selectedType = 'expense';
let selectedCat = 'food';
let currentNoteGroup = 'General';
let enteredPin = '';
let isSettingPin = false;
let editingZaduId = null; // জাদু ক্যালকুলেটর এডিট করার জন্য

// তারিখ ফরম্যেট ফাংশন (dd/mm/yyyy)
function formatDateToDisplay(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// তারিখ ফরম্যেট ফাংশন (yyyy-mm-dd থেকে dd/mm/yyyy)
function convertToDisplayFormat(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// বাংলা মাসের নাম
const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// বাংলা সপ্তাহের দিন
const banglaWeekdays = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];

// --- ১. অ্যাপ শুরু (INITIALIZATION) ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // স্প্ল্যাশ স্ক্রিন টাইমার
    setTimeout(() => {
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
            checkLock(); // লক চেক
        }, 500);
    }, 2500); // ২.৫ সেকেন্ড

    updateGreeting();
    setInterval(updateGreeting, 60000); // প্রতি মিনিটে গ্রীটিং আপডেট
    
    // আজকের তারিখ সেট (yyyy-mm-dd ফরম্যেটে রাখবো কিন্তু ডিসপ্লে হবে dd/mm/yyyy)
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    document.getElementById('home-date-picker').value = formattedToday;
    document.getElementById('home-date-picker').addEventListener('change', updateHomeDaySummary);
    
    // অ্যাপ তৈরি তারিখ সেট
    document.getElementById('app-creation-date').textContent = formatDateToDisplay('2025-12-03');
    
    // জাদু ক্যালকুলেটর UI আপডেট
    renderZaduUI();
    
    // ইনপুট ডেট ফরম্যেট সেট
    setupDateInputs();
    
    // প্রথমবারের জন্য গাইড পপআপ দেখান
    if (data.settings.firstTime) {
        setTimeout(() => {
            document.getElementById('modal-first-time').classList.remove('hidden');
        }, 1000);
    }
});

function setupDateInputs() {
    // তারিখ ইনপুটগুলোতে ফরম্যেট সেট
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.addEventListener('change', function() {
            // মান যাচাই
            if (this.value) {
                const date = new Date(this.value);
                if (isNaN(date.getTime())) {
                    this.value = '';
                    alert('সঠিক তারিখ দিন!');
                }
            }
        });
    });
}

function loadData() {
    const stored = localStorage.getItem(APP_KEY);
    if (stored) {
        data = JSON.parse(stored);
        // ডাটা মাইগ্রেশন (যদি দরকার হয়)
        if(Array.isArray(data.notes)) data.notes = { 'General': data.notes };
        
        // পুরানো ট্রানজেকশনে টাইম যোগ (যদি না থাকে)
        data.transactions.forEach(t => {
            if (!t.time) {
                const date = new Date(t.date);
                t.time = date.toLocaleTimeString('bn-BD', {hour: '2-digit', minute:'2-digit'});
            }
        });
    }
    
    // থিম অ্যাপ্লাই করুন
    applyTheme(data.settings.theme || 'light');
    
    checkYesterdaySummary(); // স্মার্ট নোটিফিকেশন চেক
    updateUI();
}

function saveData() {
    localStorage.setItem(APP_KEY, JSON.stringify(data));
    updateUI();
}

// থিম টগল ফাংশন
function toggleTheme() {
    const currentTheme = data.settings.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    data.settings.theme = newTheme;
    saveData();
    applyTheme(newTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'ri-moon-line' : 'ri-sun-line';
    }
}

// --- ২. ইউজার ইন্টারফেস আপডেট (CORE UI) ---
function updateUI() {
    // ব্যালেন্স হিসাব
    const inc = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    data.balance = inc - exp;

    // ডোম আপডেট
    document.getElementById('total-balance').innerText = data.balance.toLocaleString('bn-BD');
    document.getElementById('home-income').innerText = '৳' + inc.toLocaleString('bn-BD');
    document.getElementById('home-expense').innerText = '৳' + exp.toLocaleString('bn-BD');

    // বাজেট লজিক
    if (data.budget > 0) {
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const monthExp = data.transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr))
            .reduce((s, t) => s + t.amount, 0);
        
        const remaining = data.budget - monthExp;
        const percent = Math.min((monthExp / data.budget) * 100, 100);
        
        document.getElementById('budget-status').classList.remove('hidden');
        document.getElementById('budget-remaining').innerText = remaining.toLocaleString('bn-BD');
        document.getElementById('budget-fill').style.width = percent + '%';
        document.getElementById('budget-fill').style.backgroundColor = percent > 90 ? '#E45757' : '#4C7DF0';
    } else {
        document.getElementById('budget-status').classList.add('hidden');
    }

    renderCharts();
    updateHomeDaySummary();
    renderCalendar();
    renderNotes();
    renderZaduUI(); // জাদু ক্যালকুলেটর আপডেট
}

// --- ৩. ডায়নামিক গ্রীটিং ---
function updateGreeting() {
    const hour = new Date().getHours();
    const el = document.getElementById('greeting-text');
    
    if (hour >= 5 && hour < 12) el.innerText = "শুভ সকাল";
    else if (hour >= 12 && hour < 17) el.innerText = "শুভ দুপুর";
    else if (hour >= 17 && hour < 20) el.innerText = "শুভ সন্ধ্যা";
    else el.innerText = "শুভ রাত্রি";

    // বাংলা তারিখ ফরম্যেট
    const now = new Date();
    const day = now.getDate();
    const month = banglaMonths[now.getMonth()];
    const year = now.getFullYear();
    const weekday = banglaWeekdays[now.getDay()];
    
    document.getElementById('current-date-bn').innerText = `${weekday}, ${day} ${month} ${year}`;
}

// --- ৪. ট্যাব নেভিগেশন ---
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-view').forEach(d => d.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');

    // মোবাইল কিবোর্ড হাইড করার জন্য
    if(document.activeElement) document.activeElement.blur();
}

// --- ৫. চার্ট এবং হোম লজিক ---
function renderCharts() {
    // এই মাসের খরচ বের করা
    const currentMonth = new Date().toISOString().slice(0, 7);
    const expTrans = data.transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));
    const totalExp = expTrans.reduce((s, t) => s + t.amount, 0);
    
    const catMap = {};
    expTrans.forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    const svg = document.getElementById('home-donut-chart');
    const legend = document.getElementById('home-legend');
    svg.innerHTML = ''; legend.innerHTML = '';

    document.getElementById('home-chart-total').innerText = '৳' + totalExp;

    if (totalExp === 0) {
        svg.innerHTML = '<circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#eee" stroke-width="4"></circle>';
        legend.innerHTML = '<p style="grid-column:span 2; text-align:center; font-size:0.8rem; color:#999">কোনো খরচ নেই</p>';
        return;
    }

    let offset = 25;
    // বড় থেকে ছোট সর্ট করা
    Object.keys(catMap).sort((a,b) => catMap[b]-catMap[a]).forEach(catId => {
        const val = catMap[catId];
        const percent = (val / totalExp) * 100;
        const catInfo = categories.find(c => c.id === catId) || categories[7];
        
        // SVG Circle Segment
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "18"); circle.setAttribute("cy", "18"); circle.setAttribute("r", "15.915");
        circle.setAttribute("fill", "transparent");
        circle.setAttribute("stroke", catInfo.color);
        circle.setAttribute("stroke-width", "4");
        circle.setAttribute("stroke-dasharray", `${percent} ${100 - percent}`);
        circle.setAttribute("stroke-dashoffset", offset);
        svg.appendChild(circle);
        
        offset -= percent;

        // Legend Item
        legend.innerHTML += `
            <div class="legend-item">
                <div class="legend-dot" style="background:${catInfo.color}"></div>
                <span>${catInfo.name} (${Math.round(percent)}%)</span>
            </div>
        `;
    });
}

// --- ৬. হোমের দিন বিস্তারিত ও জোকস ---
function updateHomeDaySummary() {
    const picker = document.getElementById('home-date-picker');
    const date = picker.value;
    const card = document.getElementById('day-summary-card');
    
    const trans = data.transactions.filter(t => t.date === date);
    
    if (trans.length === 0) {
        // জোকস লজিক (শুধু আজকের জন্য)
        const today = new Date().toISOString().slice(0,10);
        if (date === today) {
            card.innerHTML = `
                <i class="ri-emotion-laugh-line" style="font-size:2.5rem; color:#FFCA28; margin-bottom:10px"></i>
                <p style="font-weight:600">আজ কোনো খরচ নেই!</p>
                <p class="funny-text">"কি ব্যাপার? খরচ করছেন না যে! বিয়ে-শাদী করার মতলব আছে নাকি?"</p>
            `;
        } else {
            card.innerHTML = `<p style="color:var(--text-light); font-size:0.9rem">${convertToDisplayFormat(date)} তারিখে কোনো হিসাব নেই।</p>`;
        }
    } else {
        // লিস্ট জেনারেট
        const total = trans.reduce((s,t) => s + (t.type==='income'?t.amount:-t.amount), 0);
        const displayDate = convertToDisplayFormat(date);
        let html = `<h4 style="margin-bottom:10px; color:var(--primary)">${displayDate} - মোট: ৳${total}</h4><div style="width:100%">`;
        
        trans.forEach(t => {
            const cat = categories.find(c => c.id === t.category) || {icon:'💰', name:'আয়'};
            const isInc = t.type === 'income';
            const timeDisplay = t.time ? `<div class="transaction-time">${t.time}</div>` : '';
            html += `
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.05); font-size:0.9rem">
                    <div style="display:flex; gap:8px; align-items:center">
                        <span>${isInc ? '💰' : cat.icon}</span>
                        <div>
                            <div style="font-weight:600">${isInc ? 'জমা' : cat.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-light)">${t.note || ''}</div>
                            ${timeDisplay}
                        </div>
                    </div>
                    <span style="font-weight:600; color:${isInc ? 'var(--success)' : 'var(--danger)'}">
                        ${isInc?'+':'-'}৳${t.amount}
                    </span>
                </div>
            `;
        });
        html += '</div>';
        card.innerHTML = html;
    }
}

// --- ৭. ট্রানজেকশন অ্যাড করা ---
function openTransModal() {
    document.getElementById('modal-trans').classList.remove('hidden');
    document.getElementById('inp-date').valueAsDate = new Date();
    setType('expense');
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function setType(type) {
    selectedType = type;
    document.getElementById('btn-inc').className = type === 'income' ? 'type-btn active' : 'type-btn';
    document.getElementById('btn-exp').className = type === 'expense' ? 'type-btn active' : 'type-btn';
    
    const catList = document.getElementById('category-list');
    const noteInp = document.getElementById('inp-note');
    
    if (type === 'income') {
        catList.style.display = 'none';
        noteInp.placeholder = "টাকা কীভাবে পেয়েছেন? (উৎস)";
    } else {
        catList.style.display = 'flex';
        noteInp.placeholder = "কি বাবদ খরচ?";
        renderCatSelect();
    }
}

function renderCatSelect() {
    const list = document.getElementById('category-list');
    list.innerHTML = '';
    categories.forEach(c => {
        const chip = document.createElement('div');
        chip.className = `cat-chip ${selectedCat === c.id ? 'selected' : ''}`;
        chip.innerHTML = `${c.icon} ${c.name}`;
        chip.onclick = () => { selectedCat = c.id; renderCatSelect(); };
        list.appendChild(chip);
    });
}

function saveTransaction() {
    const amount = parseFloat(document.getElementById('inp-amount').value);
    const note = document.getElementById('inp-note').value;
    const date = document.getElementById('inp-date').value;
    const time = new Date().toLocaleTimeString('bn-BD', {hour: '2-digit', minute:'2-digit'});

    if (!amount) { alert('টাকার পরিমাণ দিন!'); return; }
    if (!date) { alert('তারিখ নির্বাচন করুন!'); return; }

    const t = {
        id: Date.now(),
        amount,
        type: selectedType,
        category: selectedType==='income' ? 'salary' : selectedCat,
        note,
        date,
        time,
        timestamp: new Date().getTime()
    };

    data.transactions.push(t);
    saveData();
    closeModal('modal-trans');
    document.getElementById('inp-amount').value = '';
    document.getElementById('inp-note').value = '';
}

// --- ৮. ফুল ক্যালেন্ডার (হিসাব ট্যাব) ---
let calDate = new Date();

function renderCalendar() {
    const mName = document.getElementById('calendar-month-name');
    const monthName = banglaMonths[calDate.getMonth()];
    const year = calDate.getFullYear();
    mName.innerText = `${monthName} ${year}`;
    
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    const month = calDate.getMonth();
    
    // মাসিক সামারি আপডেট
    const mStart = new Date(year, month, 1).toISOString().slice(0,7); // "2025-03"
    const mTrans = data.transactions.filter(t => t.date.startsWith(mStart));
    const mInc = mTrans.filter(t => t.type === 'income').reduce((s,t)=>s+t.amount,0);
    const mExp = mTrans.filter(t => t.type === 'expense').reduce((s,t)=>s+t.amount,0);
    
    document.getElementById('month-inc-summ').innerText = '৳'+mInc;
    document.getElementById('month-exp-summ').innerText = '৳'+mExp;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // খালি ঘর
    for(let i=0; i<firstDay; i++) grid.appendChild(document.createElement('div'));

    // দিনগুলো বসানো
    for(let i=1; i<=daysInMonth; i++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const dayTrans = data.transactions.filter(t => t.date === dateStr);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day' + (dayTrans.length > 0 ? ' has-data' : '');
        dayDiv.innerHTML = `<span>${i}</span>`;
        
        if (dayTrans.length > 0) {
            const dayExp = dayTrans.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
            if(dayExp > 0) dayDiv.innerHTML += `<span style="font-size:0.6rem; margin-top:2px">৳${dayExp}</span>`;
            
            dayDiv.onclick = () => showDayDetailsModal(dateStr);
        }
        grid.appendChild(dayDiv);
    }
}
function changeMonth(d) { calDate.setMonth(calDate.getMonth() + d); renderCalendar(); }

function showDayDetailsModal(dateStr) {
    const dObj = new Date(dateStr);
    const day = dObj.getDate();
    const month = banglaMonths[dObj.getMonth()];
    document.getElementById('detail-date-title').innerText = `${day} ${month}`;
    
    const list = document.getElementById('detail-list');
    const trans = data.transactions.filter(t => t.date === dateStr);
    
    list.innerHTML = trans.map(t => {
         const cat = categories.find(c => c.id === t.category) || {icon:'💰', name:'আয়'};
         const isInc = t.type === 'income';
         const timeDisplay = t.time ? `<div style="font-size:0.7rem; color:#888">${t.time}</div>` : '';
         return `
         <div style="background:var(--card-bg); padding:12px; margin-bottom:8px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 5px rgba(0,0,0,0.05)">
            <div style="display:flex; gap:10px; align-items:center">
                <div style="font-size:1.5rem">${isInc?'💰':cat.icon}</div>
                <div>
                    <div style="font-weight:600; font-size:0.95rem">${isInc?'আয়':cat.name}</div>
                    <div style="font-size:0.8rem; color:var(--text-light)">${t.note || 'নোট নেই'}</div>
                    ${timeDisplay}
                </div>
            </div>
            <div style="font-weight:bold; color:${isInc?'var(--success)':'var(--danger)'}">
                ${isInc?'+':'-'}৳${t.amount}
            </div>
         </div>`;
    }).join('');
    
    document.getElementById('modal-details').classList.remove('hidden');
}

// --- ৯. স্মার্ট নোটস (GROUPED) ---
function renderNotes() {
    const container = document.getElementById('notes-container');
    container.innerHTML = '';
    
    // সিলেক্টর পপুলেট
    const sel = document.getElementById('note-group-select');
    const currentValue = sel.value;
    sel.innerHTML = '<option value="General">সাধারণ</option>';
    
    Object.keys(data.notes).forEach(k => {
        if(k !== 'General') {
            const opt = document.createElement('option');
            opt.value = k; opt.innerText = k;
            sel.appendChild(opt);
        }
    });
    
    // পূর্ববর্তী সিলেক্ট করা মান রাখুন
    if (currentValue && data.notes[currentValue]) {
        sel.value = currentValue;
    }
    
    currentNoteGroup = sel.value;

    const notes = data.notes[currentNoteGroup] || [''];
    
    notes.forEach((txt, i) => {
        const div = document.createElement('div');
        div.className = 'note-item';
        div.innerHTML = `
            <span class="note-num">${i+1}.</span>
            <input type="text" value="${txt}" placeholder="নোট লিখুন..."
                oninput="updateNoteText(${i}, this.value)" 
                onkeydown="handleNoteKey(event, ${i})">
        `;
        container.appendChild(div);
    });
    
    // শেষ ইনপুটে ফোকাস
    setTimeout(() => {
        const inputs = container.querySelectorAll('input');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
        }
    }, 100);
}

function updateNoteText(i, val) {
    data.notes[currentNoteGroup][i] = val;
    // আমরা সেভডাটা কল করছি না যাতে প্রতি অক্ষরে রি-রেন্ডার না হয়, শুধু স্টোরেজ আপডেট
    localStorage.setItem(APP_KEY, JSON.stringify(data));
}

function handleNoteKey(e, i) {
    if (e.key === 'Enter') {
        data.notes[currentNoteGroup].splice(i+1, 0, '');
        saveData(); renderNotes();
        setTimeout(()=>document.querySelectorAll('#notes-container input')[i+1].focus(), 50);
    } else if (e.key === 'Backspace' && data.notes[currentNoteGroup][i] === '') {
        if (data.notes[currentNoteGroup].length > 1) {
            e.preventDefault();
            data.notes[currentNoteGroup].splice(i, 1);
            saveData(); renderNotes();
            setTimeout(()=> {
                const prev = document.querySelectorAll('#notes-container input')[i-1];
                if(prev) prev.focus();
            }, 50);
        }
    }
}

function openAddGroupModal() {
    document.getElementById('modal-add-group').classList.remove('hidden');
    document.getElementById('new-group-name').value = '';
    document.getElementById('new-group-name').focus();
}

function addNewGroup() {
    const nameInput = document.getElementById('new-group-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('গ্রুপের নাম দিন!');
        return;
    }
    
    if (data.notes[name]) {
        alert('এই নামের গ্রুপ আগে থেকেই আছে!');
        return;
    }
    
    data.notes[name] = [''];
    saveData();
    closeModal('modal-add-group');
    
    // সিলেক্টরে নতুন অপশন যোগ করুন এবং সিলেক্ট করুন
    const sel = document.getElementById('note-group-select');
    const opt = document.createElement('option');
    opt.value = name; opt.innerText = name;
    sel.appendChild(opt);
    sel.value = name;
    
    renderNotes();
}

// --- ১০. সেটিংস ও লক সিস্টেম ---
function openSettings() { 
    document.getElementById('modal-settings').classList.remove('hidden'); 
}

function setMonthlyBudget() {
    document.getElementById('modal-budget').classList.remove('hidden');
    document.getElementById('budget-amount').value = data.budget || '';
    document.getElementById('budget-amount').focus();
}

function saveBudget() {
    const amount = parseFloat(document.getElementById('budget-amount').value);
    if (!isNaN(amount) && amount >= 0) {
        data.budget = amount;
        saveData();
        closeModal('modal-budget');
        alert("বাজেট সেট হয়েছে!");
    } else {
        alert("সঠিক টাকার পরিমাণ দিন!");
    }
}

function downloadReport() {
    // প্রিন্ট ডায়ালগ ওপেন করবে
    switchTab('tab-hisab');
    setTimeout(() => {
        window.print();
    }, 500);
}

// নতুন: PIN verification for reset
function resetDataWithConfirmation() {
    if (data.settings.pin) {
        // PIN সেট করা আছে, PIN verification মোডাল ওপেন করুন
        document.getElementById('modal-reset-pin').classList.remove('hidden');
        document.getElementById('pin-reset-input').value = '';
        document.getElementById('pin-reset-input').focus();
    } else {
        // কোনো PIN নেই, সরাসরি কনফার্মেশন
        if (confirm("সতর্কতা: সব হিসাব মুছে যাবে। আপনি কি নিশ্চিত?")) {
            localStorage.removeItem(APP_KEY);
            location.reload();
        }
    }
}

function verifyPinForReset() {
    const pin = document.getElementById('pin-reset-input').value;
    if (pin === data.settings.pin) {
        // PIN মিলে গেছে, রিসেট করুন
        localStorage.removeItem(APP_KEY);
        location.reload();
    } else {
        alert('ভুল পিন! রিসেট বাতিল হয়েছে।');
        closeModal('modal-reset-pin');
    }
}

// লক সিস্টেম
function checkLock() {
    if(data.settings.pin) {
        document.getElementById('lock-screen').classList.remove('hidden');
        renderNumpad();
    } else {
        document.getElementById('app-container').classList.remove('hidden');
    }
}

function renderNumpad() {
    const pad = document.getElementById('numpad');
    pad.innerHTML = '';
    [1,2,3,4,5,6,7,8,9,0].forEach(n => {
        const btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.innerText = n;
        btn.onclick = () => handlePin(n);
        pad.appendChild(btn);
    });
}

function handlePin(n) {
    enteredPin += n;
    const dots = document.querySelectorAll('.pin-dots span');
    dots.forEach((d,i) => i < enteredPin.length ? d.classList.add('filled') : d.classList.remove('filled'));
    
    if(enteredPin.length === 4) {
        if(enteredPin === data.settings.pin) {
            document.getElementById('lock-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
        } else {
            navigator.vibrate(200); // ভুল হলে ভাইব্রেট
            enteredPin = '';
            alert('ভুল পিন!');
            dots.forEach(d => d.classList.remove('filled'));
        }
    }
}

function toggleAppLock() {
    if(data.settings.pin) {
        if(confirm("পিন রিমুভ করবেন?")) {
            data.settings.pin = null;
            saveData();
            alert("পিন রিমুভ হয়েছে।");
            closeModal('modal-settings');
        }
    } else {
        isSettingPin = true;
        document.getElementById('modal-pin').classList.remove('hidden');
        document.getElementById('pin-modal-title').textContent = 'পিন সেটআপ';
        document.getElementById('pin-instruction').textContent = '৪ সংখ্যার নতুন পিন দিন:';
        document.getElementById('pin-input').value = '';
        document.getElementById('pin-input').focus();
    }
}

function savePin() {
    const pin = document.getElementById('pin-input').value;
    
    if (pin.length !== 4 || isNaN(pin)) {
        alert("সঠিকভাবে ৪টি সংখ্যা দিন।");
        return;
    }
    
    data.settings.pin = pin;
    saveData();
    closeModal('modal-pin');
    closeModal('modal-settings');
    alert("পিন সেট হয়েছে!");
    
    // লক স্ক্রিন দেখান
    checkLock();
}

// --- ১১. স্মার্ট চেক (Yesterday Summary) ---
function checkYesterdaySummary() {
    const lastDate = data.settings.lastOpened;
    const today = new Date().toISOString().slice(0,10);
    
    // গতকালের তারিখ বের করা
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().slice(0,10);

    if (lastDate && lastDate === yesterday) {
        // ইউজার গতকালও ঢুকেছিল, আজ প্রথমবার
        // চেক করি গতকাল খরচ কত ছিল
        const prevTrans = data.transactions.filter(t => t.date === yesterday && t.type === 'expense');
        const total = prevTrans.reduce((s,t) => s + t.amount, 0);
        
        setTimeout(() => {
            if(total > 0) {
                alert(`📅 গতকালের সামারি:\nমোট খরচ হয়েছিল: ৳${total}`);
            } else {
                alert(`📅 গতকাল কোনো খরচ করেননি!\n"খুব ভালো, টাকা জমানো শিখছেন!" 😉`);
            }
        }, 1000);
    }
    
    data.settings.lastOpened = today;
    saveData();
}

// --- ১২. প্রথমবারের গাইডলাইন পপআপ ---
function closeFirstTimeModal() {
    data.settings.firstTime = false;
    saveData();
    closeModal('modal-first-time');
}

function openGuideTab() {
    closeModal('modal-first-time');
    switchTab('tab-guide', document.querySelector('.nav-item[onclick*="tab-guide"]'));
}

// --- 🎩 জাদু ক্যালকুলেটর লজিক ---

// ১. বন্ধু যোগ করা
function addZaduFriend() {
    const inp = document.getElementById('zadu-friend-input');
    const name = inp.value.trim();
    
    if (!name) {
        alert('নাম লিখুন!');
        return;
    }
    
    if (data.zadu.friends.includes(name)) {
        alert('এই নাম আগে থেকেই আছে!');
        return;
    }
    
    data.zadu.friends.push(name);
    inp.value = '';
    saveData();
    renderZaduUI();
}

// ২. বন্ধু রিমুভ করা
function removeZaduFriend(name) {
    if (!confirm(`${name} কে মুছে ফেলবেন?`)) return;
    
    // বন্ধু রিমুভ
    data.zadu.friends = data.zadu.friends.filter(f => f !== name);
    
    // সংশ্লিষ্ট লেনদেনও রিমুভ
    data.zadu.transactions = data.zadu.transactions.filter(t => 
        t.payer !== name && !t.forWhom.includes(name)
    );
    
    saveData();
    renderZaduUI();
}

// ৩. লেনদেন যোগ করা
function addZaduTransaction() {
    const payer = document.getElementById('zadu-payer').value;
    const amount = parseFloat(document.getElementById('zadu-amount').value);
    const note = document.getElementById('zadu-note').value;
    
    if (!payer) {
        alert('কে দিয়েছে সেটা বলুন!');
        return;
    }
    
    if (!amount || amount <= 0) {
        alert('টাকার পরিমাণ দিন!');
        return;
    }
    
    const checks = document.querySelectorAll('#zadu-for-whom input:checked');
    const forWhom = Array.from(checks).map(c => c.value);
    
    if (forWhom.length === 0) {
        alert('কমপক্ষে একজনের জন্য সিলেক্ট করুন!');
        return;
    }
    
    const time = new Date().toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'});
    
    data.zadu.transactions.push({
        id: Date.now(),
        payer,
        amount,
        forWhom,
        note,
        time
    });
    
    document.getElementById('zadu-amount').value = '';
    document.getElementById('zadu-note').value = '';
    saveData();
    renderZaduUI();
}

// ৪. লেনদেন এডিট করা
function editZaduTransaction(id) {
    editingZaduId = id;
    const t = data.zadu.transactions.find(t => t.id === id);
    if (!t) return;
    
    // পেয়ার সিলেক্ট
    const ps = document.getElementById('edit-zadu-payer');
    ps.innerHTML = '<option value="">কে দিয়েছে?</option>' +
        data.zadu.friends.map(f => `<option value="${f}" ${f === t.payer ? 'selected' : ''}>${f}</option>`).join('');
    
    document.getElementById('edit-zadu-amount').value = t.amount;
    document.getElementById('edit-zadu-note').value = t.note || '';
    
    // কার জন্য চেকবক্স
    const fw = document.getElementById('edit-zadu-for-whom');
    fw.innerHTML = data.zadu.friends.map(f => `
        <label class="checkbox-item">
            <input type="checkbox" value="${f}" ${t.forWhom.includes(f) ? 'checked' : ''}>
            <span>${f}</span>
        </label>
    `).join('');
    
    document.getElementById('modal-edit-zadu').classList.remove('hidden');
}

// ৫. লেনদেন আপডেট করা
function updateZaduTransaction() {
    const payer = document.getElementById('edit-zadu-payer').value;
    const amount = parseFloat(document.getElementById('edit-zadu-amount').value);
    const note = document.getElementById('edit-zadu-note').value;
    
    if (!payer) {
        alert('কে দিয়েছে সেটা বলুন!');
        return;
    }
    
    if (!amount || amount <= 0) {
        alert('টাকার পরিমাণ দিন!');
        return;
    }
    
    const checks = document.querySelectorAll('#edit-zadu-for-whom input:checked');
    const forWhom = Array.from(checks).map(c => c.value);
    
    if (forWhom.length === 0) {
        alert('কমপক্ষে একজনের জন্য সিলেক্ট করুন!');
        return;
    }
    
    const tIndex = data.zadu.transactions.findIndex(t => t.id === editingZaduId);
    if (tIndex !== -1) {
        data.zadu.transactions[tIndex].payer = payer;
        data.zadu.transactions[tIndex].amount = amount;
        data.zadu.transactions[tIndex].forWhom = forWhom;
        data.zadu.transactions[tIndex].note = note;
        saveData();
        renderZaduUI();
        closeModal('modal-edit-zadu');
        editingZaduId = null;
    }
}

// ৬. লেনদেন ডিলিট করা
function deleteZaduTransaction(id) {
    if (!confirm('মুছে ফেলবেন?')) return;
    
    data.zadu.transactions = data.zadu.transactions.filter(t => t.id !== id);
    saveData();
    renderZaduUI();
}

// ৭. হিসাব ক্যালকুলেট করা
function calculateZaduSettlements() {
    const balances = {};
    
    // সব বন্ধুর ব্যালেন্স ০ দিয়ে শুরু
    data.zadu.friends.forEach(f => balances[f] = 0);
    
    // প্রতিটি লেনদেন প্রসেস করা
    data.zadu.transactions.forEach(t => {
        const perPerson = t.amount / t.forWhom.length;
        
        // যে দিল তার ব্যালেন্স বাড়বে
        balances[t.payer] += t.amount;
        
        // যাদের জন্য দিল তাদের ব্যালেন্স কমবে
        t.forWhom.forEach(p => balances[p] -= perPerson);
    });
    
    // রাউন্ডিং
    Object.keys(balances).forEach(k => {
        balances[k] = Math.round(balances[k] * 100) / 100;
    });
    
    // কে ঋণী, কে পাওনাদার
    const debtors = [];
    const creditors = [];
    
    Object.entries(balances).forEach(([p, b]) => {
        if (b > 0.01) creditors.push({ name: p, amount: b });
        else if (b < -0.01) debtors.push({ name: p, amount: -b });
    });
    
    // সেটেলমেন্ট ক্যালকুলেশন
    const settlements = [];
    
    while (creditors.length > 0 && debtors.length > 0) {
        // পাওনাদারদের বড় থেকে ছোট সাজানো
        creditors.sort((a, b) => b.amount - a.amount);
        // ঋণীদের বড় থেকে ছোট সাজানো
        debtors.sort((a, b) => b.amount - a.amount);
        
        const c = creditors[0];
        const d = debtors[0];
        const amt = Math.min(c.amount, d.amount);
        
        settlements.push({ 
            from: d.name, 
            to: c.name, 
            amount: Math.round(amt * 100) / 100 
        });
        
        c.amount -= amt;
        d.amount -= amt;
        
        if (c.amount < 0.01) creditors.shift();
        if (d.amount < 0.01) debtors.shift();
    }
    
    return { balances, settlements };
}

// ৮. UI রেন্ডার
function renderZaduUI() {
    // বন্ধুদের লিস্ট
    const fl = document.getElementById('zadu-friends-list');
    if (fl) {
        if (data.zadu.friends.length === 0) {
            fl.innerHTML = `
                <div class="empty-state">
                    <i class="ri-user-add-line"></i>
                    <p>কোনো বন্ধু যোগ করা হয়নি</p>
                </div>
            `;
        } else {
            fl.innerHTML = data.zadu.friends.map(f => `
                <div class="friend-chip">
                    <span>${f}</span>
                    <button onclick="removeZaduFriend('${f}')" class="remove-friend-btn">×</button>
                </div>
            `).join('');
        }
    }
    
    // পেয়ার সিলেক্ট
    const ps = document.getElementById('zadu-payer');
    if (ps) {
        ps.innerHTML = '<option value="">কে দিয়েছে?</option>' +
            data.zadu.friends.map(f => `<option value="${f}">${f}</option>`).join('');
    }
    
    // কার জন্য চেকবক্স
    const fw = document.getElementById('zadu-for-whom');
    if (fw) {
        if (data.zadu.friends.length === 0) {
            fw.innerHTML = '<p style="color:var(--text-light)">আগে বন্ধু যোগ করুন</p>';
        } else {
            fw.innerHTML = data.zadu.friends.map(f => `
                <label class="checkbox-item">
                    <input type="checkbox" value="${f}" checked>
                    <span>${f}</span>
                </label>
            `).join('');
        }
    }
    
    // লেনদেন লিস্ট
    const tl = document.getElementById('zadu-transactions-list');
    if (tl) {
        if (data.zadu.transactions.length === 0) {
            tl.innerHTML = `
                <div class="empty-state">
                    <i class="ri-file-list-line"></i>
                    <p>কোনো লেনদেন নেই</p>
                </div>
            `;
        } else {
            tl.innerHTML = data.zadu.transactions.map(t => `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <h5>${t.payer} দিয়েছেন</h5>
                        <p>${t.forWhom.join(', ')} এর জন্য</p>
                        ${t.note ? `<p><small>${t.note}</small></p>` : ''}
                        ${t.time ? `<p class="transaction-time">${t.time}</p>` : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:12px">
                        <div class="transaction-amount">৳${t.amount}</div>
                        <button onclick="editZaduTransaction(${t.id})" class="edit-trans-btn">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button onclick="deleteZaduTransaction(${t.id})" class="delete-trans-btn">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // রেজাল্ট
    const res = document.getElementById('zadu-result');
    if (res) {
        if (data.zadu.friends.length === 0 || data.zadu.transactions.length === 0) {
            res.innerHTML = `
                <div class="empty-state">
                    <i class="ri-calculator-line"></i>
                    <p>এখনো কোনো হিসাব নেই</p>
                </div>
            `;
            return;
        }
        
        const { balances, settlements } = calculateZaduSettlements();
        
        let html = '<h4 style="margin-bottom:15px; color:var(--text-main)">প্রত্যেকের ব্যালেন্স:</h4>';
        
        Object.entries(balances).forEach(([p, b]) => {
            const color = b > 0.01 ? 'var(--success)' : b < -0.01 ? 'var(--danger)' : 'var(--text-light)';
            const status = b > 0.01 ? 'পাবে' : b < -0.01 ? 'দিতে হবে' : 'সমান';
            html += `
                <div class="balance-item">
                    <span>${p}</span>
                    <span style="color:${color}; font-weight:700">
                        ${b > 0 ? '+' : ''}৳${Math.abs(b).toFixed(2)} ${status}
                    </span>
                </div>
            `;
        });
        
        html += '<div class="settlement-section"><h4 style="margin-bottom:15px; color:var(--text-main)">🎯 কে কাকে কত দিবে:</h4>';
        
        if (settlements.length === 0) {
            html += '<p style="color:var(--success); font-weight:600; text-align:center">✅ সবার হিসাব মিলে গেছে!</p>';
        } else {
            settlements.forEach(s => {
                html += `
                    <div class="settlement-item">
                        <div>
                            <span style="font-weight:600">${s.from}</span>
                            <i class="ri-arrow-right-line" style="margin:0 10px; color:var(--text-light)"></i>
                            <span style="font-weight:600">${s.to}</span>
                        </div>
                        <div style="font-size:1.3rem; font-weight:700; color:var(--primary)">৳${s.amount}</div>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        res.innerHTML = html;
    }
}

// ৯. জাদু ক্যালকুলেটর রিসেট
function resetZadu() {
    if (!confirm('জাদু ক্যালকুলেটরের সব ডাটা মুছে ফেলবেন?')) return;
    
    data.zadu = {
        friends: [],
        transactions: []
    };
    
    saveData();
    renderZaduUI();
}