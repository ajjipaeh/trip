// =========================================================
// 🔐 ระบบเข้าสู่ระบบ & เลือกทริป (Auth & Navigation)
// =========================================================
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentTripId = localStorage.getItem('currentTripId') || null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. เช็คสถานะล็อกอิน
    if (!currentUser) {
        document.getElementById('splash-screen').classList.remove('d-none');
        document.getElementById('main-app').classList.add('d-none');
        let hubScreen = document.getElementById('trip-hub-screen');
        if(hubScreen) hubScreen.classList.add('d-none');
    } else {
        loadTrips();
    }

    // 2. ซ่อมระบบสลับเมนูด้านล่าง (Bottom Navigation) แบบตัดขาดกัน 100%
    const navItems = document.querySelectorAll('.nav-item');
    const pageSections = document.querySelectorAll('.page-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // ล้างปุ่มสีส้มออกจากทุกเมนู แล้วใส่ให้เมนูที่กด
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // 🌟 ซ่อนทุกหน้าจอให้หมดก่อน (แก้ปัญหาหน้าจอต่อตูดกัน)
            pageSections.forEach(page => page.classList.add('d-none'));
            
            // 🌟 เปิดเฉพาะหน้าเป้าหมาย
            const targetId = item.getAttribute('data-target');
            const targetPage = document.getElementById(targetId);
            if (targetPage) targetPage.classList.remove('d-none');
            
            window.scrollTo(0, 0);
        });
    });
});

async function handleLogin() {
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    
    if(!user || !pass) return Swal.fire('แจ้งเตือน', 'กรุณากรอก Username และ Password', 'warning');
    
    Swal.fire({ title: 'กำลังเข้าสู่ระบบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username: user, password: pass }),
            redirect: 'follow'
        }).then(r => r.json());
        
        if(res.status === 'success') {
            localStorage.setItem('currentUser', JSON.stringify(res.user));
            currentUser = res.user;
            Swal.close();
            document.getElementById('splash-screen').classList.add('d-none');
            loadTrips();
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    }
}

function handleLogout() {
    Swal.fire({
        title: 'ออกจากระบบ?',
        text: "ข้อมูลของคุณจะยังถูกเก็บไว้อยู่",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#DC9B9B',
        cancelButtonColor: '#a9a9a9',
        confirmButtonText: 'ใช่, ออกจากระบบ'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentTripId');
            location.reload(); 
        }
    });
}

// 🌟 ระบบคัดกรองทริปใหม่ที่แม่นยำขึ้น
async function loadTrips() {
    Swal.fire({ title: 'กำลังโหลดข้อมูลทริป...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getTrips', userId: currentUser.userId }),
            redirect: 'follow'
        }).then(r => r.json());
        
        if (res.status === 'success') {
            const allTrips = res.trips;
            
            // 🌟 ลอจิกหาทริปใหม่: อิงตามวันที่ล้วนๆ ไม่สน Status
            const now = new Date();
            now.setHours(0,0,0,0); // รีเซ็ตเป็นเที่ยงคืน จะได้เทียบแค่วัน
            
            let activeTrip = null;
            let closestFuture = Infinity;
            let closestPast = Infinity;
            let recentPastTrip = null;

            allTrips.forEach(trip => {
                let tripDate = new Date(trip.startDate);
                tripDate.setHours(0,0,0,0);
                let diff = tripDate.getTime() - now.getTime();

                if (diff >= 0) { // ทริปในอนาคต (หรือวันนี้)
                    if (diff < closestFuture) {
                        closestFuture = diff;
                        activeTrip = trip; // เช่น จะได้ เกาะสีชัง T002 มา
                    }
                } else { // ทริปที่จบไปแล้ว
                    if (Math.abs(diff) < closestPast) {
                        closestPast = Math.abs(diff);
                        recentPastTrip = trip; // เช่น จะได้ เขาใหญ่ T001 มาสำรองไว้
                    }
                }
            });

            // ถ้าไม่มีทริปอนาคตเลย ให้เอาทริปล่าสุดในอดีตมาโชว์แทน
            if (!activeTrip) {
                activeTrip = recentPastTrip || allTrips[0];
            }

            // บันทึกทริปหลัก
            if (activeTrip) {
                currentTripId = activeTrip.tripId;
                localStorage.setItem('currentTripId', currentTripId);
            }

            // ส่งข้อมูลไปวาดที่ Dashboard (เค้าท์ดาวน์)
            if (typeof setupDashboard === 'function') {
                setupDashboard(activeTrip);
            }

            // ส่งข้อมูลไปวาดที่หน้า ทริปของเรา (Carousel)
            if (typeof renderTripCarousel === 'function') {
                renderTripCarousel(allTrips, currentTripId);
            }

            // สลับหน้าจอ พุ่งเข้า Dashboard เป็นหน้าแรกสุด
            document.getElementById('splash-screen').classList.add('d-none');
            let hubScreen = document.getElementById('trip-hub-screen');
            if(hubScreen) hubScreen.classList.add('d-none'); // ดักปิดหน้า Hub กรณีมีหลงเหลือ
            
            document.getElementById('main-app').classList.remove('d-none');
            
            // สั่งโหลดบัญชีกองกลางรอไว้
            if (currentTripId && typeof syncAppData === 'function') {
                syncAppData(false);
            }

            Swal.close();
        }
    } catch (e) {
        Swal.fire('Error', 'ดึงข้อมูลทริปไม่สำเร็จ', 'error');
    }
}