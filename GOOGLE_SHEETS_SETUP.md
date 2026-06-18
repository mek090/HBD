# เชื่อมเว็บกับ Google Sheets

1. เปิด <https://script.google.com> แล้วสร้าง **New project**
2. นำโค้ดจาก `google-apps-script/Code.gs` ไปวางแทนโค้ดเดิม แล้วกด Save
3. กด **Deploy → New deployment**
4. เลือกชนิด **Web app**
5. ตั้ง **Execute as: Me** และ **Who has access: Anyone**
6. กด Deploy, ยืนยันสิทธิ์ แล้วคัดลอก URL ที่ลงท้ายด้วย `/exec`
7. เปิด `index.html` และนำ URL ไปใส่ในบรรทัด:

   ```js
   const DATA_ENDPOINT = 'วาง_URL_ตรงนี้';
   ```

8. เปิด URL `/exec` ในเบราว์เซอร์หนึ่งครั้ง ระบบจะสร้าง Google Sheet ชื่อ **Jane Birthday Data** ใน Google Drive โดยอัตโนมัติ

## เมื่อแก้ `Code.gs` ภายหลัง

ต้อง Deploy เวอร์ชันใหม่ทุกครั้ง:

1. กด **Deploy → Manage deployments**
2. กดไอคอนดินสอของ Web app เดิม
3. ที่ Version เลือก **New version**
4. กด **Deploy** โดยใช้ URL `/exec` เดิมได้เลย

ข้อมูลที่เก็บประกอบด้วยการเปิดเว็บ, หน้าที่เข้าชม, การกดปุ่ม, เพลง, คำตอบเกม, ของขวัญ, ข้อความที่ผู้ใช้พิมพ์ส่ง, เวลาใช้งาน, อุปกรณ์ และสถานะการเชื่อมต่อ ข้อมูลจะสำรองใน `localStorage` และส่งซ้ำเมื่อกลับมาออนไลน์
