// --- ตัวแปรสำหรับแผนที่ Leaflet ---
let previewMap = null;
let mapMarkers = [];
let currentActiveTrip = null;
let currentActiveTeam = 'teamKKC'; // ค่าเริ่มต้นเป็นทีมขอนแก่น

// 1. ฟังก์ชันเปิดหน้ารายละเอียด
window.openTripDetails = function(tripId) {
    currentActiveTrip = tripsData.find(t => t.id === tripId);
    if(!currentActiveTrip) return;

    // ซ่อนหน้าอื่น โชว์หน้านี้
    document.querySelectorAll('.page-section').forEach(page => page.classList.add('d-none'));
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.classList.add('d-none');
    
    document.getElementById('page-trip-details').classList.remove('d-none');
    window.scrollTo(0, 0);

    document.getElementById('detail-cover').style.backgroundImage = `url('${currentActiveTrip.image}')`;
    
    // 🧠 ระบบ Smart Tab: เช็คว่าคนที่ล็อกอินอยู่ทีมไหน แล้วเปลี่ยนแท็บให้เอง!
    const userName = localStorage.getItem('tripUserName') || '';
    if (currentActiveTrip.routes) {
        if (currentActiveTrip.routes.teamRYG.members.includes(userName)) {
            currentActiveTeam = 'teamRYG'; // ถ้าชื่ออยู่ทีมระยอง
        } else {
            currentActiveTeam = 'teamKKC'; // ค่าเริ่มต้น หรือถ้าชื่ออยู่ทีมขอนแก่น
        }
    }
    
    // อัปเดตปุ่มสวิตช์ด้านบนให้ตรงกับทีมที่เลือก
    const radioTeam = document.getElementById(`tab-${currentActiveTeam}`);
    if(radioTeam) radioTeam.checked = true;

    // สร้างแผนที่ Leaflet
    if (!previewMap) {
        previewMap = L.map('preview-map', { zoomControl: false }).setView([13.7563, 100.5018], 6);
        const MAPTILER_API_KEY = 'RToNZ0OGFkEo4MhCW5NS'; 

        L.tileLayer(`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`, {
            attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }).addTo(previewMap);

        previewMap.locate({ setView: false, maxZoom: 16, enableHighAccuracy: true });
        previewMap.on('locationfound', function(e) {
            const userIcon = L.divIcon({ className: 'user-location-marker', html: '<div class="blue-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
            L.marker(e.latlng, { icon: userIcon }).addTo(previewMap).bindPopup("📍 ตำแหน่งปัจจุบันของคุณ");
        });
    }

    setTimeout(() => { previewMap.invalidateSize(); }, 300);
    
    // สั่งวาดเส้นทางตามทีมปัจจุบัน
    window.calculateAndRenderTimeline('07:30', 'start');
};

// 2. ระบบจำลองเวลาเดินทาง & วาด Timeline
window.calculateAndRenderTimeline = function(baseTime, mode) {
    const timelineContainer = document.getElementById('timeline-container');
    timelineContainer.innerHTML = '';
    
    // ล้าง Marker เก่าบนแผนที่ออก
    mapMarkers.forEach(marker => previewMap.removeLayer(marker));
    mapMarkers = [];
    let mapBounds = [];

    // เช็คว่ามีข้อมูลของทีมนี้ไหม
    if(!currentActiveTrip.routes || !currentActiveTrip.routes[currentActiveTeam]) {
        timelineContainer.innerHTML = '<p class="text-muted text-center mt-4">ยังไม่มีข้อมูลเส้นทางของทีมนี้</p>';
        return;
    }

    // ดึงข้อมูลรูทของทีมที่กำลังเลือก
    const activeRouteData = currentActiveTrip.routes[currentActiveTeam];
    const routePath = activeRouteData.path;
    const themeColorClass = activeRouteData.theme === 'mint' ? 'marker-mint' : 'marker-pink';
    const dotColor = activeRouteData.theme === 'mint' ? 'var(--color-1)' : 'var(--color-4)';

    // อัปเดตลิงก์ Google Maps ของทีมนั้น
    const btnFullRoute = document.getElementById('btn-full-route');
    if (btnFullRoute) {
        if (activeRouteData.gmapLink) {
            btnFullRoute.href = activeRouteData.gmapLink;
            btnFullRoute.classList.remove('d-none');
        } else {
            btnFullRoute.classList.add('d-none');
        }
    }

    // ระบบคำนวณเวลา
    let [hours, minutes] = baseTime.split(':').map(Number);
    let currentTotalMinutes = (hours * 60) + minutes;

    if (mode === 'end') {
        let totalTripDuration = routePath.reduce((sum, stop) => sum + stop.durationMinutes, 0);
        currentTotalMinutes = currentTotalMinutes - totalTripDuration;
    }

    routePath.forEach((stop, index) => {
        currentTotalMinutes += stop.durationMinutes;

        let displayHours = Math.floor(currentTotalMinutes / 60) % 24;
        let displayMinutes = currentTotalMinutes % 60;
        let formattedTime = `${String(displayHours).padStart(2, '0')}:${String(displayMinutes).padStart(2, '0')}`;

        // 📍 การสร้างหมุดแผนที่ (Custom Marker) 
        if (stop.lat && stop.lng) {
            const customIcon = L.divIcon({
                className: '', // ล้าง class ตั้งต้นออก
                // ใส่ตัวเลขลำดับลงไปในหมุด พร้อมดึงสีประจำทีมมาใช้
                html: `<div class="custom-map-marker ${themeColorClass}">${index + 1}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            let marker = L.marker([stop.lat, stop.lng], { icon: customIcon })
                          .addTo(previewMap)
                          .bindPopup(`<b>${formattedTime} น.</b><br>${stop.name}`);
            
            mapMarkers.push(marker);
            mapBounds.push([stop.lat, stop.lng]);
        }

        // 📝 วาดไทม์ไลน์
        const item = document.createElement('div');
        item.className = `timeline-item ${stop.type}`;
        
        item.innerHTML = `
            <div class="timeline-dot" style="background-color: ${dotColor};"></div>
            <div class="timeline-time">${formattedTime} น.</div>
            <h6 class="timeline-title">${stop.name}</h6>
            <div class="mt-2 d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary rounded-pill btn-flyto" data-lat="${stop.lat}" data-lng="${stop.lng}" data-index="${index}">
                    <i class="bi bi-geo-alt"></i> ตำแหน่ง
                </button>
                <a href="${stop.gmapLink}" target="_blank" class="btn btn-sm btn-outline-success rounded-pill">
                    <i class="bi bi-map"></i> Google Maps
                </a>
            </div>
        `;
        timelineContainer.appendChild(item);
    });

    // ซูมแผนที่ให้ครอบคลุมจุดทั้งหมด
    if (mapBounds.length > 0) {
        previewMap.fitBounds(mapBounds, { padding: [40, 40] });
    }

    // ปุ่มกดเพื่อลอยไปดูแผนที่
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

// 3. จัดการ Events ต่างๆ (เมื่อโหลดหน้าเว็บเสร็จ)
document.addEventListener('DOMContentLoaded', () => {
    
    // ปุ่มกลับหน้าหลัก
    const btnBackTrips = document.getElementById('btn-back-trips');
    if (btnBackTrips) {
        btnBackTrips.addEventListener('click', () => {
            document.getElementById('page-trip-details').classList.add('d-none');
            document.getElementById('page-trips').classList.remove('d-none');
            const bottomNav = document.querySelector('.bottom-nav');
            if (bottomNav) bottomNav.classList.remove('d-none'); 
        });
    }

    // 💡 ระบบเมื่อกด "สลับแท็บ" ทีม (Smart Tabs)
    const teamRadios = document.querySelectorAll('input[name="teamSelect"]');
    teamRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentActiveTeam = e.target.value; // อัปเดตทีมที่ถูกเลือก
            
            // ดึงค่าเวลาปัจจุบันจากช่อง Input มาคำนวณใหม่
            const timeVal = document.getElementById('simulator-time') ? document.getElementById('simulator-time').value : '07:30';
            const modeInput = document.querySelector('input[name="timeMode"]:checked');
            const mode = modeInput ? modeInput.value : 'start';
            
            // สั่งวาดใหม่
            window.calculateAndRenderTimeline(timeVal, mode);
        });
    });

    // ปุ่มคำนวณเวลา
    const btnCalculateTime = document.getElementById('btn-calculate-time');
    if (btnCalculateTime) {
        btnCalculateTime.addEventListener('click', () => {
            const timeVal = document.getElementById('simulator-time').value;
            const mode = document.querySelector('input[name="timeMode"]:checked').value;
            window.calculateAndRenderTimeline(timeVal, mode);
            
            Swal.fire({ icon: 'success', title: 'อัปเดตเวลาแล้ว!', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        });
    }
});