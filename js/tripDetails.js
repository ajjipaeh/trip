// --- ตัวแปรสำหรับแผนที่ Leaflet และ Backend ---
// const API_URL = 'https://script.google.com/macros/s/AKfycbw3Ad2IF2oUhRXNA6kQj2iVjnORbslQ3N2PcMWMBH6-GpC4b-ZsAdBSv43pzSd9MIGtow/exec'; // ⚠️ เปลี่ยนเป็น URL ของ Apps Script ตัวเอง
let previewMap = null;
let mapMarkers = [];
let currentActiveTrip = null;
let currentActiveTeam = 'teamKKC'; 
let myTeam = ''; 
let syncInterval = null;

// ================= ระบบ Sync Server (ดึงข้อมูล 5 นาที) =================
window.syncDataFromServer = function() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            // อัปเดตลง localStorage ของเครื่อง
            if(data.tripCheckins) localStorage.setItem('tripCheckins', JSON.stringify(data.tripCheckins));
            if(data.tripMergeDecisions) localStorage.setItem('tripMergeDecisions', JSON.stringify(data.tripMergeDecisions));
            if(data.tripDynamicMerges) localStorage.setItem('tripDynamicMerges', JSON.stringify(data.tripDynamicMerges));
            
            // รีเรนเดอร์ Timeline ถ้ากำลังดูแผนที่อยู่
            if (currentActiveTrip && !document.getElementById('page-trip-details').classList.contains('d-none')) {
                const timeVal = document.getElementById('simulator-time').value;
                const modeInput = document.querySelector('input[name="timeMode"]:checked');
                window.calculateAndRenderTimeline(timeVal, modeInput ? modeInput.value : 'start');
            }
        }).catch(err => console.error("Sync error:", err));
};

// ================= ฟังก์ชันบันทึกลง API =================
function sendPostToAPI(payload) {
    // ใช้ text/plain เพื่อเลี่ยงปัญหา CORS preflight
    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    }).catch(e => console.log('Error saving to API:', e));
}


// 1. ฟังก์ชันเปิดหน้ารายละเอียด
window.openTripDetails = function(tripId) {
    currentActiveTrip = tripsData.find(t => t.id === tripId);
    if(!currentActiveTrip) return;

    // 🌟 ดักจับทริปในอนาคต (ถ้า status เป็น future ให้เด้ง Alert และหยุดการทำงาน) 🌟
    if (currentActiveTrip.status === 'future') {
        Swal.fire({
            title: 'อดใจรอหน่อยน้าา 🥺',
            text: 'ทริปนี้ยังไม่เปิดให้ดูรายละเอียด เตรียมตัวสำหรับทริปปัจจุบันก่อนนะวัยรุ่น!',
            icon: 'info',
            confirmButtonColor: 'var(--color-4)',
            confirmButtonText: 'โอเคจ้ารับทราบ!'
        });
        return; // สั่ง return เพื่อหยุด ไม่ให้เปิดหน้าถัดไป
    }

    document.querySelectorAll('.page-section').forEach(page => page.classList.add('d-none'));
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.classList.add('d-none');
    
    document.getElementById('page-trip-details').classList.remove('d-none');
    window.scrollTo(0, 0);
    document.getElementById('detail-cover').style.backgroundImage = `url('${currentActiveTrip.image}')`;
    
    const userName = localStorage.getItem('tripUserName') || '';
    
    if (currentActiveTrip.routes) {
        if (currentActiveTrip.routes.teamRYG.members.includes(userName)) {
            myTeam = 'teamRYG';
        } else {
            myTeam = 'teamKKC';
        }
        currentActiveTeam = myTeam; 
    }
    
    const radioTeam = document.getElementById(`tab-${currentActiveTeam}`);
    if(radioTeam) radioTeam.checked = true;

    const resetZone = document.getElementById('admin-reset-zone');
    if(resetZone) {
        if(userName === 'แป๊ะ') resetZone.classList.remove('d-none');
        else resetZone.classList.add('d-none');
    }

    if (!previewMap) {
        previewMap = L.map('preview-map', { zoomControl: false }).setView([13.7563, 100.5018], 6);
        const MAPTILER_API_KEY = 'RToNZ0OGFkEo4MhCW5NS'; 
        L.tileLayer(`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`, {
            attribution: '&copy; MapTiler &copy; OSM'
        }).addTo(previewMap);
    }
    setTimeout(() => { previewMap.invalidateSize(); }, 300);
    
    let defaultTime = '07:30';
    document.getElementById('simulator-time').value = defaultTime;
    
    // โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์ทุกครั้งที่กดเข้าดูทริป
    window.syncDataFromServer();
    window.calculateAndRenderTimeline(defaultTime, 'start');
};

