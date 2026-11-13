// =========================================================
// 🎡 ระบบทริปของเรา (Carousel & Trip Manager)
// =========================================================

window.renderTripCarousel = function(allTrips, activeTripId) {
    const carouselContainer = document.getElementById('trip-carousel');
    if (!carouselContainer) return;
    
    carouselContainer.innerHTML = ''; 

    // 🌟 1. เรียงลำดับทริปตาม "วันที่เริ่มทริป" (จากอดีต -> อนาคต)
    allTrips.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // 🌟 2. สร้างแถบปุ่มควบคุม (Control Panel) ด้านบนของ Carousel
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    let controlsHTML = `
        <div class="d-flex justify-content-center gap-2 mb-1 mt-2">
            <!-- ปุ่มวิ่งไปทริปปัจจุบัน -->
            <button class="btn btn-primary rounded-pill fw-bold shadow-sm" onclick="scrollToCurrentTrip()">
                <i class="bi bi-geo-alt-fill"></i> ทริปปัจจุบัน
            </button>
            
            <!-- ปุ่มสร้างทริป (เฉพาะ SuperAdmin) -->
            ${currentUser.role === 'SuperAdmin' ? `
                <button class="btn btn-outline-danger rounded-pill fw-bold shadow-sm bg-white" onclick="openCreateTripModal()">
                    <i class="bi bi-plus-lg"></i>
                </button>
            ` : ''}
        </div>
    `;

    // อัปเดตปุ่มควบคุมแบบแทรกปกติ (ไม่ทับ Header)
    let controlsContainer = document.getElementById('carousel-top-controls');
    if (!controlsContainer) {
        controlsContainer = document.createElement('div');
        controlsContainer.id = 'carousel-top-controls';
        // แทรกปุ่มไว้ก่อนหน้ากล่อง Carousel
        carouselContainer.parentElement.insertBefore(controlsContainer, carouselContainer);
    }
    controlsContainer.innerHTML = controlsHTML;

    if (!allTrips || allTrips.length === 0) {
        carouselContainer.innerHTML = '<div class="text-center text-muted mt-5">ยังไม่มีทริปในระบบ</div>';
        return;
    }

    // 🌟 3. วาดการ์ด Carousel
    allTrips.forEach(trip => {
        let isPast = trip.status === 'Completed';
        let isCurrent = trip.tripId === activeTripId;
        
        let badgeText = isPast ? 'ผ่านมาแล้ว' : (isCurrent ? 'ทริปปัจจุบัน' : 'แพลนอนาคต');
        let statusClass = isPast ? 'past' : (isCurrent ? 'upcoming' : 'future');

        const card = document.createElement('div');
        // ใส่ id ให้การ์ดแต่ละใบ เพื่อให้ค้นหาง่าย
        card.id = `carousel-card-${trip.tripId}`;
        card.className = `trip-card status-${statusClass}`;
        
        card.innerHTML = `
            <div class="card-bg" style="background-image: url('${trip.coverImg || 'img/bg-default.jpg'}')"></div>
            <div class="card-overlay"></div>
            <div class="badge-status">${badgeText}</div>
            
            ${currentUser.role === 'SuperAdmin' ? `
            <button class="btn btn-sm btn-light position-absolute top-0 end-0 m-2 shadow-sm rounded-circle d-flex align-items-center justify-content-center" 
                    style="z-index: 10; width:35px; height:35px; opacity:0.9;" 
                    onclick="event.stopPropagation(); openEditTripModal('${trip.tripId}')">
                <i class="bi bi-pencil-fill text-primary"></i>
            </button>` : ''}

            <div class="trip-content">
                <h4 class="trip-title">${trip.tripName}</h4>
                <div class="trip-details">
                    <p class="mb-1"><i class="bi bi-calendar3"></i> ${new Date(trip.startDate).toLocaleDateString('th-TH')}</p>
                    <p class="mb-0"><i class="bi bi-check-circle-fill"></i> ${trip.status === 'Active' ? 'กำลังดำเนินการ' : 'จบทริปแล้ว'}</p>
                </div>
            </div>
        `;
        
        carouselContainer.appendChild(card);

        // จัดการเมื่อกดการ์ด
        card.addEventListener('click', () => {
            if (card.classList.contains('active-card')) {
                
                // 🌟 1. ทริปปัจจุบัน และ ทริปอนาคต (!isPast) -> พาเข้าหน้ารายละเอียดทริป
                if (!isPast) { 
                    localStorage.setItem('currentTripId', trip.tripId);
                    localStorage.setItem('tripUserName', trip.tripName); // เก็บชื่อทริปไว้เผื่อใช้
                    
                    Swal.fire({
                        title: 'พร้อมลุย!',
                        text: `กำลังเปิดแพลน: ${trip.tripName}`,
                        icon: 'success',
                        showConfirmButton: false,
                        timer: 1200
                    }).then(() => {
                        // ซ่อนทุกหน้าทิ้งให้หมดก่อน
                        document.querySelectorAll('.page-section').forEach(page => page.classList.add('d-none'));
                        
                        // เปิดหน้าเป้าหมาย
                        const detailsPage = document.getElementById('page-trip-details');
                        if (detailsPage) detailsPage.classList.remove('d-none');
                        
                        // 🌟 แก้บั๊กเมนูด้านล่าง: รีเซ็ต Active ทั้งหมด แล้วไปสว่างที่ปุ่มแผนที่
                        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
                        const targetNav = document.querySelector('.nav-link[data-target="page-trip-details"]');
                        if (targetNav) targetNav.classList.add('active');

                        window.scrollTo(0, 0); 
                        if (typeof window.syncDataFromServer === 'function') {
                            window.syncDataFromServer();
                        }
                    });

                // 🌟 2. ทริปที่จบไปแล้ว (isPast) -> ดึงข้อมูลมาโชว์สรุปสถิติ
                } else if (isPast) {
                    
                    Swal.fire({ title: 'กำลังประมวลผล...', html: 'สรุปข้อมูลและค่าใช้จ่าย', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

                    fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'getPastTripSummary', tripId: trip.tripId }),
                        redirect: 'follow'
                    }).then(res => res.json()).then(res => {
                        if (res.status === 'success') {
                            let members = res.data.members;
                            let expenses = res.data.expenses;
                            
                            // ดึงชื่อตัวเองจากระบบ (เพื่อเช็คว่าเราโดน Excluded ไหม)
                            let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
                            let myName = currentUser.name || ''; 

                            // --- ⏱️ คำนวณวันและเวลาเดินทาง ---
                            let d1 = new Date(trip.startDate);
                            let d2 = new Date(trip.endDate);
                            let diffTime = Math.abs(d2 - d1);
                            let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                            let daysText = diffDays === 0 ? "1 วัน (ไป-กลับ)" : `${diffDays + 1} วัน ${diffDays} คืน`;
                            let dateRange = `${d1.toLocaleDateString('th-TH')} - ${d2.toLocaleDateString('th-TH')}`;

                            // --- 💸 คำนวณสถิติค่าใช้จ่าย (แบบ B เป๊ะรายคน) ---
                            let totalTripExpense = 0;
                            let myPersonalExpense = 0;
                            
                            // จัดการชื่อตัวเอง ตัดช่องว่างและทำตัวเล็กกันพลาด
                            let safeMyName = myName.trim().toLowerCase();

                            expenses.forEach(exp => {
                                totalTripExpense += exp.totalAmount; // ยอดรวมทริป
                                
                                // จัดการรายชื่อ Excluded ตัดช่องว่างให้สะอาด
                                let excludedArray = exp.excluded.split(',').map(e => e.trim().toLowerCase()).filter(e => e !== "");
                                let isMeExcluded = excludedArray.includes(safeMyName);
                                
                                // นับว่าบิลนี้เหลือคนหารกี่คน
                                let sharingMembersCount = 0;
                                members.forEach(m => {
                                    if (m && m.name) {
                                        let safeMemberName = m.name.trim().toLowerCase();
                                        if (!excludedArray.includes(safeMemberName)) {
                                            sharingMembersCount++;
                                        }
                                    }
                                });
                                
                                // ถ้าเราไม่ได้โดนงดจ่าย และยังมีคนหารอยู่ ให้นำยอดมาหารแบ่งเรา
                                if (!isMeExcluded && sharingMembersCount > 0) {
                                    myPersonalExpense += (exp.totalAmount / sharingMembersCount);
                                }
                            });

                            // --- 👥 สร้าง HTML รายชื่อสมาชิก ---
                            let membersListHtml = members.map(m => `<span class="badge bg-light text-dark border m-1"><i class="bi bi-person"></i> ${m.name}</span>`).join('');

                            // --- 🎨 วาดใบเสร็จสรุปทริป ---
                            Swal.fire({
                                title: `🏕️ สรุปทริป<br><small class="text-primary">${trip.tripName}</small>`,
                                html: `
                                    <div class="text-start mt-3" style="font-size: 0.9rem;">
                                        
                                        <div class="mb-3 p-3 bg-light rounded-4 border shadow-sm">
                                            <div class="d-flex justify-content-between mb-2 pb-2 border-bottom">
                                                <span class="text-muted"><i class="bi bi-calendar-check"></i> วันเดินทาง:</span>
                                                <span class="fw-bold">${dateRange}</span>
                                            </div>
                                            <div class="d-flex justify-content-between mb-3">
                                                <span class="text-muted"><i class="bi bi-clock-history"></i> รวมเวลา:</span>
                                                <span class="fw-bold text-danger">${daysText}</span>
                                            </div>
                                            
                                            <div class="mb-2">
                                                <span class="text-muted"><i class="bi bi-people-fill"></i> สมาชิก (${members.length} คน):</span>
                                            </div>
                                            <div class="d-flex flex-wrap">${membersListHtml}</div>
                                        </div>
                                        
                                        <h6 class="fw-bold text-center text-dark mt-4 mb-3"><i class="bi bi-receipt"></i> สรุปค่าใช้จ่ายส่วนกลาง</h6>
                                        
                                        <div class="d-flex justify-content-between align-items-center mb-2 px-2 py-1">
                                            <span class="text-muted">ใช้จ่ายรวมทั้งทริป:</span>
                                            <span class="fw-bold fs-6 text-dark">฿${totalTripExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>
                                        <div class="d-flex justify-content-between align-items-center mb-2 p-3 rounded-4 shadow-sm" style="background: linear-gradient(135deg, #28a745, #20c997); color: white;">
                                            <span class="fw-bold">ส่วนของคุณ (${myName}):</span>
                                            <span class="fw-bold fs-4">฿${myPersonalExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>
                                        
                                        <div class="text-center mt-3 text-muted" style="font-size: 0.7rem; line-height: 1.4;">
                                            <i class="bi bi-info-circle"></i> ยอดนี้คำนวณแยกตามรายคนแล้ว (หักลบบิลที่ไม่เกี่ยวข้องออก) <br>
                                            *ไม่รวมค่าใช้จ่ายส่วนตัวจิปาถะ เช่น เข้าเซเว่น แวะคาเฟ่
                                        </div>
                                    </div>
                                `,
                                confirmButtonColor: 'var(--color-4)',
                                confirmButtonText: 'ปิดหน้าต่าง'
                            });
                        } else {
                            Swal.fire('Error', 'ไม่สามารถดึงข้อมูลสรุปทริปได้', 'error');
                        }
                    }).catch(e => {
                        Swal.fire('Error', 'การเชื่อมต่อมีปัญหา', 'error');
                    });
                }

            } else {
                // ถ้าการ์ดยังไม่ Active (ยังไม่อยู่ตรงกลาง) ให้เลื่อนมาตรงกลางก่อน
                card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        });
    });

    // 🌟 4. IntersectionObserver ย่อ/ขยาย การ์ดตรงกลาง
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active-card');
            } else {
                entry.target.classList.remove('active-card');
            }
        });
    }, { root: carouselContainer, rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    document.querySelectorAll('.trip-card').forEach(card => observer.observe(card));

    // 🌟 5. เมื่อวาดการ์ดเสร็จ ให้หน่วงเวลา 0.5 วินาที แล้วเลื่อนไปหาทริปปัจจุบันอัตโนมัติ
    setTimeout(() => {
        scrollToCurrentTrip();
    }, 500);
}

