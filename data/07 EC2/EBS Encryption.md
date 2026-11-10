---
tags: [saa-c03, s07-ec2, ec2, storage, ebs, security, encryption, kms]
aliases: [EBS Volume Encryption, Encrypted EBS, EBS DEK]
lessons: ["0140 EBS Encryption"]
videos: ["134 [ASSOCIATESHARED] EBS Encryption"]
---
# EBS Encryption

> **TL;DR:** EBS encryption mã hóa **at rest** cho volume và snapshot bằng [[KMS]]. KMS key sinh ra một **data encryption key (DEK) riêng cho mỗi volume**; DEK được giải mã và giữ **trong memory của EC2 host**, host mã hóa/giải mã dữ liệu giữa instance và volume bằng AES-256. OS không biết gì về việc mã hóa; tính năng **miễn phí** (chỉ trả phí dùng KMS) → nên bật mặc định.

## 🖼️ Sơ đồ
![[EBS Encryption.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[EBS Encryption.svg]]*

![[EBS Encryption - dek.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[EBS Encryption - dek.svg]]*

## Khái niệm cốt lõi
- Mặc định EBS **không mã hóa**: dữ liệu OS ghi xuống được lưu dạng **plaintext** trên đĩa vật lý → rủi ro, một vector tấn công vật lý.
- EBS encryption mã hóa **dữ liệu at rest trên volume**, **dữ liệu in transit giữa EC2 host và volume**, **snapshot** của volume và **volume tạo từ snapshot đó**.
- Key dùng:
  - **AWS managed key** mặc định: `aws/ebs`, hoặc
  - **Customer managed KMS key** do bạn tạo và quản lý.
- Mã hóa xảy ra **giữa EC2 host và EBS**, thuật toán **AES-256**.

## Cách hoạt động / Kiến trúc

```mermaid
sequenceDiagram
    participant EBS as EBS
    participant KMS as KMS (KMS key)
    participant Host as EC2 Host (memory)
    participant Vol as Raw storage của volume
    EBS->>KMS: GenerateDataKeyWithoutPlaintext
    KMS-->>EBS: DEK đã mã hóa (riêng cho volume)
    EBS->>Vol: Lưu DEK đã mã hóa cùng volume
    Note over Host,Vol: Khi volume được attach / instance launch
    EBS->>KMS: Decrypt DEK (cần quyền kms:Decrypt)
    KMS-->>Host: DEK plaintext, chỉ nằm trong memory host
    Host->>Vol: Instance ghi dữ liệu, host mã hóa thành ciphertext
    Vol-->>Host: Đọc ciphertext, host giải mã trả plaintext cho OS
    Note over Host: Instance chuyển host thì DEK plaintext bị hủy,<br/>host mới phải xin KMS giải mã lại
```

1. Khi tạo volume mã hóa, EBS gọi KMS **`GenerateDataKeyWithoutPlaintext`** → nhận **DEK đã mã hóa**, lưu cùng volume trên raw storage. Volume lúc đầu trống nên chưa có gì để mã hóa.
2. DEK chỉ giải mã được qua KMS, bởi thực thể **có quyền decrypt** với KMS key tương ứng.
3. Khi volume được dùng lần đầu (attach vào instance hoặc instance launch), EBS nhờ KMS **giải mã DEK** và nạp vào **memory của EC2 host** đang dùng volume. DEK plaintext **chỉ tồn tại trong memory host**.
4. Host dùng DEK mã hóa/giải mã dữ liệu đi giữa instance và volume → trên đĩa luôn là **ciphertext**; plaintext chỉ có trong memory host.
5. Instance chuyển host → DEK plaintext trên host cũ bị **hủy**, chỉ còn bản mã hóa đi kèm volume; host mới phải giải mã lại qua KMS.
6. **Snapshot** của volume mã hóa dùng **cùng DEK** → snapshot cũng mã hóa. Volume restore từ snapshot đó cũng được mã hóa: giữ **cùng KMS key** thì dùng lại **cùng DEK**; khi restore (hoặc copy) bạn được **chọn KMS key khác**, lúc đó KMS sinh **DEK mới** dưới key mới. KMS vẫn cần quyền với key gốc để giải mã DEK của snapshot trong lúc restore.

### Quy tắc DEK (giảng viên nhấn mạnh nhiều lần)
| Hành động | DEK |
|---|---|
| Tạo volume **mới từ đầu** | **DEK mới, duy nhất** cho volume đó |
| Tạo volume mới khác từ đầu | DEK khác |
| Snapshot volume mã hóa | **Cùng DEK** với volume |
| Tạo volume từ snapshot đó, **cùng KMS key** | **Cùng DEK** |
| Restore / copy với **KMS key khác** | **DEK mới** dưới key mới |

## Các điểm tóm tắt (Exam PowerUp)
- **Account có thể bật "encrypt by default"** (thiết lập theo từng region) với một **default KMS key**; nếu không thì chọn KMS key thủ công mỗi lần tạo volume.
- KMS key **không trực tiếp** mã hóa volume; nó sinh ra **DEK riêng cho từng volume** (xem [[KMS]] về envelope encryption).
- **Không thể bỏ mã hóa** khỏi volume hay snapshot: đã mã hóa là mã hóa mãi. Cách vòng duy nhất: trong OS (nơi thấy plaintext), **copy dữ liệu** sang một volume không mã hóa. Console/CLI/API không hỗ trợ.
- **OS không biết có mã hóa**: OS chỉ thấy plaintext. Mã hóa xảy ra giữa host và EBS.
- Nếu cần **OS tự mã hóa và tự giữ key** (không để EC2/EBS/KMS giữ) → dùng **software disk encryption** trong OS. Có thể dùng đồng thời với EBS encryption (ít khi có ý nghĩa).
- EBS encryption: **tính năng không tốn phí**, chỉ trả phí dùng KMS, rất hiệu quả, không phải lo quản lý key → nên dùng mặc định. Nhiều tổ chức còn bắt buộc theo quy định. (Bản khóa cũ nói thêm: không giảm hiệu năng.)

### Mã hóa một volume chưa mã hóa
- **Không bật mã hóa được cho volume hoặc snapshot sau khi đã tạo.** Quy trình: **snapshot** volume → tạo **volume mới có mã hóa** từ snapshot đó → thay volume cũ. (Bổ sung, bài không nói: cũng có thể **copy snapshot với tùy chọn encrypt** rồi tạo volume từ bản copy.)
- (Bổ sung, bài không nói) Chia sẻ snapshot/AMI mã hóa sang account khác cần dùng **customer managed key** và cấp quyền trong key policy; key `aws/ebs` không chia sẻ được.

## 🎯 Mẹo thi SAA-C03
- Yêu cầu "mọi EBS volume mới phải được mã hóa" → bật **EBS encryption by default** cho account/region.
- Volume mã hóa → snapshot mã hóa → volume từ snapshot mã hóa (cùng DEK nếu giữ KMS key; đổi KMS key thì DEK mới). Không có cách "gỡ mã hóa" qua AWS, cũng không bật mã hóa được cho volume đã tạo: phải snapshot rồi tạo volume mã hóa.
- Cần **chính bạn giữ key ở mức OS**, AWS không được truy cập key → software/full-disk encryption trong OS (hoặc [[CloudHSM]] cho quản lý key), không phải EBS encryption.
- "Mã hóa có tốn thêm không?" → tính năng **miễn phí**, chỉ trả phí dùng KMS.
- Thực thể dùng volume cần quyền KMS (decrypt) với key tương ứng; nếu key bị disable/xóa, volume không dùng được.
- Encryption at rest trên EBS khác với [[S3 Encryption]] (SSE-S3/SSE-KMS/SSE-C) nhưng cùng ý tưởng envelope encryption với KMS.

## Liên kết
- Tiên quyết: [[KMS]], [[Encryption Fundamentals]], [[EBS]]
- Liên quan: [[EBS Snapshots]], [[AMI]], [[S3 Encryption]], [[RDS Security]], [[CloudHSM]]
- Phân biệt với: [[S3 Encryption]], [[SSL and TLS]] (encryption in transit)
