---
tags: [saa-c03, s07-ec2, ec2, compute, security, access, demo]
aliases: [EC2 Instance Connect, EIC, SSH Key Pair, Connect to EC2, EC2 Instance Connect prefix list]
lessons: ["0128 DEMO EC2 SSH vs EC2 Instance Connect"]
videos: ["122 [ASSOCIATESHARED] [DEMO] EC2 SSH vs EC2 Instance Connect"]
---
# EC2 Instance Connect and SSH

> **TL;DR:** Có hai cách cơ bản để vào shell của EC2 Linux: **SSH client cục bộ** dùng key pair, và **EC2 Instance Connect** dùng quyền IAM qua trình duyệt. Điểm mấu chốt: với Instance Connect, kết nối đến instance **xuất phát từ dịch vụ AWS**, không phải từ máy bạn, nên Security Group phải cho phép **dải IP của dịch vụ EC2 Instance Connect** trong region đó.

## 🖼️ Sơ đồ
![[EC2 Instance Connect and SSH.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[EC2 Instance Connect and SSH.svg]]*

## Khái niệm cốt lõi

### Cách 1: SSH client cục bộ + key pair
- Tạo **key pair** trong EC2 console (ví dụ `AEM`, loại RSA). Định dạng:
  - **PEM**: Linux, macOS, Windows 10 trở lên (OpenSSH).
  - **PPK**: cho PuTTY (Windows 8 trở về trước).
- AWS giữ public key và chèn vào instance lúc launch; bạn tải private key về **một lần duy nhất**.
- Lệnh mẫu: `ssh -i "AEM.pem" ec2-user@<public-DNS>` (console có sẵn lệnh ở tab *SSH client*).
- **Lỗi permission**: SSH client từ chối dùng key nếu quyền file quá rộng (ví dụ 644, người dùng khác đọc được). Sửa bằng `chmod 400 AEM.pem` (Linux/macOS); trên Windows thì vào Properties → Security, bỏ quyền của mọi user khác.
- Lần đầu kết nối sẽ hỏi xác nhận **host fingerprint**. Đây là cơ chế chống giả mạo: DNS có thể bị thao túng để trỏ sang server khác, fingerprint giúp xác minh đúng là instance bạn muốn vào.
- Yêu cầu:
  - Có **kết nối mạng** tới instance (public IP hoặc private connectivity).
  - Có **private key** trên máy. Khó mở rộng: cả team đều cần bản sao key → vấn đề quản trị khi làm ở quy mô lớn.
  - [[Security Groups|Security Group]] cho phép **IP của máy bạn** vào cổng TCP 22.

### Cách 2: EC2 Instance Connect
- Trong console: chuột phải instance → Connect → EC2 Instance Connect → mở terminal **ngay trong trình duyệt**.
- **Không cần key**: xác thực bằng **quyền IAM** (identity policy gắn trên user/group/role). Phù hợp cấp quyền truy cập theo quy mô lớn. Xem [[IAM Identity Policies]].
- Phải chọn đúng **username** theo AMI: Amazon Linux 2 → `ec2-user`, Ubuntu → `ubuntu`, CentOS → `centos`... Với AMI mặc định AWS thường đoán đúng; với custom AMI thường đoán sai.
- **Luồng kết nối**: trình duyệt → dịch vụ AWS → **EC2 Instance Connect service** mở kết nối SSH tới instance. Vì vậy SG phải cho phép **dải IP của dịch vụ EC2 Instance Connect** (không phải IP của bạn).
- Cách gọn nhất để cho phép dải đó: trong rule SSH chọn source là **AWS-managed prefix list của EC2 Instance Connect** (gõ "connect" trong ô source, chọn bản IPv4). AWS tự duy trì danh sách IP trong prefix list, bạn không phải tra và gõ tay. (Bản khóa cũ dùng file `ip-ranges.json` để lấy dải `EC2_INSTANCE_CONNECT` rồi nhập thủ công; xem [[Security Groups]] về prefix list.)

```mermaid
flowchart LR
    subgraph SSH["SSH client cục bộ"]
      L["Máy của bạn<br/>có private key .pem"] -- "TCP 22 từ IP của bạn" --> I1["EC2 instance<br/>(public IP)"]
    end
    subgraph EIC["EC2 Instance Connect"]
      B["Trình duyệt<br/>(quyền IAM)"] --> S["EC2 Instance Connect service<br/>(dải IP AWS theo region)"]
      S -- "TCP 22 từ dải IP của dịch vụ" --> I2["EC2 instance<br/>(public IP)"]
    end
```

### Phạm vi truy cập
- Instance Connect qua **console (GUI)** chỉ kết nối được instance có **public addressing**.
- **EC2 Instance Connect CLI** có thể kết nối instance **private** nếu bạn có private connectivity (VPN, [[Direct Connect]]).
- Màn hình *Connect* trong console hiện có 4 cách kết nối qua trình duyệt (thấy trên màn hình của bài demo): **EC2 Instance Connect** (public subnet, SSH key tạm do AWS quản lý), **EC2 Instance Connect Endpoint** (instance ở private subnet, đi qua một VPC endpoint), **SSM Session Manager** (xác thực IAM, không cần SSH key, bastion hay mở cổng inbound) và **EC2 Serial Console** (truy cập serial port để xử lý sự cố boot/mạng). Bài demo NAT Gateway regional ([[NAT Gateway]]) có dùng EC2 Instance Connect Endpoint.
- **Session Manager** (thuộc Systems Manager) không có các giới hạn của EC2 Instance Connect thường: vào được cả instance public lẫn private, không cần mở cổng 22. Được đề cập ở bài riêng sau.
- (Bổ sung, bài không nói: EC2 Instance Connect Endpoint ra mắt năm 2023, cho kết nối instance private mà không cần public IP, [[Bastion Host]] hay VPN.)

## Demo / Lab
1. Tạo key pair `AEM` (RSA, `.pem`), deploy stack CloudFormation (chọn KeyName = AEM) tạo instance public trong VPC Aus-E-Mart.
2. SG ban đầu cho phép SSH từ mọi IPv4 (`0.0.0.0/0`); console còn cảnh báo cổng 22 đang mở cho mọi IPv4 và gợi ý chỉ mở cho dải IP của dịch vụ EC2 Instance Connect trong region.
3. SSH bằng client cục bộ (lệnh copy từ tab *SSH client*) → xác nhận fingerprint → lỗi permission key → `chmod 400` → kết nối được.
4. Instance Connect → vào được, không cần key.
5. Sửa SG: rule SSH đổi sang **My IP** → SSH cục bộ vẫn vào được, nhưng **Instance Connect không kết nối được** (kết nối đi từ dịch vụ EC2 Instance Connect, không phải từ trình duyệt của bạn).
6. Xóa rule cũ, thêm rule SSH với source là **prefix list AWS-managed của EC2 Instance Connect** (bản IPv4) → Instance Connect hoạt động lại, còn SSH cục bộ bị chặn.
7. Dọn dẹp: xóa stack.
- (Bản khóa cũ ở bước 6 tra file **`ip-ranges.json`**, lấy dải của service `EC2_INSTANCE_CONNECT` ở `us-east-1` rồi nhập tay.)
- Rút ra: cho phép `0.0.0.0/0` là cách dễ nhưng là bad practice cho production. Cách an toàn là chỉ cho phép dải IP của dịch vụ Instance Connect.

## 🎯 Mẹo thi SAA-C03
- **Instance Connect không chạy dù SSH từ máy bạn chạy được** → SG đang chỉ cho phép IP của bạn; cần cho phép dải IP của dịch vụ EC2 Instance Connect trong region, gọn nhất là dùng **AWS-managed prefix list** của EC2 Instance Connect. (Chi tiết dải IP hay ra hơn ở đề SysOps.)
- Muốn quản lý quyền truy cập theo IAM, không phân phối key → **EC2 Instance Connect** (hoặc Session Manager).
- Truy cập instance private không mở cổng inbound, không bastion → **Session Manager** (hoặc EC2 Instance Connect Endpoint).
- Lỗi "permissions are too open" khi SSH → `chmod 400` file key.
- SSH cần: kết nối mạng + key + SG cho phép nguồn; nếu instance ở private subnet thì cần [[Bastion Host]] hoặc VPN.

## Liên kết
- Tiên quyết: [[EC2 Basics]], [[Security Groups]], [[IAM Basics]]
- Liên quan: [[Bastion Host]], [[IAM Identity Policies]], [[EC2 Instance Roles]], [[AMI]], [[Site-to-Site VPN]]
- Phân biệt với: [[Bastion Host]] (jump box truyền thống, phải quản lý key và instance riêng)
