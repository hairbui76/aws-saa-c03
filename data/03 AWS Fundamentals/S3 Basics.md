---
tags: [saa-c03, s03-aws-fundamentals, storage, s3]
aliases: [S3, Simple Storage Service, S3 Bucket, S3 Object, S3 101]
lessons: ["0058 Simple Storage Service S3 Basics", "0059 DEMO My First S3 Bucket"]
videos: ["025 [ASSOCIATESHARED] Simple Storage Service (S3) Basics", "026 [ASSOCIATESHARED] [DEMO] My First S3 Bucket"]
---
# S3 Basics

> **TL;DR:** S3 (Simple Storage Service) là dịch vụ **object storage** mặc định của AWS: **public service** chạy trong AWS Public Zone, dung lượng gần như vô hạn, nhiều người dùng truy cập cùng lúc, giá rẻ. Dữ liệu nằm trong **bucket** (tạo ở một region, tên **duy nhất toàn cầu**) dưới dạng **object** (key = tên, value = dữ liệu, 0 byte đến **50 TB**).

## 🖼️ Sơ đồ
![[S3 Basics.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[S3 Basics.svg]]*

![[S3 Basics - storage types.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[S3 Basics - storage types.svg]]*

## Khái niệm cốt lõi
- **Global storage platform, regional based/resilient**:
  - "Global" vì chạy ở mọi region và truy cập được từ bất kỳ đâu có Internet. Danh sách bucket trong console liệt kê bucket của **mọi region** (*General purpose buckets – All AWS Regions*), nhưng console S3 nay **có bộ chọn region** như các dịch vụ khác: bucket mới được tạo ở region đang chọn (bản khóa cũ: console S3 hiển thị "Global", không cần chọn region).
  - "Regional" vì dữ liệu at rest nằm ở **một region cụ thể** và **không rời region** trừ khi bạn cấu hình (ví dụ replication, xem [[S3 Replication]]).
  - **Regionally resilient**: dữ liệu được replicate qua **nhiều AZ** trong region nên chịu được mất một AZ.
- **Public service** (xem [[AWS Public vs Private Services]]): chạy trong AWS Public Zone, xử lý **lượng dữ liệu không giới hạn**, thiết kế cho **multi-user** (hàng triệu người cùng đọc).
- Phù hợp: phim, phân phối audio, kho ảnh lớn, dữ liệu văn bản lớn, big dataset, dữ liệu từ hàng triệu thiết bị IoT, ảnh cho blog. Scale từ 0 tới gần vô hạn và **kinh tế**.
- Truy cập qua: **console (GUI)**, **CLI**, **API**, hoặc **HTTP(S)**.
- Adrian: hãy coi S3 là **dịch vụ lưu trữ mặc định** trong AWS, trừ khi yêu cầu không phù hợp.

### Object
- Tương tự file. Thành phần chính:
  - **Key**: giống tên file. **Bucket + key** xác định duy nhất một object.
  - **Value**: nội dung/dữ liệu, kích thước **0 byte → 50 TB** (khóa mới; bản khóa cũ dạy **5 TB**, AWS đã nâng giới hạn object lên 50 TB).
  - Ngoài ra: **version ID**, **metadata**, **access control**, **subresources** (học ở section S3).
- Mặc định **không ai có quyền** trừ account root user, kể cả với public service.

### Bucket
- **Container chứa object**, tạo trong **một region cụ thể** (ví dụ `ap-southeast-2`). Hệ quả:
  - Dữ liệu có **home region**, không tự rời region → **data sovereignty** ổn định, biết rõ luật nào áp dụng.
  - **Blast radius** của sự cố lớn (thiên tai, hỏng dữ liệu diện rộng) giới hạn trong region đó.
- **Tên bucket phải duy nhất toàn cầu**: trên mọi region và **mọi AWS account**. Khác với phần lớn tài nguyên chỉ cần duy nhất trong account/region (ví dụ IAM user tên "Fred" có thể tồn tại ở nhiều account).
- Chứa **không giới hạn số object**, nên dung lượng bucket từ 0 đến vô hạn.
- **Cấu trúc phẳng (flat)**: mọi object nằm cùng một cấp ở root của bucket, không có file system thật.
  - "Folder" trên UI chỉ là **prefix** trong key: các object `old/koala1.jpg`, `old/koala2.jpg` được hiển thị như folder `old`. Tạo folder trong console thực chất là tạo một object có key `archive/`.
  - S3 cũng không suy ra loại file từ tên; `koala1.jpg` chỉ là một key.
- Bucket là nơi đặt **phần lớn cấu hình và permission** của S3.
- **ARN của bucket**: `arn:aws:s3:::koala-campaign-1333337`. Không có region và account ID (để trống bằng `::`) vì tên bucket đã duy nhất toàn cầu. Xem [[IAM Users and ARNs]].

## Bảng so sánh / số liệu
### Exam PowerUp (slide Summary)
| Điểm | Giá trị |
|---|---|
| Tên bucket | **Duy nhất toàn cầu** |
| Độ dài tên | **3–63 ký tự**, toàn **chữ thường**, **không dấu gạch dưới** (chỉ chữ thường, số, dấu chấm, gạch ngang) |
| Ký tự đầu (và cuối) | Chữ thường hoặc số |
| Định dạng IP | **Không được**, ví dụ `1.1.1.1` |
| Số bucket/account | Khóa mới không nêu con số (chỉ nói không cần lo về số bucket). Bản khóa cũ: **100 soft, 1000 hard**, tính cho **cả account** (không theo region). Hiện nay: quota mặc định **10.000** general purpose bucket/account, xin tăng được (xem [[Service Quotas]]) |
| Số object/bucket | Không giới hạn |
| Kích thước object | **0 byte → 50 TB** (bản khóa cũ: 5 TB) |
| Object | **Key = tên, Value = dữ liệu** |

> (Bản khóa cũ nói 100 soft / 1000 hard; khóa mới bỏ con số này. Từ 11/2024 AWS nâng quota mặc định lên **10.000 bucket/account** và có thể xin tăng tới **1 triệu**. Đề thi cũ vẫn có thể dùng con số 100/1000; ý kiến trúc bên dưới vẫn đúng. Giới hạn object 50 TB: slide Summary của khóa mới.)

### Object vs File vs Block storage
| | **Object (S3)** | **File (EFS, FSx)** | **Block (EBS)** |
|---|---|---|---|
| Truy cập | Cả object qua API/HTTP | Duyệt thư mục, network share | Mount như ổ đĩa/volume |
| Cấu trúc | Phẳng (prefix) | Cây thư mục thật | Do OS tạo file system |
| Mount được không | Không | Có (NFS/SMB) | Có |
| Nhiều client | Rất nhiều cùng lúc | Nhiều | Thường **một instance** |

## Cách hoạt động / Kiến trúc
- **Mẫu dùng tốt (patterns)**:
  - Lưu trữ và **phân phối dữ liệu quy mô lớn**.
  - **Offload** dữ liệu tĩnh (ảnh, audio, video của blog) từ EC2 đắt tiền sang S3, cho người dùng tải trực tiếp từ S3 → instance nhỏ hơn. Xem [[S3 Static Website Hosting]].
  - **Input/output mặc định cho các dịch vụ AWS**: hầu hết dịch vụ nhận hoặc xuất dữ liệu đều hỗ trợ S3.
- **Không phù hợp (anti-patterns)**:
  - Cần **file system / network share** (ví dụ Windows server cần share) → dùng file storage ([[EFS]], [[FSx for Windows]]).
  - Cần **mount làm ổ đĩa / volume** cho OS → block storage ([[EBS]]).

## Demo / Lab
1. Console S3 nay có **bộ chọn region** ở góc trên phải; trang Create bucket hiển thị *AWS Region* là region đang chọn (dùng `us-east-1`). Kịch bản: bucket chứa ảnh koala cho chiến dịch của Aus-E-Mart, tên `koalacampaign` thêm số ngẫu nhiên vì tên phải duy nhất toàn cầu. Lỗi "bucket already exists" thường là do người khác đã dùng tên đó, thêm vài chữ số rồi tạo lại.
   - Muốn dùng bucket làm static website với custom domain thì **tên bucket phải trùng tên DNS**.
   - Trang tạo bucket còn có: *Bucket type* (**General purpose** hoặc **Directory** cho S3 Express One Zone), **Copy settings from existing bucket** (dùng cấu hình bucket có sẵn làm mẫu), **Object Ownership** (để mặc định *ACLs disabled*).
2. **Block Public Access**: bucket luôn **private mặc định**. Block Public Access là **chốt an toàn (fail-safe)** chặn mọi quyền public dù có lỡ cấp. Tắt nó **không làm bucket public**, chỉ cho phép bạn cấp quyền public sau này (phải tick xác nhận).
3. Danh sách *General purpose buckets* (All AWS Regions). Tab của bucket: Objects, Metadata, Properties (versioning, encryption, Intelligent-Tiering, logging với CloudTrail, event qua EventBridge, static website...), Permissions, Metrics (CloudWatch), Management (lifecycle, replication), Access Points.
4. Upload 3 ảnh (storage class mặc định **Standard**). Chưa bật versioning nên upload trùng key sẽ **ghi đè** object.
5. **Create folder** `archive` → thực ra tạo object `archive/`; upload ảnh vào đó → key `archive/koala.jpg`.
6. Mở **Object URL** (`https://<bucket>.s3.<region>.amazonaws.com/<key>`) trong tab mới → **AccessDenied** (truy cập ẩn danh, object private). Nút **Open** thì xem được vì URL kèm thông tin xác thực phiên đăng nhập của bạn (presigned, xem [[S3 Presigned URLs]]).
7. Dọn dẹp: xóa bucket là **hai bước**: **Empty** (gõ *permanently delete*) rồi **Delete** (gõ tên bucket). Bucket còn object thì không xóa được.

## 🎯 Mẹo thi SAA-C03
- **Tên bucket duy nhất toàn cầu**: giảng viên lưu ý điểm này hay xuất hiện trong đề.
- Thuộc: object **0 B – 50 TB** (đề hoặc tài liệu cũ có thể còn ghi 5 TB), số object trong bucket không giới hạn. Số bucket mỗi account có quota (bản khóa cũ: 100 soft / 1000 hard; nay mặc định 10.000).
- Đề hỏi hệ thống có **hàng nghìn user, mỗi user cần vùng lưu trữ riêng** → **không** tạo một bucket/user (vướng quota bucket); dùng **một bucket chia theo prefix** cho từng user (kết hợp IAM policy theo prefix). (Mẹo của bản khóa cũ, vẫn đúng.)
- Cần lưu trữ mà nhiều lựa chọn đều được → **S3 là mặc định**, nhất là làm input/output cho dịch vụ khác.
- Cần **mount** hoặc **file share** → không phải S3.
- S3 là **public service** nhưng **private theo mặc định**; Block Public Access là lớp chặn cuối. Xem [[S3 Security]].
- S3 là **regionally resilient** (khác EBS là AZ, IAM là global).

## Liên kết
- Tiên quyết: [[AWS Public vs Private Services]], [[AWS Global Infrastructure]]
- Liên quan: [[S3 Security]], [[S3 Storage Classes]], [[S3 Versioning and MFA Delete]], [[S3 Static Website Hosting]], [[S3 Replication]], [[S3 Presigned URLs]], [[IAM Users and ARNs]], [[Service Quotas]]
- Phân biệt với: [[EBS]] (block), [[EFS]] (file), [[Storage Fundamentals]]
- MOC: [[_MOC 03 AWS Fundamentals]]