// ================= ฟังก์ชันเคลียร์ค่า (เฉพาะแอดมิน) =================
window.resetCheckins = function() {
    Swal.fire({
        title: 'ล้างข้อมูลทั้งหมด?', text: 'จะล้างสถานะการเช็คอินและการตัดสินใจทั้งหมดทั้งบนเว็บและเซิร์ฟเวอร์', icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'ใช่, ล้างเลย'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('tripCheckins');
            localStorage.removeItem('tripMergeDecisions');
            localStorage.removeItem('tripDynamicMerges'); 
            
            // ส่งคำสั่งลบไปที่ Google Sheet
            sendPostToAPI({ action: 'resetAll' });
            
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            window.calculateAndRenderTimeline(timeStr, 'start');
            Swal.fire('รีเซ็ตสำเร็จ', 'ข้อมูลถูกล้างแล้ว', 'success');
        }
    });
}

// ================= ระบบ Check-in & Live Status =================
window.handleCheckIn = function(team, stopId, stopIndex, isOriginalMergePoint, stopName) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    let mergeData = JSON.parse(localStorage.getItem('tripMergeDecisions')) || {};
    let dynamicMerges = JSON.parse(localStorage.getItem('tripDynamicMerges')) || [];
    
    let isMergePoint = isOriginalMergePoint || dynamicMerges.includes(stopName);

    if(isMergePoint) {
        if(!mergeData[stopName]) {
            Swal.fire({
                title: '🤝 ถึงจุดรวมพลแล้ว!',
                html: `คุณเป็นทีมแรกที่มาถึง <b>${stopName}</b><br>จะรอเพื่อนที่นี่ หรือไปรวมจุดถัดไปแทน?`,
                icon: 'question',
                showDenyButton: true,
                confirmButtonText: 'รอที่นี่แหละ',
                denyButtonText: 'ไปรวมจุดหน้า!',
                confirmButtonColor: '#28a745',
                denyButtonColor: '#dc3545'
            }).then((result) => {
                let decision = result.isConfirmed ? 'wait' : 'next';
                let nextStopName = null;
                
                if (decision === 'next') {
                    const path = currentActiveTrip.routes[team].path;
                    if (stopIndex + 1 < path.length) {
                        nextStopName = path[stopIndex + 1].name;
                        if (!dynamicMerges.includes(nextStopName)) {
                            dynamicMerges.push(nextStopName);
                            localStorage.setItem('tripDynamicMerges', JSON.stringify(dynamicMerges));
                            // บันทึกจุดย้ายรวมพลลง API
                            sendPostToAPI({ action: 'addDynamicMerge', stopName: nextStopName });
                        }
                    }
                }
                
                // บันทึกการตัดสินใจ
                mergeData[stopName] = { by: team, decision: decision, nextStop: nextStopName };
                localStorage.setItem('tripMergeDecisions', JSON.stringify(mergeData));
                
                // ส่งการตัดสินใจลง API
                sendPostToAPI({ action: 'addMergeDecision', stopName: stopName, by: team, decision: decision, nextStop: nextStopName });
                
                saveCheckIn(team, stopIndex, timeStr, stopName);
                Swal.fire('บันทึกการตัดสินใจแล้ว!', result.isConfirmed ? 'สั่งเสบียงรอเลย!' : `ย้ายจุดรวมพลไปที่ ${nextStopName || 'ปลายทาง'} แล้ว!`, 'success');
            });
        } else {
            saveCheckIn(team, stopIndex, timeStr, stopName);
            let teamDisplay = mergeData[stopName].by === 'teamKKC' ? 'ทีมขอนแก่น' : 'ทีมระยอง';
            let dText = mergeData[stopName].decision === 'wait' 
                ? `${teamDisplay} รอคุณอยู่ที่นี่แล้ว!` 
                : `${teamDisplay} ล่วงหน้าไปรอที่ ${mergeData[stopName].nextStop || 'ปลายทาง'} แล้ว!`;
            
            Swal.fire('📍 เช็คอินสำเร็จ!', dText, 'info');
        }
    } else {
        saveCheckIn(team, stopIndex, timeStr, stopName);
        Swal.fire({ title: '📍 เช็คอินสำเร็จ!', text: `คุณอยู่ที่ ${stopName}`, icon: 'success', timer: 1500, showConfirmButton: false });
    }
}

