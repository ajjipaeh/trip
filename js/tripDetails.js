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
    const tripId = localStorage.getItem('currentTripId');
    if (!tripId) return Promise.resolve();

    return fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getTripData', tripId: tripId }),
        redirect: 'follow'
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === 'success') {
            const data = res.data;
            // อัปเดตลง localStorage ของเครื่อง
            if(data.tripCheckins) localStorage.setItem('tripCheckins', JSON.stringify(data.tripCheckins));
            if(data.tripMergeDecisions) localStorage.setItem('tripMergeDecisions', JSON.stringify(data.tripMergeDecisions));
            if(data.tripDynamicMerges) localStorage.setItem('tripDynamicMerges', JSON.stringify(data.tripDynamicMerges));
            
            // 🌟 นำข้อมูลที่พักไปวาดบนหน้าจอ
            if(typeof renderAccommodation === 'function') {
                renderAccommodation(data.accommodation, data.members);
            }

            // 🌟 เก็บรายชื่อสมาชิกและทีมไว้ใช้ แล้ววาดปุ่มสลับทีม
            window.currentTripMembers = data.members || [];
            window.currentTripTeams = data.teams || [];
            if(typeof renderTeamTabs === 'function') {
                renderTeamTabs(window.currentTripTeams, window.currentTripMembers);
            }

            // 🌟 [ระบบใหม่] ปั้นข้อมูลดิบ ให้กลายเป็น Object Routes สไตล์ดั้งเดิม 🌟
            if (!currentActiveTrip) currentActiveTrip = {};
            currentActiveTrip.routes = {};
            
            // 1. สร้างก้อนโครงสร้างเปล่าๆ ให้ทุกทีมกัน Error
            let displayTeams = window.currentTripTeams.length > 0 ? window.currentTripTeams : [{ teamId: 'teamGlobal' }];
            displayTeams.forEach(t => {
                currentActiveTrip.routes[t.teamId] = { path: [], theme: 'mint' }; 
            });

            // 2. เอาจุดแวะพักมายัดใส่ path ของแต่ละทีม
            let rawItineraries = data.itineraries || [];
            rawItineraries.forEach(stop => {
                if (currentActiveTrip.routes[stop.teamId]) {
                    currentActiveTrip.routes[stop.teamId].path.push({
                        id: stop.stopId,
                        name: stop.stopName,
                        lat: parseFloat(stop.lat),
                        lng: parseFloat(stop.lng),
                        durationMinutes: parseInt(stop.travelMins || 0) + parseInt(stop.activityMins || 0),
                        rawTravel: parseInt(stop.travelMins || 0),
                        rawActivity: parseInt(stop.activityMins || 0),
                        type: "stop",
                        isMergePoint: false,
                        gmapLink: `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`
                    });
                }
            });

            // 🌟 3. บังคับอัปเดตสิทธิ์และวาดแผนที่+Timeline ทันที! (แก้ปัญหาต้องรอกดปุ่มคำนวณ)
            if (typeof window.changeActiveTeam === 'function') {
                window.changeActiveTeam(currentActiveTeam);
            }
        }
    }).catch(err => console.error("Sync error:", err));
};

