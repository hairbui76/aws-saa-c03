---
tags: [saa-c03, s21-machine-learning, machine-learning, ocr, document-processing, ai-services]
aliases: [Amazon Textract, OCR, document text extraction]
lessons: ["0369 Amazon Textract"]
videos: ["372 Amazon Textract"]
---
# Textract

> **TL;DR:** Amazon Textract **phát hiện và phân tích text trong tài liệu** (ảnh scan, PDF). Không chỉ OCR: nó trích luôn **cấu trúc** (form key-value, bảng) và **phân tích chuyên biệt** cho hóa đơn/biên lai và giấy tờ tùy thân.

## 🖼️ Sơ đồ
![[Textract.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[Textract.svg]]*

## Khái niệm cốt lõi
- **Input**: **JPEG, PNG, PDF, TIFF**.
- **Output**: **text đã trích xuất**, **cấu trúc** của text đó (quan hệ giữa các phần, vị trí xuất hiện, metadata) và **kết quả phân tích**.
- **Chế độ xử lý**:
  - **Synchronous (near real-time)**: tài liệu **một trang**; kết quả có gần như ngay sau khi gửi.
  - **Asynchronous**: tài liệu **nhiều trang** (PDF hoặc TIFF từ 2 trang, **tối đa 3.000 trang**). Submit job rồi chờ xử lý xong.
- **Giá**: **pay for usage**; có **custom pricing** cho khối lượng lớn.
- **Khả năng**:
  - Phát hiện text **và quan hệ giữa các phần text**. Ví dụ trên hóa đơn: dòng sản phẩm nào đi với giá nào, thuế bao nhiêu.
  - Sinh **metadata**: text nằm ở đâu trong tài liệu.
  - Đọc được chữ **in, viết tay, đóng dấu**, chữ nghiêng hoặc tràn khỏi ô (chi tiết từ demo bản khóa cũ).
  - Hiểu **layout** của tài liệu (các khối, đoạn text) và nhận ra **chữ ký** (signature) kèm confidence.
- **Phân tích theo loại tài liệu**:
  | Loại | Trích được |
  |---|---|
  | Tài liệu chung (**Analyze Document**) | Raw text, **Layout**, **Forms** (key-value), **Tables** (giữ cấu trúc bảng), **Queries**, **Signatures**; tên, địa chỉ, ngày sinh |
  | Biên lai/hóa đơn (**Analyze Expense**) | **Vendor**, giá, **line items**, ngày |
  | Giấy tờ tùy thân Mỹ (**Analyze ID**) | Các trường chuẩn hóa: số giấy phép lái xe và số hộ chiếu đều quy về **Document number** |
- **Field abstraction** cho ID: nhiều loại giấy tờ khác nhau được map về **một schema chung** (Document ID, First/Last name, Date of birth, Expiration date...), lưu vào cùng một database. Rất có giá trị cho **KYC (Know Your Customer)** và **AML (anti-money laundering)** (bản khóa cũ nêu, bài mới không nói).
- Dùng qua **console UI** hoặc **API**; tích hợp với ứng dụng và các dịch vụ AWS khác, kể cả các dịch vụ ML khác.

## Cách hoạt động / Kiến trúc
```mermaid
flowchart LR
  D["Tài liệu: JPEG / PNG / PDF / TIFF"] --> T{"Textract"}
  T -- "1 trang: sync" --> R1["Kết quả gần như tức thì"]
  T -- "nhiều trang (PDF/TIFF, ≤ 3.000 trang): async job" --> R2["Kết quả khi job xong (báo qua SNS)"]
  R1 --> O["Text + cấu trúc (forms, tables) + phân tích (expense, ID)"]
  R2 --> O
  O --> C["Comprehend / Translate / DB / ứng dụng"]
```

## Demo / Lab
- Console → **Try Amazon Textract** → **Analyze Document** với mẫu **paystub**:
  - Tab **Raw text**: toàn bộ chữ trên phiếu lương.
  - Tab **Layout**: tài liệu được chia thành các khối, đoạn text.
  - Tab **Forms**: cặp **key-value**, ví dụ Department và mã tương ứng, Social Security Number và số của nó. Không chỉ là nhận dạng chữ đơn thuần.
  - Tab **Tables**: tái tạo từng bảng ở dạng dễ đọc (nhiều bảng trong một tài liệu).
  - Tab **Signatures**: nhận ra chữ ký với confidence 80%.
- Mẫu **loan application**: tab Forms trả về đúng các trường mà người phải đọc tay trước đây, giảm lỗi nhập liệu.
- **Analyze Expense**: biên lai nhân viên nộp để thanh toán chi phí → từng line item, các trường của hóa đơn.
- **Analyze ID**: bằng lái và hộ chiếu Mỹ (mẫu giả) → first name, last name, state, address, ID.
- Console demo giới hạn tài liệu upload: < 11 trang, < 5 MB, JPEG, PNG hoặc PDF.
- Cuối bài: đưa tài liệu lên S3, phân tích nhiều trang theo kiểu asynchronous, có thể nối với một SNS topic cho kiến trúc event-driven.
- Demo bản khóa cũ (bài mới không còn): mẫu **vaccination card** vừa có trường cấu trúc vừa có bảng ngày tiêm viết tay, đóng dấu, lệch khỏi ô, vẫn trích đúng; mẫu loan application trích cả đoạn văn dài.

## 🎯 Mẹo thi SAA-C03
- **Trích text/dữ liệu từ tài liệu scan, PDF, form, bảng, hóa đơn, biên lai, hộ chiếu, bằng lái** → **Textract**.
- **OCR có cấu trúc** (giữ key-value, bảng) → Textract, không phải [[Rekognition]]. Rekognition đọc text trong ảnh tự nhiên (biển số), không hiểu form/bảng.
- Tài liệu **một trang** → synchronous; tài liệu **nhiều trang** (PDF/TIFF, tới 3.000 trang) → **asynchronous** API (start job rồi lấy kết quả, kèm thông báo qua [[SNS]] cho kiến trúc event-driven).
- Textract là dịch vụ chuyên dụng cho text trong tài liệu; [[Rekognition]] chỉ đọc tối đa 100 từ mỗi ảnh.
- Pipeline phổ biến: S3 upload → [[Lambda]] → Textract → [[Comprehend]] (tìm entity/PII) → lưu DB.

## Liên kết
- Dùng cùng: [[S3 Events]], [[Lambda]], [[Comprehend]], [[Translate]], [[SNS]]
- Phân biệt với: [[Rekognition]] (ảnh/video), [[Comprehend]] (phân tích text đã có)
- Liên quan: [[Kendra]]
- MOC: [[_MOC 21 Machine Learning]]
