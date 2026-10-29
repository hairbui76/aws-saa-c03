---
tags: [saa-c03, s05-s3, s3, storage, performance, networking]
aliases: [Multipart Upload, MPU, S3 Transfer Acceleration, S3TA, Accelerated Transfer]
lessons: ["0092 S3 Performance Optimization", "0093 DEMO S3 Performance"]
---
# S3 Performance Optimization

> **TL;DR:** Hai tính năng chính giúp upload lên S3 nhanh và tin cậy hơn: **Multipart Upload** (chia dữ liệu thành nhiều part upload song song, part lỗi thì chỉ gửi lại part đó) và **S3 Transfer Acceleration** (đưa dữ liệu vào **edge location** gần nhất rồi đi trên **AWS global network** tới bucket ở xa).

## 🖼️ Sơ đồ
![[S3 Performance Optimization.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[S3 Performance Optimization.svg]]*

![[S3 Performance Optimization - acceleration.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[S3 Performance Optimization - acceleration.svg]]*

## Khái niệm cốt lõi
- Bối cảnh [[Animals4life Scenario]]: nhân viên ở xa, mạng chậm/không ổn định, phải upload dataset lớn thường xuyên về trụ sở. Mục tiêu là **hiệu năng + độ tin cậy**.

### Single PUT upload (mặc định)
- File được upload thành **một blob, một stream** qua API `PutObject`.
- Stream đứt là **hỏng cả upload**, phải làm lại từ đầu (đứt ở 4,5 GB của file 5 GB → mất trắng 4,5 GB).
- Một stream thường **không tận dụng hết băng thông** của cả hai đầu, nhất là khi truyền xa. (Tốc độ tối đa luôn bị giới hạn bởi đầu chậm hơn, nhưng single stream thường còn không đạt tới mức đó.)
- Giới hạn: single PUT tối đa **5 GB**. Adrian: đừng bao giờ tin single PUT với lượng dữ liệu gần mức đó.

### Multipart Upload
- Chia blob gốc thành nhiều **part**, mỗi part là một upload độc lập: lỗi thì **chỉ retry part đó**.
- Upload các part **song song** → tốc độ tổng = tổng tốc độ các part, tận dụng băng thông tốt hơn, vượt qua giới hạn single-stream của ISP/mạng.
- Số liệu:

| Thông số | Giá trị |
|---|---|
| Ngưỡng dùng (theo khóa học) | dữ liệu từ **100 MB** trở lên |
| Số part tối đa | **10.000** |
| Kích thước mỗi part | **5 MB – 5 GB** (part cuối được nhỏ hơn 5 MB) |
| Single PUT tối đa | **5 GB** |

- Khuyến nghị: dùng multipart **ngay khi có thể** (>100 MB); hầu hết tool AWS (CLI, SDK) tự bật multipart. Trên 100 MB gần như không có lý do dùng single PUT.
- (Chính xác theo AWS: về kỹ thuật multipart dùng được với object lớn hơn 5 MB; 100 MB là ngưỡng AWS **khuyến nghị**. Với object > 5 GB thì **bắt buộc** multipart.)

### S3 Transfer Acceleration
- Vấn đề: S3 là **public service, regional**. Upload từ Úc tới bucket London phải đi suốt **public internet** tới tận UK mới vào AWS public zone. Đường đi do router/ISP quyết định theo lợi ích thương mại, có thể vòng vèo, nhiều hop, chậm dần.
- Giải pháp: dùng mạng **edge location** của AWS:
  1. Client upload tới **edge location gần nhất** (vẫn qua public internet nhưng rất ngắn, ít mạng trung gian).
  2. Edge location chuyển dữ liệu qua **AWS global network** (mạng riêng AWS kiểm soát, ít điểm dừng, độ trễ thấp và ổn định) tới bucket.
- Ví von: internet như hệ thống xe buýt công cộng (linh hoạt, đến mọi nơi nhưng nhiều lần chuyển tuyến); AWS network như **tàu tốc hành** chỉ dừng ở điểm đầu và cuối.
- **Mặc định tắt**, bật ở mức bucket. Điều kiện tên bucket: **không chứa dấu chấm (`.`)** và phải **DNS-compatible**.
- Khi bật, bucket có **endpoint riêng** (dạng `<bucket>.s3-accelerate.amazonaws.com`); phải dùng endpoint này mới có hiệu quả, nó resolve tới edge location tốt nhất.
- Lợi ích tăng theo **khoảng cách** và **chất lượng đường truyền gốc càng kém** thì càng lợi.

```mermaid
flowchart LR
  subgraph Direct["Không acceleration"]
    A1["Team ở Úc"] -->|"public internet, nhiều hop"| B1["S3 bucket eu-west-2 London"]
  end
  subgraph Accel["Transfer Acceleration"]
    A2["Team ở Úc"] -->|"public internet, quãng ngắn"| E["Edge location gần nhất"]
    E -->|"AWS global network"| B2["S3 bucket eu-west-2 London"]
  end
```

## Bổ sung (không có trong bài, hay gặp trong đề)
- S3 tự scale: tối thiểu **3.500 PUT/COPY/POST/DELETE** và **5.500 GET/HEAD request/giây cho mỗi prefix**; dùng nhiều prefix để tăng throughput song song.
- **Byte-range fetches**: tải song song nhiều đoạn byte của một object để tăng tốc download (tương tự multipart cho chiều tải xuống).
- Muốn giảm độ trễ **download** cho người dùng toàn cầu → [[CloudFront Architecture|CloudFront]] (cache); Transfer Acceleration chủ yếu tối ưu **upload** đường dài.

## Demo / Lab
- Tạo bucket (tên không có dấu chấm) → Properties → **Transfer acceleration: Enable** → nhận endpoint mới.
- Dùng công cụ **S3 Transfer Acceleration Speed Comparison** của AWS: so sánh tốc độ upload trực tiếp vs qua acceleration tới từng region. Kết quả của Adrian: nhanh hơn ~144% tới us-east-1; region càng xa (Oregon, Dublin) lợi ích càng lớn, region gần (San Francisco) gần như không khác.

## 🎯 Mẹo thi SAA-C03
- Upload file lớn qua mạng không ổn định, muốn **resume/retry từng phần**, tăng tốc → **Multipart Upload**.
- Object **> 5 GB** → bắt buộc multipart (single PUT tối đa 5 GB). Từ **100 MB** nên dùng multipart.
- Người dùng **ở xa region của bucket** (khác lục địa) upload chậm → **S3 Transfer Acceleration**.
- Bucket có dấu chấm trong tên → **không** bật được Transfer Acceleration.
- Phải dùng **accelerate endpoint**; bật tính năng mà vẫn dùng endpoint thường thì không có tác dụng.
- Phân biệt: Transfer Acceleration dùng edge location cho **S3**; [[Global Accelerator]] dùng edge/anycast cho ứng dụng TCP/UDP (ALB, NLB, EC2); [[CloudFront Architecture|CloudFront]] dùng edge để **cache nội dung** khi đọc.
- Dữ liệu cực lớn (hàng chục TB+) mà mạng yếu → cân nhắc [[Snow Family]] hoặc [[DataSync]]/[[Direct Connect]] thay vì chỉ tối ưu upload.

## Liên kết
- Tiên quyết: [[S3 Basics]], [[AWS Global Infrastructure]], [[AWS Public vs Private Services]]
- Liên quan: [[Animals4life Scenario]], [[CloudFront Architecture]], [[DataSync]], [[Snow Family]]
- Phân biệt với: [[Global Accelerator]], [[CloudFront Architecture]]
