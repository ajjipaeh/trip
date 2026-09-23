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

    // จับการแตะหน้าจอ (Touch & Click)
    const tapEvent = (window.PointerEvent) ? 'pointerdown' : 'touchstart';
    
    areaKKC.addEventListener(tapEvent, (e) => {
        e.preventDefault(); // กันจอกระตุกบนมือถือ
        if(!isTapping) return;
        if(kkcScore < 95) { kkcScore++; rygScore--; }
        areaKKC.style.flexGrow = kkcScore; areaRYG.style.flexGrow = rygScore;
    });

    areaRYG.addEventListener(tapEvent, (e) => {
        e.preventDefault();
        if(!isTapping) return;
        if(rygScore < 95) { rygScore++; kkcScore--; }
        areaKKC.style.flexGrow = kkcScore; areaRYG.style.flexGrow = rygScore;
    });
}

// ================= 4. แก้วมรณะ (Bomb Cup) =================
window.initBombCup = function() {
    const grid = document.getElementById('bombcup-grid');
    grid.innerHTML = '';
    
    // สร้างอาเรย์ 14 ใบ มีระเบิด 2 ลูก (เปลี่ยนจำนวนระเบิดตรงนี้ได้)
    let cups = Array(12).fill('safe').concat(Array(2).fill('bomb'));
    cups = cups.sort(() => Math.random() - 0.5); // สลับตำแหน่ง

    cups.forEach((type, index) => {
        let cup = document.createElement('div');
        cup.className = 'bomb-cup glass-card';
        cup.innerHTML = '🍺'; // รูปก่อนเปิด
        
        cup.addEventListener('click', function() {
            if(type === 'safe') {
                this.classList.add('safe');
                this.innerHTML = '✅';
            } else {
                this.classList.add('boom');
                this.innerHTML = '💥';
                Swal.fire({ title: 'ตูมมมม!! 💣', text: 'หมดแก้วไปเลยเพื่อน!', confirmButtonColor: '#dc3545', backdrop: `rgba(220,53,69,0.4)` });
                // หงายไพ่ที่เหลือทั้งหมด
                document.querySelectorAll('.bomb-cup').forEach(c => c.style.pointerEvents = 'none');
            }
        });
        grid.appendChild(cup);
    });
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