// ================= ฟังก์ชันบันทึกลง API =================
function sendPostToAPI(payload) {
    const tripId = localStorage.getItem('currentTripId');
    if (!tripId) return;
    
    payload.tripId = tripId; // 🌟 แนบ Trip_ID ไปด้วยเสมอ

    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        redirect: 'follow' // 🌟 ใช้ redirect follow เพื่อเลี่ยง CORS
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
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    const myName = currentUser.name || '';

    const resetZone = document.getElementById('admin-reset-zone');
    if(resetZone) {
        if(myName === 'แป๊ะ') resetZone.classList.remove('d-none');
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
            sendPostToAPI({ action: 'resetAll', tripId: currentTripId });
            
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
                            sendPostToAPI({ action: 'addDynamicMerge', stopName: nextStopName, tripId: currentTripId });
                        }
                    }
                }
                
                // บันทึกการตัดสินใจ
                mergeData[stopName] = { by: team, decision: decision, nextStop: nextStopName };
                localStorage.setItem('tripMergeDecisions', JSON.stringify(mergeData));
                
                // ส่งการตัดสินใจลง API
                sendPostToAPI({ action: 'addMergeDecision', stopName: stopName, by: team, decision: decision, nextStop: nextStopName, tripId: currentTripId });
                
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
        sendPostToAPI({ action: 'addCheckins', data: newCheckins, tripId: currentTripId });
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
    
    // 🌟 1. ดักจับและสร้างแผนที่ตรงนี้เลย! (แก้บั๊ก Error previewMap เป็น null)
    if (!previewMap) {
        const mapEl = document.getElementById('preview-map');
        if (mapEl) {
            previewMap = L.map('preview-map', { zoomControl: false }).setView([13.7563, 100.5018], 6);
            const MAPTILER_API_KEY = 'RToNZ0OGFkEo4MhCW5NS'; 
            L.tileLayer(`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`, {
                attribution: '&copy; MapTiler &copy; OSM'
            }).addTo(previewMap);
            
            // หน่วงเวลาให้กรอบแผนที่กางออกจนเสร็จก่อน แล้วค่อยเรนเดอร์ภาพแผนที่
            setTimeout(() => { previewMap.invalidateSize(); }, 500);
        }
    }

    // ล้างหมุดเก่าออกก่อนวาดใหม่ (กันหมุดซ้อนกัน)
    if (previewMap) {
        mapMarkers.forEach(marker => previewMap.removeLayer(marker));
    }
    mapMarkers = [];
    let mapBounds = [];

    // 🌟 2. ดักป้องกันกรณีทริปนี้ยังไม่ได้เพิ่มจุดแวะพักเลย
    if(!currentActiveTrip || !currentActiveTrip.routes || !currentActiveTrip.routes[currentActiveTeam]) {
        return; // ให้หยุดแค่นี้ แผนที่จะได้ไม่พัง
    }

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
                    onclick="handleCheckIn('${currentActiveTeam}', '${stop.id}', ${index}, ${isMergePoint ? 'true' : 'false'}, '${stop.name}')">
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

// =========================================================
// 🏠 ระบบจัดการที่พัก (Accommodation Widget)
// =========================================================

let currentAccData = null; // เก็บข้อมูลที่พักปัจจุบันไว้ใช้ตอนกดแก้ไข

