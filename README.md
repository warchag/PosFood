# 🍽️ Siam Culinary POS & Floor Plan Management System
### ระบบคิดเงินร้านอาหาร จัดการเมนู และผังโต๊ะอาหารแบบ Top View Real-time เชื่อมต่อฐานข้อมูล PostgreSQL

ระบบบริหารจัดการร้านอาหารแบบครบวงจร (Full-Stack Restaurant POS & Floor Plan Management) พัฒนาด้วยเทคโนโลยีทันสมัย รองรับการใช้งานผ่านคอมพิวเตอร์ แท็บเล็ต และ iPad แบบเรียลไทม์ผ่าน WebSocket พร้อมระบบจัดการฐานข้อมูลระดับองค์กรด้วย **PostgreSQL**

---

## 📑 สารบัญ (Table of Contents)
1. [จุดเด่นและฟังก์ชันหลัก (Key Features)](#-จุดเด่นและฟังก์ชันหลัก-key-features)
2. [สถาปัตยกรรมระบบ (System Architecture)](#-สถาปัตยกรรมระบบ-system-architecture)
3. [โครงสร้างฐานข้อมูล PostgreSQL (Database Schema)](#-โครงสร้างฐานข้อมูล-postgresql-database-schema)
4. [รายละเอียดฟังก์ชันการทำงาน (Feature Breakdown)](#-รายละเอียดฟังก์ชันการทำงาน-feature-breakdown)
   - [4.1 ผังโต๊ะอาหาร Top View 2D & ระบบโซน](#41-ผังโต๊ะอาหาร-top-view-2d--ระบบโซน-interactive-floor-plan)
   - [4.2 ระบบจัดการเมนูและหมวดหมู่](#42-ระบบจัดการเมนูและหมวดหมู่อาหาร-menu--category-management)
   - [4.3 ระบบสั่งอาหารและส่งเข้าครัว](#43-ระบบสั่งอาหารและส่งเข้าครัว-ordering--cart)
   - [4.4 หน้าจอคิวครัว Real-time (KDS)](#44-หน้าจอคิวครัว-real-time-kitchen-display-system)
   - [4.5 ระบบคิดเงินและใบเสร็จ](#45-ระบบคิดเงินและใบเสร็จ-billing--checkout)
   - [4.6 รายงานยอดขายประจำวัน](#46-รายงานสรุปยอดขายประจำวัน-daily-sales-analytics)
   - [4.7 ระบบจัดการการจองโต๊ะอาหาร](#47-ระบบจัดการการจองโต๊ะอาหาร-table-reservation-management)
   - [4.8 ระบบสั่งอาหารผ่าน QR Code ในมือถือลูกค้า](#48-ระบบสั่งอาหารผ่าน-qr-code-ในมือถือลูกค้า-customer-mobile-qr-ordering)
   - [4.9 ระบบจัดการพนักงานและสิทธิ์การเข้าใช้งาน](#49-ระบบจัดการพนักงานและสิทธิ์การเข้าใช้งาน-staff--role-management)
5. [รายการ API Endpoints](#-รายการ-api-endpoints)
6. [วิธีติดตั้งและเริ่มใช้งาน (Getting Started)](#-วิธีติดตั้งและเริ่มใช้งาน-getting-started)
   - [รันในเครื่อง (Local Development)](#61-รันในเครื่อง-local-development)
   - [รันผ่าน Docker Compose](#62-รันผ่าน-docker-compose)
7. [แผนพัฒนาต่อยอดในอนาคต (Recommended Future Roadmap)](#-แผนพัฒนาต่อยอดในอนาคต-recommended-future-roadmap)

---

## 🌟 จุดเด่นและฟังก์ชันหลัก (Key Features)

- 🗺️ **ผังโต๊ะอาหาร 2D Top View**: แสดงรูปทรงโต๊ะตามจริง (สี่เหลี่ยม, โต๊ะกลม, ซุ้มโซฟา, บาร์นั่งเดี่ยว) พร้อมเก้าอี้รอบโต๊ะ
- 📍 **ระบบโซนอาหารแบบแยกส่วน**: เลือกดูผังแยกทีละโซนชัดเจน พร้อมสถิติประเภทโต๊ะและจำนวนโต๊ะในแต่ละโซน
- 🖱️ **ลากจัดผังร้านได้อิสระ (Drag & Drop Floor Plan Editor)**: ปรับตำแหน่งโต๊ะบนหน้าจอ แล้วกดบันทึกพิกัดลงฐานข้อมูล PostgreSQL ทันที
- 🟢 **ไฟสถานะโต๊ะแบบ Real-time**: สีเขียว (ว่าง), สีแดง (มีลูกค้า), สีส้ม (สั่งอาหาร/รอครัว), สีม่วง (รอเช็คบิล), สีฟ้า (จอง)
- 📅 **ระบบจัดการการจองโต๊ะ (Table Reservation Management)**: บันทึกการจองล่วงหน้า แสดงคิวจองวันนี้/พรุ่งนี้ ล็อคโต๊ะบนผังอัตโนมัติ และเช็คอินเข้าโต๊ะในคลิกเดียว
- 📱 **สั่งอาหารผ่านมือถือลูกค้า (Customer Mobile QR Ordering)**: ลูกค้าสแกน QR Code ประจำโต๊ะเพื่อดูเมนูและกดสั่งเอง พร้อมระบบความปลอดภัย **4-Digit Session PIN** ป้องกันคนนอกสั่งมั่ว
- 🔔 **ระบบเรียกพนักงานพร้อมเสียงแจ้งเตือน (Staff Call & Sound Alerts)**: ลูกค้ากดปุ่มเรียกพนักงานจากมือถือ มีเสียงเตือนและแถบแจ้งเตือน Real-time บนหน้าจอแคชเชียร์
- 🔐 **ระบบพนักงานและสิทธิ์การเข้าใช้งาน (PIN Authentication)**: ล็อกอินด้วยรหัส PIN 4 หลัก แยกสิทธิ์ Admin, Cashier, Waiter อย่างชัดเจน
- 🔁 **ระบบย้ายโต๊ะ (Transfer Table)**: ย้ายลูกค้าและรายการอาหารที่สั่งทั้งหมดไปยังโต๊ะว่างอื่นได้ในคลิกเดียว
- 🍲 **ระบบจัดการเมนูและหมวดหมู่เต็มรูปแบบ (Full CRUD)**: เพิ่ม/แก้ไข/ลบเมนูและหมวดหมู่ พร้อมคลังภาพอาหารความละเอียดสูงสำเร็จรูป (Preset Gallery)
- 👨‍🍳 **จอคิวครัวสด (Kitchen Display System - KDS)**: รับออเดอร์เข้าครัวอัตโนมัติ เชฟกดเริ่มปรุงและกดเสร็จสิ้นได้ทันที
- 💳 **ระบบชำระเงินมาตรฐานสากล**: รองรับ **Thai QR PromptPay** (Dynamic EMVCo QR Code), **เงินสด (Cash)** พร้อมคำนวณเงินทอน และ **บัตรเครดิต (Credit Card)**
- 🧾 **พิมพ์ใบเสร็จรับเงิน (Thermal Slip 80mm)**: จัดรูปแบบพิมพ์สวยงามตามมาตรฐานร้านอาหาร พร้อมหน้าตั้งค่าหัว/ท้ายใบเสร็จ
- 📊 **รายงานยอดขายประจำวัน (Daily Dashboard)**: สรุปรายรับสุทธิ, จำนวนบิล, จำนวนลูกค้า, สัดส่วนวิธีชำระเงิน, และอันดับเมนูขายดี

---

## 🏗️ สถาปัตยกรรมระบบ (System Architecture)

```
[ Frontend: React + Vite ] (Port 3000)
    │
    ├── Canvas & SVG 2D Floor Plan (Drag & Drop Top-View)
    ├── POS Ordering & Cart Management
    ├── Kitchen Display System (KDS)
    ├── Menu & Category Admin
    └── Daily Sales Analytics
    │
    ▼ (HTTP REST API / WebSocket via Socket.io)
    │
[ Backend: Node.js + Express ] (Port 5001)
    ├── Tables & Zones Controller
    ├── Menu & Categories Controller
    ├── Orders & Kitchen Queue Controller
    ├── Billing & Checkout Controller
    └── Socket.io Real-time Event Broadcaster
    │
    ▼ (PostgreSQL Connection Pool - pg driver)
    │
[ Database: PostgreSQL 16 ] (Port 5432)
    └── Database: restaurant_pos
        (zones, restaurant_tables, categories, menu_items, orders, order_items, payments, restaurant_settings)
```

---

## 🗄️ โครงสร้างฐานข้อมูล PostgreSQL (Database Schema)

ฐานข้อมูลชื่อ: `restaurant_pos` ประกอบด้วย 10 ตารางหลัก:

| ชื่อตาราง | คำอธิบาย | ฟิลด์สำคัญ |
|---|---|---|
| `zones` | ข้อมูลโซนพื้นที่ในร้าน | `id`, `name`, `description`, `display_order` |
| `restaurant_tables` | ข้อมูลโต๊ะอาหารและพิกัดมุมมอง Top View | `id`, `table_number`, `zone_id`, `shape`, `x`, `y`, `width`, `height`, `capacity`, `status`, `guest_count`, `current_order_id`, `current_pin`, `current_reservation_id` |
| `categories` | หมวดหมู่อาหาร | `id`, `name`, `icon`, `display_order`, `is_active` |
| `menu_items` | รายการเมนูอาหาร | `id`, `category_id`, `name`, `description`, `price`, `cost_price`, `image_url`, `is_available`, `is_recommended`, `prep_time_minutes` |
| `orders` | บิลคำสั่งซื้อ | `id`, `order_number`, `table_id`, `status`, `guest_count`, `subtotal`, `discount_amount`, `service_charge_amount`, `vat_amount`, `total_amount`, `staff_name`, `table_pin` |
| `order_items` | รายการอาหารย่อยในบิล | `id`, `order_id`, `menu_item_id`, `item_name`, `unit_price`, `quantity`, `total_price`, `notes`, `status` |
| `payments` | ประวัติการรับชำระเงิน | `id`, `order_id`, `payment_method`, `total_billed`, `amount_received`, `change_amount`, `transaction_ref`, `cashier_name`, `paid_at` |
| `reservations` | รายการจองโต๊ะอาหารล่วงหน้า | `id`, `table_id`, `customer_name`, `customer_phone`, `guest_count`, `reservation_date`, `reservation_time`, `status`, `special_requests`, `checked_in_at` |
| `staff` | บัญชีพนักงานและรหัส PIN | `id`, `name`, `nickname`, `role`, `pin_code`, `is_active`, `last_login_at` |
| `restaurant_settings` | ข้อมูลร้านค้าและตั้งค่าภาษี/พร้อมเพย์ | `setting_key`, `setting_value` |

---

## 🎯 รายละเอียดฟังก์ชันการทำงาน (Feature Breakdown)

### 4.1 ผังโต๊ะอาหาร Top View 2D & ระบบโซน (Interactive Floor Plan)
- **แยกดูทีละโซนอย่างเป็นระเบียบ**: แสดงเฉพาะแท็บโซนที่มีอยู่จริง เช่น *โซนห้องอาหารหลัก*, *โซนระเบียงริมสวน*, *โซนบาร์ & VIP* (ไม่มีปุ่ม "ทุกโซน" มาปะปน)
- **แถบข้อมูลและสถิติโซน (Zone Info Bar)**:
  - แสดงชื่อโซนและคำอธิบายบรรยากาศ
  - สรุปจำนวนโต๊ะในโซนนั้น (โต๊ะทั้งหมด, โต๊ะว่าง 🟢, โต๊ะที่มีลูกค้า 🔴)
  - สรุปสัดส่วนประเภทโต๊ะ: สี่เหลี่ยม (Rect), โต๊ะกลม (Round), ซุ้มโซฟา (Booth), และบาร์เดี่ยว (Bar Counter)
- **ปุ่ม "+ เพิ่มโต๊ะในโซนนี้"**: กำหนดรหัสโต๊ะ, เลือกประเภท/รูปทรงโต๊ะ, และจำนวนที่นั่ง โต๊ะจะปรากฏบนผังทันที
- **ปุ่ม "จัดการโซน"**: เพิ่มโซนใหม่ (เช่น โซน Rooftop, ห้องจัดเลี้ยง VIP), แก้ไขชื่อ และลบโซน
- **โหมดจัดผังร้าน (Drag & Drop)**: กดปุ่ม "จัดผังโต๊ะ" เพื่อคลิกลากย้ายตำแหน่งโต๊ะบน Canvas ได้อิสระ พร้อมระบบ Snap Grid 10px และกดปุ่ม "บันทึกตำแหน่ง" เพื่อเซฟพิกัดลง PostgreSQL
- **คลิกที่โต๊ะ**:
  - โต๊ะว่าง ➔ เปิดโต๊ะ ระบุจำนวนลูกค้า และไปสั่งอาหาร
  - โต๊ะไม่ว่าง ➔ ดูรายการอาหารที่สั่ง, สั่งอาหารเพิ่ม, ย้ายโต๊ะ, พิมพ์บิล หรือกดคิดเงิน

### 4.2 ระบบจัดการเมนูและหมวดหมู่อาหาร (Menu & Category Management)
- เข้าใช้งานได้ผ่านแท็บ **"จัดการเมนู & หมวดหมู่"**
- **เพิ่ม/แก้ไข/ลบ เมนูอาหาร**:
  - ชื่อเมนู, เลือกหมวดหมู่, ราคาขาย, ต้นทุน, เวลาปรุง
  - ตัวเลือกติดป้าย "เมนูแนะนำยอดฮิต (Recommended)"
  - **คลังรูปภาพอาหารสำเร็จรูป (Preset Photo Gallery)**: มีภาพอาหารความละเอียดสูงคัดสรรไว้กว่า 15 ภาพ (ปลากะพง, กุ้งเผา, สเต๊กเนื้อ, ต้มยำ, ผัดไทย, ข้าวผัด, สลัด, ชาไทย, ของหวาน ฯลฯ) คลิกเลือกใช้ได้ทันที หรือใส่ URL ภาพเองได้
  - สลับสถานะ **"พร้อมขาย (✓ In Stock)"** หรือ **"ของหมด (✗ Out of Stock)"** ได้ในคลิกเดียว
- **จัดการหมวดหมู่**: เพิ่มหมวดหมู่ใหม่ จัดลำดับการแสดงผล และแก้ไขชื่อได้ตลอดเวลา

### 4.3 ระบบสั่งอาหารและส่งเข้าครัว (Ordering & Cart)
- ค้นหาเมนูอาหารและกรองตามหมวดหมู่ได้อย่างรวดเร็ว
- ระบุหมายเหตุพิเศษของแต่ละจานได้ (เช่น *เผ็ดน้อย, ไม่ใส่ผักชี, หวาน 50%, แยกน้ำยำ*)
- ตะกร้าสรุปรายการอาหารต่อโต๊ะ แสดงจำนวนจาน ยอดรวม และปุ่มกด **"ส่งออเดอร์เข้าครัว (Send to Kitchen)"**

### 4.4 หน้าจอคิวครัว Real-time (Kitchen Display System)
- หน้าจอสำหรับเชฟในครัว แสดงรายการอาหารที่ต้องทำเรียงตามเวลาที่สั่ง
- แสดงเวลาที่สั่ง (เช่น *เมื่อสักครู่*, *5 นาทีที่แล้ว*) พร้อมหมายเหตุพิเศษที่ลูกค้าสั่ง
- เชฟสามารถกดเปลี่ยนสถานะ: **"กำลังเริ่มปรุง"** ➔ **"ปรุงเสร็จแล้ว / พร้อมเสิร์ฟ"** ข้อมูลจะซิงค์กลับไปยังผังโต๊ะอัตโนมัติ

### 4.5 ระบบคิดเงินและใบเสร็จ (Billing & Checkout)
- คำนวณยอดเงินอัตโนมัติ: ยอดรวมอาหาร, หักส่วนลด (%, บาท), ค่าบริการ Service Charge (10%), และภาษีมูลค่าเพิ่ม VAT (7%)
- **3 ช่องทางการชำระเงิน**:
  1. **Thai QR PromptPay**: QR Code พร้อมเพย์จำลองพร้อมแสดงยอดเงินสุทธิ
  2. **เงินสด (Cash)**: ปุ่มลัดธนบัตร (+฿100, +฿500, +฿1,000, พอดีบิล) พร้อมคำนวณเงินทอนอัตโนมัติ
  3. **บัตรเครดิต (Credit Card)**
- เมื่อชำระเงินสำเร็จ: มีเอฟเฟกต์ Confetti เฉลิมฉลอง โต๊ะจะถูกรีเซ็ตกลับเป็น **"โต๊ะว่าง (🟢)"** อัตโนมัติทันที
- **พิมพ์ใบเสร็จรับเงิน (Thermal Slip 80mm)**: จัดหน้าตามมาตรฐาน มีชื่อร้าน เลขประจำตัวผู้เสียภาษี รายการอาหาร ภาษี และเงินทอน พร้อมกดสั่งพิมพ์ (`window.print()`)

### 4.6 รายงานสรุปยอดขายประจำวัน (Daily Sales & Analytics)
- สรุปยอดขายสุทธิประจำวัน
- จำนวนบิลที่ปิด และจำนวนลูกค้าที่เข้ามารับประทาน
- สรุปสัดส่วนวิธีชำระเงิน (PromptPay vs เงินสด vs บัตรเครดิต) พร้อมกราฟแถบเปอร์เซ็นต์
- อันดับเมนูขายดีประจำวัน (Top Sellers)
- ตารางประวัติการปิดบิลย้อนหลังพร้อมปุ่มเปิดดูใบเสร็จ

### 4.7 ระบบจัดการการจองโต๊ะอาหาร (Table Reservation Management)
- **หน้าจอจัดการการจอง (Reservations Dashboard)**:
  - การ์ดสถิติสรุป: ยอดจองวันนี้ทั้งหมด, รอมาถึง/ยืนยันแล้ว, เช็คอินแล้ว, และยกเลิก
  - แถบตัวกรองวันที่: วันนี้, พรุ่งนี้, ทุกวัน, หรือระบุวันที่ต้องการผ่านปฏิทิน
  - ตัวกรองสถานะและช่องค้นหาด่วนตามชื่อลูกค้า เบอร์โทรศัพท์ หรือเลขโต๊ะ
- **เชื่อมโยงสถานะกับผังโต๊ะ 2D Real-time**:
  - โต๊ะที่ถูกจองจะแสดงไฟสถานะสีฟ้า `reserved` พร้อมป้ายแสดงเวลานัด เช่น `จอง 18:30 น.`
  - ป้องกันการเปิดโต๊ะซ้อนทับโดยไม่ได้ตั้งใจ
- **ปุ่ม "+ บันทึกการจองใหม่"**:
  - ระบุชื่อลูกค้า, เบอร์โทรศัพท์, วันที่, เวลานัดหมาย (มีปุ่มเวลาด่วน), จำนวนแขก, เลือกโต๊ะว่างในแต่ละโซน และความต้องการพิเศษ
  - สามารถจองได้ทั้งจากหน้าการจอง และคลิกที่โต๊ะว่างบนผัง 2D แล้วเลือกแท็บ **"🔷 จองโต๊ะนี้"**
- **เช็คอินในคลิกเดียว (1-Click Check-in)**:
  - เมื่อลูกค้ามาถึงร้าน พนักงานกดปุ่ม **"เช็คอินเข้าโต๊ะ"** จากตารางหรือหน้าผังโต๊ะ
  - ระบบจะเปิดโต๊ะ สร้างเลขออเดอร์ สุ่มรหัส PIN ประจำโต๊ะ และเปลี่ยนสถานะบนผังเป็น "มีลูกค้า (🔴)" พร้อมพาไปสั่งอาหารทันที

### 4.8 ระบบสั่งอาหารผ่าน QR Code ในมือถือลูกค้า (Customer Mobile QR Ordering)
- **สแกนสั่งจากสมาร์ตโฟน**: ลูกค้าใช้กล้องมือถือสแกน QR Code ประจำโต๊ะ เข้าสู่หน้าสั่งอาหารแบบ Web App ได้ทันทีโดยไม่ต้องติดตั้งแอปพลิเคชัน
- **ระบบความปลอดภัย 4-Digit Session PIN**:
  - เมื่อเปิดโต๊ะ ระบบจะสุ่มรหัส PIN 4 หลักประจำโต๊ะ แสดงบนหน้าจอ POS และพิมพ์บนบัตรโต๊ะ
  - ลูกค้าต้องกรอก PIN ให้ถูกต้องก่อนยืนยันส่งออเดอร์ เพื่อป้องกันลูกค้าโต๊ะอื่นหรือบุคคลภายนอกสั่งอาหารมั่ว
- **ฟังก์ชันในมือถือลูกค้า**:
  - เลือกดูเมนูอาหาร ค้นหา กรองหมวดหมู่ และระบุโน้ตพิเศษ (เช่น เผ็ดน้อย, ไม่ใส่ผักชี)
  - ตรวจสอบคิวและสถานะอาหารที่สั่งสดๆ ผ่าน WebSocket (⏳ รอคิว ➔ 🍳 กำลังปรุง ➔ ✓ เสิร์ฟแล้ว)
  - ปุ่ม **"🛎️ เรียกพนักงาน / ขอความช่วยเหลือ"**: ส่งสัญญาณเตือนและเสียงกระดิ่งมายังหน้าจอ POS แคชเชียร์ทันที
  - ตรวจสอบยอดรวมบิล ค่าอาหาร VAT และ Service Charge แบบ Real-time
- **ระบบพิมพ์ป้าย QR Code (Batch QR Print)**:
  - มีปุ่มสั่งพิมพ์ป้าย QR Code ประจำโต๊ะทั้งแบบรายโต๊ะ และปุ่ม **"พิมพ์ QR ทุกโต๊ะ"** รองรับเครื่องพิมพ์ Thermal และกระดาษ A4

### 4.9 ระบบจัดการพนักงานและสิทธิ์การเข้าใช้งาน (Staff & Role Management)
- **เข้าสู่ระบบด้วยรหัส PIN 4 หลัก (PIN Authentication)**: รวดเร็ว ปลอดภัย สะดวกต่อการสลับกะพนักงานหน้าร้าน
- **สิทธิ์การใช้งาน 3 ระดับ (Role-Based Access Control)**:
  - 👑 **ผู้จัดการร้าน (Admin)**: สิทธิ์เต็ม จัดการเพิ่ม/แก้ไขพนักงาน, จัดการเมนูและราคา, แก้ไขผังโต๊ะ, ดูรายงานยอดขาย
  - 💳 **แคชเชียร์ (Cashier)**: คิดเงิน, เช็คบิล, รับชำระเงิน, พิมพ์ใบเสร็จ, จัดการการจองโต๊ะ
  - 🍽️ **พนักงานบริการ (Waiter)**: เปิดโต๊ะ, รับออเดอร์, ส่งเข้าครัว, เสิร์ฟอาหาร
- **Staff Attribution**: บันทึกชื่อพนักงานผู้รับออเดอร์ และแคชเชียร์ผู้ปิดบิลลงในแต่ละคำสั่งซื้อและใบเสร็จเพื่อการตรวจสอบย้อนหลัง

---

## 🔌 รายการ API Endpoints

### โต๊ะและผังร้าน (Tables & Layout)
- `GET /api/tables` - รายการโต๊ะทั้งหมดพร้อมข้อมูลโซนและยอดบิล
- `POST /api/tables` - เพิ่มโต๊ะใหม่ลงในโซน
- `DELETE /api/tables/:id` - ลบโต๊ะ
- `PUT /api/tables/:id/layout` - อัปเดตพิกัด Top View โต๊ะเดียว
- `PUT /api/tables/batch-layout` - บันทึกตำแหน่งโต๊ะทั้งหมดจากการ Drag & Drop
- `POST /api/tables/:id/open` - เปิดโต๊ะและสร้างบิล
- `POST /api/tables/transfer` - ย้ายลูกค้าและออเดอร์ไปยังโต๊ะอื่น

### โซนร้าน (Zones)
- `GET /api/zones` - รายการโซนทั้งหมดพร้อมสถิติจำนวนโต๊ะและประเภทโต๊ะ
- `POST /api/zones` - เพิ่มโซนใหม่
- `PUT /api/zones/:id` - แก้ไขข้อมูลโซน
- `DELETE /api/zones/:id` - ลบโซน

### เมนูและหมวดหมู่ (Menu & Categories)
- `GET /api/categories` - รายการหมวดหมู่ทั้งหมด
- `POST /api/categories` - เพิ่มหมวดหมู่ใหม่
- `PUT /api/categories/:id` - แก้ไขหมวดหมู่
- `DELETE /api/categories/:id` - ลบหมวดหมู่
- `GET /api/menu-items` - รายการเมนูอาหาร (รองรับ filter ตามหมวดหมู่และค้นหา)
- `POST /api/menu-items` - เพิ่มเมนูอาหารใหม่
- `PUT /api/menu-items/:id` - แก้ไขเมนูอาหาร
- `DELETE /api/menu-items/:id` - ลบเมนูอาหาร
- `PATCH /api/menu-items/:id/toggle` - สลับสถานะ พร้อมขาย / ของหมด

### คำสั่งซื้อและคิวครัว (Orders & Kitchen)
- `GET /api/orders/:id` - ดูข้อมูลคำสั่งซื้อ (รองรับ query `?byTable=true`)
- `POST /api/orders/items` - ส่งรายการอาหารเข้าบิล / สั่งอาหารเข้าครัว
- `PATCH /api/order-items/:itemId/status` - เปลี่ยนสถานะอาหาร (pending -> cooking -> served)
- `GET /api/kitchen/queue` - คิวอาหารที่รอทำในครัวทั้งหมด

### การคิดเงินและรายงาน (Billing & Reports)
- `POST /api/billing/request` - แจ้งขอเช็คบิลโต๊ะ
- `PUT /api/billing/settings/:orderId` - ปรับส่วนลด, Service Charge, VAT
- `POST /api/billing/pay` - บันทึกการชำระเงิน ปิดบิล และรีเซ็ตสถานะโต๊ะเป็นว่าง
- `GET /api/billing/receipt/:orderId` - ดึงข้อมูลใบเสร็จรับเงินสำหรับพิมพ์
- `GET /api/reports/daily` - รายงานสรุปยอดขายประจำวัน

### การจองโต๊ะอาหาร (Table Reservations)
- `GET /api/reservations` - รายการจองทั้งหมด (รองรับ filter `?date=...`, `?status=...`, `?search=...`)
- `GET /api/reservations/:id` - ดูรายละเอียดการจองรายบุคคล
- `POST /api/reservations` - บันทึกการจองโต๊ะใหม่
- `PUT /api/reservations/:id` - แก้ไขข้อมูลการจอง
- `POST /api/reservations/:id/check-in` - เช็คอินลูกค้าเข้าโต๊ะ เปิดโต๊ะ และสร้างบิลออเดอร์ทันที
- `POST /api/reservations/:id/cancel` - ยกเลิกการจองและปลดโต๊ะคืนสถานะว่าง

### การสั่งอาหารผ่าน QR Code ในมือถือลูกค้า (Customer Mobile QR Ordering)
- `POST /api/customer/verify-pin` - ตรวจสอบความถูกต้องของรหัส PIN 4 หลักประจำโต๊ะ
- `POST /api/customer/order` - ลูกค้าส่งรายการอาหารเข้าครัวโดยตรงจากสมาร์ตโฟน
- `GET /api/customer/order-status/:tableIdentifier` - ตรวจสอบสถานะอาหารและยอดบิลสด
- `POST /api/customer/call-staff` - ลูกค้ากดเรียกพนักงาน (ส่งแจ้งเตือนและเสียงกระดิ่งมาที่ POS)

### พนักงานและการเข้าสู่ระบบ (Staff & Authentication)
- `GET /api/staff` - รายชื่อพนักงานทั้งหมด
- `POST /api/auth/login-pin` - เข้าสู่ระบบด้วยรหัส PIN 4 หลัก
- `POST /api/staff` - เพิ่มพนักงานใหม่
- `PUT /api/staff/:id` - แก้ไขข้อมูลพนักงานและเปลี่ยนรหัส PIN
- `DELETE /api/staff/:id` - ลบพนักงาน

---

## 🚀 วิธีติดตั้งและเริ่มใช้งาน (Getting Started)

### 6.1 รันในเครื่อง (Local Development)

#### ข้อกำหนดเบื้องต้น (Prerequisites):
- Node.js (v18 ขึ้นไป)
- PostgreSQL (v14 ขึ้นไป รันอยู่ที่ port 5432)

#### 1. สร้างฐานข้อมูล PostgreSQL และนำเข้าข้อมูลเริ่มต้น:
```bash
# สร้างฐานข้อมูล
createdb restaurant_pos

# นำเข้าโครงสร้างตารางและข้อมูลตัวอย่าง
psql -d restaurant_pos -f server/sql/schema.sql
psql -d restaurant_pos -f server/sql/seed.sql
```

#### 2. รัน Backend API (Port 5001):
```bash
cd server
npm install
npm run dev
```

#### 3. รัน Frontend Web App (Port 3000):
```bash
cd client
npm install
npm run dev
```

เปิดเว็บเบราว์เซอร์ไปที่: **http://localhost:3000**

---

### 6.2 รันผ่าน Docker Compose

หากต้องการรัน PostgreSQL และเครื่องมือจัดการฐานข้อมูล Adminer ผ่าน Docker:
```bash
docker compose up -d
```
- **PostgreSQL**: `localhost:5432` (User: `postgres`, Password: `postgrespassword`, DB: `restaurant_pos`)
- **Adminer (Web GUI จัดการ DB)**: `http://localhost:8080`

---

## 🔮 แผนพัฒนาต่อยอดในอนาคต (Recommended Future Roadmap)

1. **🪑 ระบบรวมโต๊ะ (Merge Tables)**: รวมโต๊ะ 2 ตัวเข้าด้วยกันสำหรับรองรับลูกค้ากลุ่มใหญ่ โดยรวมรายการอาหารเป็นบิลเดียวกัน
2. **🧾 ระบบแยกบิล (Split Bill)**: แยกจ่ายเท่ากัน (Split equally) หรือแยกจ่ายตามเมนูที่สั่ง (Split by items)
3. **📦 ระบบจัดการสต็อกวัตถุดิบและตัดสต็อกตามสูตร (Inventory & Recipe Costing)**: ผูกสูตรอาหารกับวัตถุดิบเพื่อตัดสต็อกอัตโนมัติ และคำนวณต้นทุนอาหาร (COGS)
4. **👑 ระบบสมาชิกและสะสมแต้ม (Loyalty CRM & Member Points)**: ค้นหาด้วยเบอร์โทรศัพท์ สะสมแต้ม และให้สิทธิประโยชน์ส่วนลดตามระดับสมาชิก
5. **🏷️ ระบบโปรโมชั่นและคูปองส่วนลด (Promotions & Coupons)**: รหัสส่วนลด, ชุดเซ็ตอาหารสุดคุ้ม และ Happy Hour

---
*จัดทำขึ้นสำหรับการพัฒนาระบบ Siam Culinary POS & Floor Plan Management System*