// 🌟 ฟังก์ชันสำหรับวิ่งไปหาการ์ดทริปปัจจุบัน (ใช้เชื่อมกับปุ่มด้านบน)
window.scrollToCurrentTrip = function() {
    const carouselContainer = document.getElementById('trip-carousel');
    // หาการ์ดที่มี class 'status-upcoming' (ทริปปัจจุบัน)
    const currentCard = carouselContainer.querySelector('.status-upcoming');
    
    if (currentCard) {
        currentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// =========================================================
// 🚀 ระบบสร้างทริปใหม่ (Create New Trip)
// =========================================================

window.openCreateTripModal = async function() {
    Swal.fire({ title: 'กำลังโหลดข้อมูลเพื่อนๆ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        // ดึงรายชื่อจากตาราง Users มาก่อน
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getAllUsers' }),
            redirect: 'follow'
        }).then(r => r.json());

        if (res.status === 'success') {
            Swal.close();
            showCreateTripForm(res.users); // โยนรายชื่อไปวาดแบบฟอร์ม
        }
    } catch(e) {
        Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error');
    }
}

function showCreateTripForm(allUsers) {
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    // กรองชื่อตัวเราเองออก เพราะเราจะถูกแอดเข้าทริปเป็น Admin อัตโนมัติ
    let availableUsers = allUsers.filter(u => u.userId !== currentUser.userId);

    // ปั้น HTML รายชื่อเพื่อนเก่าให้ติ๊กเลือก
    let usersHTML = availableUsers.map(u => `
        <label class="btn btn-outline-primary btn-sm m-1 rounded-pill trip-member-checkbox" style="cursor:pointer;">
            <input type="checkbox" class="d-none existing-user-chk" value="${u.userId}">
            <i class="bi bi-person"></i> ${u.name}
        </label>
    `).join('');

    let formHtml = `
        <div class="text-start" style="font-size: 0.9rem;">
            <div class="mb-2">
                <label class="fw-bold">ชื่อทริป <span class="text-danger">*</span></label>
                <input type="text" id="ct-name" class="form-control" placeholder="เช่น เชียงใหม่ 2027">
            </div>
            <div class="row mb-2">
                <div class="col-6">
                    <label class="fw-bold">วันเริ่มทริป <span class="text-danger">*</span></label>
                    <input type="date" id="ct-start" class="form-control">
                </div>
                <div class="col-6">
                    <label class="fw-bold">วันสิ้นสุด <span class="text-danger">*</span></label>
                    <input type="date" id="ct-end" class="form-control">
                </div>
            </div>
            <div class="mb-3">
                <label class="fw-bold">URL รูปปกทริป (ไม่บังคับ)</label>
                <input type="text" id="ct-cover" class="form-control" placeholder="https://...">
            </div>

            <div class="p-3 bg-light rounded border mb-2">
                <label class="fw-bold mb-2"><i class="bi bi-people-fill text-primary"></i> เลือกเพื่อนร่วมทริป (เพื่อนเก่า)</label>
                <div class="d-flex flex-wrap mb-3" id="existing-users-container">
                    ${usersHTML}
                </div>
                
                <hr>
                <label class="fw-bold mb-2 text-success"><i class="bi bi-person-plus-fill"></i> หรือสร้างบัญชีเพื่อนใหม่ทริปนี้</label>
                <div class="row g-2 align-items-center">
                    <div class="col-5">
                        <input type="text" id="ct-new-name" class="form-control form-control-sm" placeholder="ชื่อเล่น (ไทย)">
                    </div>
                    <div class="col-5">
                        <input type="text" id="ct-new-username" class="form-control form-control-sm" placeholder="Username (Eng)">
                    </div>
                    <div class="col-2">
                        <button class="btn btn-success btn-sm w-100" id="btn-add-new-user"><i class="bi bi-plus"></i></button>
                    </div>
                </div>
                <div id="new-users-list" class="mt-2 d-flex flex-wrap gap-1"></div>
                <small class="text-muted mt-2 d-block">*ระบบจะตั้งรหัสผ่าน <b>1234</b> ให้เพื่อนใหม่อัตโนมัติ</small>
            </div>
            <small class="text-muted fw-bold text-danger">* แอดมิน (คุณ) จะถูกดึงเข้าทริปเป็นหัวหน้าทริปนี้โดยอัตโนมัติ</small>
        </div>
    `;

    let newUsersList = []; // เก็บตัวแปรเพื่อนใหม่ที่กด +

    Swal.fire({
        title: '🏕️ สร้างทริปใหม่',
        html: formHtml,
        showCancelButton: true,
        confirmButtonText: 'บันทึกทริป',
        cancelButtonText: 'ยกเลิก',
        width: '500px',
        didOpen: () => {
            // ระบบสลับสีปุ่มเมื่อติ๊กเลือกเพื่อนเก่า
            document.querySelectorAll('.existing-user-chk').forEach(chk => {
                chk.addEventListener('change', function() {
                    if(this.checked) this.parentElement.classList.replace('btn-outline-primary', 'btn-primary');
                    else this.parentElement.classList.replace('btn-primary', 'btn-outline-primary');
                });
            });

            // ระบบกดเพิ่มเพื่อนใหม่ลงกระดาน
            document.getElementById('btn-add-new-user').addEventListener('click', () => {
                let nName = document.getElementById('ct-new-name').value.trim();
                let nUsername = document.getElementById('ct-new-username').value.trim();
                
                if(!nName || !nUsername) {
                    Swal.showValidationMessage('กรุณากรอกชื่อเล่นและ Username (ภาษาอังกฤษ) ให้ครบถ้วน');
                    return;
                }
                if(!/^[a-zA-Z0-9_]+$/.test(nUsername)) {
                    Swal.showValidationMessage('Username ต้องเป็นภาษาอังกฤษหรือตัวเลขเท่านั้นครับ');
                    return;
                }

                newUsersList.push({ name: nName, username: nUsername.toLowerCase() });
                renderNewUsers();
                
                document.getElementById('ct-new-name').value = '';
                document.getElementById('ct-new-username').value = '';
                Swal.resetValidationMessage();
            });

            function renderNewUsers() {
                const container = document.getElementById('new-users-list');
                container.innerHTML = newUsersList.map((nu, idx) => `
                    <span class="badge bg-success p-2">
                        ${nu.name} (${nu.username}) 
                        <i class="bi bi-x-circle ms-1" style="cursor:pointer;" onclick="removeNewUser(${idx})"></i>
                    </span>
                `).join('');
            }

            window.removeNewUser = function(idx) {
                newUsersList.splice(idx, 1);
                renderNewUsers();
            }
        },
        preConfirm: () => {
            let tName = document.getElementById('ct-name').value;
            let tStart = document.getElementById('ct-start').value;
            let tEnd = document.getElementById('ct-end').value;
            let tCover = document.getElementById('ct-cover').value;
            let selectedExisting = Array.from(document.querySelectorAll('.existing-user-chk:checked')).map(c => c.value);
            
            if(!tName) { Swal.showValidationMessage('กรุณาตั้งชื่อทริปด้วยครับ!'); return false; }
            if(!tStart || !tEnd) { Swal.showValidationMessage('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุดทริปครับ!'); return false; }

            return {
                tripName: tName,
                startDate: tStart,
                endDate: tEnd,
                coverImg: tCover,
                existingMembers: selectedExisting,
                newMembers: newUsersList,
                creatorId: currentUser.userId
            }
        }
    }).then(result => {
        if(result.isConfirmed) {
            submitNewTrip(result.value);
        }
    });
}

// ฟังก์ชันส่งข้อมูลไปให้หลังบ้าน
async function submitNewTrip(payload) {
    Swal.fire({ title: 'กำลังสร้างทริปใหม่...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    payload.action = 'createNewTrip';

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            redirect: 'follow'
        }).then(r => r.json());

        if(res.status === 'success') {
            Swal.fire('สำเร็จ!', 'ทริปใหม่ถูกสร้างเรียบร้อยแล้ว!', 'success').then(() => {
                // ทริกเกอร์ให้แอปโหลดรายชื่อทริปใหม่ทั้งหมดมาโชว์ที่ Carousel 
                loadTrips(); 
            });
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch(e) {
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
    }
}

// =========================================================
// ✏️ ระบบแก้ไขทริป (Edit Trip)
// =========================================================

window.openEditTripModal = async function(tripId) {
    Swal.fire({ title: 'กำลังโหลดข้อมูลทริป...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getEditTripInfo', tripId: tripId }),
            redirect: 'follow'
        }).then(r => r.json());

        if (res.status === 'success') {
            Swal.close();
            showEditTripForm(res.trip, res.activeUsers, res.allUsers);
        }
    } catch(e) {
        Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลทริปได้', 'error');
    }
}

