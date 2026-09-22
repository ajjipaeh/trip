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
    }
};

// ปิดหน้าเกม กลับไป Hub
window.closeMiniGame = function() {
    document.getElementById('subpage-roulette').classList.add('d-none');
    document.getElementById('subpage-dice').classList.add('d-none');
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

// ฟังก์ชันวาดวงล้อ (ใช้ซ้ำได้กับทั้ง 2 วง) ขนาดรัศมี 75px (ครึ่งนึงของ 150)
function drawWheel(ctx, opts, colors, currentAngle) {
    if (!ctx) return;
    ctx.clearRect(0, 0, 150, 150);
    let arc = Math.PI / (opts.length / 2);
    
    for(let i = 0; i < opts.length; i++) {
        let angle = currentAngle + i * arc;
        ctx.fillStyle = colors[i % colors.length];
        
        ctx.beginPath();
        ctx.arc(75, 75, 75, angle, angle + arc, false);
        ctx.arc(75, 75, 0, angle + arc, angle, true);
        ctx.fill();
        
        ctx.save();
        ctx.fillStyle = "#333";
        // ย้ายจุดหมุนไปวาดตัวหนังสือ
        ctx.translate(75 + Math.cos(angle + arc / 2) * 50, 
                        75 + Math.sin(angle + arc / 2) * 50);
        ctx.rotate(angle + arc / 2 + Math.PI / 2);
        let text = opts[i];
        ctx.font = 'bold 12px Prompt';
        if(text.length > 8) text = text.substring(0,8) + '..'; // ตัดคำถ้าเกิน
        ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
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
        btnSpinDouble.innerHTML = "กำลังลุ้น... 🌀";
        
        spinArcStart1 = Math.random() * 10 + 15;
        spinArcStart2 = Math.random() * 10 + 15;
        spinTime = 0;
        spinTimeTotal = Math.random() * 2000 + 4000; // 4-6 วินาที
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