function renderAccommodation(accData, membersList) {
    currentAccData = accData;
    const contentDiv = document.getElementById('acc-content');
    const editBtn = document.getElementById('btn-edit-acc');
    
    // เช็คสิทธิ์การโชว์ปุ่มแก้ไข (เป็น SuperAdmin หรือเป็น Admin ของทริปนี้)
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    let isTripAdmin = false;
    if (currentUser.role === 'SuperAdmin') isTripAdmin = true;
    if (membersList) {
        let myMemberData = membersList.find(m => m.userId === currentUser.userId);
        if (myMemberData && myMemberData.role === 'Admin') isTripAdmin = true;
    }
    
    if (isTripAdmin && editBtn) {
        editBtn.classList.remove('d-none');
        editBtn.classList.add('d-flex');
    }

    if (!accData) {
        contentDiv.innerHTML = `
            <div class="text-center my-3">
                <i class="bi bi-house-add text-muted" style="font-size: 2.5rem;"></i>
                <p class="text-muted small mt-2 mb-0">ยังไม่มีข้อมูลที่พักสำหรับทริปนี้</p>
                ${isTripAdmin ? '<small class="text-primary">กดปุ่มดินสอมุมขวาบนเพื่อเพิ่มข้อมูล</small>' : ''}
            </div>
        `;
        return;
    }

    // จัดฟอร์แมตวันที่และเวลา
    const formatDateTime = (isoString) => {
        if (!isoString) return '-';
        const d = new Date(isoString);
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' เวลา ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    };

    let imgHtml = accData.imgUrl ? `
        <div class="mb-3 rounded-4 overflow-hidden shadow-sm" style="height: 120px;">
            <img src="${accData.imgUrl}" class="w-100 h-100" style="object-fit: cover;">
        </div>
    ` : '';

    let detailsHtml = accData.details ? `<div class="mt-2 p-2 bg-white rounded-3 small text-muted border"><i class="bi bi-info-circle"></i> ${accData.details.replace(/\n/g, '<br>')}</div>` : '';

    contentDiv.innerHTML = `
        ${imgHtml}
        <h6 class="fw-bold text-dark mb-2">${accData.name}</h6>
        <div class="row g-2 small">
            <div class="col-6">
                <div class="p-2 rounded-3" style="background: rgba(40, 167, 69, 0.1);">
                    <strong class="text-success d-block"><i class="bi bi-box-arrow-in-right"></i> Check-in</strong>
                    <span class="text-dark">${formatDateTime(accData.checkIn)}</span>
                </div>
            </div>
            <div class="col-6">
                <div class="p-2 rounded-3" style="background: rgba(220, 53, 69, 0.1);">
                    <strong class="text-danger d-block"><i class="bi bi-box-arrow-right"></i> Check-out</strong>
                    <span class="text-dark">${formatDateTime(accData.checkOut)}</span>
                </div>
            </div>
        </div>
        ${detailsHtml}
    `;
}

// ✏️ ฟังก์ชันเมื่อกดปุ่มแก้ไข
window.openEditAccModal = function() {
    let nameVal = currentAccData ? currentAccData.name : '';
    let imgVal = currentAccData ? currentAccData.imgUrl : '';
    let detailsVal = currentAccData ? currentAccData.details : '';
    
    // แปลงเวลาให้กลับไปอยู่ในฟอร์แมต YYYY-MM-DDTHH:mm เพื่อใส่ใน <input type="datetime-local">
    const toLocalISO = (isoString) => {
        if(!isoString) return '';
        let d = new Date(isoString);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };
    
    let inVal = currentAccData ? toLocalISO(currentAccData.checkIn) : '';
    let outVal = currentAccData ? toLocalISO(currentAccData.checkOut) : '';

    let html = `
        <div class="text-start" style="font-size: 0.9rem;">
            <div class="mb-2">
                <label class="fw-bold">ชื่อที่พัก <span class="text-danger">*</span></label>
                <input type="text" id="acc-name" class="form-control" placeholder="เช่น Pool Villa เขาใหญ่" value="${nameVal}">
            </div>
            <div class="mb-2">
                <label class="fw-bold">URL รูปภาพ</label>
                <input type="text" id="acc-img" class="form-control" placeholder="https://..." value="${imgVal}">
            </div>
            <div class="row mb-2">
                <div class="col-6">
                    <label class="fw-bold text-success">เวลา Check-in</label>
                    <input type="datetime-local" id="acc-in" class="form-control" value="${inVal}">
                </div>
                <div class="col-6">
                    <label class="fw-bold text-danger">เวลา Check-out</label>
                    <input type="datetime-local" id="acc-out" class="form-control" value="${outVal}">
                </div>
            </div>
            <div class="mb-2">
                <label class="fw-bold">รายละเอียด / กฎระเบียบ</label>
                <textarea id="acc-details" class="form-control" rows="3" placeholder="เช่น มีเตาปิ้งย่าง, ค่าประกันบ้าน 2000 บาท">${detailsVal}</textarea>
            </div>
        </div>
    `;

    Swal.fire({
        title: '🏠 จัดการข้อมูลที่พัก',
        html: html,
        showCancelButton: true,
        confirmButtonText: 'บันทึกข้อมูล',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            let name = document.getElementById('acc-name').value.trim();
            if(!name) {
                Swal.showValidationMessage('กรุณาระบุชื่อที่พักครับ');
                return false;
            }
            return {
                name: name,
                imgUrl: document.getElementById('acc-img').value.trim(),
                checkIn: document.getElementById('acc-in').value,
                checkOut: document.getElementById('acc-out').value,
                details: document.getElementById('acc-details').value.trim()
            };
        }
    }).then((result) => {
        if(result.isConfirmed) {
            saveAccommodation(result.value);
        }
    });
};

function saveAccommodation(data) {
    const tripId = localStorage.getItem('currentTripId');
    if (!tripId) return;

    Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    data.action = 'updateAccommodation';
    data.tripId = tripId;

    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(data),
        redirect: 'follow'
    }).then(res => res.json())
      .then(res => {
          if(res.status === 'success') {
              Swal.fire('สำเร็จ!', 'อัปเดตข้อมูลที่พักเรียบร้อย', 'success').then(() => {
                  window.syncDataFromServer(); // โหลดข้อมูลใหม่มาระบายสี
              });
          } else {
              Swal.fire('Error', res.message, 'error');
          }
      }).catch(e => {
          Swal.fire('Error', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
      });
}

// =========================================================
// 👥 ระบบจัดการทีม (Team Manager & Dynamic Tabs)
// =========================================================

