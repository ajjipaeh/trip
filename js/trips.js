document.addEventListener('DOMContentLoaded', () => {
    const carouselContainer = document.getElementById('trip-carousel');

    if (typeof tripsData !== 'undefined' && carouselContainer) {
        
        // 1. สร้าง Slide ยัดลงใน Swiper
        tripsData.forEach(trip => {
            const slide = document.createElement('div');
            // ใส่คลาส swiper-slide เป็นข้อบังคับของไลบรารี
            slide.className = `swiper-slide status-${trip.status}`;
            
            let badgeText = trip.status === 'past' ? 'ผ่านมาแล้ว' : 
                            trip.status === 'upcoming' ? 'กำลังจะถึง' : 'แพลนอนาคต';

            slide.innerHTML = `
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
            carouselContainer.appendChild(slide);

            // 2. จับ Event คลิกการ์ด
            slide.addEventListener('click', () => {
                // เช็คว่าการ์ดนี้ active อยู่หรือไม่
                if (slide.classList.contains('swiper-slide-active') && trip.status !== 'past') {
                    Swal.fire({
                        title: 'พร้อมลุย!', 
                        text: `กำลังเปิดแพลน: ${trip.title}`, 
                        icon: 'success',
                        showConfirmButton: false, 
                        timer: 1200
                    }).then(() => {
                        if(typeof openTripDetails === 'function') openTripDetails(trip.id); 
                    });
                }
            });
        });

        // 3. เริ่มต้นการทำงานของ Swiper
        const swiper = new Swiper('.trip-swiper', {
            direction: 'vertical',
            loop: true,               // วนลูป Infinity!
            centeredSlides: true,     // ให้ใบที่โฟกัสอยู่ตรงกลางเสมอ
            slidesPerView: 'auto',    // คำนวณความสูงอัตโนมัติ
            spaceBetween: 20,         // ระยะห่างระหว่างการ์ด
            speed: 500,               // ความเร็วตอนแอนิเมชันเลื่อน (ms)
            slideToClickedSlide: true // คลิกลูกไหน ลูกนั้นเด้งมาตรงกลางให้เลย!
        });
    }
});