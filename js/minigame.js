// --- ระบบ ศูนย์รวมมินิเกม (Hub) ---
const pageMiniGameHub = document.getElementById('page-minigame');
const subpageRoulette = document.getElementById('subpage-roulette');

// เปิดหน้าเกม
window.openMiniGame = function(gameId) {
    if (gameId === 'roulette') {
        document.getElementById('subpage-roulette').classList.remove('d-none');
        initDoubleRoulette(); 
    } else if (gameId === 'dice') {
        document.getElementById('subpage-dice').classList.remove('d-none');
    } else if (gameId === 'taptap') {
        document.getElementById('subpage-taptap').classList.remove('d-none');
        resetTapTap();
    } else if (gameId === 'bombcup') {
        document.getElementById('subpage-bombcup').classList.remove('d-none');
        initBombCup();
    } else if (gameId === 'kingscup') {
        document.getElementById('subpage-kingscup').classList.remove('d-none');
        document.getElementById('kingscup-result').classList.add('d-none');
    }
};

// ปิดหน้าเกม กลับไป Hub
window.closeMiniGame = function() {
    document.getElementById('subpage-roulette').classList.add('d-none');
    document.getElementById('subpage-dice').classList.add('d-none');
    document.getElementById('subpage-taptap').classList.add('d-none');
    document.getElementById('subpage-bombcup').classList.add('d-none');
    document.getElementById('subpage-kingscup').classList.add('d-none');
    if(taptapInterval) clearInterval(taptapInterval); // หยุดเวลาถ้ากดปิดกลางคัน
};

// --- ระบบ วงล้อคู่ (Double Roulette) ---
const canvas1 = document.getElementById("canvas-roulette-1");
const ctx1 = canvas1 ? canvas1.getContext("2d") : null;
const canvas2 = document.getElementById("canvas-roulette-2");
const ctx2 = canvas2 ? canvas2.getContext("2d") : null;

const btnSpinDouble = document.getElementById("btn-spin-double");
const btnUpdateDouble = document.getElementById("btn-update-double-wheel");
const optInput1 = document.getElementById("roulette-opt-1");
const optInput2 = document.getElementById("roulette-opt-2");

let options1 = [], options2 = [];
let startAngle1 = 0, startAngle2 = 0;
let spinTimeout = null;
let spinTime = 0, spinTimeTotal = 0;
let spinArcStart1 = 10, spinArcStart2 = 10;

const colors1 = ["#C0E1D2", "#F6F4E8", "#A8DADC", "#FDFFB6"]; // โทนเขียว-เหลือง
const colors2 = ["#DC9B9B", "#E5EEE4", "#FFD6A5", "#F1FAEE"]; // โทนชมพู-ส้ม

function initDoubleRoulette() {
    if (!optInput1 || !optInput2) return;
    options1 = optInput1.value.split('\n').map(l => l.trim()).filter(l => l !== '');
    options2 = optInput2.value.split('\n').map(l => l.trim()).filter(l => l !== '');
    drawWheel(ctx1, options1, colors1, startAngle1);
    drawWheel(ctx2, options2, colors2, startAngle2);
}

// ฟังก์ชันวาดวงล้อ (ฉบับแก้ไขความคมชัด และ องศาข้อความ)
function drawWheel(ctx, opts, colors, currentAngle) {
    if (!ctx) return;
    
    // เราตั้งค่า Canvas ไว้ที่ 300x300 จุดกึ่งกลางและรัศมีจึงเป็น 150
    const centerX = 150;
    const centerY = 150;
    const radius = 150;
    
    ctx.clearRect(0, 0, 300, 300);
    
    // สูตรคำนวณองศาของแต่ละช่อง (360 องศา / จำนวนตัวเลือก)
    let arc = (2 * Math.PI) / opts.length;
    
    for(let i = 0; i < opts.length; i++) {
        let angle = currentAngle + i * arc;
        ctx.fillStyle = colors[i % colors.length];
        
        // --- 1. วาดชิ้นส่วนวงล้อให้กลมเนียน ---
        ctx.beginPath();
        ctx.moveTo(centerX, centerY); // เริ่มจากจุดศูนย์กลาง
        ctx.arc(centerX, centerY, radius, angle, angle + arc, false); // ลากโค้งไปตามขอบ
        ctx.lineTo(centerX, centerY); // ลากเส้นตรงกลับมาจุดศูนย์กลาง
        ctx.fill();
        
        // --- 2. วาดตัวหนังสือให้เอียงพุ่งออกจากศูนย์กลาง ---
        ctx.save();
        ctx.translate(centerX, centerY); // ย้ายแกนอ้างอิงไปที่ศูนย์กลางวงล้อ
        ctx.rotate(angle + arc / 2); // หมุนแกนให้ตรงกับกึ่งกลางของช่องนั้นๆ
        
        ctx.fillStyle = "#333";
        ctx.font = 'bold 16px Prompt'; // ขนาดใหญ่ขึ้นเพราะ Canvas เป็น 300x300
        ctx.textAlign = "right"; // จัดข้อความชิดขวา
        ctx.textBaseline = "middle"; // ให้อยู่กึ่งกลางบรรทัด
        
        let text = opts[i];
        if(text.length > 12) text = text.substring(0,12) + '..'; // ตัดคำถ้ายาวไป
        
        // วาดข้อความโดยขยับไปทางขวาให้ชิดขอบวงล้อ (เว้นขอบนิดหน่อยที่ระยะ 135)
        ctx.fillText(text, 135, 0); 
        
        ctx.restore();
    }
}