window.renderTeamTabs = function(teams, members) {
    const container = document.getElementById('dynamic-team-tabs');
    const btnManage = document.getElementById('btn-manage-teams');
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    
    // เช็คสิทธิ์ Admin
    let isTripAdmin = currentUser.role === 'SuperAdmin' || (members.find(m => m.userId === currentUser.userId)?.role === 'Admin');
    if (isTripAdmin && btnManage) {
        btnManage.classList.remove('d-none');
    }

    // ถ้าไม่มีทีมถูกสร้างไว้เลย ให้บังคับสร้าง "ทีมรวม"
    let displayTeams = teams.length > 0 ? teams : [{
        teamId: 'teamGlobal',
        teamName: 'All',
        members: members.map(m => m.userId)
    }];

    if (!displayTeams.find(t => t.teamId === currentActiveTeam)) {
        currentActiveTeam = displayTeams[0].teamId;
    }

    // 🌟 1. สร้างโครงสร้าง HTML ให้เป๊ะเหมือนของเดิม
    let html = '';
    displayTeams.forEach((t) => {
        let checked = (currentActiveTeam === t.teamId) ? 'checked' : '';
        html += `
            <input type="radio" name="teamSelect" id="tab-${t.teamId}" value="${t.teamId}" ${checked}>
            <label for="tab-${t.teamId}" class="segment-label">${t.teamName}</label>
        `;
    });
    // โยนไฮไลท์ไว้ท้ายสุดเหมือนต้นฉบับ
    html += `<div class="segment-highlight" id="team-highlight-box"></div>`;
    
    container.innerHTML = html;
    
    // 🌟 2. คำนวณความกว้างและผูก Event เพื่อให้แถบดุ๊กดิ๊กเลื่อนตาม 100%
    const radioInputs = container.querySelectorAll('input[type="radio"]');
    const highlightBox = document.getElementById('team-highlight-box');
    
    // คำนวณให้แถบขาวมันยืดพอดีกับจำนวนปุ่ม (เช่น มี 3 ทีม แถบขาวต้องกว้าง 33.33%)
    let percentWidth = 100 / displayTeams.length;
    if(highlightBox) highlightBox.style.width = `${percentWidth}%`;

    // ผูก Event การเลื่อน
    radioInputs.forEach((radio, index) => {
        // เมื่อมีการคลิกเปลี่ยนวิทยุ
        radio.addEventListener('change', (e) => {
            // เลื่อนแถบขาวไปตามช่อง (1 ช่อง = ความกว้างของมันเอง)
            if(highlightBox) highlightBox.style.transform = `translateX(${index * 100}%)`;
            
            // เรียกใช้สคริปต์สลับแผนที่หลังบ้านที่เราทำไว้
            if(typeof window.changeActiveTeam === 'function') {
                window.changeActiveTeam(e.target.value);
            }
        });

        // จัดตำแหน่งเริ่มต้น (ตอนโหลดหน้าครั้งแรก ให้มันวิ่งไปหาทีมที่ตั้งไว้)
        if (radio.checked && highlightBox) {
            highlightBox.style.transform = `translateX(${index * 100}%)`;
        }
    });

    // กำหนดให้ myTeam (ทีมของเรา)
    let myFoundTeam = displayTeams.find(t => t.members.includes(currentUser.userId));
    myTeam = myFoundTeam ? myFoundTeam.teamId : displayTeams[0].teamId;
}

// 🌟 ฟังก์ชันสลับทีมและสั่งวาดแผนที่ทันทีแบบเบ็ดเสร็จ (ใช้ทั้งตอนโหลดหน้าเว็บและตอนสลับแท็บ)
window.changeActiveTeam = function(teamId) {
    currentActiveTeam = teamId;
    
    // บังคับให้ปุ่ม Radio สลับหน้าตา UI แถบสีแดงตามทีมที่กดทันที
    const radio = document.getElementById(`tab-${teamId}`);
    if (radio) radio.checked = true;

    // 1. เช็คสิทธิ์แสดงปุ่ม "จัดการเส้นทาง" ของทีมนี้
    if (typeof window.checkRouteButtonVisibility === 'function') {
        window.checkRouteButtonVisibility();
    }

    // 2. ดึงเวลาจากช่อง Simulator (ถ้าไม่มีให้ใช้ 06:00 เป็นค่าเริ่มต้น)
    const timeInput = document.getElementById('simulator-time');
    let timeVal = '06:00';
    if (timeInput && timeInput.value) timeVal = timeInput.value;
    
    const modeInput = document.querySelector('input[name="timeMode"]:checked');
    let mode = modeInput ? modeInput.value : 'start';
    
    // 3. สั่งวาดแผนที่และ Timeline ทันที!
    if (typeof window.calculateAndRenderTimeline === 'function') {
        window.calculateAndRenderTimeline(timeVal, mode);
    }
}