function saveCheckIn(team, stopIndex, timeStr, stopName) {
    let data = JSON.parse(localStorage.getItem('tripCheckins')) || {};
    const path = currentActiveTrip.routes[team].path;
    let newCheckins = [];
    
    // ✅ ออโต้เช็คอินย้อนหลัง (ถ้ากดข้ามจุด)
    for (let i = 0; i <= stopIndex; i++) {
        let sId = path[i].id; 
        if (!data[`${team}_${sId}`]) {
            let timestamp = Date.now() - (stopIndex - i);
            data[`${team}_${sId}`] = { time: timeStr, name: path[i].name, timestamp: timestamp };
            // เก็บข้อมูลที่พึ่งเช็คอินเพื่อเตรียมส่ง API
            newCheckins.push({ team: team, stopId: sId, time: timeStr, stopName: path[i].name, timestamp: timestamp });
        }
    }
    
    localStorage.setItem('tripCheckins', JSON.stringify(data));
    
    // ยิง API สำหรับ Check-in ชุดใหม่
    if(newCheckins.length > 0) {
        sendPostToAPI({ action: 'addCheckins', data: newCheckins });
    }

    document.getElementById('simulator-time').value = timeStr;
    document.getElementById('mode-start').checked = true;
    window.calculateAndRenderTimeline(timeStr, 'start');
}

function updateLiveStatus() {
    let data = JSON.parse(localStorage.getItem('tripCheckins')) || {};
    const alertBox = document.getElementById('live-status-alert');
    const otherTeam = currentActiveTeam === 'teamKKC' ? 'teamRYG' : 'teamKKC';
    
    let latest = null;
    for(let key in data) {
        if(key.startsWith(otherTeam)) {
            if(!latest || data[key].timestamp > latest.timestamp) latest = data[key];
        }
    }
    
    if(latest) {
        alertBox.classList.remove('d-none');
        let teamName = otherTeam === 'teamKKC' ? '🦖 ทีมขอนแก่น' : '🌊 ทีมระยอง';
        
        // นำ timestamp มาแปลงเป็น Object วันที่
        let dateObj = new Date(latest.timestamp);
        
        // แปลงวันที่ให้อยู่ในรูปแบบไทย (เช่น 23 กันยายน 2569)
        let thaiDate = dateObj.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // แปลงเวลา (เช่น 17:23:34)
        let thaiTime = dateObj.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // นำมาประกอบกัน
        let desc = `เช็คอินล่าสุด: <b>${latest.name}</b> <br><small class="text-muted">( ${thaiDate} เวลา ${thaiTime} น. )</small>`;
        
        document.getElementById('live-status-title').innerText = `👀 อัปเดตจาก ${teamName}`;
        document.getElementById('live-status-desc').innerHTML = desc;
    } else {
        alertBox.classList.add('d-none');
    }
}
// ==========================================================

