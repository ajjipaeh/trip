// ข้อมูลทริปจำลอง คุณสามารถมาเพิ่ม/แก้ตรงนี้ได้ในอนาคต
const tripsData = [
    {
        id: 1,
        title: "ทริปพัทยา",
        date: "10-12 สิงหาคม 2569",
        location: "พัทยา, ชลบุรี",
        image: "https://images.unsplash.com/photo-1596525164222-385501bf00d7?auto=format&fit=crop&w=600&q=80", 
        status: "past", // ผ่านไปแล้ว
    },
    {
        id: 2,
        title: "พูลวิลล่า เขาใหญ่",
        date: "7 พฤศจิกายน 2569",
        location: "เขาใหญ่",
        image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80",
        status: "upcoming",
        // ข้อมูลเส้นทางที่ปรับใหม่ มีพิกัดและลิงก์ Google Maps
        route: [
            { 
                id: 1, 
                name: "รับทรายที่บ้าน + ซื้อเบียร์ที่ร้านพายุ (รถแป๊ะ)", 
                type: "start", 
                durationMinutes: 0, // จุดเริ่มต้น
                lat: 16.0594, lng: 102.7297, // พิกัดคร่าวๆ บ้านไผ่
                gmapLink: "https://maps.app.goo.gl/..." // ใส่ลิงก์จริงได้เลย
            },
            { 
                id: 2, 
                name: "ออกจากบ้านไผ่ + แวะรับหญิงที่โนนศิลา (รถป๊อป)", 
                type: "stop", 
                durationMinutes: 30, // จาก 07:30 ไป 08:00 ใช้เวลา 30 นาที
                lat: 15.9750, lng: 102.6711, // พิกัดโนนศิลา
                gmapLink: "https://maps.app.goo.gl/..." 
            },
            { 
                id: 3, 
                name: "แวะซื้อของสดที่แม็คโครปากช่อง", 
                type: "stop", 
                durationMinutes: 210, // จาก 08:00 ไป 11:30 ใช้เวลา 3.5 ชม. (210 นาที)
                lat: 14.6865, lng: 101.4063, // พิกัดแม็คโครปากช่อง
                gmapLink: "https://maps.app.goo.gl/..." 
            },
            { 
                id: 4, 
                name: "แวะคาเฟ่ (สตาร์ดอย หรือ ฮารุโดท)", 
                type: "stop", 
                durationMinutes: 50, // จาก 11:30 ไป 12:20
                lat: 14.5379, lng: 101.4005,
                gmapLink: "https://maps.app.goo.gl/..." 
            },
            { 
                id: 5, 
                name: "เช็คอินบ้านพัก", 
                type: "end", 
                durationMinutes: 100, // จาก 12:20 ไป 14:00
                lat: 14.5000, lng: 101.4000, // พิกัดที่พัก
                gmapLink: "https://maps.app.goo.gl/..." 
            }
        ]
    },
    {
        id: 3,
        title: "เกาะสีชัง",
        date: "9-11 มกราคม 2570",
        location: "ชลบุรี",
        image: "https://i0.wp.com/widsawa.com/wp-content/uploads/2019/02/img_2645.jpg?fit=720%2C479&ssl=1",  
        status: "future", // อนาคต
    },
    {
        id: 4,
        title: "ตะลุยหิมะ ญี่ปุ่น",
        date: "10-15 กุมภาพันธ์ 2570",
        location: "ฮอกไกโด, ญี่ปุ่น",
        image: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=600&q=80", 
        status: "future", // อนาคต
    }
];

// ข้อมูลเช็คลิสต์แยกตามหมวดหมู่ทริป
const packingData = {
    "sea": {
        name: "เที่ยวทะเล 🏖️",
        items: ["ครีมกันแดด", "แว่นตากันแดด", "ชุดว่ายน้ำ", "หมวกปีกกว้าง", "รองเท้าแตะ", "ผ้าเช็ดตัว", "ซองกันน้ำมือถือ", "เสื้อคลุมบางๆ"]
    },
    "mountain": {
        name: "ลุยป่า/แคมป์ ⛺",
        items: ["รองเท้าผ้าใบ/ปีนเขา", "เสื้อกันหนาว", "ยากันยุง", "ไฟฉาย", "พาวเวอร์แบงค์", "กระติกน้ำ", "หมวกแก็ป", "ยาสามัญ"]
    },
    "poolvilla": {
        name: "พูลวิลล่า 🦩",
        items: ["ชุดว่ายน้ำ", "พร็อพถ่ายรูป/ห่วงยาง", "เครื่องดื่ม/ของว่าง", "ลำโพงบลูทูธ", "ครีมบำรุงผิว", "ชุดนอนปาร์ตี้", "บอร์ดเกม"]
    }
};