document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const mainApp = document.getElementById('main-app');
    const btnStart = document.getElementById('btnStart');
    const userNameInput = document.getElementById('userNameInput');
    const welcomeText = document.getElementById('welcome-text');
    const btnLogout = document.getElementById('btnLogout');

    // ตรวจสอบว่าเคยเข้าสู่ระบบ (มีชื่อใน LocalStorage) หรือไม่
    const savedName = localStorage.getItem('tripUserName');

    if (savedName) {
        showMainApp(savedName);
    }

    // เมื่อกดปุ่ม "เริ่มกันเลย"
    btnStart.addEventListener('click', () => {
        const name = userNameInput.value.trim();
        
        if (name === '') {
            Swal.fire({
                icon: 'warning',
                title: 'เดี๋ยวก่อน!',
                text: 'กรุณากรอกชื่อของคุณก่อนไปลุยกัน!',
                confirmButtonColor: '#DC9B9B', 
                confirmButtonText: 'ตกลง',
                shape: 'pill'
            });
            userNameInput.focus();
            return;
        }

        localStorage.setItem('tripUserName', name);
        splashScreen.style.opacity = '0';
        
        setTimeout(() => {
            showMainApp(name);
        }, 800);
    });

    // ฟังก์ชันสำหรับแสดงหน้าหลัก
    function showMainApp(name) {
        splashScreen.classList.add('d-none');
        mainApp.classList.remove('d-none');
        document.body.style.overflow = 'auto'; 
        if (welcomeText) welcomeText.textContent = `สวัสดีคุณ ${name} 👋`;
    }

    // ระบบออกจากระบบ
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            Swal.fire({
                title: 'ออกจากระบบ?',
                text: "ข้อมูลของคุณจะยังถูกเก็บไว้อยู่",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#DC9B9B',
                cancelButtonColor: '#a9a9a9',
                confirmButtonText: 'ใช่, ออกจากระบบ',
                cancelButtonText: 'ยกเลิก',
                borderRadius: '24px'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem('tripUserName');
                    location.reload(); 
                }
            });
        });
    }

    // --- ระบบสลับเมนูด้านล่าง (Bottom Navigation) ---
    const navItems = document.querySelectorAll('.nav-item');
    const pageSections = document.querySelectorAll('.page-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            pageSections.forEach(page => page.classList.add('d-none'));
            
            const targetId = item.getAttribute('data-target');
            const targetPage = document.getElementById(targetId);
            if (targetPage) targetPage.classList.remove('d-none');
            
            window.scrollTo(0, 0);
        });
    });
});