// ⚙️ ฟังก์ชันเมื่อกดปุ่มจัดการทีม
window.openManageTeamsModal = function() {
    // โคลนตัวแปรไว้แก้ไข จะได้ไม่กระทบของจริงจนกว่าจะกดเซฟ
    let editingTeams = JSON.parse(JSON.stringify(window.currentTripTeams));
    let membersList = window.currentTripMembers || [];

    function renderFormHTML() {
        let html = `<div class="text-start" style="font-size: 0.9rem;">`;
        
        if(editingTeams.length === 0) {
            html += `<div class="alert alert-info small"><i class="bi bi-info-circle"></i> ตอนนี้ทุกคนเดินทางรวมกันใน "ทีมรวม" (ยังไม่มีการแบ่งกลุ่ม)</div>`;
        }

        editingTeams.forEach((team, tIndex) => {
            let membersHtml = membersList.map(m => {
                let isChecked = team.members.includes(m.userId) ? 'checked' : '';
                let btnClass = isChecked ? 'btn-primary' : 'btn-outline-primary';
                return `
                    <label class="btn ${btnClass} btn-sm m-1 rounded-pill" style="cursor:pointer;" onclick="toggleTeamMember(${tIndex}, '${m.userId}')">
                        <i class="bi bi-person"></i> ${m.name}
                    </label>
                `;
            }).join('');

            html += `
                <div class="card mb-3 border shadow-sm">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center p-2">
                        <input type="text" class="form-control form-control-sm fw-bold border-0 bg-transparent px-1" 
                               value="${team.teamName}" onchange="updateTeamName(${tIndex}, this.value)" placeholder="ชื่อทีม (เช่น ทีมขอนแก่น)">
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="removeTeam(${tIndex})"><i class="bi bi-trash3-fill"></i></button>
                    </div>
                    <div class="card-body p-2">
                        <small class="text-muted d-block mb-1 fw-bold">สมาชิกในทีมนี้:</small>
                        <div class="d-flex flex-wrap">${membersHtml}</div>
                    </div>
                </div>
            `;
        });

        html += `
            <button class="btn btn-outline-success w-100 rounded-pill border-dashed mt-2" onclick="addNewTeam()">
                <i class="bi bi-plus-circle"></i> เพิ่มกลุ่มใหม่
            </button>
        </div>`;
        return html;
    }

    // ฟังก์ชันลูก สำหรับจัดการ State ใน Modal
    window.toggleTeamMember = function(tIndex, uId) {
        let idx = editingTeams[tIndex].members.indexOf(uId);
        if (idx > -1) editingTeams[tIndex].members.splice(idx, 1);
        else editingTeams[tIndex].members.push(uId);
        document.getElementById('manage-teams-content').innerHTML = renderFormHTML();
    }
    window.updateTeamName = function(tIndex, newName) {
        editingTeams[tIndex].teamName = newName;
    }
    window.removeTeam = function(tIndex) {
        editingTeams.splice(tIndex, 1);
        document.getElementById('manage-teams-content').innerHTML = renderFormHTML();
    }
    window.addNewTeam = function() {
        let newId = 'TM' + new Date().getTime(); // สุ่ม ID ให้ทีมใหม่
        editingTeams.push({ teamId: newId, teamName: 'ทีมใหม่', members: [] });
        document.getElementById('manage-teams-content').innerHTML = renderFormHTML();
    }

    Swal.fire({
        title: '👥 จัดการกลุ่มเดินทาง',
        html: `<div id="manage-teams-content">${renderFormHTML()}</div>`,
        showCancelButton: true,
        confirmButtonText: 'บันทึกการจัดทีม',
        cancelButtonText: 'ยกเลิก',
        width: '500px',
        preConfirm: () => {
            // Validate
            for(let t of editingTeams) {
                if(!t.teamName.trim()) {
                    Swal.showValidationMessage('กรุณาตั้งชื่อทีมให้ครบทุกทีมครับ');
                    return false;
                }
            }
            return editingTeams;
        }
    }).then((result) => {
        if(result.isConfirmed) {
            saveTripTeams(result.value);
        }
    });
}

function saveTripTeams(newTeams) {
    const tripId = localStorage.getItem('currentTripId');
    if (!tripId) return;

    Swal.fire({ title: 'กำลังบันทึกกลุ่มเดินทาง...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateTripTeams', tripId: tripId, teams: newTeams }),
        redirect: 'follow'
    }).then(res => res.json())
      .then(res => {
          if(res.status === 'success') {
              Swal.fire('สำเร็จ!', 'แบ่งทีมเรียบร้อยแล้ว', 'success').then(() => {
                  window.syncDataFromServer(); // ดึงข้อมูลใหม่มาอัปเดตหน้าจอ
              });
          } else {
              Swal.fire('Error', res.message, 'error');
          }
      }).catch(e => Swal.fire('Error', 'เชื่อมต่อขัดข้อง', 'error'));
}

// =========================================================
// 📍 ระบบจัดการเส้นทางและแผนที่ (Dynamic Itinerary Builder)
// =========================================================