// 2. ระบบจำลองเวลาเดินทาง & วาด Timeline
window.calculateAndRenderTimeline = function(baseTime, mode) {
    const timelineContainer = document.getElementById('timeline-container');
    timelineContainer.innerHTML = '';
    
    mapMarkers.forEach(marker => previewMap.removeLayer(marker));
    mapMarkers = [];
    let mapBounds = [];

    if(!currentActiveTrip.routes || !currentActiveTrip.routes[currentActiveTeam]) return;

    const activeRouteData = currentActiveTrip.routes[currentActiveTeam];
    const routePath = activeRouteData.path;
    const themeColorClass = activeRouteData.theme === 'mint' ? 'marker-mint' : 'marker-pink';
    let baseDotColor = activeRouteData.theme === 'mint' ? 'var(--color-1)' : 'var(--color-4)';

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
    
    let checkinData = JSON.parse(localStorage.getItem('tripCheckins')) || {};
    let mergeData = JSON.parse(localStorage.getItem('tripMergeDecisions')) || {};
    let dynamicMerges = JSON.parse(localStorage.getItem('tripDynamicMerges')) || [];
    
    let latestCheckedIndex = -1;
    routePath.forEach((stop, index) => {
        if (checkinData[`${currentActiveTeam}_${stop.id}`]) latestCheckedIndex = index;
    });

    let [hours, minutes] = baseTime.split(':').map(Number);
    let currentTotalMinutes = (hours * 60) + minutes;

    if (mode === 'end') {
        let totalTripDuration = routePath.reduce((sum, stop) => sum + stop.durationMinutes, 0);
        currentTotalMinutes = currentTotalMinutes - totalTripDuration;
    }

    updateLiveStatus();
    let isReadOnly = (currentActiveTeam !== myTeam); 

    routePath.forEach((stop, index) => {
        currentTotalMinutes += stop.durationMinutes;

        let displayHours = Math.floor(currentTotalMinutes / 60) % 24;
        let displayMinutes = currentTotalMinutes % 60;
        let formattedTime = `${String(displayHours).padStart(2, '0')}:${String(displayMinutes).padStart(2, '0')}`;
        
        let isCheckedIn = index <= latestCheckedIndex;
        let isCurrentLocation = (index === latestCheckedIndex);
        let isNextStop = (index === latestCheckedIndex + 1);
        let isNotStarted = (latestCheckedIndex === -1 && index === 0); 
        
        let renderDotColor = isCheckedIn ? '#ccc' : baseDotColor; 
        let pulseClass = isCurrentLocation ? 'live-pulse' : ''; 
        if(isCurrentLocation) renderDotColor = '#dc3545'; 

        let statusBadge = '';
        if (isCurrentLocation) statusBadge = `<span class="badge bg-danger rounded-pill ms-2">📍 อยู่ที่นี่</span>`;
        if (isNextStop || isNotStarted) statusBadge = `<span class="badge bg-info text-dark rounded-pill ms-2"><i class="bi bi-truck van-moving"></i> กำลังไป...</span>`;

        let isMergePoint = stop.isMergePoint || dynamicMerges.includes(stop.name);
        let mergeInfo = '';
        
        if (isMergePoint) {
            if (mergeData[stop.name]) {
                let decData = mergeData[stop.name];
                let tName = decData.by === 'teamKKC' ? 'ขอนแก่น' : 'ระยอง';
                
                if (decData.decision === 'wait') {
                    mergeInfo = `<span class="badge badge-merge-point rounded-pill ms-2">🤝 จุดรวมพล</span>`;
                    mergeInfo += `<br><small class="text-success fw-bold ms-2">(${tName} คอนเฟิร์ม: รอรวมพลที่นี่)</small>`;
                } else {
                    mergeInfo = `<span class="badge bg-secondary text-decoration-line-through rounded-pill ms-2">🤝 จุดรวมพล (ย้ายแล้ว)</span>`;
                    mergeInfo += `<br><small class="text-danger fw-bold ms-2">(${tName} คอนเฟิร์ม: ย้ายไป ${decData.nextStop || 'ปลายทาง'})</small>`;
                }
            } else {
                mergeInfo = `<span class="badge badge-merge-point rounded-pill ms-2">🤝 จุดรวมพล 2 ทีม</span>`;
            }
        }

        if (stop.lat && stop.lng) {
            let markerOpacity = (isCheckedIn && !isCurrentLocation) ? 0.5 : 1;
            const customIcon = L.divIcon({
                className: '',
                html: `<div class="custom-map-marker ${themeColorClass} ${pulseClass}" style="opacity: ${markerOpacity};">${index + 1}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
            let marker = L.marker([stop.lat, stop.lng], { icon: customIcon })
                          .addTo(previewMap)
                          .bindPopup(`<b>${formattedTime} น.</b><br>${stop.name}`);
            mapMarkers.push(marker);
            mapBounds.push([stop.lat, stop.lng]);
        }

        let actionButtons = '';
        if (isReadOnly) {
            actionButtons = `<div class="alert alert-secondary text-center small py-2 mt-2 mb-0 border-0 rounded-pill"><i class="bi bi-eye"></i> โหมดสอดแนม (ดูได้อย่างเดียว)</div>`;
        } else {
            if (isCheckedIn && !isCurrentLocation) {
                actionButtons = `<button class="btn btn-sm btn-light text-muted rounded-pill mt-2 w-100 fw-bold disabled shadow-sm"><i class="bi bi-check-circle-fill"></i> ผ่านแล้ว</button>`;
            } else if (isCurrentLocation) {
                actionButtons = `<button class="btn btn-sm btn-secondary rounded-pill mt-2 w-100 fw-bold disabled shadow-sm"><i class="bi bi-pin-map-fill"></i> จอดอยู่ที่นี่</button>`;
            } else {
                actionButtons = `<button class="btn btn-sm btn-danger rounded-pill mt-2 w-100 fw-bold shadow-sm"
                    onclick="handleCheckIn('${currentActiveTeam}', ${stop.id}, ${index}, ${isMergePoint ? 'true' : 'false'}, '${stop.name}')">
                    <i class="bi bi-pin-map-fill"></i> เช็คอินว่าถึงแล้ว!</button>`;
            }
        }

        const item = document.createElement('div');
        item.className = `timeline-item ${stop.type} ${isCheckedIn && !isCurrentLocation ? 'opacity-75' : ''}`;
        
        item.innerHTML = `
            <div class="timeline-dot ${pulseClass}" style="background-color: ${renderDotColor};"></div>
            <div class="timeline-time">${formattedTime} น.</div>
            <h6 class="timeline-title fw-bold">${stop.name} ${statusBadge}</h6>
            ${mergeInfo}
            
            <div class="mt-2 d-flex flex-wrap gap-2">
                <button class="btn btn-sm btn-outline-primary rounded-pill btn-flyto flex-fill" data-lat="${stop.lat}" data-lng="${stop.lng}" data-index="${index}">
                    <i class="bi bi-geo-alt"></i> แผนที่
                </button>
                <a href="${stop.gmapLink}" target="_blank" class="btn btn-sm btn-outline-success rounded-pill flex-fill">
                    <i class="bi bi-cursor"></i> นำทาง
                </a>
            </div>
            ${actionButtons}
        `;
        timelineContainer.appendChild(item);
    });

    if (mapBounds.length > 0) previewMap.fitBounds(mapBounds, { padding: [40, 40] });

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

// 3. จัดการ Events ต่างๆ
document.addEventListener('DOMContentLoaded', () => {
    // เซ็ต Interval ให้ Sync ข้อมูลทุกๆ 5 นาที (300,000 มิลลิวินาที)
    syncInterval = setInterval(window.syncDataFromServer, 300000);
    // ดึงครั้งแรกเมื่อโหลดเว็บเสร็จ
    window.syncDataFromServer(); 

    const btnBackTrips = document.getElementById('btn-back-trips');
    if (btnBackTrips) {
        btnBackTrips.addEventListener('click', () => {
            document.getElementById('page-trip-details').classList.add('d-none');
            document.getElementById('page-trips').classList.remove('d-none');
            const bottomNav = document.querySelector('.bottom-nav');
            if (bottomNav) bottomNav.classList.remove('d-none'); 
        });
    }

    const teamRadios = document.querySelectorAll('input[name="teamSelect"]');
    teamRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentActiveTeam = e.target.value; 
            const timeVal = document.getElementById('simulator-time').value;
            const modeInput = document.querySelector('input[name="timeMode"]:checked');
            window.calculateAndRenderTimeline(timeVal, modeInput ? modeInput.value : 'start');
        });
    });

    const btnCalculateTime = document.getElementById('btn-calculate-time');
    if (btnCalculateTime) {
        btnCalculateTime.addEventListener('click', () => {
            const timeVal = document.getElementById('simulator-time').value;
            const mode = document.querySelector('input[name="timeMode"]:checked').value;
            window.calculateAndRenderTimeline(timeVal, mode);
        });
    }

    const btnTimeNow = document.getElementById('btn-time-now');
    if (btnTimeNow) {
        btnTimeNow.addEventListener('click', () => {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            document.getElementById('simulator-time').value = timeStr;
            document.getElementById('mode-start').checked = true; 
            window.calculateAndRenderTimeline(timeStr, 'start');
            Swal.fire({ icon: 'success', title: 'อัปเดตเป็นเวลาปัจจุบัน', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        });
    }
});