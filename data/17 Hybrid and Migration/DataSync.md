---
tags: [saa-c03, s17-hybrid-and-migration, storage, migration, data-transfer]
aliases: [AWS DataSync, Data Sync]
lessons: ["0313 DataSync"]
videos: ["286 AWS DataSync"]
---
# DataSync

> **TL;DR:** AWS DataSync là dịch vụ truyền dữ liệu **qua mạng (online)**, được quản lý end-to-end, để chuyển dữ liệu **vào hoặc ra khỏi AWS** (và giữa các dịch vụ storage AWS với nhau). Nó lo luôn lịch chạy, giới hạn băng thông, retry, nén, mã hóa, giữ metadata và tự kiểm tra tính toàn vẹn dữ liệu. Trên đề, đây là lựa chọn "điện tử" khi cần chuyển lượng dữ liệu lớn một cách tin cậy, khác với thiết bị vật lý như [[Snow Family]].

## 🖼️ Sơ đồ
![[DataSync.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[DataSync.svg]]*

## Khái niệm cốt lõi
- **Bài toán:** trước đây chuyển dữ liệu vào AWS chủ yếu là upload/download thủ công hoặc gửi thiết bị vật lý (Snowball/Snowball Edge). DataSync quản lý toàn bộ quá trình qua đường mạng.
- **Use case điển hình:**
  - Migration dữ liệu từ on-premises lên AWS.
  - Đưa dữ liệu lên AWS để xử lý rồi kéo kết quả về lại (hai chiều).
  - Archive dữ liệu sang storage giá rẻ của AWS (ví dụ các [[S3 Storage Classes]] lạnh).
  - Một phần của kế hoạch DR / business continuity (xem [[HA vs FT vs DR]]).
- **Quy mô (số liệu theo khóa học):**
  - Mỗi **task ~10 Gbps**, tương đương khoảng **100 TB/ngày** (bản khóa cũ nói ~10 Gbps **mỗi agent**).
  - Bản khóa cũ nêu, bài mới không nói: mỗi task xử lý được tới khoảng **50 triệu file**.
- **Giữ metadata**: permission, timestamp. Đây là điều kiện cần khi migrate cấu trúc thư mục phức tạp.
- **Built-in data validation** (bật mặc định): dữ liệu tới AWS được so khớp với bản gốc. Ví dụ hay gặp: chuyển hồ sơ y tế/ảnh chụp cần chứng minh dữ liệu không bị sai lệch.

### Tính năng chính
| Tính năng | Ý nghĩa |
|---|---|
| Scalable | ~10 Gbps/task (~100 TB/ngày) |
| Bandwidth limiter | Đặt trần băng thông (MiB/s) để không làm nghẽn đường internet, giảm ảnh hưởng tới người dùng |
| Incremental & scheduled | Chỉ chuyển phần thay đổi; đặt lịch chạy vào hoặc tránh một số khung giờ |
| Compression & encryption | Nén dữ liệu; mã hóa in-transit bằng TLS (xem [[SSL and TLS]]) |
| Recovery khi lỗi đường truyền | Transfer bị ngắt thì lần chạy sau **chỉ chuyển phần còn thiếu**, dữ liệu cuối cùng đầy đủ và nhất quán |
| Service integration | S3 (các storage class), [[EFS]] và **cả họ FSx**: [[FSx for Windows]], [[FSx for Lustre]], FSx for NetApp ONTAP, FSx for OpenZFS. Hỗ trợ cả service-to-service, ví dụ EFS → EFS, kể cả cross-region |
| Giá | Pay-as-you-use: phí theo **GB dữ liệu được chuyển**, cộng một khoản nhỏ **mỗi lần chạy** nếu dùng **enhanced mode** (khi cần throughput lớn hơn) |

## Cách hoạt động / Kiến trúc

```mermaid
flowchart LR
  subgraph ONPREM["On-premises"]
    NAS["SAN / NAS storage"]
    AG["DataSync Agent (VM trên VMware)"]
    NAS <-- "NFS / SMB" --> AG
  end
  subgraph AWS["AWS Region (vd us-east-1)"]
    EP["DataSync Endpoint"]
    S3["S3 (các storage class)"]
    subgraph VPC
      EFS["EFS"]
      FSX["FSx for Windows File Server"]
    end
    EP --> S3
    EP --> EFS
    EP --> FSX
  end
  AG <-- "TLS, có schedule + bandwidth limit" --> EP
```

- **Agent** được cài on-premises dưới dạng máy ảo trên nền tảng ảo hóa (ví dụ VMware). Agent nói chuyện với storage nội bộ qua **NFS** (thường cho Linux/Unix) hoặc **SMB** (thường cho Windows), nên gần như mọi SAN/NAS đều tích hợp được.
- Agent kết nối tới **DataSync endpoint** trong AWS, từ đó ghi dữ liệu vào S3, EFS hoặc FSx (EFS/FSx nằm trong VPC).
- Có thể đặt schedule và bandwidth limit để không ảnh hưởng giờ làm việc.

### Các thành phần
- **Task**: một "job". Định nghĩa đồng bộ cái gì, tốc độ bao nhiêu (throttle), lịch chạy, và **hai location**: FROM và TO.
- **Agent**: phần mềm đọc/ghi vào data store on-premises qua **NFS, SMB**, và cả **HDFS** (cluster Hadoop) hay **object storage**, kéo dữ liệu lên AWS hoặc đẩy ngược về.
- **Location**: mỗi task có đúng hai location (nguồn và đích). Ví dụ: NFS, SMB, Amazon EFS, Amazon FSx, Amazon S3. Location còn có thể là **storage của cloud khác**, như **Azure Blob Storage** hay **Google Cloud Storage**.
- **Cần agent** khi một đầu là **storage tự quản lý** (NFS, SMB…). Truyền **giữa các dịch vụ AWS với nhau thì không cần agent**.

> Bổ sung, bài không nói: agent chạy được trên VMware, Hyper-V, KVM hoặc EC2. Đề SAA-C03 vẫn chỉ hỏi ở mức kiến trúc.

## 🎯 Mẹo thi SAA-C03
- Câu hỏi DataSync thường **không** hỏi chi tiết tính năng. Đề bắt bạn **chọn giữa DataSync và một cách khác** để đưa dữ liệu vào AWS.
- Chọn **DataSync** khi đề có các từ khóa sau:
  - Chuyển **online / qua mạng** (loại Snowball/Snowball Edge, vốn là thiết bị vật lý → [[Snow Family]]).
  - Truyền **hai chiều** (vào và ra AWS).
  - Cần **schedule**, **bandwidth throttling**, **incremental**, **automatic retry**, **compression**, **data validation/integrity**.
  - Đích là **S3, EFS hoặc FSx** (mọi loại FSx); nguồn là NAS/SAN dùng **NFS hoặc SMB**, HDFS, object storage, hoặc storage của **cloud khác** (Azure Blob, Google Cloud Storage).
  - Khối lượng dữ liệu lớn, nhiều file, cần tin cậy.
- Nhớ kiến trúc: **agent on-premises** → (NFS/SMB tới storage nội bộ) → **DataSync endpoint** → S3/EFS/FSx.
- **Agent chỉ cần** khi có storage tự quản lý (NFS/SMB…). Chuyển **giữa các dịch vụ AWS** (ví dụ EFS → EFS khác region) thì **không cần agent**.
- Một task ~**10 Gbps** (~100 TB/ngày).
- Phân biệt:
  - [[Storage Gateway]]: tích hợp **lâu dài** (hybrid storage, file/volume/tape gateway, cache cục bộ). DataSync dùng để **di chuyển/đồng bộ** dữ liệu.
  - [[Snow Family]]: offline, khi băng thông không đủ hoặc dữ liệu quá lớn so với thời gian cho phép.
  - [[Transfer Family]]: cho **người dùng/đối tác bên ngoài** đẩy file vào S3/EFS bằng SFTP/FTPS/FTP/AS2.
  - [[DMS]]: migrate **database**, không phải file.

## Liên kết
- Tiên quyết: [[S3 Basics]], [[EFS]], [[Storage Fundamentals]]
- Liên quan: [[FSx for Windows]], [[FSx for Lustre]], [[S3 Storage Classes]], [[Site-to-Site VPN]], [[Direct Connect]]
- Phân biệt với: [[Storage Gateway]], [[Snow Family]], [[Transfer Family]], [[DMS]]
