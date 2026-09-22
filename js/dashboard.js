document.addEventListener('DOMContentLoaded', () => {
    function updateCountdown() {
        // วันที่เป้าหมาย (แก้ไขวันที่และเวลาตามจริงได้เลย)
        const tripDate = new Date('2026-11-07T06:00:00').getTime();
        const now = new Date().getTime();
        const distance = tripDate - now;

        const elDays = document.getElementById('cd-days');
        const elHours = document.getElementById('cd-hours');
        const elMinutes = document.getElementById('cd-minutes');
        const elSeconds = document.getElementById('cd-seconds');

        if (distance > 0) {
            // คำนวณ วัน ชม นาที วินาที
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            if(elDays) elDays.textContent = days;
            // .padStart(2, '0') ช่วยเติมเลข 0 ด้านหน้าถ้าเลขตัวเดียว เช่น 09 นาที
            if(elHours) elHours.textContent = String(hours).padStart(2, '0');
            if(elMinutes) elMinutes.textContent = String(minutes).padStart(2, '0');
            if(elSeconds) elSeconds.textContent = String(seconds).padStart(2, '0');
        } else {
            // กรณีถึงวันทริปแล้ว
            if(elDays) elDays.textContent = "0";
            if(elHours) elHours.textContent = "00";
            if(elMinutes) elMinutes.textContent = "00";
            if(elSeconds) elSeconds.textContent = "00";
        }
    }
    
    // อัปเดตทันทีเมื่อโหลดหน้าเว็บ
    updateCountdown();
    
    // สั่งให้อัปเดตซ้ำทุกๆ 1 วินาที (1000 มิลลิวินาที)
    setInterval(updateCountdown, 1000);
});