function showEditTripForm(trip, activeUsers, allUsers) {
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    
    // กรองชื่อตัวเราเองออก เพราะเราห้ามลบตัวเองออกจากการเป็น Admin
    let availableUsers = allUsers.filter(u => u.userId !== currentUser.userId);

    // ปั้น HTML รายชื่อเพื่อน โดยเช็คว่าใครอยู่ใน activeUsers ให้ติ๊กถูกไว้เลย
    let usersHTML = availableUsers.map(u => {
        let isChecked = activeUsers.includes(u.userId);
        let btnClass = isChecked ? 'btn-primary' : 'btn-outline-primary';
        return `
            <label class="btn ${btnClass} btn-sm m-1 rounded-pill edit-member-checkbox" style="cursor:pointer;">
                <input type="checkbox" class="d-none edit-user-chk" value="${u.userId}" ${isChecked ? 'checked' : ''}>
                <i class="bi bi-person"></i> ${u.name}
            </label>
        `;
    }).join('');

    // แปลงวันที่ให้อยู่ในฟอร์แมต YYYY-MM-DD เพื่อยัดลง Input
    const formatDate = (dateStr) => {
        if(!dateStr) return '';
        const d = new Date(dateStr);
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    let formHtml = `
        <div class="text-start" style="font-size: 0.9rem;">
            <div class="mb-2">
                <label class="fw-bold">ชื่อทริป</label>
                <input type="text" id="et-name" class="form-control" value="${trip.tripName}">
            </div>
            <div class="row mb-2">
                <div class="col-6">
                    <label class="fw-bold">วันเริ่มทริป</label>
                    <input type="date" id="et-start" class="form-control" value="${formatDate(trip.startDate)}">
                </div>
                <div class="col-6">
                    <label class="fw-bold">วันสิ้นสุด</label>
                    <input type="date" id="et-end" class="form-control" value="${formatDate(trip.endDate)}">
                </div>
            </div>
            <div class="mb-3">
                <label class="fw-bold">URL รูปปกทริป</label>
                <input type="text" id="et-cover" class="form-control" value="${trip.coverImg || ''}">
            </div>

            <div class="p-3 bg-light rounded border mb-2">
                <label class="fw-bold mb-2"><i class="bi bi-people-fill text-primary"></i> จัดการสมาชิกทริปนี้</label>
                <div class="d-flex flex-wrap mb-3">
                    ${usersHTML}
                </div>
                
                <hr>
                <label class="fw-bold mb-2 text-success"><i class="bi bi-person-plus-fill"></i> เพิ่มเพื่อนใหม่ (บัญชีใหม่)</label>
                <div class="row g-2 align-items-center">
                    <div class="col-5">
                        <input type="text" id="et-new-name" class="form-control form-control-sm" placeholder="ชื่อเล่น">
                    </div>
                    <div class="col-5">
                        <input type="text" id="et-new-username" class="form-control form-control-sm" placeholder="Username">
                    </div>
                    <div class="col-2">
                        <button class="btn btn-success btn-sm w-100" id="btn-edit-add-new"><i class="bi bi-plus"></i></button>
                    </div>
                </div>
                <div id="edit-new-users-list" class="mt-2 d-flex flex-wrap gap-1"></div>
            </div>
        </div>
    `;

    let newUsersList = [];

    Swal.fire({
        title: '✏️ แก้ไขข้อมูลทริป',
        html: formHtml,
        showCancelButton: true,
        confirmButtonText: 'บันทึกการแก้ไข',
        cancelButtonText: 'ยกเลิก',
        width: '500px',
        didOpen: () => {
            // ระบบสลับสีปุ่มสมาชิก
            document.querySelectorAll('.edit-user-chk').forEach(chk => {
                chk.addEventListener('change', function() {
                    if(this.checked) this.parentElement.classList.replace('btn-outline-primary', 'btn-primary');
                    else this.parentElement.classList.replace('btn-primary', 'btn-outline-primary');
                });
            });

            // ระบบปุ่มเพิ่มเพื่อนใหม่
            document.getElementById('btn-edit-add-new').addEventListener('click', () => {
                let nName = document.getElementById('et-new-name').value.trim();
                let nUsername = document.getElementById('et-new-username').value.trim();
                
                if(!nName || !nUsername) return;
                
                newUsersList.push({ name: nName, username: nUsername.toLowerCase() });
                renderNewUsers();
                
                document.getElementById('et-new-name').value = '';
                document.getElementById('et-new-username').value = '';
            });

            function renderNewUsers() {
                const container = document.getElementById('edit-new-users-list');
                container.innerHTML = newUsersList.map((nu, idx) => `
                    <span class="badge bg-success p-2">
                        ${nu.name} 
                        <i class="bi bi-x-circle ms-1" style="cursor:pointer;" onclick="removeEditNewUser(${idx})"></i>
                    </span>
                `).join('');
            }
            window.removeEditNewUser = function(idx) {
                newUsersList.splice(idx, 1);
                renderNewUsers();
            }
        },
        preConfirm: () => {
            let tName = document.getElementById('et-name').value;
            let tStart = document.getElementById('et-start').value;
            let tEnd = document.getElementById('et-end').value;
            
            if(!tName || !tStart || !tEnd) { 
                Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน'); 
                return false; 
            }

            // ดึงรายชื่อคนที่ถูกติ๊ก (รวมคุณแป๊ะด้วยอัตโนมัติ)
            let selectedExisting = Array.from(document.querySelectorAll('.edit-user-chk:checked')).map(c => c.value);
            selectedExisting.push(currentUser.userId);

            return {
                tripId: trip.tripId,
                tripName: tName,
                startDate: tStart,
                endDate: tEnd,
                coverImg: document.getElementById('et-cover').value,
                activeMembers: selectedExisting,
                newMembers: newUsersList,
                creatorId: currentUser.userId
            }
        }
    }).then(result => {
        if(result.isConfirmed) submitEditTrip(result.value);
    });
}

async function submitEditTrip(payload) {
    Swal.fire({ title: 'กำลังอัปเดตข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    payload.action = 'updateTrip';

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            redirect: 'follow'
        }).then(r => r.json());

        if(res.status === 'success') {
            Swal.fire('สำเร็จ!', 'อัปเดตข้อมูลทริปเรียบร้อยแล้ว', 'success').then(() => {
                loadTrips(); // โหลดใหม่เพื่อรีเฟรชหน้าจอทั้งหมด
            });
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch(e) {
        Swal.fire('Error', 'การเชื่อมต่อผิดพลาด', 'error');
    }
}