function rotateWheels() {
    spinTime += 30;
    if(spinTime >= spinTimeTotal) {
        stopRotateWheels();
        return;
    }
    
    // วงล้อ 1 หมุนปกติ
    let spinAngle1 = spinArcStart1 - easeOut(spinTime, 0, spinArcStart1, spinTimeTotal);
    startAngle1 += (spinAngle1 * Math.PI / 180);
    
    // วงล้อ 2 หมุนสวนทางให้ดูมีมิติ
    let spinAngle2 = spinArcStart2 - easeOut(spinTime, 0, spinArcStart2, spinTimeTotal);
    startAngle2 -= (spinAngle2 * Math.PI / 180);
    
    drawWheel(ctx1, options1, colors1, startAngle1);
    drawWheel(ctx2, options2, colors2, startAngle2);
    
    spinTimeout = setTimeout(rotateWheels, 30);
}

function stopRotateWheels() {
    clearTimeout(spinTimeout);
    
    // ฟังก์ชันคำนวณหาผู้ชนะที่แม่นยำ 100% (รองรับทั้งหมุนตามเข็มและทวนเข็ม)
    function getWinningIndex(currentAngle, numOptions) {
        let arc = (2 * Math.PI) / numOptions;
        // ลูกศรชี้อยู่ด้านบนสุด ซึ่งในแกน Canvas คือ -90 องศา (-Math.PI / 2)
        let targetAngle = -Math.PI / 2 - currentAngle;
        
        // ปรับองศาให้เป็นค่าบวกเสมอ (อยู่ในกรอบ 0 ถึง 360 องศา)
        targetAngle = (targetAngle % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
        
        // หารด้วยขนาดของชิ้นส่วน เพื่อหาว่าตกที่ index ไหน
        return Math.floor(targetAngle / arc);
    }
    
    // ดึง index ที่ชนะของทั้ง 2 วงล้อ
    let index1 = getWinningIndex(startAngle1, options1.length);
    let index2 = getWinningIndex(startAngle2, options2.length);
    
    let result1 = options1[index1];
    let result2 = options2[index2];
    let gameTitle = document.getElementById("roulette-title").value;
    
    // เด้งประกาศผล 2 อย่างพร้อมกัน
    Swal.fire({
        title: gameTitle,
        html: `<h2 class="text-danger fw-bold my-3">${result1}</h2>
                <h4>ต้อง...</h4>
                <h2 class="text-primary fw-bold my-3">${result2}</h2>`,
        confirmButtonColor: '#DC9B9B',
        confirmButtonText: 'รับทราบ!',
        backdrop: `rgba(0,0,0,0.6)`
    });
    
    btnSpinDouble.disabled = false;
    btnSpinDouble.innerHTML = "หมุนอีกรอบ!";
}

// ฟังก์ชันคำนวณความหน่วง (Ease Out)
function easeOut(t, b, c, d) {
    let ts = (t/=d)*t;
    let tc = ts*t;
    return b+c*(tc + -3*ts + 3*t);
}

// กดปุ่มหมุน
if (btnSpinDouble) {
    btnSpinDouble.addEventListener("click", () => {
        if(options1.length < 2 || options2.length < 2) {
            Swal.fire('ข้อผิดพลาด', 'แต่ละฝั่งต้องมีตัวเลือกอย่างน้อย 2 ข้อนะ', 'warning');
            return;
        }
        btnSpinDouble.disabled = true;
        btnSpinDouble.innerHTML = "🌀";
        
        spinArcStart1 = Math.random() * 10 + 15;
        spinArcStart2 = Math.random() * 10 + 15;
        spinTime = 0;
        spinTimeTotal = Math.random() * 3000 + 6000;
        rotateWheels();
    });

    btnUpdateDouble.addEventListener("click", () => {
        initDoubleRoulette();
        Swal.fire({ icon: 'success', title: 'อัปเดตข้อมูลแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    });
}

// --- ระบบมินิเกม เต๋าสั่งลุย (Action Dice) ---
const btnRollDice = document.getElementById('btn-roll-dice');
const diceIcon = document.getElementById('dice-icon');
const diceDisplay = document.getElementById('dice-display');

if (btnRollDice) {
    btnRollDice.addEventListener('click', () => {
        btnRollDice.disabled = true;
        btnRollDice.innerHTML = "กำลังทอย... 🎲";
        
        // ใส่คลาสแอนิเมชันให้ลูกเต๋าหมุน
        diceDisplay.classList.add('rolling');
        
        let rolls = 0;
        // ให้หน้าลูกเต๋าเปลี่ยนรัวๆ ทุก 100 มิลลิวินาที
        let rollInterval = setInterval(() => {
            const randomFace = Math.floor(Math.random() * 6) + 1;
            diceIcon.className = `bi bi-dice-${randomFace}-fill`;
            diceIcon.style.color = "var(--color-4)";
            rolls++;
            
            // หยุดหมุนหลังจากเปลี่ยนหน้าไป 15 ครั้ง (ประมาณ 1.5 วินาที)
            if (rolls > 15) { 
                clearInterval(rollInterval);
                diceDisplay.classList.remove('rolling');
                
                // สุ่มแต้มสุดท้ายที่ได้จริงๆ
                const finalFace = Math.floor(Math.random() * 6) + 1;
                diceIcon.className = `bi bi-dice-${finalFace}-fill`;
                
                // ดึงคำสั่งจาก Input ที่ผู้ใช้ตั้งค่าไว้
                const ruleInput = document.querySelector(`.dice-rule[data-dice="${finalFace}"]`);
                const ruleText = ruleInput ? ruleInput.value : "ไม่มีคำสั่ง";
                
                // หน่วงเวลาแป๊บนึงก่อนเด้งผลลัพธ์ ให้ดูมีลุ้น
                setTimeout(() => {
                    Swal.fire({
                        title: `ได้แต้ม ${finalFace}!`,
                        html: `<h2 class="text-danger fw-bold my-3">${ruleText}</h2>`,
                        confirmButtonColor: '#DC9B9B',
                        confirmButtonText: 'จัดไป!',
                        backdrop: `rgba(0,0,0,0.6)`
                    });
                    btnRollDice.disabled = false;
                    btnRollDice.innerHTML = "ทอยเต๋า!";
                }, 400);
            }
        }, 100); 
    });
}

// ================= 3. สงครามรัวนิ้ว (Tap-Tap Battle) =================
const areaKKC = document.getElementById('tap-area-kkc');
const areaRYG = document.getElementById('tap-area-ryg');
const btnStartTap = document.getElementById('btn-start-taptap');
let kkcScore = 50, rygScore = 50;
let taptapTime = 10.0;
let taptapInterval = null;
let isTapping = false;

function resetTapTap() {
    kkcScore = 50; rygScore = 50;
    areaKKC.style.flexGrow = kkcScore;
    areaRYG.style.flexGrow = rygScore;
    document.getElementById('taptap-timer').innerText = "เวลา: 10.0s";
    document.getElementById('taptap-start-overlay').classList.remove('d-none');
    isTapping = false;
}

if(btnStartTap) {
    btnStartTap.addEventListener('click', () => {
        document.getElementById('taptap-start-overlay').classList.add('d-none');
        taptapTime = 10.0;
        isTapping = true;
        
        taptapInterval = setInterval(() => {
            taptapTime -= 0.1;
            document.getElementById('taptap-timer').innerText = `เวลา: ${taptapTime.toFixed(1)}s`;
            
            if(taptapTime <= 0) {
                clearInterval(taptapInterval);
                isTapping = false;
                document.getElementById('taptap-timer').innerText = "หมดเวลา!!";
                
                let winner = "";
                if(kkcScore > rygScore) winner = "🦖 ทีมขอนแก่น ชนะ!!";
                else if(rygScore > kkcScore) winner = "🌊 ทีมระยอง ชนะ!!";
                else winner = "เสมอ! (ยกหมดโต๊ะ!)";

                setTimeout(() => {
                    Swal.fire({ title: 'หมดเวลา!', text: winner, confirmButtonColor: '#DC9B9B', confirmButtonText: 'กลับไปล้างแค้น' })
                    .then(() => resetTapTap());
                }, 500);
            }
        }, 100);
    });

    // ฟังก์ชันสร้างคลื่นน้ำ (Ripple)
    function createRipple(event, container) {
        const circle = document.createElement('div');
        const diameter = Math.max(container.clientWidth, container.clientHeight);
        const radius = diameter / 2;

        // ดึงพิกัดนิ้ว (รองรับทั้งมือถือและเมาส์)
        let clientX = event.clientX || (event.touches ? event.touches[0].clientX : 0);
        let clientY = event.clientY || (event.touches ? event.touches[0].clientY : 0);

        const rect = container.getBoundingClientRect();
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${clientX - rect.left - radius}px`;
        circle.style.top = `${clientY - rect.top - radius}px`;
        circle.classList.add('ripple');

        container.appendChild(circle);

        // ลบ div คลื่นทิ้งเมื่อแสดงผลจบ (0.4 วิ) จะได้ไม่หนักเครื่อง
        setTimeout(() => {
            circle.remove();
        }, 400);
    }

    // จับการแตะหน้าจอ (Touch & Click)
    const tapEvent = (window.PointerEvent) ? 'pointerdown' : 'touchstart';
    
    areaKKC.classList.add('tap-area'); // ใส่ class ให้รองรับคลื่น
    areaRYG.classList.add('tap-area');
    
    areaKKC.addEventListener(tapEvent, (e) => {
        e.preventDefault(); 
        if(!isTapping) return;
        
        createRipple(e, areaKKC); // เรียกคลื่นน้ำ
        
        if(kkcScore < 95) { kkcScore++; rygScore--; }
        areaKKC.style.flexGrow = kkcScore; areaRYG.style.flexGrow = rygScore;
    });

    areaRYG.addEventListener(tapEvent, (e) => {
        e.preventDefault();
        if(!isTapping) return;
        
        createRipple(e, areaRYG); // เรียกคลื่นน้ำ
        
        if(rygScore < 95) { rygScore++; kkcScore--; }
        areaKKC.style.flexGrow = kkcScore; areaRYG.style.flexGrow = rygScore;
    });
}

// ================= 4. แก้วมรณะ (Bomb Cup) =================
let bombFoundCount = 0; // ตัวแปรนับจำนวนระเบิดที่ถูกเปิดเจอ

window.initBombCup = function() {
    const grid = document.getElementById('bombcup-grid');
    grid.innerHTML = '';
    bombFoundCount = 0; // รีเซ็ตตัวนับทุกครั้งที่เริ่มเกมใหม่
    
    // สร้างอาเรย์ 24 ใบ มีระเบิด 4 ลูก
    let cups = Array(20).fill('safe').concat(Array(4).fill('bomb'));
    cups = cups.sort(() => Math.random() - 0.5); // สลับตำแหน่ง

    cups.forEach((type, index) => {
        let cup = document.createElement('div');
        cup.className = 'bomb-cup glass-card';
        cup.innerHTML = '🍺'; 
        
        cup.addEventListener('click', function() {
            if(this.classList.contains('opened') || this.classList.contains('counting')) return;
            
            this.classList.add('counting');
            
            // เริ่มนับถอยหลังบนแก้ว 3 วิ
            let count = 3;
            this.innerHTML = count;
            this.style.backgroundColor = '#ffc107'; 
            this.style.color = '#fff';
            
            let countDownInterval = setInterval(() => {
                count--;
                if(count > 0) {
                    this.innerHTML = count;
                } else {
                    clearInterval(countDownInterval);
                    this.classList.remove('counting');
                    this.classList.add('opened');
                    
                    // แสดงผลเต็มจอ
                    showBombResult(type, this);
                }
            }, 1000);
        });
        grid.appendChild(cup);
    });
}

// ฟังก์ชันแสดงหน้าจอเฉลยแบบเต็มจอ
function showBombResult(type, cupElement) {
    const overlay = document.getElementById('bombcup-fullscreen');
    const icon = document.getElementById('bombcup-result-icon');
    const text = document.getElementById('bombcup-result-text');
    
    overlay.classList.remove('d-none'); // เปิดหน้าจอเฉลย
    icon.classList.remove('boom-animation');
    
    if (type === 'safe') {
        overlay.style.backgroundColor = '#28a745'; // สีเขียว
        icon.innerHTML = '✅';
        text.innerHTML = 'รอดตัวไป!';
        
        cupElement.classList.add('safe');
        cupElement.innerHTML = '✅';
        cupElement.style.backgroundColor = ''; 
    } else {
        bombFoundCount++; // 💥 เจอบอมบ์ เพิ่มจำนวนนับ
        
        overlay.style.backgroundColor = '#dc3545'; // สีแดง
        icon.innerHTML = '💥';
        text.innerHTML = 'ตูมมมม!! หมดแก้ว!';

        icon.classList.add('boom-animation');
        
        cupElement.classList.add('boom');
        cupElement.innerHTML = '💥';
        cupElement.style.backgroundColor = ''; 
    }
    
    // ตั้งเวลาปิดอัตโนมัติหลัง 3 วินาที
    let autoClose = setTimeout(() => {
        overlay.classList.add('d-none');
    }, 3000);
    
    // แตะหน้าจอเพื่อปิดก่อน 3 วิ
    overlay.onclick = function() {
        clearTimeout(autoClose);
        overlay.classList.add('d-none');
    };
}

// ================= 5. กษัตริย์สั่งลุย (King's Cup) =================
const kcRules = [
    { title: "น้ำตก (Waterfall)", desc: "เริ่มกินพร้อมกัน! คนแรกหยุด คนต่อไปถึงหยุดได้ วนไปจนจบวง" },
    { title: "คุณ (You)", desc: "ชี้หน้าใครก็ได้ 1 คน... ให้คนนั้นยกหมดแก้ว!" },
    { title: "ฉัน (Me)", desc: "ยินดีด้วย คนเปิดไพ่ใบนี้ ยกหมดแก้วด้วยตัวเอง!" },
    { title: "สาวๆ (Ladies)", desc: "ผู้หญิงทุกคนในวง ชนแก้วแล้วดื่ม!" },
    { title: "หนุ่มๆ (Men)", desc: "ผู้ชายทุกคนในวง ชนแก้วแล้วดื่ม!" },
    { title: "คู่หู (Mate)", desc: "เลือกคู่หู 1 คน ตั้งแต่นี้ไป ถ้าคุณโดนกิน คู่หูต้องกินด้วย!" },
    { title: "ชี้หน้า (Point)", desc: "นับ 1..2..3 ชี้หน้าคนอื่น ใครโดนชี้เยอะสุด โดน 1 ช็อต!" },
    { title: "หมวดหมู่ (Category)", desc: "ตั้งหมวดหมู่มา 1 อย่าง (เช่น ยี่ห้อรถ) วนตอบ ใครนึกไม่ออก กิน!" },
    { title: "กฎเหล็ก (Rule)", desc: "ตั้งกฎอะไรก็ได้ 1 ข้อ (เช่น ห้ามพูดคำหยาบ) ใครเผลอทำ โดนกิน!" }
];

const deck = document.getElementById('kingscup-deck');
if(deck) {
    deck.addEventListener('click', () => {
        deck.style.transform = "scale(0.9)";
        setTimeout(() => { deck.style.transform = "scale(1)"; }, 150);

        const randomRule = kcRules[Math.floor(Math.random() * kcRules.length)];
        
        const resultBox = document.getElementById('kingscup-result');
        resultBox.classList.add('d-none');
        
        setTimeout(() => {
            document.getElementById('kc-title').innerText = randomRule.title;
            document.getElementById('kc-desc').innerText = randomRule.desc;
            resultBox.classList.remove('d-none');
        }, 200); // ดีเลย์นิดนึงให้ดูมีจังหวะจั่ว
    });
}

// ================= ระบบภารกิจลับ (Buddy Game) =================

// อย่าลืมใส่ URL ของ Google Apps Script ของคุณที่นี่นะครับ!
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw3Ad2IF2oUhRXNA6kQj2iVjnORbslQ3N2PcMWMBH6-GpC4b-ZsAdBSv43pzSd9MIGtow/exec'; 

// 1. ฟังก์ชันเปิดหน้าเกมบัดดี้ (แบบดึงข้อมูลสดๆ Real-time)
window.openBuddyGame = function() {
    document.querySelectorAll('.page-section').forEach(page => page.classList.add('d-none'));
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.classList.add('d-none');
    
    document.getElementById('subpage-buddy').classList.remove('d-none');
    
    // โชว์ Tutorial ถ้าเพิ่งเข้าครั้งแรก
    if (!localStorage.getItem('buddyTutSkipped')) {
        showBuddyTutorial();
    }

    // 🌟 ดึงข้อมูลล่าสุดจาก Google Sheets ทุกครั้งที่เปิดหน้าเกม
    Swal.fire({title: 'กำลังเชื่อมต่อฐานข้อมูลลับ...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
    
    fetch(GAS_URL) 
    .then(response => response.json())
    .then(data => {
        Swal.close();
        // ส่งข้อมูลที่ได้ไปแสดงผลบนหน้าจอ
        renderBuddyState(data.buddyData, data.buddyRevealed, data.members);
    })
    .catch(error => {
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
        console.error(error);
    });
}

// 2. ฟังก์ชันโชว์ Pop-up สอนเล่น (Tutorial)
window.showBuddyTutorial = function(force = false) {
    Swal.fire({
        title: '🕵️ กติกาภารกิจลับ',
        html: `
            <div class="text-start small">
                <p>1. แอดมินจะเป็นคนกดสุ่มจับคู่ในตอนเช้า</p>
                <p>2. <b>แตะค้างที่การ์ด</b> เพื่อดูว่าคุณต้องไปทำภารกิจกับใคร (ห้ามให้ใครเห็น!)</p>
                <p>3. เนียนทำภารกิจให้สำเร็จ พร้อม <b>ถ่ายรูป/คลิปหลักฐาน</b> ไว้ในมือถือ</p>
                <p>4. กดปุ่ม 'ทำสำเร็จแล้ว' ในแอป (เก็บหลักฐานไว้งัดตอนดึก)</p>
                <p>5. <b>ทายผล</b> ว่าใครจับได้คุณ ส่งได้ครั้งเดียว ล็อกเป้าเลย!</p>
            </div>
            ${!force ? '<div class="form-check text-start mt-3"><input class="form-check-input" type="checkbox" id="skipBuddyTut"><label class="form-check-label text-muted small" for="skipBuddyTut">เข้าใจแล้ว ไม่ต้องแสดงอีก</label></div>' : ''}
        `,
        icon: 'info',
        confirmButtonColor: 'var(--color-4)',
        confirmButtonText: 'รับทราบ!',
        preConfirm: () => {
            const skip = document.getElementById('skipBuddyTut');
            if(skip && skip.checked) localStorage.setItem('buddyTutSkipped', 'true');
        }
    });
}

// 3. ฟังก์ชันควบคุมการเปลี่ยนหน้าจอเกม (3 สถานะ)
function renderBuddyState(buddyData, isRevealed, membersData) {
    const myName = localStorage.getItem('tripUserName') || '';
    
    // 1. จัดการสิทธิ์แอดมินโซน (แป๊ะ)
    if (myName === 'แป๊ะ') document.getElementById('buddy-admin-zone').classList.remove('d-none');
    else document.getElementById('buddy-admin-zone').classList.add('d-none');

    const sectionWaiting = document.getElementById('buddy-waiting');
    const sectionActive = document.getElementById('buddy-active');
    const sectionRevealed = document.getElementById('buddy-revealed');

    // ซ่อนทุกสถานะก่อน
    sectionWaiting.classList.add('d-none');
    sectionActive.classList.add('d-none');
    sectionRevealed.classList.add('d-none');

    // 🌟 สถานะ 1: แอดมินยังไม่ได้กดสุ่ม
    if (!buddyData || buddyData.length === 0) {
        sectionWaiting.classList.remove('d-none');
        return;
    }

    // หาข้อมูลของตัวเองที่ถูกจับคู่
    const myData = buddyData.find(b => b.player === myName);
    if(!myData) {
        sectionWaiting.classList.remove('d-none');
        sectionWaiting.innerHTML = '<h5 class="text-danger mt-4">คุณไม่ได้อยู่ในรายชื่อผู้เล่นทริปนี้!</h5>';
        return;
    }

    // 🌟 สถานะ 2: สุ่มแล้ว กำลังเล่นเกม!
    if (!isRevealed) {
        sectionActive.classList.remove('d-none');
        
        // หารูปของเป้าหมาย (บัดดี้) จากฐานข้อมูล
        const targetMember = membersData.find(m => m.name === myData.target);
        
        // อัปเดตข้อมูลบนการ์ดความลับ
        document.getElementById('buddy-target-name').innerText = myData.target;
        document.getElementById('buddy-mission-text').innerText = myData.mission;
        document.getElementById('buddy-target-img').src = targetMember ? targetMember.img : 'img/default.png';

        // จัดการปุ่ม "ทำสำเร็จแล้ว"
        const btnSuccess = document.getElementById('btn-buddy-success');
        if(myData.isSuccess) {
            btnSuccess.classList.replace('btn-success', 'btn-secondary');
            btnSuccess.innerHTML = '<i class="bi bi-check-all"></i> บันทึกแล้ว รองัดหลักฐานตอนดึก!';
            btnSuccess.disabled = true;
        } else {
            btnSuccess.classList.replace('btn-secondary', 'btn-success');
            btnSuccess.innerHTML = '<i class="bi bi-check-circle"></i> ทำภารกิจสำเร็จแล้ว!';
            btnSuccess.disabled = false;
        }

        // จัดการฟอร์มทายผล 
        const guessForm = document.getElementById('buddy-guess-form');
        const guessLocked = document.getElementById('buddy-guess-locked');
        
        if(myData.guessTarget !== "") { // ถ้าทายไปแล้ว
            guessForm.classList.add('d-none');
            guessLocked.classList.remove('d-none');
        } else { // ถ้ายังไม่ทาย
            guessForm.classList.remove('d-none');
            guessLocked.classList.add('d-none');
            
            // เติมรายชื่อเพื่อนลงใน Dropdown ให้เลือกทาย
            const guessWho = document.getElementById('guess-who');
            guessWho.innerHTML = '<option value="">-- เลือกคนที่น่าสงสัย --</option>';
            membersData.forEach(m => {
                if(m.name !== myName && m.isActive) {
                    guessWho.innerHTML += `<option value="${m.name}">${m.name}</option>`;
                }
            });
        }

        // เปิดระบบ "แตะค้างเพื่อส่อง (Hold to Reveal)"
        bindHoldToReveal();
    } 
    // 🌟 สถานะ 3: แอดมินกดเฉลยวงแตก!
    else {
        sectionRevealed.classList.remove('d-none');
        
        // หาว่าใครคือคนที่ล่าเรา (ใครมี target เป็นชื่อเรา)
        const hunter = buddyData.find(b => b.target === myName);
        
        if(hunter) {
            document.getElementById('reveal-hunter-name').innerText = hunter.player;
            document.getElementById('reveal-hunter-mission').innerText = hunter.mission;
            
            const resultIcon = document.getElementById('reveal-result-icon');
            const resultText = document.getElementById('reveal-result-text');
            const resultBox = document.getElementById('reveal-guess-result');
            
            // ตรวจสอบว่า "สิ่งที่เราทาย" ตรงกับ "คนที่ล่าเรา" ไหม?
            if(myData.guessTarget === hunter.player) {
                resultIcon.innerText = '✅';
                resultText.innerText = 'ทายถูก! เซ้นส์แรงมาก!';
                resultBox.className = 'p-3 rounded-3 text-white bg-success shadow-sm mt-3';
            } else {
                resultIcon.innerText = '❌';
                resultText.innerText = `ทายผิด! โดน ${hunter.player} หลอกเนียนสนิท!`;
                resultBox.className = 'p-3 rounded-3 text-white bg-danger shadow-sm mt-3';
            }
        }
    }
}

// 4. ฟังก์ชันแยกสำหรับทำปุ่มแตะค้าง
function bindHoldToReveal() {
    const holdCard = document.getElementById('hold-to-reveal-card');
    if(!holdCard) return;

    holdCard.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); return false; };
    const startReveal = (e) => { e.preventDefault(); holdCard.classList.add('is-revealing'); };
    const stopReveal = (e) => { e.preventDefault(); holdCard.classList.remove('is-revealing'); };

    holdCard.removeEventListener('mousedown', startReveal);
    holdCard.removeEventListener('mouseup', stopReveal);
    holdCard.removeEventListener('mouseleave', stopReveal);
    holdCard.removeEventListener('touchstart', startReveal);
    holdCard.removeEventListener('touchend', stopReveal);

    holdCard.addEventListener('mousedown', startReveal);
    holdCard.addEventListener('mouseup', stopReveal);
    holdCard.addEventListener('mouseleave', stopReveal); 
    holdCard.addEventListener('touchstart', startReveal, {passive: false});
    holdCard.addEventListener('touchend', stopReveal);
}

// -----------------------------------------------------
// ฟังก์ชันเรียก API (ส่งไปที่ Google Apps Script)
// -----------------------------------------------------

window.adminShuffleBuddy = function() {
    Swal.fire({
        title: 'เริ่มเกมใหม่?', text: 'การกดสุ่มจะล้างข้อมูลเก่าทั้งหมดและจับคู่ใหม่ทันที ยืนยันไหมแอดมินแป๊ะ?',
        icon: 'warning', showCancelButton: true, confirmButtonText: 'ลุยเลย!'
    }).then((res) => {
        if(res.isConfirmed) {
            Swal.fire({title: 'กำลังสุ่ม...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
            fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'shuffleBuddy' }) })
            .then(() => { 
                Swal.fire('สุ่มเสร็จแล้ว!', 'ลูกทัวร์ทุกคนสามารถดูเป้าหมายได้แล้ว', 'success')
                .then(() => openBuddyGame()); // รีโหลดหน้าจอใหม่
            });
        }
    });
}

window.adminRevealBuddy = function() {
    Swal.fire({
        title: 'เฉลยวงแตก! 🚨', text: 'ถ้ากดยืนยัน หน้าจอของทุกคนจะเปิดเผยผลลัพธ์ทันที!',
        icon: 'error', showCancelButton: true, confirmButtonText: 'เฉลยเลย!'
    }).then((res) => {
        if(res.isConfirmed) {
            Swal.fire({title: 'กำลังส่งสัญญาณ...', didOpen: () => Swal.showLoading()});
            fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'revealBuddy' }) })
            .then(() => { 
                Swal.fire('เฉลยแล้ว!', 'ดูรีแอคชั่นเพื่อนๆ ได้เลย 555', 'success')
                .then(() => openBuddyGame()); // รีโหลดหน้าจอใหม่
            });
        }
    });
}

window.markBuddySuccess = function() {
    Swal.fire({
        title: 'สำเร็จแล้วจริงดิ?', text: 'แน่ใจนะว่าทำเนียนๆ และมีหลักฐานถ่ายไว้ในมือถือแล้ว?',
        icon: 'question', showCancelButton: true, confirmButtonText: 'มีหลักฐานพร้อม!'
    }).then((res) => {
        if(res.isConfirmed) {
            Swal.fire({title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
            const myName = localStorage.getItem('tripUserName');
            fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'updateBuddySuccess', playerName: myName }) })
            .then(() => {
                document.getElementById('btn-buddy-success').classList.replace('btn-success', 'btn-secondary');
                document.getElementById('btn-buddy-success').innerHTML = '<i class="bi bi-check-all"></i> บันทึกแล้ว รองัดหลักฐานตอนดึก!';
                document.getElementById('btn-buddy-success').disabled = true;
                Swal.fire('ยอดเยี่ยม!', 'รอรับแรงกระแทกตอนเฉลยได้เลย', 'success');
            });
        }
    });
}

window.submitBuddyGuess = function() {
    const who = document.getElementById('guess-who').value;
    const what = document.getElementById('guess-what').value;
    
    if(!who || !what) { Swal.fire('เดี๋ยวก่อน!', 'กรอกให้ครบทั้งชื่อและภารกิจสิวัยรุ่น', 'warning'); return; }

    Swal.fire({
        title: 'ล็อกคำตอบนะ?', text: `คุณทายว่า "${who}" มาทำ "${what}" ส่งแล้วแก้ไม่ได้แล้วนะ!`,
        icon: 'warning', showCancelButton: true, confirmButtonText: 'มั่นใจ! ล็อกเลย'
    }).then((res) => {
        if(res.isConfirmed) {
            Swal.fire({title: 'กำลังล็อกเป้าหมาย...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
            const myName = localStorage.getItem('tripUserName');
            fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'submitBuddyGuess', playerName: myName, guessTarget: who, guessMission: what }) })
            .then(() => {
                document.getElementById('buddy-guess-form').classList.add('d-none');
                document.getElementById('buddy-guess-locked').classList.remove('d-none');
                Swal.fire('ล็อกเป้าแล้ว!', 'รอแอดมินเฉลยตอนดึก', 'success');
            });
        }
    });
}

// ฟังก์ชันล้างกระดานเกมบัดดี้ (กลับไปหน้าจอแม่กุญแจ)
window.adminResetBuddy = function() {
    Swal.fire({
        title: 'ล้างข้อมูลเกม?', 
        text: 'จะล้างบัดดี้ ภารกิจ และการทายผลทั้งหมด กลับไปสู่สถานะยังไม่เริ่มเกม (เอาไว้เทส)',
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonText: 'ล้างเลย!'
    }).then((res) => {
        if(res.isConfirmed) {
            Swal.fire({title: 'กำลังล้างข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
            fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'resetBuddyGame' }) })
            .then(() => { 
                Swal.fire('รีเซ็ตสำเร็จ!', 'กลับสู่สถานะยังไม่เริ่มเกมแล้ว', 'success')
                .then(() => openBuddyGame()); // รีโหลดหน้าจอใหม่ให้กลับเป็นรูปแม่กุญแจ
            });
        }
    });
}