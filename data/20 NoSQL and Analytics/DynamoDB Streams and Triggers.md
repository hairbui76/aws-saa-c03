---
tags: [saa-c03, s20-nosql-and-analytics, database, dynamodb, serverless, event-driven]
aliases: [DynamoDB Streams, DynamoDB Triggers, DDB Streams, Stream View Types]
lessons: ["0354 DynamoDB Streams Lambda Triggers"]
videos: ["339 [ASSOCIATESHARED] DynamoDB Streams and Triggers"]
---
# DynamoDB Streams and Triggers

> **TL;DR:** DynamoDB Stream là danh sách **có thứ tự thời gian** các thay đổi (insert/update/delete) của item trong table, giữ trong cửa sổ trượt **24 giờ**. Kết hợp Stream với **Lambda** ta có kiến trúc **database trigger** serverless: dữ liệu đổi → Lambda chạy, không cần polling.

## 🖼️ Sơ đồ
![[DynamoDB Streams and Triggers.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[DynamoDB Streams and Triggers.svg]]*

## Khái niệm cốt lõi

### DynamoDB Streams
- Ghi lại **theo thứ tự** mọi thay đổi trên item: **insert, update, delete**.
- **Rolling window 24 giờ**.
- Bật **theo từng table** (mặc định tắt).
- Nghe giống Kinesis nhưng **không phải Kinesis**: Streams là tính năng **native của DynamoDB**. Nếu muốn, DynamoDB có tùy chọn **tích hợp với Kinesis** ([[Kinesis Data Streams]]) thay cho DynamoDB Streams. (Bản khóa cũ giới thiệu kiến trúc nền của Streams tương tự Kinesis, với shard.)

### Stream view types
Mỗi stream chọn một view type, quyết định nội dung mỗi record. Ví dụ: một item bị **xóa attribute thứ 4**.

| View type | Nội dung record | Dùng khi |
|---|---|---|
| **KEYS_ONLY** | Chỉ PK (và SK nếu có) của item đổi | Chỉ cần biết item nào đổi; muốn biết đổi gì phải tự đọc lại DB |
| **NEW_IMAGE** | Toàn bộ item **sau** thay đổi | Xử lý nghiệp vụ dựa trên trạng thái mới |
| **OLD_IMAGE** | Toàn bộ item **trước** thay đổi | So với item hiện tại trong table để suy ra đã đổi gì |
| **NEW_AND_OLD_IMAGES** | Cả trước **và** sau | Cần thấy đầy đủ thay đổi mà **không phải đọc lại table** |

- Với **insert**: phần old trống. Với **delete**: phần new trống.

## Triggers = Streams + Lambda

```mermaid
flowchart LR
    A["Item thay đổi trong table (Streams bật)"] --> B["Stream record được thêm vào DDB Stream (24h)"]
    B --> C["Lambda được invoke, nhận dữ liệu VIEW làm event"]
    C --> D["Xử lý: báo cáo, tổng hợp, gửi thông báo..."]
```

1. Item thay đổi trong table đã bật stream.
2. Stream record được thêm vào stream (nội dung theo view type).
3. **Lambda function** được invoke, nhận dữ liệu view làm **event** — chính lần invoke này là "trigger". Phía Lambda gọi là **event source mapping**: Lambda **poll stream** và invoke function với **từng batch record**.

- Event-driven, giống trigger của Oracle nhưng **serverless**: không phải poll database, chỉ tốn compute khi thực sự có thay đổi → rẻ và hiệu quả. Xem [[Event-Driven Architecture]].

### Use case
Ví dụ của bài là cửa hàng Aus-E-Mart:
- **Reporting / analytics**: mỗi lần tồn kho của một sản phẩm (ví dụ Croc Cap) đổi → trigger cập nhật báo cáo **low stock** trực tiếp, không cần job chạy theo lịch.
- **Aggregation**: mỗi đơn hàng ghi vào table orders → trigger cập nhật **tổng doanh số trong ngày** theo sản phẩm.
- **Notification**: sản phẩm hết hàng có hàng trở lại → một lần update item kích hoạt **push notification** tới mọi khách đang chờ (có thể qua [[SNS]]).
- (Bản khóa cũ dùng ví dụ kiểm phiếu cho app bình chọn và app chat nhóm gửi push notification.)

## 🎯 Mẹo thi SAA-C03
- "Thực hiện hành động **khi dữ liệu trong DynamoDB thay đổi**", "trigger", "event-driven, serverless, không polling" → **DynamoDB Streams + Lambda**.
- Nhớ **4 view type** và **24 giờ** retention.
- Cần cả trạng thái trước và sau mà không đọc lại table → **NEW_AND_OLD_IMAGES**.
- Streams phải **bật theo table**; streams cũng là nền tảng cho [[DynamoDB Global Tables]] (replication giữa region; bổ sung, bài không nói).
- DynamoDB Streams là tính năng native, **không phải Kinesis**; Lambda đọc stream qua **event source mapping** (poll, xử lý theo batch).
- Phân biệt: [[S3 Events]] cho thay đổi object S3; [[EventBridge]] cho event của dịch vụ AWS nói chung; DynamoDB Streams cho thay đổi **item** trong table.

## Liên kết
- Tiên quyết: [[DynamoDB Architecture]], [[Lambda]]
- Liên quan: [[Event-Driven Architecture]], [[Serverless Architecture]], [[Kinesis Data Streams]], [[DynamoDB Global Tables]], [[DynamoDB TTL]] (item hết hạn bị xóa cũng xuất hiện trong stream)
- Phân biệt với: [[S3 Events]], [[EventBridge]], [[SNS]]
- Section: [[_MOC 20 NoSQL and Analytics]]
