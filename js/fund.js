// =========================================================
// 💼 ข้อมูลพื้นฐานและการตั้งค่า (Configuration)
// =========================================================
let fundMetaData = {
    lastUpdated: "กำลังดึงข้อมูล...",
    nextDueDate: "15 พ.ย. 2569"
};

// ใช้โครงสร้าง Expenses แบบเดิม ผสม Transactions
let membersData = [];
let expensesData = [];
let transactionsData = [];

// 🌐 URL ของ Google Apps Script (ตรวจสอบให้ตรงกับของคุณ)
const API_URL = "https://script.google.com/macros/s/AKfycbw3Ad2IF2oUhRXNA6kQj2iVjnORbslQ3N2PcMWMBH6-GpC4b-ZsAdBSv43pzSd9MIGtow/exec";

// =========================================================
// 🔄 ระบบดึงข้อมูลและจัดการหน้าจอ (Fetch & Navigation)
// =========================================================
async function fetchFundDataFromGoogleSheets() {
    try {
        const response = await fetch(API_URL, { redirect: 'follow' }); // แก้ปัญหา CORS
        const data = await response.json();
        
        membersData = data.members || [];
        expensesData = data.expenses || []; 
        transactionsData = data.transactions || [];
        
        fundMetaData.lastUpdated = new Date().toLocaleDateString('th-TH', { 
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        if (!document.getElementById('page-fund').classList.contains('d-none')) {
            renderFundData();
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลชีท:", error);
        Swal.fire('แจ้งเตือน', 'ไม่สามารถเชื่อมต่อฐานข้อมูลกองกลางได้', 'error');
    }
}

window.openFundPage = function() {
    document.getElementById('page-fund').classList.remove('d-none');
    fetchFundDataFromGoogleSheets();
}

window.closeFundPage = function() {
    document.getElementById('page-fund').classList.add('d-none');
}

// =========================================================
// 🧠 เครื่องยนต์คำนวณบัญชีอัจฉริยะ (Smart Ledger Engine)
// =========================================================

function getUserFinancials(userName) {
    let myUserObj = membersData.find(m => m.name === userName) || { isActive: true };
    
    let totalOwed = 0; // หนี้รวม
    let breakdown = []; // แจกแจงรายบิล
    
    // 1. คำนวณหนี้จากตาราง Expenses
    const TRAVEL_ICONS = ['bi-car-front-fill', 'bi-fuel-pump', 'bi-signpost-split', 'bi-cup-hot', 'bi-bag-heart', 'bi-p-circle', 'bi-shop'];

    expensesData.forEach(exp => {
        let isTravel = TRAVEL_ICONS.includes(exp.icon);
        let isExcluded = !myUserObj.isActive || exp.excluded.includes(userName);
        let owedAmount = 0;
        
        if (!isExcluded) {
            let payingMembersCount = membersData.filter(m => m.isActive && !exp.excluded.includes(m.name)).length;
            if (payingMembersCount > 0) {
                owedAmount = Math.ceil(exp.totalAmount / payingMembersCount);
            }
        }
        
        // 🔥 จุดสำคัญ: ถ้าไม่ใช่บิลค่าเดินทาง ถึงจะเอาไปบวกเป็นหนี้กองกลาง!
        if (!isTravel) {
            totalOwed += owedAmount;
        }
        
        // 2. คำนวณยอดที่จ่ายไปแล้ว สำหรับบิลนี้โดยเฉพาะ (เช็คจาก Transactions)
        let paidForThisBill = transactionsData
            .filter(tx => tx.billId == exp.id && tx.paidFor === userName)
            .reduce((sum, tx) => sum + tx.amount, 0);
            
        breakdown.push({
            billId: exp.id,
            billName: exp.name,
            totalAmount: exp.totalAmount,
            owedAmount: owedAmount,
            paidAmount: paidForThisBill,
            isExcluded: isExcluded || owedAmount === 0,
            isTravel: isTravel, // แปะป้ายบอกว่าเป็นบิลเดินทาง
            icon: exp.icon || 'bi-receipt'
        });
    });
    
    // 3. ยอดจ่ายรวมทั้งหมดของคนนี้
    let totalPaid = transactionsData
        .filter(tx => tx.paidFor === userName)
        .reduce((sum, tx) => sum + tx.amount, 0);
        
    return { totalOwed, totalPaid, breakdown };
}

// ฟังก์ชันหาว่าใครค้างจ่ายบิลไหนบ้าง (ใช้ตอนเปิดตะกร้าหักหนี้)
function calculateDebts(payersArray) {
    let debts = [];
    payersArray.forEach(payer => {
        let fin = getUserFinancials(payer);
        fin.breakdown.forEach(billFin => {
            let remaining = billFin.owedAmount - billFin.paidAmount;
            
            if (remaining > 0 && !billFin.isExcluded && !billFin.isTravel) {
                debts.push({
                    billId: billFin.billId,
                    billName: billFin.billName,
                    paidFor: payer,
                    remaining: remaining,
                    allocated: 0
                });
            }
        });
    });
    return debts;
}

// =========================================================
// 🎨 ฟังก์ชันวาดหน้าจอหลักกองกลาง (Render UI)
// =========================================================
function renderFundData() {
    const userName = localStorage.getItem('tripUserName') || 'Guest';
    const myUserObj = membersData.find(m => m.name === userName) || { isActive: true };
    const myFin = getUserFinancials(userName); 
    
    document.getElementById('fund-last-update').textContent = fundMetaData.lastUpdated;
    document.getElementById('fund-due-date').textContent = fundMetaData.nextDueDate;

    const remain = myFin.totalOwed - myFin.totalPaid;
    let progress = myFin.totalOwed > 0 ? (myFin.totalPaid / myFin.totalOwed) * 100 : 0;

    // --- 1. จัดการข้อมูลส่วนตัว (การ์ดด้านบน) ---
    document.getElementById('fund-user-name').textContent = userName;
    document.getElementById('fund-personal-total').textContent = myFin.totalOwed.toLocaleString();

    if (!myUserObj.isActive) {
        document.getElementById('fund-personal-remain').textContent = "ไม่ได้ไปทริปนี้";
        document.getElementById('fund-personal-remain').classList.add('fs-4');
        document.getElementById('fund-personal-progress').style.width = `0%`;
        document.getElementById('fund-personal-paid').textContent = "0";
    } else {
        document.getElementById('fund-personal-paid').textContent = myFin.totalPaid.toLocaleString();
        if (remain < 0) {
            document.getElementById('fund-personal-remain').textContent = `ได้คืน ฿${Math.abs(remain).toLocaleString()}`;
        } else {
            document.getElementById('fund-personal-remain').textContent = `฿${remain > 0 ? remain.toLocaleString() : '0 (ครบแล้ว)'}`;
        }
        document.getElementById('fund-personal-progress').style.width = `${progress}%`;
    }

    const card = document.getElementById('fund-personal-card');
    if (!myUserObj.isActive) {
        card.style.background = 'linear-gradient(135deg, #6c757d, #adb5bd)';
    } else if (remain <= 0 && myFin.totalOwed > 0) {
        card.style.background = 'linear-gradient(135deg, #28a745, #85e09b)';
    } else {
        card.style.background = 'linear-gradient(135deg, var(--color-4), #f8cdda)';
    }

    // --- 2. วาดบิลรายละเอียด Breakdown (แยกกองกลาง กับ จัดกลุ่มรถ) ---
    const expenseListMain = document.getElementById('fund-expense-list-main');
    const expenseListTravel = document.getElementById('fund-expense-list-travel');
    expenseListMain.innerHTML = '';
    expenseListTravel.innerHTML = '';
    
    // ยอดรวมทั้งทริป (Total Trip Burn)
    let grandTotalBurn = 0;

    // 2.1 วาดบิลกองกลางหลัก
    myFin.breakdown.filter(exp => !exp.isTravel).forEach(exp => {
        grandTotalBurn += exp.totalAmount; // บวกเข้ายอดใช้จ่ายรวม
        
        let statusText = "";
        let colorClass = "text-dark";
        let amountText = `฿${exp.owedAmount.toLocaleString()}`;
        const currentExpObj = expensesData.find(e => e.id == exp.billId);
        let payingCount = currentExpObj ? membersData.filter(m => m.isActive && !currentExpObj.excluded.includes(m.name)).length : 0;

        if (exp.isExcluded) {
            statusText = `<span class="badge bg-light text-secondary rounded-pill">ไม่ได้หาร</span>`;
            colorClass = "text-muted"; amountText = "฿0";
        } else if (exp.paidAmount >= exp.owedAmount && exp.owedAmount > 0) {
            statusText = `<span class="badge bg-success-subtle text-success rounded-pill">จ่ายแล้ว</span>`;
        } else {
            statusText = `<span class="badge bg-secondary-subtle text-secondary rounded-pill">หาร ${payingCount} คน</span>`;
        }

        expenseListMain.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div class="d-flex align-items-center gap-2 ${colorClass}">
                    <i class="bi ${exp.icon} fs-5 text-muted"></i>
                    <div>
                        <p class="mb-0 small fw-bold">${exp.billName}</p>
                        ${statusText} <small class="text-muted">(รวม ฿${exp.totalAmount.toLocaleString()})</small>
                    </div>
                </div>
                <div class="${colorClass} fw-bold">${amountText}</div>
            </div>
        `;
    });

    // 2.2 วาดบิลค่าเดินทาง (แยกกลุ่มรถ)
    let cars = expensesData.filter(e => e.icon === 'bi-car-front-fill');
    
    if (cars.length === 0) {
        expenseListTravel.innerHTML = '<div class="text-center text-muted small py-2">คุณยังไม่มีกลุ่มรถ หรือบิลค่าเดินทาง</div>';
    } else {
        cars.forEach(car => {
            // หารายชื่อคนในรถ
            let peopleInCarCount = membersData.filter(m => m.isActive && !car.excluded.includes(m.name)).length;
            
            // หาบิลที่อยู่ในรถคันนี้ (เช็คจาก Tag [🚗 ชื่อรถ] ที่เราแอบใส่ไว้ตอนเซฟ)
            let carExpenses = expensesData.filter(e => e.icon !== 'bi-car-front-fill' && e.name.startsWith(`[${car.name}]`));
            
            let carTotal = 0;
            let expenseItemsHTML = '';
            
            carExpenses.forEach(ce => {
                carTotal += ce.totalAmount;
                grandTotalBurn += ce.totalAmount; // บวกเข้ายอดใช้จ่ายรวม
                
                // สกัดชื่อบิลกับคนจ่ายออกมา (แยกด้วยเครื่องหมาย |)
                let cleanName = ce.name.replace(`[${car.name}] `, '').split(' | ');
                let itemName = cleanName[0];
                let payerName = cleanName[1] ? cleanName[1] : '';

                expenseItemsHTML += `
                    <div class="d-flex justify-content-between align-items-center mt-2 small border-bottom pb-1 border-light">
                        <div>
                            <i class="bi ${ce.icon} text-muted me-1"></i> <span class="fw-bold">${itemName}</span><br>
                            <span class="text-muted" style="font-size: 0.7rem;">${payerName}</span>
                        </div>
                        <span class="fw-bold text-dark">฿${ce.totalAmount.toLocaleString()}</span>
                    </div>
                `;
            });
            
            let perPerson = peopleInCarCount > 0 ? Math.ceil(carTotal / peopleInCarCount) : 0;
            let amIInThisCar = !car.excluded.includes(userName);
            let borderHighlight = amIInThisCar ? 'border-primary border-4 shadow-sm' : 'border-light opacity-75';

            expenseListTravel.innerHTML += `
                <div class="glass-card mb-3 p-3 border-start ${borderHighlight}" style="background-color: #f8f9fa;">
                    <h6 class="fw-bold text-primary mb-1">${car.name} <span class="badge bg-light text-dark border">ลูกเรือ ${peopleInCarCount} คน</span></h6>
                    ${expenseItemsHTML || '<div class="small text-muted mt-2">ยังไม่มีค่าใช้จ่าย</div>'}
                    
                    <div class="mt-2 pt-2 text-end">
                        <span class="fw-bold text-dark">ยอดรวมรถคันนี้: ฿${carTotal.toLocaleString()}</span><br>
                        ${carTotal > 0 ? `<span class="badge bg-danger rounded-pill px-3 py-1 mt-1 fs-6 shadow-sm">หารตกคนละ ฿${perPerson.toLocaleString()}</span>` : ''}
                        ${carTotal > 0 ? `<div class="small text-muted mt-1">*ไปเคลียร์เงิน โอนคืนคนจ่ายกันเองนะจ๊ะ</div>` : ''}
                    </div>
                </div>
            `;
        });
    }

    // อัปเดตยอดรวมทั้งหมด
    document.getElementById('fund-total-owed-display').textContent = myFin.totalOwed.toLocaleString(); // หนี้กองกลางของคุณ
    
    // 🌟 โชว์สถิติ "ทริปนี้ละลายทรัพย์ไปแล้วรวม..." (เพิ่ม element นี้ต่อท้ายใน HTML หรือโชว์แบบนี้ไปเลย)
    if(document.getElementById('fund-grand-total')) {
        document.getElementById('fund-grand-total').textContent = grandTotalBurn.toLocaleString();
    }

    
    // --- 3. จัดการสิทธิ์แอดมิน ---
    const adminControls = document.getElementById('admin-controls');
    if (userName === 'แป๊ะ') adminControls.classList.remove('d-none');
    else adminControls.classList.add('d-none');

    // --- 4. แสดงสถานะเพื่อนๆ ทุกคนในทริป ---
    const listContainer = document.getElementById('fund-members-list');
    listContainer.innerHTML = '';

    membersData.forEach(member => {
        let memFin = getUserFinancials(member.name);
        let memRemain = memFin.totalOwed - memFin.totalPaid;
        
        let statusBadge = "";
        let opacity = "1";

        if (!member.isActive) {
            statusBadge = `<span class="badge bg-secondary-subtle text-secondary rounded-pill">ยกเลิกทริป</span>`;
            opacity = "0.5";
        } else if (memRemain < 0) {
            statusBadge = `<span class="badge bg-info-subtle text-info rounded-pill">จ่ายเกิน (ทอน ฿${Math.abs(memRemain)})</span>`;
        } else if (memRemain === 0 && memFin.totalOwed > 0) {
            statusBadge = `<span class="badge bg-success-subtle text-success rounded-pill">ครบแล้ว</span>`;
        } else {
            statusBadge = `<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill">ค้าง ฿${memRemain.toLocaleString()}</span>`;
        }

        const item = document.createElement('div');
        item.className = 'glass-card p-3 d-flex justify-content-between align-items-center mb-2 shadow-sm';
        item.style.opacity = opacity;
        if (member.name === userName) item.style.borderLeft = "4px solid var(--color-4)";

        item.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="bg-light border rounded-circle d-flex align-items-center justify-content-center fw-bold text-secondary" style="width: 45px; height: 45px; overflow: hidden;">
                    ${member.img ? `<img src="${member.img}" style="width: 100%; height: 100%; object-fit: cover;">` : member.name.substring(0,1)}
                </div>
                <div>
                    <h6 class="mb-0 fw-bold ${member.name === userName ? 'text-danger' : ''} ${!member.isActive ? 'text-decoration-line-through' : ''}">${member.name}</h6>
                    <small class="text-muted">จ่าย: ฿${memFin.totalPaid.toLocaleString()} / ฿${memFin.totalOwed.toLocaleString()}</small>
                </div>
            </div>
            <div>${statusBadge}</div>
        `;
        listContainer.appendChild(item);
    });
}

// =========================================================
// 🛒 ระบบแนบสลิป & ตะกร้าหักหนี้อัจฉริยะ (Smart Slip)
// =========================================================
window.notifyPayment = function() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return Swal.fire('ไฟล์ใหญ่เกินไป!', 'ขอรูปสลิปไม่เกิน 5MB นะวัยรุ่น', 'error');

        const reader = new FileReader();
        reader.onload = function(event) {
            openSmartAllocationUI(event.target.result, file);
        };
        reader.readAsDataURL(file);
    };
    fileInput.click();
};

function openSmartAllocationUI(base64, file) {
    const myName = localStorage.getItem('tripUserName') || '';
    window.__smartAllocations = []; 
    
    let payersHTML = membersData.filter(m => m.isActive).map(m => `
        <label class="btn btn-sm ${m.name === myName ? 'btn-danger shadow-sm' : 'btn-outline-danger'} me-2 mb-2 rounded-pill px-3" style="cursor: pointer;">
            <input type="checkbox" class="d-none payer-checkbox" value="${m.name}" ${m.name === myName ? 'checked' : ''}> 
            <i class="bi bi-person-circle"></i> ${m.name}
        </label>
    `).join('');

    Swal.fire({
        title: 'กรอกข้อมูล',
        html: `
            <img src="${base64}" class="img-fluid rounded-3 mb-3 shadow-sm border" style="max-height: 180px; object-fit: contain;">
            
            <div class="mb-3 text-start">
                <label class="fw-bold mb-1 text-secondary">ยอดเงินในสลิป (บาท)</label>
                <input type="number" id="slip-total" class="form-control form-control-lg text-center fw-bold text-success" placeholder="กรอกยอดที่โอน" style="font-size: 1.5rem;">
            </div>
            
            <div class="mb-3 text-start bg-light p-2 rounded-3 border">
                <label class="small fw-bold mb-1"><i class="bi bi-people-fill"></i> จ่ายให้ใครบ้าง? (ติ๊กเลือกได้)</label>
                <div id="payer-list" class="d-flex flex-wrap">${payersHTML}</div>
            </div>
            
            <div class="mb-2 text-start">
                <div class="d-flex justify-content-between align-items-end border-bottom pb-2">
                    <label class="small fw-bold mb-0">รายการที่ค้างจ่าย</label>
                    <span class="small fw-bold text-dark badge bg-warning">ยอดในมือ: ฿<span id="display-balance">0</span></span>
                </div>
                <div id="debt-list" class="mt-2" style="max-height: 250px; overflow-y: auto;"></div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: 'var(--color-4)',
        confirmButtonText: '🚀 บันทึกสลิป',
        cancelButtonText: 'ยกเลิก',
        didOpen: setupSmartSlipLogic, 
        preConfirm: () => {
            const inputAmount = parseFloat(document.getElementById('slip-total').value);
            if(!inputAmount || inputAmount <= 0) {
                Swal.showValidationMessage('อย่าลืมกรอกยอดเงินในสลิปด้วยจ้า!'); return false;
            }
            
            const finalAllocations = window.__smartAllocations.filter(d => d.allocated > 0).map(d => ({
                paidFor: d.paidFor,
                billId: d.billId,
                amount: d.allocated
            }));

            if(finalAllocations.length === 0) {
                Swal.showValidationMessage('เงินเหลือ! กรุณาติ๊กเลือกรายการที่จะจ่ายด้านล่างด้วย'); return false;
            }
            
            let totalAllocated = finalAllocations.reduce((sum, d) => sum + d.amount, 0);
            if(totalAllocated !== inputAmount) {
                Swal.showValidationMessage('จัดสรรเงินยังไม่ครบดี หรือเกินยอดสลิปนะ เช็คใหม่ๆ'); return false;
            }

            return { transferBy: myName, allocations: finalAllocations, base64: base64, fileName: file.name, mimeType: file.type };
        }
    }).then((result) => {
        if (result.isConfirmed) uploadSmartSlipToServer(result.value);
    });
}

function setupSmartSlipLogic() {
    let currentDebts = [];
    let totalSlipAmount = 0;
    let remainingBalance = 0;

    const inputTotal = document.getElementById('slip-total');
    const displayBalance = document.getElementById('display-balance');
    const debtList = document.getElementById('debt-list');
    const payerCheckboxes = document.querySelectorAll('.payer-checkbox');

    function renderDebtsUI() {
        const selectedPayers = Array.from(payerCheckboxes).filter(c => c.checked).map(c => c.value);
        const newDebts = calculateDebts(selectedPayers); 
        
        newDebts.forEach(nd => {
            const existing = currentDebts.find(cd => cd.billId === nd.billId && cd.paidFor === nd.paidFor);
            if(existing) nd.allocated = existing.allocated;
        });
        currentDebts = newDebts;
        window.__smartAllocations = currentDebts; 
        updateAllocationsUI();
    }

    function updateAllocationsUI() {
        let totalAllocated = currentDebts.reduce((sum, d) => sum + d.allocated, 0);
        remainingBalance = totalSlipAmount - totalAllocated;
        displayBalance.innerText = remainingBalance.toLocaleString();

        debtList.innerHTML = '';
        if(currentDebts.length === 0) {
            debtList.innerHTML = '<div class="text-center text-muted small py-3">ไม่มีรายการค้างจ่ายสำหรับคนที่เลือก 🎉</div>';
            return;
        }

        // 🌟 1. จัดกลุ่มบิลตามชื่อคน (Group by paidFor) แต่ยังคงเก็บ index เดิมไว้เพื่อให้ระบบติ๊กทำงานได้
        let groupedDebts = {};
        currentDebts.forEach((debt, index) => {
            if (!groupedDebts[debt.paidFor]) {
                groupedDebts[debt.paidFor] = [];
            }
            groupedDebts[debt.paidFor].push({ debt, index });
        });

        // 🌟 2. วนลูปวาดรายการตามแต่ละคน
        for (const [person, debts] of Object.entries(groupedDebts)) {
            
            // วาดหัวข้อชื่อคน
            const header = document.createElement('div');
            header.className = 'mt-3 mb-2 px-1 text-start d-flex align-items-center gap-2 border-bottom pb-1';
            header.innerHTML = `
                <div class="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 28px; height: 28px;">
                    <i class="bi bi-person-fill small"></i>
                </div>
                <h6 class="fw-bold text-dark mb-0">บิลของ ${person}</h6>
            `;
            debtList.appendChild(header);

            // วาดการ์ดบิลของคนๆ นั้น
            debts.forEach(item => {
                const debt = item.debt;
                const index = item.index; // ใช้ index ตัวจริงสำหรับอ้างอิงตอนหักเงิน

                const isChecked = debt.allocated > 0;
                const isPartial = isChecked && debt.allocated < debt.remaining; 
                
                let badgeHtml = isChecked 
                    ? `<span class="badge ${isPartial ? 'bg-warning text-dark' : 'bg-success'} rounded-pill shadow-sm">หัก ฿${debt.allocated.toLocaleString()}</span>` 
                    : `<span class="badge bg-white text-secondary border rounded-pill">ค้าง ฿${debt.remaining.toLocaleString()}</span>`;
                
                const card = document.createElement('label');
                card.className = 'w-100 p-2 mb-2 border rounded-3 d-flex justify-content-between align-items-center shadow-sm transition-all ' + 
                                 (isChecked ? (isPartial ? 'bg-warning-subtle border-warning' : 'bg-success-subtle border-success') : 'bg-white');
                card.style.cursor = 'pointer';
                
                // เอาป้ายชื่อในตัวการ์ดออก เพราะมีหัวข้อแล้ว
                card.innerHTML = `
                    <div class="d-flex align-items-center gap-3">
                        <input class="form-check-input debt-check fs-4 m-0 shadow-sm" type="checkbox" data-index="${index}" ${isChecked ? 'checked' : ''} ${!isChecked && remainingBalance <= 0 ? 'disabled' : ''}>
                        <div style="line-height: 1.3;" class="text-start">
                            <span class="fw-bold text-dark d-block" style="font-size: 0.95rem;">${debt.billName}</span>
                        </div>
                    </div>
                    <div>${badgeHtml}</div>
                `;
                debtList.appendChild(card);
            });
        }

        // 3. ดักจับการกดติ๊กแต่ละรายการ (ลอจิกหักยอดเหมือนเดิม)
        document.querySelectorAll('.debt-check').forEach(chk => {
            chk.addEventListener('change', function() {
                const idx = this.getAttribute('data-index');
                if(this.checked) {
                    if (remainingBalance > 0) {
                        let amountToTake = Math.min(remainingBalance, currentDebts[idx].remaining);
                        currentDebts[idx].allocated = amountToTake;
                    } else {
                        this.checked = false;
                    }
                } else {
                    currentDebts[idx].allocated = 0; 
                }
                updateAllocationsUI(); 
            });
        });
    }

    inputTotal.addEventListener('input', function() {
        totalSlipAmount = parseFloat(this.value) || 0;
        currentDebts.forEach(d => d.allocated = 0);
        updateAllocationsUI();
    });

    payerCheckboxes.forEach(chk => {
        chk.addEventListener('change', function() {
            if(this.checked) this.parentElement.classList.replace('btn-outline-danger', 'btn-danger');
            else this.parentElement.classList.replace('btn-danger', 'btn-outline-danger');
            renderDebtsUI();
        });
    });

    renderDebtsUI(); 
}

function uploadSmartSlipToServer(data) {
    Swal.fire({ title: 'กำลังแยกรายการจ่าย...', html: 'รอแป๊บนึงนะวัยรุ่น 💸', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const payload = {
        action: 'uploadSlipSmart',
        transferBy: data.transferBy,
        allocations: data.allocations,
        base64: data.base64,
        fileName: data.fileName,
        mimeType: data.mimeType
    };

    fetch(API_URL, { 
        method: 'POST', 
        body: JSON.stringify(payload),
        redirect: 'follow'
    })
    .then(res => res.text())
    .then(textData => {
        let res;
        try {
            res = JSON.parse(textData);
        } catch (e) {
            res = { status: 'success' };
        }

        // เช็คแบบยืดหยุ่น ถ้าไม่มีสถานะ error หรือสถานะเป็น success ให้ตีว่าสำเร็จหมด
        if (!res.status || res.status === 'success' || res.status === 'ok') {
            Swal.fire('ชำระเงินสำเร็จ!', 'ระบบอัปเดตยอดคงเหลือเรียบร้อย', 'success');
            fetchFundDataFromGoogleSheets(); 
        } else {
            Swal.fire('Error', res.message || 'เกิดข้อผิดพลาดบางอย่าง', 'error');
        }
    })
    .catch(err => {
        Swal.fire('Error', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
        console.error(err);
    });
}

// =========================================================
// ⚙️ แอดมินโซน
// =========================================================
window.adminManageExpenses = function() {
    Swal.fire({ title: 'จัดการบิล', text: 'ไปเพิ่ม/ลดค่าใช้จ่ายในชีต Expenses ได้เลยครับ', icon: 'info' });
}
window.adminManageMembers = function() {
    Swal.fire({ title: 'จัดการสมาชิก', text: 'สลับ TRUE/FALSE ในชีต Members เพื่อเปิดปิดลูกทัวร์', icon: 'warning' });
}
window.adminUpdatePayment = function() {
    Swal.fire({ title: 'ดูประวัติสลิป', text: 'ข้อมูลโอนเงินจะไปกองอยู่ในชีต Transactions แบบแยกบรรทัดให้เรียบร้อย!', icon: 'success' });
}

// =========================================================
// 🚗 ระบบจัดการกลุ่มรถ และ ค่าใช้จ่ายเดินทาง
// =========================================================
window.manageTravelBill = function() {
    const myName = localStorage.getItem('tripUserName') || '';
    
    // 1. ตรวจสอบว่าตัวเองมีสังกัดรถแล้วหรือยัง? (หาไอคอน bi-car-front-fill ที่ไม่มีชื่อเราใน excluded)
    let myCar = expensesData.find(e => e.icon === 'bi-car-front-fill' && !e.excluded.includes(myName));
    
    if (!myCar) {
        // ================== โหมดสร้างกลุ่มรถใหม่ ==================
        // กรองคนที่มีรถแล้วออกไป
        let allCarExpenses = expensesData.filter(e => e.icon === 'bi-car-front-fill');
        let peopleInCars = new Set();
        allCarExpenses.forEach(c => membersData.forEach(m => {
            if (!c.excluded.includes(m.name)) peopleInCars.add(m.name);
        }));
        
        let availableMembers = membersData.filter(m => m.isActive && !peopleInCars.has(m.name));
        
        let membersHTML = availableMembers.map(m => `
            <label class="btn btn-sm ${m.name === myName ? 'btn-primary shadow-sm' : 'btn-outline-primary'} m-1 rounded-pill" style="cursor:pointer;">
                <input type="checkbox" class="d-none car-member-checkbox" value="${m.name}" ${m.name === myName ? 'checked' : ''}>
                <i class="bi bi-person"></i> ${m.name}
            </label>
        `).join('');

        Swal.fire({
            title: '🚗 สร้างกลุ่มรถของคุณ',
            html: `
                <div class="text-start mb-3">
                    <label class="small fw-bold text-muted mb-1">ตั้งชื่อรถ</label>
                    <input type="text" id="new-car-name" class="form-control" placeholder="เช่น รถแป๊ะ, คันที่ 1">
                </div>
                <div class="text-start mb-2">
                    <label class="small fw-bold text-muted mb-1">เลือกสมาชิกร่วมรถ (รวมตัวเอง)</label><br>
                    <div class="d-flex flex-wrap">${membersHTML}</div>
                </div>
                <small class="text-danger">*สร้างแล้วห้ามย้ายกลุ่ม หรือสร้างซ้อนนะจ๊ะ!</small>
            `,
            showCancelButton: true,
            confirmButtonText: 'สร้างกลุ่มรถ',
            cancelButtonText: 'ยกเลิก',
            didOpen: () => {
                document.querySelectorAll('.car-member-checkbox').forEach(chk => {
                    chk.addEventListener('change', function() {
                        if(this.checked) this.parentElement.classList.replace('btn-outline-primary', 'btn-primary');
                        else this.parentElement.classList.replace('btn-primary', 'btn-outline-primary');
                    });
                });
            },
            preConfirm: () => {
                let carName = document.getElementById('new-car-name').value;
                let selected = Array.from(document.querySelectorAll('.car-member-checkbox:checked')).map(c => c.value);
                if(!carName) { Swal.showValidationMessage('ตั้งชื่อรถด้วยจ้า!'); return false; }
                if(selected.length === 0) { Swal.showValidationMessage('เลือกสมาชิกอย่างน้อย 1 คน!'); return false; }
                
                // หาชื่อคนที่ "ไม่ได้ถูกเลือก" เพื่อส่งไปใส่ใน excluded ของหลังบ้าน
                let excluded = membersData.filter(m => !selected.includes(m.name)).map(m => m.name);
                return { action: 'createCarGroup', carName: `🚗 ${carName}`, excluded: excluded };
            }
        }).then(result => {
            if(result.isConfirmed) submitTravelData(result.value);
        });
        
    } else {
        // ================== โหมดเพิ่มค่าใช้จ่ายเข้ากลุ่มรถ ==================
        Swal.fire({
            title: 'เพิ่มบิลค่าเดินทาง',
            html: `
                <h6 class="text-primary fw-bold mb-3">${myCar.name}</h6>
                
                <div class="text-start mb-3">
                    <label class="small fw-bold text-muted mb-2">ประเภทค่าใช้จ่าย</label>
                    <div class="d-flex flex-wrap gap-2 justify-content-center">
                        <label class="btn btn-primary text-white p-2 rounded-3 travel-type-btn shadow-sm" style="width: 70px;">
                            <input type="radio" name="travelType" value="bi-fuel-pump" class="d-none" checked>
                            <i class="bi bi-fuel-pump fs-4 d-block"></i><small style="font-size: 0.7rem;">น้ำมัน</small>
                        </label>
                        <label class="btn btn-outline-secondary p-2 rounded-3 travel-type-btn" style="width: 70px;">
                            <input type="radio" name="travelType" value="bi-signpost-split" class="d-none">
                            <i class="bi bi-signpost-split fs-4 d-block"></i><small style="font-size: 0.7rem;">ทางด่วน</small>
                        </label>
                        <label class="btn btn-outline-secondary p-2 rounded-3 travel-type-btn" style="width: 70px;">
                            <input type="radio" name="travelType" value="bi-cup-hot" class="d-none">
                            <i class="bi bi-cup-hot fs-4 d-block"></i><small style="font-size: 0.7rem;">เครื่องดื่ม</small>
                        </label>
                        <label class="btn btn-outline-secondary p-2 rounded-3 travel-type-btn" style="width: 70px;">
                            <input type="radio" name="travelType" value="bi-shop" class="d-none">
                            <i class="bi bi-shop fs-4 d-block"></i><small style="font-size: 0.7rem;">เสบียง</small>
                        </label>
                    </div>
                </div>
                
                <div class="text-start mb-2">
                    <label class="small fw-bold text-muted mb-1">ยอดเงินรวม (บาท)</label>
                    <input type="number" id="travel-bill-amount" class="form-control form-control-lg text-center fw-bold text-danger" placeholder="0">
                </div>
                <div class="text-start mb-2">
                    <label class="small fw-bold text-muted mb-1">รายละเอียดเพิ่มเติม (ถ้ามี)</label>
                    <input type="text" id="travel-bill-note" class="form-control" placeholder="เช่น ปตท. มอเตอร์เวย์">
                </div>
                
                <div class="alert alert-info small text-start mt-3 mb-0 p-2 border-0 shadow-sm">
                    <i class="bi bi-info-circle-fill"></i> ระบบจะบันทึกว่า <b>คุณ (${myName}) สำรองจ่ายไป</b> และจะเพิ่มหนี้ให้เพื่อนในรถอัติโนมัติ
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'บันทึกบิล',
            cancelButtonText: 'ยกเลิก',
            didOpen: () => {
                // สคริปต์สลับสีปุ่ม Radio
                const typeBtns = document.querySelectorAll('.travel-type-btn');
                document.querySelectorAll('input[name="travelType"]').forEach(radio => {
                    radio.addEventListener('change', function() {
                        typeBtns.forEach(btn => {
                            btn.classList.replace('btn-primary', 'btn-outline-secondary');
                            btn.classList.remove('text-white', 'shadow-sm');
                        });
                        this.parentElement.classList.replace('btn-outline-secondary', 'btn-primary');
                        this.parentElement.classList.add('text-white', 'shadow-sm');
                    });
                });
            },
            preConfirm: () => {
                let amount = parseFloat(document.getElementById('travel-bill-amount').value);
                let note = document.getElementById('travel-bill-note').value;
                let icon = document.querySelector('input[name="travelType"]:checked').value;
                
                if(!amount || amount <= 0) { Swal.showValidationMessage('ใส่ยอดเงินด้วยจ้า!'); return false; }
                
                // แปลงไอคอนเป็นชื่อหัวข้อ
                let typeName = "ค่าเดินทาง";
                if(icon === 'bi-fuel-pump') typeName = "น้ำมัน";
                if(icon === 'bi-signpost-split') typeName = "ทางด่วน";
                if(icon === 'bi-cup-hot') typeName = "กาแฟ/เครื่องดื่ม";
                if(icon === 'bi-shop') typeName = "เสบียง/มินิมาร์ท";
                
                let cleanCarName = myCar.name.replace('🚗 ', ''); // ลบไอคอนออกจากชื่อรถเดิม
                let fullName = note ? `${typeName} (${note})` : `${typeName} (${cleanCarName})`;
                
                return { 
                    action: 'addTravelExpense', 
                    payer: myName, 
                    carName: myCar.name,
                    expenseName: fullName, 
                    amount: amount, 
                    icon: icon, 
                    excluded: myCar.excluded // โยน excluded ชุดเดิมกลับไปให้หลังบ้าน
                };
            }
        }).then(result => {
            if(result.isConfirmed) submitTravelData(result.value);
        });
    }
}

// ฟังก์ชันส่งข้อมูลเดินทางไปที่เซิร์ฟเวอร์
function submitTravelData(payload) {
    Swal.fire({ title: 'กำลังบันทึกข้อมูลรถ...', html: 'รอสักครู่นะครับ 🚗💨', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    fetch(API_URL, { method: 'POST', body: JSON.stringify(payload), redirect: 'follow' })
    .then(r => r.json())
    .then(res => {
        if(res.status === 'success') {
            Swal.fire('สำเร็จ!', 'อัปเดตข้อมูลเดินทางเรียบร้อย', 'success');
            fetchFundDataFromGoogleSheets(); // รีโหลดข้อมูลตารางใหม่
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    }).catch(err => {
        Swal.fire('Error', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    });
}