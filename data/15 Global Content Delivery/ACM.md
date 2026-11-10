---
tags: [saa-c03, s15-global-content-delivery, security, certificates, tls]
aliases: [AWS Certificate Manager, Certificate Manager, SSL Certificate, ACM Private CA]
lessons: ["0276 ACM"]
videos: ["253 AWS Certificate Manager (ACM)"]
---
# ACM

> **TL;DR:** AWS Certificate Manager (ACM) tạo, lưu trữ, gia hạn và **deploy SSL/TLS certificate** tới các dịch vụ AWS được hỗ trợ (chủ yếu **CloudFront** và **load balancer**). ACM là dịch vụ **regional**: cert chỉ dùng được trong region của nó. Riêng **CloudFront luôn dùng cert ở us-east-1**.

## 🖼️ Sơ đồ
![[ACM.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[ACM.svg]]*

## Bối cảnh: HTTP → HTTPS
- **HTTP** ban đầu không có xác thực danh tính server, cũng không mã hóa đường truyền. Nếu kẻ tấn công **spoof DNS** thì có thể dẫn người dùng tới server giả mà trình duyệt vẫn hiện địa chỉ "bình thường", từ đó đánh cắp credential hoặc sniff dữ liệu.
- **HTTPS** chạy HTTP bên trong một tunnel **SSL/TLS** (xem [[SSL and TLS]]), mang lại hai thứ:
  1. **Mã hóa in-transit** đối với người quan sát bên ngoài.
  2. **Xác thực danh tính server** bằng **certificate** do một **CA (Certificate Authority)** mà client tin cậy ký (xem [[Digital Signatures]]). Client tin CA nên tin cert mà CA ký, và do đó tin site. Một site tự xưng netflix.com phải có cert netflix.com được CA tin cậy ký.
- Tên DNS và certificate gắn với nhau: site chọn tên miền, có cert cho tên đó, và dùng cert để chứng minh danh tính.

## Khái niệm cốt lõi
- ACM cấp cert theo **hai chế độ**:
  - **Public certificate**: ký bởi một **CA do AWS vận hành**, được trình duyệt/thiết bị public tin cậy. Hệ điều hành và trình duyệt có sẵn danh sách CA tin cậy, các CA này lại tin CA khác, tạo thành **chain of trust**.
  - **Private certificate**: ký bởi một CA do bạn tạo trong **AWS Private CA**. Cùng kiến trúc nhưng chain of trust chỉ nội bộ tổ chức (thường gặp ở doanh nghiệp lớn). Client phải được **cấu hình để tin** private CA, thủ công trong image máy hoặc tự động qua policy.
- **Generate vs Import**:
  - **ACM tạo cert**: chỉ cần chứng minh sở hữu domain bằng **DNS validation** (thêm một CNAME record, dễ nhất nếu domain ở Route 53) hoặc **email validation**. ACM **tự động gia hạn**.
  - **Import cert** từ nguồn ngoài: **bạn tự chịu trách nhiệm gia hạn** (gia hạn ở nguồn ngoài rồi import lại).
- Cert luôn được **lưu mã hóa** và deploy một cách managed, an toàn tới **dịch vụ được hỗ trợ**.

## Dịch vụ được hỗ trợ
- ACM chỉ deploy cert tới **dịch vụ tích hợp với ACM** (integrated services). Toàn bộ giá trị của ACM (tạo, deploy, gia hạn tự động) chỉ có ở các dịch vụ này.
- **Tích hợp**: **CloudFront**, **load balancer** ([[Elastic Load Balancer|ALB/NLB]]), **API Gateway**, **EKS** và một số dịch vụ khác. Không phải dịch vụ AWS nào cũng tích hợp.
- **KHÔNG tích hợp: EC2**. Lý do: EC2 là compute tự quản lý, bạn giữ quyền root trên instance, nên AWS không có cách bảo vệ việc chuyển và cài cert. Mục đích của ACM là bảo vệ việc lưu trữ và triển khai cert, nên ACM không tự deploy lên EC2.
- **Exportable certificate**: cần dùng cert ở dịch vụ ngoài AWS hoặc dịch vụ không tích hợp (như EC2, server on-prem) thì **request một exportable certificate rồi export** ra và **tự quản lý** (tự cài, tự gia hạn). Khi giảng viên nói "ACM không hỗ trợ dịch vụ X" là nói về phần tích hợp tự động này. (Bổ sung theo AWS hiện tại, bài không nói: exportable public certificate có tính phí.)
- **S3 không dùng ACM**. S3 tự xử lý certificate của nó khi làm origin cho CloudFront.

## Kiến trúc regional
```mermaid
flowchart LR
    SA["Security admin"] --> A1["ACM us-west-1"]
    SA --> A2["ACM us-east-1"]
    SA --> A3["ACM ap-southeast-2"]
    A1 --> L1["ALB us-west-1"]
    A2 --> L2["ALB us-east-1"]
    A2 --> D["CloudFront distribution (coi như ở us-east-1)"]
    D --> E["Mọi edge location toàn cầu"]
    A3 --> L3["ALB ap-southeast-2"]
    A1 -. "KHÔNG: cross-region" .-> L2
    A3 -. "KHÔNG: EC2 không hỗ trợ" .-> EC2["EC2 instance"]
```
- Mỗi region có một ACM **độc lập**. Cert được tạo hoặc import vào region nào thì **bị khóa ở region đó**: ACM không copy sang region khác, dịch vụ ở region khác không tích hợp được với cert đó (exportable cert thì bạn tự export một bản, nhưng đó không phải tích hợp).
- Muốn dùng cert cho ALB ở `ap-southeast-2` thì cert **phải nằm trong ACM ở `ap-southeast-2`**. Admin phải tạo/import cert **ở từng region có dịch vụ cần dùng**.
- **CloudFront**: là dịch vụ global, nhưng về mặt ACM hãy coi **distribution nằm ở us-east-1 (N. Virginia)**. Cert phải ở **us-east-1**. ACM deploy cert vào distribution, rồi distribution đẩy cert ra mọi edge location ở mọi nơi. Cert tạo ở region khác sẽ **không gắn được** vào CloudFront.
- Khi cert đã được deploy, khách hàng có thể thiết lập kết nối tin cậy và an toàn tới ALB hoặc edge location.

## 🎯 Mẹo thi SAA-C03
- **ACM generate thì tự gia hạn. Import thì tự gia hạn bằng tay.**
- **ACM không tích hợp với EC2** (câu bẫy rất phổ biến). Muốn HTTPS cho ứng dụng trên EC2 với cert ACM, quản lý và gia hạn tự động, thì đặt **ALB phía trước** và terminate TLS ở ALB (xem [[SSL Offload and Session Stickiness]]). Exportable certificate cài tay lên EC2 được, nhưng bạn tự lo cài và gia hạn, không phải đáp án "ít vận hành".
- **Cert phải cùng region với dịch vụ** (ALB ở Sydney thì cert ở Sydney). **Không cross-region.**
- **CloudFront thì cert luôn ở us-east-1.** Các tích hợp regional khác của CloudFront cũng nghĩ theo hướng us-east-1.
- Đề thường cho tình huống lỗi "không chọn được cert trong CloudFront hoặc ALB": nguyên nhân thường là **sai region**.

## Liên kết
- Tiên quyết: [[SSL and TLS]], [[Encryption Fundamentals]], [[Digital Signatures]]
- Dùng cùng: [[CloudFront and SSL]], [[Elastic Load Balancer]], [[SSL Offload and Session Stickiness]], [[API Gateway]]
- Liên quan: [[R53 Public Hosted Zones]] (DNS validation), [[CloudFront Architecture]]
- Phân biệt với: [[KMS]], [[CloudHSM]] (quản lý key, không phải certificate)
- Section: [[_MOC 15 Global Content Delivery]]
