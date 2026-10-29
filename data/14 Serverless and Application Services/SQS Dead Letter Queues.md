---
tags: [saa-c03, s14-serverless-and-application-services, messaging, reliability]
aliases: [DLQ, Dead-Letter Queue, Redrive Policy]
lessons: ["0264 SQS Dead Letter Queues"]
---
# SQS Dead Letter Queues

> **TL;DR:** Dead-letter queue (DLQ) là queue phụ chứa các **message "có vấn đề"**: bị nhận nhiều lần mà không bao giờ được xử lý thành công. Nhờ đó message lỗi không quay vòng mãi trong queue chính, và có chỗ riêng để cảnh báo, chẩn đoán, xử lý lại.

## 🖼️ Sơ đồ
![[SQS Dead Letter Queues.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[SQS Dead Letter Queues.svg]]*

## Khái niệm cốt lõi
- Vấn đề: message lỗi (corrupt, đặc thù...) → nhận → xử lý fail → hết [[SQS Delay Queues|visibility timeout]] → hiện lại → lặp **vô hạn**.
- Mỗi lần message được nhận, thuộc tính **`ReceiveCount`** tăng 1 (1, 2, 3, ...).
- **Redrive policy** (cấu hình trên source queue) chỉ định: **source queue**, **DLQ**, và điều kiện chuyển, cụ thể là **`maxReceiveCount`**.
- Khi **`ReceiveCount` > `maxReceiveCount`** và message **vẫn chưa bị xóa** → message được **chuyển sang DLQ**.
- **Một DLQ có thể phục vụ nhiều source queue.**
- DLQ phải cùng loại với source: queue FIFO dùng DLQ FIFO, Standard dùng DLQ Standard.

## Cách hoạt động / Kiến trúc

```mermaid
flowchart LR
    P["Producer"] --> SQ["Source Queue (redrive policy: maxReceiveCount = N)"]
    SQ -->|"Receive, xử lý fail, ReceiveCount++"| C["Consumer"]
    C -.->|"không Delete, hết visibility timeout"| SQ
    SQ -->|"ReceiveCount > N"| DLQ["Dead-Letter Queue"]
    DLQ --> A["CloudWatch Alarm / SNS"]
    DLQ --> D["Xử lý riêng / chẩn đoán"]
```

### Lợi ích
- **Alarm** khi có message vào DLQ, nên biết sớm có message lỗi (CloudWatch alarm theo độ dài DLQ).
- Khu vực **cô lập** để **chẩn đoán**: xem log, phân tích nội dung message lỗi.
- **Xử lý riêng** cho message khó: workload khác, logic khác, hoặc redrive về source queue sau khi sửa lỗi.

### ⚠️ Retention và enqueue timestamp
- Mỗi message có **enqueue timestamp** (thời điểm lần đầu vào queue).
- Khi chuyển sang DLQ, **timestamp này giữ nguyên**, không reset.
- Ví dụ: message đã ở source queue **1 ngày**, DLQ có retention **2 ngày** → message chỉ còn sống thêm **1 ngày** trong DLQ.
- ⇒ **Retention của DLQ nên dài hơn retention của source queue** (tối đa 14 ngày).

## 🎯 Mẹo thi SAA-C03
- Đề: "message lỗi cứ bị xử lý lại liên tục, làm nghẽn/tốn tài nguyên" → cấu hình **DLQ + redrive policy (`maxReceiveCount`)**.
- Đề: "cần cô lập và phân tích message xử lý thất bại" → **DLQ**.
- Đặt **retention DLQ > retention source queue**, vì enqueue timestamp không đổi.
- DLQ cũng xuất hiện ở các dịch vụ khác (Lambda async invocation, SNS subscription) với ý tương tự: nơi đổ sự kiện thất bại.

## Liên kết
- Tiên quyết: [[SQS]], [[SQS Delay Queues]] (ôn visibility timeout)
- Liên quan: [[SQS Standard vs FIFO]], [[CloudWatch Basics]], [[SNS]], [[Lambda]]
- Section: [[_MOC 14 Serverless and Application Services]]
