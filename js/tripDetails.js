// --- ตัวแปรสำหรับแผนที่ Leaflet ---
let previewMap = null;
let mapMarkers = [];
let currentActiveTrip = null;

// 1. ฟังก์ชันเปิดหน้ารายละเอียด (ใส่ window. เพื่อให้คลิกจากการ์ดหน้าอื่นได้)
window.openTripDetails = function(tripId) {
    currentActiveTrip = tripsData.find(t => t.id === tripId);
    if(!currentActiveTrip) return;

    // ค้นหา Element ใหม่ เพราะถูกแยกไฟล์มา
    document.querySelectorAll('.page-section').forEach(page => page.classList.add('d-none'));
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.classList.add('d-none');
    
    document.getElementById('page-trip-details').classList.remove('d-none');
    window.scrollTo(0, 0);

    document.getElementById('detail-cover').style.backgroundImage = `url('${currentActiveTrip.image}')`;
    
    // สร้างแผนที่ Leaflet (ถ้ายังไม่เคยสร้าง)
    if (!previewMap) {
        previewMap = L.map('preview-map', { zoomControl: false }).setView([13.7563, 100.5018], 6);
        
        const MAPTILER_API_KEY = 'RToNZ0OGFkEo4MhCW5NS'; 

        L.tileLayer(`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`, {
            attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }).addTo(previewMap);

        // ระบบขอตำแหน่งปัจจุบัน
        previewMap.locate({ setView: false, maxZoom: 16, enableHighAccuracy: true });
        previewMap.on('locationfound', function(e) {
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="blue-dot"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            L.marker(e.latlng, { icon: userIcon }).addTo(previewMap).bindPopup("📍 ตำแหน่งปัจจุบันของคุณ");
        });
        previewMap.on('locationerror', function(e) {
            console.log("ไม่สามารถดึงตำแหน่งได้ หรือผู้ใช้ปฏิเสธการเข้าถึง");
        });
    }

    setTimeout(() => { previewMap.invalidateSize(); }, 300);
    window.calculateAndRenderTimeline('07:30', 'start');
};

// 2. ระบบจำลองเวลาเดินทาง & วาด Timeline
window.calculateAndRenderTimeline = function(baseTime, mode) {
    const timelineContainer = document.getElementById('timeline-container');
    timelineContainer.innerHTML = '';
    
    mapMarkers.forEach(marker => previewMap.removeLayer(marker));
    mapMarkers = [];
    let mapBounds = [];

    if(!currentActiveTrip.route) {
        timelineContainer.innerHTML = '<p class="text-muted">ยังไม่มีข้อมูลเส้นทาง</p>';
        return;
    }

    let [hours, minutes] = baseTime.split(':').map(Number);
    let currentTotalMinutes = (hours * 60) + minutes;

    if (mode === 'end') {
        let totalTripDuration = currentActiveTrip.route.reduce((sum, stop) => sum + stop.durationMinutes, 0);
        currentTotalMinutes = currentTotalMinutes - totalTripDuration;
    }

    currentActiveTrip.route.forEach((stop, index) => {
        currentTotalMinutes += stop.durationMinutes;

        let displayHours = Math.floor(currentTotalMinutes / 60) % 24;
        let displayMinutes = currentTotalMinutes % 60;
        let formattedTime = `${String(displayHours).padStart(2, '0')}:${String(displayMinutes).padStart(2, '0')}`;

        if (stop.lat && stop.lng) {
            let marker = L.marker([stop.lat, stop.lng]).addTo(previewMap).bindPopup(`<b>${formattedTime} น.</b><br>${stop.name}`);
            mapMarkers.push(marker);
            mapBounds.push([stop.lat, stop.lng]);
        }

        const item = document.createElement('div');
        item.className = `timeline-item ${stop.type}`;
        
        let buttonsHtml = `
            <div class="mt-2 d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary rounded-pill btn-flyto" data-lat="${stop.lat}" data-lng="${stop.lng}" data-index="${index}">
                    <i class="bi bi-geo-alt"></i> พรีวิวตำแหน่ง
                </button>
                <a href="${stop.gmapLink}" target="_blank" class="btn btn-sm btn-outline-success rounded-pill">
                    <i class="bi bi-map"></i> Google Maps
                </a>
            </div>
        `;

        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-time">${formattedTime} น.</div>
            <h6 class="timeline-title">${stop.name}</h6>
            ${buttonsHtml}
        `;
        timelineContainer.appendChild(item);
    });

    if (mapBounds.length > 0) {
        previewMap.fitBounds(mapBounds, { padding: [30, 30] });
    }

    // ระบบจับ Event กดปุ่ม Fly To
    document.querySelectorAll('.btn-flyto').forEach(btn => {
        btn.addEventListener('click', function() {
            const lat = parseFloat(this.getAttribute('data-lat'));
            const lng = parseFloat(this.getAttribute('data-lng'));
            const index = parseInt(this.getAttribute('data-index'));
            
            previewMap.flyTo([lat, lng], 15, { duration: 1.5 });
            setTimeout(() => { mapMarkers[index].openPopup(); }, 1500);
        });
    });
};

// 3. กำหนด Event ให้กับปุ่มต่างๆ (เมื่อโหลดหน้าเว็บเสร็จ)
document.addEventListener('DOMContentLoaded', () => {
    
    // ปุ่มกลับหน้าหลัก (ปิดหน้ารายละเอียด)
    const btnBackTrips = document.getElementById('btn-back-trips');
    if (btnBackTrips) {
        btnBackTrips.addEventListener('click', () => {
            document.getElementById('page-trip-details').classList.add('d-none');
            document.getElementById('page-trips').classList.remove('d-none');
            
            const bottomNav = document.querySelector('.bottom-nav');
            if (bottomNav) bottomNav.classList.remove('d-none'); 
        });
    }

    // ปุ่มคำนวณเวลา (คลิกเพื่ออัปเดต Timeline)
    const btnCalculateTime = document.getElementById('btn-calculate-time');
    if (btnCalculateTime) {
        btnCalculateTime.addEventListener('click', () => {
            const timeVal = document.getElementById('simulator-time').value;
            const mode = document.querySelector('input[name="timeMode"]:checked').value;
            window.calculateAndRenderTimeline(timeVal, mode);
            
            Swal.fire({
                icon: 'success',
                title: 'อัปเดตเวลาแล้ว!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
        });
    }
});