// =========================================================
// 🕒 ระบบ Dashboard เค้าท์ดาวน์ทริปหลัก (Dynamic Countdown)
// =========================================================
let countdownInterval = null;

window.setupDashboard = function(activeTrip) {
    const elDays = document.getElementById('cd-days');
    const elHours = document.getElementById('cd-hours');
    const elMinutes = document.getElementById('cd-minutes');
    const elSeconds = document.getElementById('cd-seconds');
    const boxDays = document.getElementById('box-days');
    const sepDays = document.getElementById('sep-days');
    const welcomeText = document.getElementById('welcome-text');
    
    // ดึงชื่อผู้ใช้มาทักทาย
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    if (welcomeText) welcomeText.textContent = `สวัสดีคุณ ${currentUser.name || 'Guest'} 👋`;

    // 🌟 ดึง Element หัวข้อใหญ่ และวันที่ มาแก้ไขข้อความ
    const titleText = document.getElementById('dashboard-trip-name');
    const datePillText = document.getElementById('dashboard-trip-date');

    if (!activeTrip) return;

    // เปลี่ยนชื่อบนหน้าจอให้เป็นชื่อทริปปัจจุบัน
    if (titleText) titleText.textContent = activeTrip.tripName;
    
    // เปลี่ยนวันที่บนหน้าจอให้ตรงกับฐานข้อมูล
    const startDateObj = new Date(activeTrip.startDate);
    if (datePillText) {
        datePillText.textContent = startDateObj.toLocaleDateString('th-TH', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // ล้างตัวจับเวลาเก่าทิ้งก่อน (กันมันนับซ้อนกัน)
    if (countdownInterval) clearInterval(countdownInterval);

    function updateCountdown() {
        // 🌟 ตั้งเวลาเป็น 06:00 น. ของวันเริ่มทริป
        let targetDate = new Date(activeTrip.startDate);
        targetDate.setHours(6, 0, 0, 0); 
        
        const now = new Date().getTime();
        const distance = targetDate.getTime() - now;

        if (distance > 0) {
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            if(elDays) elDays.textContent = days;
            if(elHours) elHours.textContent = String(hours).padStart(2, '0');
            if(elMinutes) elMinutes.textContent = String(minutes).padStart(2, '0');
            if(elSeconds) elSeconds.textContent = String(seconds).padStart(2, '0');

            if (boxDays && sepDays) {
                if (days <= 0) {
                    boxDays.classList.add('d-none');
                    sepDays.classList.add('d-none');
                } else {
                    boxDays.classList.remove('d-none');
                    sepDays.classList.remove('d-none');
                }
            }
        } else {
            // ถึงวันทริปแล้ว
            if(elDays) elDays.textContent = "0";
            if(elHours) elHours.textContent = "00";
            if(elMinutes) elMinutes.textContent = "00";
            if(elSeconds) elSeconds.textContent = "00";

            if (boxDays && sepDays) {
                boxDays.classList.add('d-none');
                sepDays.classList.add('d-none');
            }
        }
    }
    
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}