// ฟังก์ชันเช็คว่าใครมีสิทธิ์เพิ่มจุดแวะพักบ้าง (คนในทีมตัวเอง หรือ แอดมิน)
window.checkRouteButtonVisibility = function() {
    const btnManage = document.getElementById('btn-manage-route');
    if (!btnManage) return;
    
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    let isTripAdmin = currentUser.role === 'SuperAdmin' || (window.currentTripMembers && window.currentTripMembers.find(m => m.userId === currentUser.userId)?.role === 'Admin');
    
    // ถ้าเป็นแอดมิน หรือ ถ้าแท็บที่เปิดอยู่คือทีมของตัวเอง ให้แสดงปุ่ม
    if (isTripAdmin || currentActiveTeam === myTeam) {
        btnManage.classList.remove('d-none');
    } else {
        btnManage.classList.add('d-none');
    }
}

// ผูกฟังก์ชันนี้เข้าไปที่ปุ่มสลับทีมด้วย เพื่อให้ซ่อน/โชว์ปุ่มแบบ Realtime
document.addEventListener('DOMContentLoaded', () => {
    // ต้องรอให้ dynamic-team-tabs ถูกสร้างเสร็จก่อน เราเลยใช้ Event Delegation
    document.getElementById('dynamic-team-tabs').addEventListener('change', function(e) {
        if(e.target.name === 'teamSelect') {
            checkRouteButtonVisibility();
        }
    });
});

