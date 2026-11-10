---
tags: [saa-c03, s17-hybrid-and-migration, storage, data-transfer, networking]
aliases: [AWS Transfer Family, AWS Transfer for SFTP, Transfer for SFTP]
lessons: ["0316 AWS Transfer Family"]
videos: ["289 AWS Transfer Family"]
---
# Transfer Family

> **TL;DR:** AWS Transfer Family là dịch vụ **managed file transfer**. Nó dựng sẵn các "server" nói **SFTP, FTPS, FTP, AS2** đặt trước **S3 hoặc EFS**, để người dùng hoặc đối tác truyền file bằng giao thức họ đang dùng mà không cần đổi ứng dụng sang API S3/NFS, và bạn không phải quản lý server nào.

## 🖼️ Sơ đồ
![[Transfer Family.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[Transfer Family.svg]]*

![[Transfer Family - endpoints.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[Transfer Family - endpoints.svg]]*

## Khái niệm cốt lõi
- Truyền file **vào/ra S3 và [[EFS]]** bằng giao thức khác với giao thức native của hai dịch vụ này.
- **Giao thức hỗ trợ:**
  | Giao thức | Mô tả |
  |---|---|
  | **FTP** | File Transfer Protocol, **không mã hóa**, giao thức cũ, dùng hạn chế |
  | **FTPS** | FTP + **TLS** |
  | **SFTP** | File transfer chạy trên **SSH** |
  | **AS2** | Applicability Statement 2: truyền **dữ liệu B2B có cấu trúc**, có sẵn tính năng bảo mật/compliance. Gặp trong supply chain/logistics, payment workflow, tích hợp ERP/CRM |
- **Identity provider:**
  - **Service managed** (user tạo ngay trong dịch vụ).
  - **[[Directory Service]]** của AWS.
  - **Custom IdP** qua [[Lambda]] hoặc [[API Gateway]].
- **Managed File Transfer Workflows (MFTW):** workflow engine **serverless**. Định nghĩa các bước xử lý tự động khi file được upload (ví dụ gửi notification, gắn tag...), để gắn Transfer Family vào quy trình nghiệp vụ có sẵn.
- **Quyền truy cập backend:** server dùng **[[IAM Roles]]** để đọc/ghi S3/EFS.
- **Mỗi server chỉ một loại storage**: S3 **hoặc** EFS, chọn lúc tạo và **không đổi được** sau đó. User cần cả hai thì phải có **hai server**.
- Có thể dùng **custom DNS name** cho server.
- Ngoài **managed server** (chức năng chính) còn hai tính năng:
  - **Connector**: chiều ngược lại với server. Thay vì đối tác kết nối vào bạn, Transfer Family **kết nối ra** server **SFTP** hoặc **AS2** của đối tác để **gửi** file (SFTP còn để **lấy** file về), bạn không quản lý hạ tầng nào.
  - **Web app**: cho người dùng truy cập S3 **qua trình duyệt**, không cần cài client truyền file.

## Cách hoạt động / Kiến trúc

```mermaid
flowchart LR
  U["Người dùng ngoài / đối tác (vd medical user)"] -- "SFTP / FTPS / FTP / AS2" --> TS["Transfer Family server (storage S3, custom DNS tùy chọn)"]
  U -- "SFTP / FTPS / FTP" --> TS2["Server thứ hai (storage EFS)"]
  TS -- "IAM role" --> S3["S3"]
  TS2 -- "IAM role" --> EFS["EFS"]
  IDP["Identity: service managed / Directory Service / Custom (Lambda, API GW)"] -.-> TS
  IDP -.-> TS2
```

### Endpoint types
| | **Public** | **VPC – Internet** | **VPC – Internal only** |
|---|---|---|---|
| Vị trí | AWS public zone | Trong VPC + **Elastic IP** | Chỉ trong VPC |
| Truy cập | Internet | Internet + VPC + mạng doanh nghiệp (VPN/DX) | VPC + mạng doanh nghiệp (VPN/DX) |
| Giao thức | **Chỉ SFTP** | SFTP, FTPS, AS2 | SFTP, FTPS, **FTP**, AS2 |
| IP | **Động**, AWS quản lý → nên truy cập bằng DNS | **Static** (EIP) | **Static** (private IP) |
| Kiểm soát truy cập bằng SG/NACL | **Không** | Có ([[Security Groups]], [[NACL]]) | Có |
| Cấu hình mạng | Không cần gì | Cần VPC | Cần VPC |

- **FTP chỉ chạy được internal trong VPC**: không mã hóa nên không được đưa ra internet (không dùng với Public hay VPC Internet).
- **AS2 chỉ dùng với VPC Internet hoặc VPC Internal**, không dùng Public. AS2 **chỉ chạy với S3** (không EFS) và **không có user login**: đối tác dùng **profile, certificate và agreement** riêng của AS2.
- Hai kiểu VPC đều truy cập được từ mạng doanh nghiệp qua [[Direct Connect]] hoặc [[Site-to-Site VPN]], như thể client nằm trong VPC.

### Các điểm khác
- **Multi-AZ**: với endpoint kiểu VPC, chọn subnet ở **tối đa 3 AZ**; một subnet nghĩa là một AZ.
- **Giá:** theo **giờ cho mỗi protocol được bật** trên server + **lượng dữ liệu truyền**. Không có phí trả trước. Tính giờ **từ lúc tạo tới lúc xóa server, kể cả khi server stopped hay idle**.
- **FTP và FTPS chỉ dùng Directory Service hoặc Custom IdP**, không dùng được service-managed identity.

## 🎯 Mẹo thi SAA-C03
- Đề nói cần truy cập **S3/EFS bằng giao thức có sẵn (SFTP/FTPS/FTP/AS2)**, tích hợp với **workflow hiện tại không thể đổi ứng dụng**, hoặc đối tác bên ngoài cần upload file qua SFTP → **Transfer Family**.
- Cần tự động xử lý file sau khi upload mà không dựng server → **MFTW**.
- Ghi nhớ ràng buộc:
  - **Public endpoint chỉ SFTP**, IP động, không gắn được SG/NACL.
  - **FTP = VPC internal only.**
  - **AS2 = VPC (Internet hoặc Internal)**, không Public.
  - **FTP/FTPS = Directory Service hoặc Custom IdP.**
  - **AS2 = chỉ S3**, không user login (profile, certificate, agreement).
  - **Một server = một loại storage** (S3 hoặc EFS), không đổi được sau khi tạo.
  - Cần **IP tĩnh** để đối tác whitelist → endpoint kiểu VPC (VPC Internet có EIP).
- Cần **đẩy file ra** server SFTP/AS2 **của đối tác** mà không dựng hạ tầng → **Transfer Family connector**. Người dùng cần truy cập S3 **qua trình duyệt**, không cài client → **web app**.
- Server **stopped vẫn tính tiền** theo giờ; muốn ngừng trả phí thì xóa server.
- Phân biệt:
  - [[DataSync]]: đồng bộ/migrate khối dữ liệu lớn giữa storage on-prem và AWS (qua agent).
  - [[Storage Gateway]]: hybrid storage lâu dài cho ứng dụng on-prem (NFS/SMB/iSCSI).
  - Transfer Family: **endpoint giao thức truyền file** cho người dùng/hệ thống bên ngoài.

## Liên kết
- Tiên quyết: [[S3 Basics]], [[EFS]], [[IAM Roles]]
- Liên quan: [[Directory Service]], [[Lambda]], [[API Gateway]], [[Security Groups]], [[NACL]], [[AWS Public vs Private Services]], [[Direct Connect]], [[Site-to-Site VPN]]
- Phân biệt với: [[DataSync]], [[Storage Gateway]], [[Snow Family]]
