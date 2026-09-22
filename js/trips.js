document.addEventListener('DOMContentLoaded', () => {
    // --- ระบบ Carousel หน้าทริปของเรา ---
    const carouselContainer = document.getElementById('trip-carousel');

    // ตรวจสอบว่ามีข้อมูลจาก data.js หรือไม่
    if (typeof tripsData !== 'undefined' && carouselContainer) {
        
        // 1. สร้างการ์ดจากข้อมูล
        tripsData.forEach(trip => {
            const card = document.createElement('div');
            card.className = `trip-card status-${trip.status}`;
            
            // กำหนดข้อความป้ายกำกับ
            let badgeText = trip.status === 'past' ? 'ผ่านมาแล้ว' : 
                            trip.status === 'upcoming' ? 'กำลังจะถึง' : 'แพลนอนาคต';

            card.innerHTML = `
                <div class="card-bg" style="background-image: url('${trip.image}')"></div>
                <div class="card-overlay"></div>
                <div class="badge-status">${badgeText}</div>
                <div class="trip-content">
                    <h4 class="trip-title">${trip.title}</h4>
                    <div class="trip-details">
                        <p class="mb-1"><i class="bi bi-calendar3"></i> ${trip.date}</p>
                        <p class="mb-0"><i class="bi bi-geo-alt"></i> ${trip.location}</p>
                    </div>
                </div>
            `;
            
            carouselContainer.appendChild(card);

            // 2. จัดการเมื่อกดการ์ด (ในส่วนของ Carousel)
            card.addEventListener('click', () => {
                if (card.classList.contains('active-card') && trip.status !== 'past') {
                    
                    Swal.fire({
                        title: 'พร้อมลุย!',
                        text: `กำลังเปิดแพลน: ${trip.title}`,
                        icon: 'success',
                        showConfirmButton: false,
                        timer: 1200
                    }).then(() => {
                        // เดี๋ยวเราจะเรียกฟังก์ชันเปิดหน้ารายละเอียดทริปตรงนี้
                        openTripDetails(trip.id); 
                        console.log("ไปหน้ารายละเอียดทริป ID:", trip.id);
                    });

                } else if (!card.classList.contains('active-card')) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        });

        // 3. ใช้ IntersectionObserver เพื่อตรวจจับว่าการ์ดไหนอยู่ "ตรงกลางจอ"
        // โดยตั้ง rootMargin ให้โฟกัสเฉพาะเส้นตรงกลาง
        const observerOptions = {
            root: carouselContainer,
            rootMargin: '-45% 0px -45% 0px', 
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active-card');
                } else {
                    entry.target.classList.remove('active-card');
                }
            });
        }, observerOptions);

        // ให้ observer สังเกตการณ์การ์ดทุกใบ
        document.querySelectorAll('.trip-card').forEach(card => observer.observe(card));
    }
})