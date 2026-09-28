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
    
    // 1. คำนวณหนี้จากตาราง Expenses (หารทุกคนยกเว้น excluded)
    expensesData.forEach(exp => {
        let isExcluded = !myUserObj.isActive || exp.excluded.includes(userName);
        let owedAmount = 0;
        
        if (!isExcluded) {
            // นับจำนวนคนที่หารบิลนี้ (คนที่ยังไปทริป และไม่มีชื่อใน excluded)
            let payingMembersCount = membersData.filter(m => m.isActive && !exp.excluded.includes(m.name)).length;
            if (payingMembersCount > 0) {
                owedAmount = Math.ceil(exp.totalAmount / payingMembersCount);
            }
        }
        
        totalOwed += owedAmount;
        
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
            
            if (remaining > 0 && !billFin.isExcluded) {
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

    // --- 2. วาดบิลรายละเอียด Breakdown ---
    const expenseList = document.getElementById('fund-expense-list');
    expenseList.innerHTML = '';
    
    myFin.breakdown.forEach(exp => {
        let statusText = "";
        let colorClass = "text-dark";
        let amountText = `฿${exp.owedAmount.toLocaleString()}`;

        // คำนวณหาจำนวนคนที่หารบิลนี้จริงๆ (เพื่อเอามาโชว์ตัวเลข)
        const currentExpObj = expensesData.find(e => e.id == exp.billId);
        let payingCount = 0;
        if (currentExpObj) {
            payingCount = membersData.filter(m => m.isActive && !currentExpObj.excluded.includes(m.name)).length;
        }

        if (exp.isExcluded) {
            statusText = `<span class="badge bg-light text-secondary rounded-pill">ไม่ได้หาร</span>`;
            colorClass = "text-muted";
            amountText = "฿0";
        } else if (exp.paidAmount >= exp.owedAmount) {
            statusText = `<span class="badge bg-success-subtle text-success rounded-pill">จ่ายแล้ว</span>`;
        } else {
            // 🌟 เงื่อนไขใหม่: ถ้ายังจ่ายไม่ครบ ให้แสดงจำนวนคนหาร + ยอดที่ค้างอยู่
            let remainForThisBill = exp.owedAmount - exp.paidAmount;
            statusText = `
                <span class="badge bg-secondary-subtle text-secondary rounded-pill">หาร ${payingCount} คน</span>
            `;
        }

        expenseList.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div class="d-flex align-items-center gap-2 ${colorClass}">
                    <i class="bi ${exp.icon} fs-5 text-muted"></i>
                    <div>
                        <p class="mb-0 small fw-bold">${exp.billName}</p>
                        ${statusText} <small class="text-muted">(รวม ฿${exp.totalAmount.toLocaleString()})</small>
                    </div>
                </div>
                <div class="${colorClass} fw-bold">
                    ${amountText}
                </div>
            </div>
        `;
    });

    expenseList.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mt-2 fw-bold text-dark">
            <span>รวมยอดของคุณ</span>
            <span class="text-danger fs-5">฿${myFin.totalOwed.toLocaleString()}</span>
        </div>
    `;

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

    fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(res => {
        if (res.status === 'success') {
            Swal.fire('ชำระเงินสำเร็จ!', 'ระบบอัปเดตยอดคงเหลือเรียบร้อย', 'success');
            fetchFundDataFromGoogleSheets(); 
        } else {
            Swal.fire('Error', res.message, 'error');
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