// ✏️ เปิดหน้าต่างสร้างเส้นทาง
window.openManageRouteModal = function() {
    // ดึงเส้นทางของทีมที่กำลังเปิดอยู่มาแก้ไข
    let currentPath = currentActiveTrip.routes[currentActiveTeam] ? currentActiveTrip.routes[currentActiveTeam].path : [];
    let editingStops = JSON.parse(JSON.stringify(currentPath));

    function renderStopsHTML() {
        let html = `<div class="text-start" style="font-size: 0.9rem;">`;
        if(editingStops.length === 0) {
            html += `<div class="alert alert-warning small text-center">ยังไม่มีจุดแวะพัก กดเพิ่มด้านล่างเลยครับ!</div>`;
        }
        
        editingStops.forEach((s, index) => {
            html += `
                <div class="card mb-3 border shadow-sm">
                    <div class="card-header bg-danger text-white p-2 d-flex justify-content-between align-items-center">
                        <span class="fw-bold"><i class="bi bi-pin-map-fill"></i> จุดที่ ${index + 1}</span>
                        <button class="btn btn-sm btn-light text-danger py-0 px-2" onclick="removeStop(${index})"><i class="bi bi-trash"></i></button>
                    </div>
                    <div class="card-body p-2 bg-light">
                        <input type="text" class="form-control form-control-sm mb-2 fw-bold text-primary" placeholder="ชื่อสถานที่ (เช่น ปั๊ม ปตท.)" value="${s.name || ''}" onchange="updateStop(${index}, 'name', this.value)">
                        
                        <!-- 🌟 โซนพิกัดแผนที่ -->
                        <div class="d-flex justify-content-between align-items-center mb-1 mt-3">
                            <small class="text-muted fw-bold">พิกัดแผนที่ (Lat, Lng)</small>
                            <button id="btn-gps-${index}" class="btn btn-sm btn-outline-primary py-0 px-2 rounded-pill shadow-sm" onclick="getCurrentLocation(${index})" style="font-size: 0.75rem;">
                                <i class="bi bi-geo-alt-fill"></i> ดึงพิกัดปัจจุบัน
                            </button>
                        </div>

                        <!-- 🌟 โซนระยะเวลา -->
                        <div class="row g-2 mt-3 border-top pt-2">
                            <div class="col-6">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <label class="text-muted mb-0" style="font-size:0.7rem;">เดินทางมาจุดนี้ (นาที)</label>
                                    ${index > 0 ? `<button id="btn-calc-time-${index}" class="btn btn-sm btn-outline-success py-0 px-2 rounded-pill shadow-sm" onclick="calcTimeFromPrevCheckin(${index})" style="font-size: 0.65rem;" title="คำนวณจากเวลาเช็คอินจุดที่แล้ว"><i class="bi bi-stopwatch"></i> วัดเวลา</button>` : ''}
                                </div>
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text bg-white"><i class="bi bi-car-front-fill"></i></span>
                                    <input type="number" id="travel-input-${index}" class="form-control fw-bold text-success" value="${s.rawTravel || 0}" onchange="updateStop(${index}, 'rawTravel', this.value)">
                                </div>
                            </div>
                            <div class="col-6">
                                <label class="text-muted mb-1 d-block" style="font-size:0.7rem;">เวลาทำกิจกรรม (นาที)</label>
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text bg-white"><i class="bi bi-camera-fill"></i></span>
                                    <input type="number" class="form-control" value="${s.rawActivity || 0}" onchange="updateStop(${index}, 'rawActivity', this.value)">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            <button class="btn btn-outline-danger w-100 rounded-pill border-dashed mt-2 fw-bold shadow-sm" onclick="addNewStop()">
                <i class="bi bi-plus-circle"></i> เพิ่มจุดแวะพักใหม่
            </button>
        </div>`;
        return html;
    }

    // --- ฟังก์ชันลูกสำหรับจัดการข้อมูลในหน้าต่างนี้ ---
    window.updateStop = function(index, field, value) {
        editingStops[index][field] = value;
    }
    
    window.removeStop = function(index) {
        editingStops.splice(index, 1);
        document.getElementById('manage-routes-content').innerHTML = renderStopsHTML();
    }
    
    window.addNewStop = function() {
        let newId = 'S' + new Date().getTime(); 
        editingStops.push({ id: newId, name: '', lat: '', lng: '', rawTravel: 0, rawActivity: 0 });
        document.getElementById('manage-routes-content').innerHTML = renderStopsHTML();
    }

    // 📍 ฟังก์ชันดึงพิกัด GPS ปัจจุบัน (แบบปลอดภัย 100% ไม่กวนหน้าต่างหลัก)
    window.getCurrentLocation = function(index) {
        if (navigator.geolocation) {
            let btn = document.getElementById(`btn-gps-${index}`);
            let originalHtml = '';
            
            // 1. เปลี่ยนปุ่มเป็นสถานะกำลังโหลด
            if (btn) {
                originalHtml = btn.innerHTML;
                btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> รอพิกัด...`;
                btn.disabled = true;
                btn.classList.remove('btn-outline-primary');
                btn.classList.add('btn-outline-secondary');
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    let lat = position.coords.latitude;
                    let lng = position.coords.longitude;
                    
                    // 2. บันทึกค่าลงตัวแปร
                    editingStops[index].lat = lat;
                    editingStops[index].lng = lng;
                    
                    // 3. หยอดค่าใส่ช่อง Input บนหน้าจอโดยตรง
                    let latInput = document.getElementById(`lat-input-${index}`);
                    let lngInput = document.getElementById(`lng-input-${index}`);
                    if (latInput) {
                        latInput.value = lat;
                        // กระตุ้นให้ input รู้ว่ามีการเปลี่ยนค่า เพื่อให้ onchange ทำงาน (เผื่อไว้)
                        latInput.dispatchEvent(new Event('change'));
                    }
                    if (lngInput) {
                        lngInput.value = lng;
                        lngInput.dispatchEvent(new Event('change'));
                    }
                    
                    // 4. เปลี่ยนปุ่มเป็นสีเขียวเพื่อบอกว่า "สำเร็จ!"
                    if (btn) {
                        btn.innerHTML = `<i class="bi bi-check-circle-fill"></i> สำเร็จ!`;
                        btn.classList.remove('btn-outline-secondary', 'btn-outline-danger');
                        btn.classList.add('btn-success', 'text-white');
                        
                        // คืนสภาพปุ่มกลับมาเหมือนเดิมหลังผ่านไป 2 วินาที
                        setTimeout(() => {
                            btn.innerHTML = originalHtml;
                            btn.classList.remove('btn-success', 'text-white');
                            btn.classList.add('btn-outline-primary');
                            btn.disabled = false;
                        }, 2000);
                    }
                },
                (error) => {
                    // ถ้าดึงไม่ได้ ให้ปุ่มเป็นสีแดงแป๊บนึง
                    if (btn) {
                        btn.innerHTML = `<i class="bi bi-x-circle-fill"></i> เปิด GPS ก่อนนะ`;
                        btn.classList.remove('btn-outline-secondary');
                        btn.classList.add('btn-outline-danger');
                        
                        setTimeout(() => {
                            btn.innerHTML = originalHtml;
                            btn.classList.remove('btn-outline-danger');
                            btn.classList.add('btn-outline-primary');
                            btn.disabled = false;
                        }, 3000);
                    }
                }, 
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            // ถ้าระบบไม่รองรับ
            let btn = document.getElementById(`btn-gps-${index}`);
            if(btn) {
                btn.innerHTML = `<i class="bi bi-x-circle-fill"></i> ไม่รองรับ GPS`;
                btn.classList.replace('btn-outline-primary', 'btn-outline-danger');
            }
        }
    };

    // ⏱️ ฟังก์ชันคำนวณเวลาจากจุดเช็คอินก่อนหน้า (แบบปลอดภัย ไม่กวนฟอร์มหลัก)
    window.calcTimeFromPrevCheckin = function(index) {
        if (index === 0) return; 
        
        let btn = document.getElementById(`btn-calc-time-${index}`);
        let originalHtml = btn ? btn.innerHTML : '';
        let originalClass = btn ? btn.className : '';
        
        // ฟังก์ชันตัวช่วยสำหรับเปลี่ยนหน้าตาปุ่มชั่วคราวแล้วเด้งกลับ
        const showBtnMessage = (msg, colorClass, delay = 2500) => {
            if (btn) {
                btn.innerHTML = msg;
                btn.className = `btn btn-sm ${colorClass} text-white py-0 px-2 rounded-pill shadow-sm`;
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.className = originalClass;
                }, delay);
            }
        };

        let prevStopId = editingStops[index - 1].id;
        let checkinsStr = localStorage.getItem('tripCheckins');
        
        // กรณีไม่มีประวัติใดๆ ในเครื่อง
        if (!checkinsStr) {
            showBtnMessage('<i class="bi bi-exclamation-triangle-fill"></i> ไม่มีประวัติเช็คอิน', 'btn-warning');
            return;
        }
        
        let checkins = JSON.parse(checkinsStr);
        let checkinKey = currentActiveTeam + '_' + prevStopId; 
        let prevCheckin = checkins[checkinKey];

        // กรณีจุดที่แล้ว ยังไม่เคยกดเช็คอิน
        if (!prevCheckin || !prevCheckin.timestamp) {
            showBtnMessage('<i class="bi bi-exclamation-triangle-fill"></i> จุดที่แล้วยังไม่เช็คอิน!', 'btn-warning');
            return;
        }

        // 🌟 ดึงเวลาอดีต มาเทียบกับเวลาปัจจุบัน
        let prevTime = new Date(prevCheckin.timestamp);
        let currentTime = new Date();
        let diffMs = currentTime - prevTime; 
        let diffMins = Math.floor(diffMs / 60000); 
        
        if (diffMins < 0) diffMins = 0; 

        // บันทึกและหยอดใส่กล่อง
        editingStops[index].rawTravel = diffMins;
        let travelInput = document.getElementById(`travel-input-${index}`);
        
        if (travelInput) {
            travelInput.value = diffMins;
            // กระตุ้นให้ onchange ทำงาน
            travelInput.dispatchEvent(new Event('change'));
        }
        
        // โชว์ปุ่มสีเขียวว่าสำเร็จ!
        showBtnMessage(`<i class="bi bi-check-circle-fill"></i> ได้ ${diffMins} นาที`, 'btn-success', 2000);
    };

    // --- ส่วนแสดง Modal ---
    let teamNameDisplay = document.querySelector(`label[for="tab-${currentActiveTeam}"]`).innerText;

    Swal.fire({
        title: `📍 จัดการเส้นทาง <br><small class="text-primary">${teamNameDisplay}</small>`,
        html: `<div id="manage-routes-content">${renderStopsHTML()}</div>`,
        showCancelButton: true,
        confirmButtonText: 'บันทึกเส้นทาง',
        cancelButtonText: 'ยกเลิก',
        width: '500px',
        preConfirm: () => {
            let formattedStops = editingStops.map(s => {
                if (!s.name.trim()) Swal.showValidationMessage('กรุณากรอกชื่อสถานที่ให้ครบครับ');
                if (!s.lat || !s.lng) Swal.showValidationMessage('กรุณากรอกพิกัด Lat, Lng ให้ครบครับ');
                return {
                    stopId: s.id,
                    stopName: s.name,
                    lat: s.lat,
                    lng: s.lng,
                    travelMins: s.rawTravel,
                    activityMins: s.rawActivity
                };
            });
            return formattedStops;
        }
    }).then((result) => {
        if(result.isConfirmed) saveTripRoute(result.value);
    });
}

function saveTripRoute(stopsData) {
    const tripId = localStorage.getItem('currentTripId');
    if (!tripId) return;

    Swal.fire({ title: 'กำลังบันทึกเส้นทาง...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ 
            action: 'updateItineraryTeam', 
            tripId: tripId, 
            teamId: currentActiveTeam, 
            stops: stopsData 
        }),
        redirect: 'follow'
    }).then(res => res.json())
      .then(res => {
          if(res.status === 'success') {
              Swal.fire('สำเร็จ!', 'อัปเดตเส้นทางและพิกัดเรียบร้อย', 'success').then(() => {
                  window.syncDataFromServer(); // ดึงข้อมูลกลับมาคำนวณและวาดแผนที่ทันที!
              });
          } else {
              Swal.fire('Error', res.message, 'error');
          }
      }).catch(e => Swal.fire('Error', 'เชื่อมต่อขัดข้อง', 'error'));
}