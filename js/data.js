// ข้อมูลทริปจำลอง คุณสามารถมาเพิ่ม/แก้ตรงนี้ได้ในอนาคต
const tripsData = [
    {
        id: 1,
        title: "ทริปหัวหิน",
        date: "21-24 กรกฏาคม 2569",
        location: "ประจวบคีรีขันธ์",
        image: "https://images.unsplash.com/photo-1596525164222-385501bf00d7?auto=format&fit=crop&w=600&q=80", 
        status: "past", // ผ่านไปแล้ว
    },
    {
        id: 2,
        title: "ทริปพัทยา",
        date: "10-12 สิงหาคม 2569",
        location: "พัทยา, ชลบุรี",
        image: "https://images.unsplash.com/photo-1596525164222-385501bf00d7?auto=format&fit=crop&w=600&q=80", 
        status: "past", // ผ่านไปแล้ว
    },
    {
        id: 3,
        title: "พูลวิลล่า เขาใหญ่",
        date: "7 พฤศจิกายน 2569",
        location: "เขาใหญ่",
        image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80",
        status: "upcoming",
        // โครงสร้างเส้นทางแบบแบ่งทีม
        routes: {
            teamKKC: {
                id: "teamKKC",
                name: "ทีมขอนแก่น 🦖",
                theme: "pink", // ใช้สีชมพูตุ่น
                members: ["มายด์", "ซีแพค", "ป๊อปอาย", "ไทเกอร์", "ลีโอ", "หญิง", "ทราย", "พายุ"],
                gmapLink: "https://maps.app.goo.gl/GPD8kcRoCKNAAWD16?g_st=ic",
                path: [
                    { id: 1, name: "รับทรายที่บ้าน + ซื้อเบียร์ร้านพายุ", type: "start", durationMinutes: 0, lat: 16.056453374435712, lng:  102.72641009074128, gmapLink: "https://maps.app.goo.gl/Y3JJLqtDVHX1Df9GA" },
                    { id: 2, name: "แวะรับหญิงที่โนนศิลา", type: "stop", durationMinutes: 20, lat: 15.96474185282544, lng: 102.69165938650796, gmapLink: "https://maps.app.goo.gl/t9AQvJ4ypudx434h7" },
                    { id: 3, name: "แวะปั๊มแรก ปตท.พี โอ ออยล์ สาขาคง", type: "stop", durationMinutes: 80, lat: 15.319918, lng: 102.434115, gmapLink: "https://maps.app.goo.gl/MJbG99ZXbjJHKZbr6" },
                    { id: 4, name: "แวะปั๊มสอง ปตท.ปากช่องไฮเวย์ PTT", type: "stop", durationMinutes: 200, lat: 14.666410038015002, lng: 101.43362817670122, gmapLink: "https://maps.app.goo.gl/hd5WhcNvK3bUq5nw8" },
                    { id: 5, name: "แม็คโคร ฟู้ดเซอร์วิส ปากช่อง", type: "stop", isMergePoint: true, durationMinutes: 10, lat: 14.649498281735688, lng: 101.40860424071239, gmapLink: "https://maps.app.goo.gl/fgYNysHgUzoAyqSC9" },
                    { id: 6, name: "สตาร์ดอยฟาร์ม เขาใหญ่", type: "stop", durationMinutes: 60, lat: 14.54631659774482, lng: 101.44430391327381, gmapLink: "https://maps.app.goo.gl/DxTp2XQFdmWeJkxR8" },
                    { id: 7, name: "ฮารุโดท เขาใหญ่", type: "stop", durationMinutes: 40, lat: 14.531163182762413, lng: 101.52129128383615, gmapLink: "https://maps.app.goo.gl/7WLGXCa6Le2SsJB77" },
                    { id: 8, name: "เช็คอินบ้านพัก Verona", type: "end", durationMinutes: 30, lat: 14.53411601033038, lng: 101.49329343778123, gmapLink: "https://maps.app.goo.gl/oS4QUVV9L1thdApJ6" }
                ]
            },
            teamRYG: {
                id: "teamRYG",
                name: "ทีมระยอง 🌊",
                theme: "mint", // ใช้สีเขียวมินต์
                members: ["ตอง", "แฟนตอง", "อาร์", "แฟนอาร์", "ออมสิน", "บิ๊ก"],
                gmapLink: "https://maps.app.goo.gl/...",
                path: [
                    // จำลองจุดแวะทีมระยองไปก่อน
                    { id: 1, name: "จุดนัดพบ ปตท.ชลบุรีสันติสุข", type: "start", durationMinutes: 0, lat: 13.394958002682014, lng: 101.00882462909475, gmapLink: "https://maps.app.goo.gl/qZF4MJZrzT4kjiUJ7" },
                    { id: 2, name: "แวะรับออมสิน ไอทีสแคว์หลักสี่", type: "stop", durationMinutes: 130, lat: 13.5283, lng: 101.0000, gmapLink: "https://maps.app.goo.gl/XWqrnUDGmBvG7tkL7" },
                    { id: 3, name: "ปตท.สระบุรี แวะอีกแล้ว เขียนไปก่อนอิอิ", type: "stop", durationMinutes: 150, lat: 14.553783576329455, lng: 100.96621460282084, gmapLink: "https://maps.app.goo.gl/mJMP53HXRjMSfUANA" },
                    { id: 4, name: "แม็คโคร ฟู้ดเซอร์วิส ปากช่อง", type: "stop", isMergePoint: true, durationMinutes: 50, lat: 14.649498281735688, lng: 101.40860424071239, gmapLink: "https://maps.app.goo.gl/fgYNysHgUzoAyqSC9" },
                    { id: 5, name: "สตาร์ดอยฟาร์ม เขาใหญ่", type: "stop", durationMinutes: 60, lat: 14.54631659774482, lng: 101.44430391327381, gmapLink: "https://maps.app.goo.gl/DxTp2XQFdmWeJkxR8" },
                    { id: 6, name: "ฮารุโดท เขาใหญ่", type: "stop", durationMinutes: 40, lat: 14.531163182762413, lng: 101.52129128383615, gmapLink: "https://maps.app.goo.gl/7WLGXCa6Le2SsJB77" },
                    { id: 7, name: "เช็คอินบ้านพัก Verona", type: "end", durationMinutes: 30, lat: 14.53411601033038, lng: 101.49329343778123, gmapLink: "https://maps.app.goo.gl/oS4QUVV9L1thdApJ6" }
                ]
            }
        }
    },
    {
        id: 4,
        title: "เกาะสีชัง",
        date: "9-11 มกราคม 2570",
        location: "ชลบุรี",
        image: "https://i0.wp.com/widsawa.com/wp-content/uploads/2019/02/img_2645.jpg?fit=720%2C479&ssl=1",  
        status: "future", // อนาคต
    },
    {
        id: 5,
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