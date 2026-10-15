# WEBSITE HỌC VÀ LUYỆN ĐỀ CƯƠNG ANH 2 (B1 READING)

Nền tảng học tập và luyện thi kỹ năng Đọc B1 hoàn chỉnh được xây dựng từ tài liệu gốc **“Đề cương ôn tập Anh 2 – sinh viên”** (`Đề cương ôn tập Anh 2-sinh viên (in) (1).docx`).

## 1. Thống kê dữ liệu đã trích xuất (100% nguyên bản từ file Word)
- **Tổng số Part**: 5 Parts (`PART I` đến `PART V`)
- **Tổng số Đề / Test**: 41 Đề/Test
- **Tổng số câu hỏi**: 305 câu hỏi
  - **PART I (Biển báo, thông báo, tin nhắn - A/B/C kèm hình ảnh)**: 6 Đề (Đề 01 – Đề 06) = **30 câu hỏi** & **30 hình ảnh gốc** (`assets/images/part1_test1_q1.jpeg` ... `part1_test6_q5.jpeg`)
  - **PART II (Đọc mô tả người và ghép với 5 đoạn văn A–E)**: 5 Đề (Đề 01 – Đề 05) = **25 câu hỏi**
  - **PART III (Đọc hiểu True/False - 10 câu/đề)**: 10 Đề (Đề 01 – Đề 10) = **100 câu hỏi**
  - **PART IV (Đọc hiểu trắc nghiệm A/B/C/D - 5 câu/đề)**: 10 Test (Test 1 – Test 10) = **50 câu hỏi**
  - **PART V (Điền từ vào chỗ trống Cloze Test - 10 câu/đề)**: 10 Test (TEST 1 – TEST 10) = **100 câu hỏi**

## 2. Cấu trúc thư mục dự án
```text
english-review/
├── index.html
├── README.md
├── assets/
│   ├── images/          # 30 hình ảnh trích xuất từ Part I của file Word gốc
│   ├── icons/
│   └── fonts/
├── css/
│   ├── reset.css
│   ├── variables.css
│   ├── layout.css
│   ├── components.css
│   ├── dashboard.css
│   ├── practice.css
│   ├── exam.css
│   ├── results.css
│   ├── review.css
│   ├── animations.css
│   └── responsive.css
├── js/
│   ├── utils.js
│   ├── storage.js
│   ├── data-loader.js
│   ├── router.js
│   ├── timer.js
│   ├── scoring.js
│   ├── charts.js
│   ├── statistics.js
│   ├── question-renderer.js
│   ├── practice.js
│   ├── exam-config.js
│   ├── exam-engine.js
│   ├── review.js
│   ├── search.js
│   ├── settings.js
│   └── app.js
└── data/
    ├── questions.json   # Toàn bộ 5 Part, 41 Đề, 305 câu hỏi & bài đọc
    ├── answers.json     # Đáp án đối chiếu văn bản, dẫn chứng & giải thích
    ├── metadata.json    # Cấu trúc đề thi B1 & báo cáo rà soát file Word
    └── embedded-data.js # Bản nhúng giúp mở trực tiếp index.html offline không lỗi CORS
```

## 3. Hướng dẫn chạy trên máy tính (Localhost & Offline)
### Cách 1: Chạy trực tiếp Offline (Không cần cài đặt)
- Giải nén thư mục `english-review/` và nhấp đúp mở file `index.html` bằng bất kỳ trình duyệt nào (Chrome, Edge, Firefox, Safari). Nhờ cơ chế `data/embedded-data.js`, toàn bộ 305 câu hỏi và 30 hình ảnh hoạt động ngay lập tức mà không bị chặn CORS.

### Cách 2: Chạy bằng Localhost Server
- **Sử dụng Python (có sẵn trên macOS/Linux/Windows)**:
  ```bash
  cd english-review
  python3 -m http.server 8080
  ```
  Sau đó mở trình duyệt tại địa chỉ: `http://localhost:8080`
- **Sử dụng VS Code Live Server**: Nhấp chuột phải vào `index.html` → chọn **Open with Live Server**.
- **Sử dụng Node.js**:
  ```bash
  npx serve english-review
  ```

## 4. Hướng dẫn chỉnh sửa / cập nhật dữ liệu câu hỏi và đáp án
1. **Chỉnh sửa trực tiếp trên giao diện web**:
   - Vào mục **🛠️ Cài đặt & Sao lưu** → Kéo xuống phần **🔑 Cập Nhật Đáp Án Thủ Công (Theo Giảng Viên Chữa Trên Lớp)** → Chọn câu hỏi và nhập đáp án mới.
2. **Chỉnh sửa trong file JSON**:
   - Mở `data/questions.json` để sửa nội dung câu hỏi/bài đọc, hoặc `data/answers.json` để sửa đáp án và lời giải thích. Nếu chạy qua `localhost`, trình duyệt sẽ nạp trực tiếp từ 2 file JSON này khi xóa/tắt `data/embedded-data.js`.
