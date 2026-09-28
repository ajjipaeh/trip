let fundMetaData = {
    lastUpdated: "ดึงข้อมูลจาก Google Sheets...",
    nextDueDate: "15 พ.ย. 2569"
};

let expensesData = [];
let membersData = [];
const TOTAL_PER_PERSON_FALLBACK = 1136;

// 🌐 URL ที่ได้จากการ Deploy Google Apps Script (เอา URL ของคุณมาใส่แทนตรงนี้)
const API_URL = "https://script.google.com/macros/s/AKfycbw3Ad2IF2oUhRXNA6kQj2iVjnORbslQ3N2PcMWMBH6-GpC4b-ZsAdBSv43pzSd9MIGtow/exec";

// ฟังก์ชันดึงข้อมูลจาก Google Sheets
async function fetchFundDataFromGoogleSheets() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        membersData = data.members;
        expensesData = data.expenses;
        
        fundMetaData.lastUpdated = new Date().toLocaleDateString('th-TH', { 
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        
        // โหลดหน้าจอใหม่หลังจากได้ข้อมูลแล้ว
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
    // ดึงข้อมูลใหม่ทุกครั้งที่กดเปิดหน้ากองกลาง
    fetchFundDataFromGoogleSheets();
}

window.closeFundPage = function() {
    document.getElementById('page-fund').classList.add('d-none');
}

// 🧠 ระบบคำนวณยอดอัจฉริยะ (Dynamic Calculation Engine)
function calculateUserTotal(userName) {
    const user = membersData.find(m => m.name === userName);
    if (!user || !user.isActive) return 0;

    let myTotal = 0;
    expensesData.forEach(exp => {
        if (!exp.excluded.includes(userName)) {
            let payingMembersCount = membersData.filter(m => m.isActive && !exp.excluded.includes(m.name)).length;
            if (payingMembersCount > 0) {
                myTotal += (exp.totalAmount / payingMembersCount);
            }
        }
    });
    return Math.ceil(myTotal);
}

function renderFundData() {
    const userName = localStorage.getItem('tripUserName') || 'Guest';
    const myData = membersData.find(m => m.name === userName) || { paid: 0, isActive: true };
    
    document.getElementById('fund-last-update').textContent = fundMetaData.lastUpdated;
    document.getElementById('fund-due-date').textContent = fundMetaData.nextDueDate;

    const myTotalShare = calculateUserTotal(userName);
    const remain = myTotalShare - myData.paid;
    let progress = myTotalShare > 0 ? (myData.paid / myTotalShare) * 100 : 0;

    // --- 1. จัดการข้อมูลส่วนตัว ---
    document.getElementById('fund-user-name').textContent = userName;
    document.getElementById('fund-personal-total').textContent = myTotalShare.toLocaleString();

    if (!myData.isActive) {
        document.getElementById('fund-personal-remain').textContent = "ไม่ได้ไปทริปนี้";
        document.getElementById('fund-personal-remain').classList.add('fs-4');
        document.getElementById('fund-personal-progress').style.width = `0%`;
        document.getElementById('fund-personal-paid').textContent = "0";
    } else {
        document.getElementById('fund-personal-paid').textContent = myData.paid.toLocaleString();
        if (remain < 0) {
            document.getElementById('fund-personal-remain').textContent = `ได้คืน ฿${Math.abs(remain).toLocaleString()}`;
        } else {
            document.getElementById('fund-personal-remain').textContent = `฿${remain > 0 ? remain.toLocaleString() : '0 (ครบแล้ว!)'}`;
        }
        document.getElementById('fund-personal-progress').style.width = `${progress}%`;
    }

    const card = document.getElementById('fund-personal-card');
    if (!myData.isActive) {
        card.style.background = 'linear-gradient(135deg, #6c757d, #adb5bd)';
    } else if (remain <= 0) {
        card.style.background = 'linear-gradient(135deg, #28a745, #85e09b)';
    } else {
        card.style.background = 'linear-gradient(135deg, var(--color-4), #f8cdda)';
    }

    // --- 2. วาดบิลรายละเอียด (Breakdown) ---
    const expenseList = document.getElementById('fund-expense-list');
    expenseList.innerHTML = '';
    
    expensesData.forEach(exp => {
        let payingMembersCount = membersData.filter(m => m.isActive && !exp.excluded.includes(m.name)).length;
        let perPersonAmount = payingMembersCount > 0 ? Math.ceil(exp.totalAmount / payingMembersCount) : 0;
        let isUserExcluded = exp.excluded.includes(userName) || !myData.isActive;
        
        let statusText = "";
        let colorClass = "text-dark";
        let amountText = `฿${perPersonAmount.toLocaleString()}`;

        if (isUserExcluded) {
            statusText = `<span class="badge bg-light text-secondary rounded-pill">ไม่ได้หาร</span>`;
            colorClass = "text-muted";
            amountText = "฿0";
        } else {
            statusText = `<span class="badge bg-primary-subtle rounded-pill">หาร ${payingMembersCount} คน</span>`;
        }

        expenseList.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div class="d-flex align-items-center gap-2 ${colorClass}">
                    <i class="bi ${exp.icon} fs-5 text-muted"></i>
                    <div>
                        <p class="mb-0 small fw-bold">${exp.name}</p>
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
            <span class="text-danger fs-5">฿${myTotalShare.toLocaleString()}</span>
        </div>
    `;

    // --- 3. จัดการสิทธิ์แอดมิน ---
    const adminControls = document.getElementById('admin-controls');
    if (userName === 'แป๊ะ') {
        adminControls.classList.remove('d-none');
    } else {
        adminControls.classList.add('d-none');
    }

    // --- 4. แสดงรายชื่อสถานะสมาชิก ---
    const listContainer = document.getElementById('fund-members-list');
    listContainer.innerHTML = '';

    membersData.forEach(member => {
        let memTotal = calculateUserTotal(member.name);
        let memRemain = memTotal - member.paid;
        
        let statusBadge = "";
        let opacity = "1";

        if (!member.isActive) {
            statusBadge = `<span class="badge bg-secondary rounded-pill">ยกเลิกทริป</span>`;
            opacity = "0.5";
        } else if (memRemain < 0) {
            statusBadge = `<span class="badge bg-info text-dark rounded-pill">จ่ายเกิน (ทอน ฿${Math.abs(memRemain)})</span>`;
        } else if (memRemain === 0) {
            statusBadge = `<span class="badge bg-success rounded-pill">ครบแล้ว ✅</span>`;
        } else {
            statusBadge = `<span class="badge bg-warning text-dark bg-opacity-50 rounded-pill">ค้าง ฿${memRemain.toLocaleString()}</span>`;
        }

        const item = document.createElement('div');
        item.className = 'glass-card p-3 d-flex justify-content-between align-items-center mb-2';
        item.style.opacity = opacity;
        if (member.name === userName) item.style.borderLeft = "4px solid var(--color-4)";

        item.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="bg-light rounded-circle d-flex align-items-center justify-content-center fw-bold text-muted" style="width: 40px; height: 40px;">
                    ${member.name.substring(0,1)}
                </div>
                <div>
                    <h6 class="mb-0 fw-bold ${member.name === userName ? 'text-danger' : ''} ${!member.isActive ? 'text-decoration-line-through' : ''}">${member.name}</h6>
                    <small class="text-muted">จ่าย: ฿${member.paid.toLocaleString()} / ฿${memTotal.toLocaleString()}</small>
                </div>
            </div>
            <div>${statusBadge}</div>
        `;
        listContainer.appendChild(item);
    });
}

// ================= ระบบแจ้งโอนเงิน (แนบสลิป) =================
window.notifyPayment = function() {
    // 1. สร้างตัวเลือกไฟล์ (Input Type File) แบบซ่อนไว้ เพื่อเรียกใช้งานเมื่อกดปุ่ม
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*'; // รับเฉพาะไฟล์รูปภาพ
    
    // 2. เมื่อเพื่อนเลือกรูปเสร็จ จะทำงานตรงนี้
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // เช็คขนาดไฟล์ (ป้องกันไฟล์ใหญ่เกิน 5MB แล้วแอปค้าง)
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire('ไฟล์ใหญ่เกินไป!', 'ขอรูปสลิปขนาดไม่เกิน 5MB นะวัยรุ่น', 'error');
            return;
        }

        // 3. แปลงไฟล์รูปเป็น Base64 (ข้อความ) เพื่อส่งผ่านอินเทอร์เน็ต
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64String = event.target.result;
            
            // 4. เด้ง Pop-up โชว์รูปพรีวิว และให้กรอกจำนวนเงิน
            Swal.fire({
                title: 'ยืนยันการแจ้งโอน',
                html: `
                    <p class="text-muted small mb-2">เช็คความถูกต้องของสลิปก่อนส่งนะจ๊ะ</p>
                    <img src="${base64String}" class="img-fluid rounded-3 shadow-sm mb-3 border" style="max-height: 250px; object-fit: contain;">
                    
                    <div class="form-group text-start px-2 mb-3">
                        <label class="fw-bold mb-1"><i class="bi bi-cash-coin text-success"></i> ยอดเงินที่โอน (บาท):</label>
                        <input type="number" id="slip-amount" class="form-control form-control-lg text-center fw-bold text-danger" placeholder="เช่น 500" style="font-size: 1.5rem;">
                    </div>
                    
                    <div class="form-group text-start px-2">
                        <label class="fw-bold mb-1 small text-muted"><i class="bi bi-chat-text"></i> หมายเหตุ (จ่ายให้ใครบ้าง):</label>
                        <input type="text" id="slip-note" class="form-control" placeholder="เช่น ของซีแพคและแป๊ะ">
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: 'var(--color-4)',
                confirmButtonText: '🚀 ยืนยันการส่งสลิป',
                cancelButtonText: 'ยกเลิก',
                preConfirm: () => {
                    const amount = document.getElementById('slip-amount').value;
                    const note = document.getElementById('slip-note').value; // 🌟 แก้จุดที่ 1: เพิ่มบรรทัดดึงค่า note
                    
                    if (!amount || amount <= 0) {
                        Swal.showValidationMessage('อย่าลืมใส่ยอดเงินให้ถูกต้องด้วยจ้า!');
                        return false;
                    }
                    return { amount: amount, note: note, base64: base64String, fileName: file.name, mimeType: file.type };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    // 5. ถ้ากดยืนยัน ให้เรียกฟังก์ชันส่งไฟล์ไปที่เซิร์ฟเวอร์
                    uploadSlipToServer(result.value);
                }
            });
        };
        // สั่งให้อ่านไฟล์
        reader.readAsDataURL(file);
    };
    
    // จำลองการคลิกเพื่อเปิดหน้าต่างเลือกไฟล์ในมือถือ
    fileInput.click();
};

// ฟังก์ชันส่งข้อมูลไปยัง Google Apps Script
function uploadSlipToServer(data) {
    Swal.fire({
        title: 'กำลังส่งสลิปให้แอดมินแป๊ะ...',
        html: 'รอแป๊บนึงนะวัยรุ่น 💸',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const myName = localStorage.getItem('tripUserName') || 'ไม่ระบุชื่อ';
    
    const payload = {
        action: 'uploadSlip',
        playerName: myName,
        amount: data.amount,
        note: data.note || '-',
        base64: data.base64,
        fileName: data.fileName,
        mimeType: data.mimeType
    };

    // 🌟 แก้จุดที่ 2: เปลี่ยนจาก GAS_URL เป็น API_URL ให้ตรงกับที่ประกาศไว้ด้านบน
    fetch(API_URL, { 
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(res => {
        if (res.status === 'success') {
            Swal.fire({
                icon: 'success',
                title: 'ส่งสลิปเรียบร้อย!',
                text: 'เงินเข้าระบบแล้ว รอแอดมินแป๊ะตรวจสอบอีกทีนะจ๊ะ'
            });
        } else {
            Swal.fire('Error', res.message || 'เกิดข้อผิดพลาดในการส่ง', 'error');
        }
    })
    .catch(err => {
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        console.error(err);
    });
}

window.adminManageExpenses = function() {
    Swal.fire({ title: 'จัดการบิล', text: 'คุณสามารถแก้ไขตัวเลขใน Google Sheets ได้เลย ข้อมูลจะอัปเดตบนเว็บทันที!', icon: 'info' });
}

window.adminManageMembers = function() {
    Swal.fire({ title: 'จัดการสมาชิก', text: 'เปลี่ยนค่า TRUE/FALSE ในชีตคอลัมน์ isActive เพื่อเปิด/ปิดการหารได้เลย', icon: 'warning' });
}

window.adminUpdatePayment = function() {
    Swal.fire({ title: 'อัปเดตยอดโอน', text: 'แก้ตัวเลขช่อง paid ใน Google Sheets ได้เลย', icon: 'success' });
}