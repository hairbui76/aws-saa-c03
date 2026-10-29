---
tags: [saa-c03, moc, s16-advanced-vpc-networking]
aliases: [MOC Advanced VPC Networking]
---
# 16 Advanced VPC Networking

Section nâng cao sau [[_MOC 06 VPC Basics|VPC Basics]]: quan sát traffic bằng VPC Flow Logs, cho IPv6 ra Internet một chiều bằng Egress-Only IGW, truy cập dịch vụ AWS public một cách riêng tư bằng Gateway và Interface VPC Endpoints, và nối hai VPC với nhau bằng VPC Peering. Đây là bước đệm trước phần kết nối on-prem và nhiều VPC ở [[_MOC 17 Hybrid and Migration|Hybrid and Migration]] (VPN, Direct Connect, Transit Gateway).

← [[00 Home]] · Trước: [[_MOC 15 Global Content Delivery]] · Sau: [[_MOC 17 Hybrid and Migration]]

## Lộ trình học
1. [[VPC Flow Logs]] — ghi metadata luồng traffic (IP, port, protocol, ACCEPT/REJECT) ở mức VPC/subnet/ENI, không ghi nội dung, không real-time; đẩy tới S3 hoặc CloudWatch Logs.
2. [[Egress-Only Internet Gateway]] — internet gateway chỉ cho IPv6 và chỉ outbound; thay NAT Gateway trong thế giới IPv6, route `::/0`.
3. [[Gateway VPC Endpoints]] — truy cập S3/DynamoDB riêng tư bằng prefix list trong route table; HA sẵn, cùng region, chỉ dùng từ trong VPC.
4. [[Interface VPC Endpoints]] — ENI có private IP trong subnet (PrivateLink), dẫn traffic bằng DNS; theo AZ, có Security Group, dùng được từ on-prem.
5. [[VPC Peering]] — kết nối riêng tư, mã hóa giữa đúng hai VPC (khác region/account được); non-transitive, CIDR không được trùng.
6. [[Compare - Gateway vs Interface Endpoints]] — routing/prefix list vs DNS/ENI; HA sẵn vs mỗi AZ một endpoint; khi nào chọn cái nào.

## Bản đồ khái niệm
```mermaid
flowchart TB
  VPC["VPC"] --> FL["VPC Flow Logs (metadata)"]
  FL --> CWL["CloudWatch Logs"]
  FL --> S3A["S3 + Athena"]
  FL -.->|"REJECT chiều về"| NACL["NACL (stateless)"]
  VPC --> RT["Route table"]
  RT -->|"0.0.0.0/0, IPv4"| NAT["NAT Gateway"]
  RT -->|"::/0, IPv6 outbound-only"| EIGW["Egress-Only IGW"]
  RT -->|"prefix list"| GWE["Gateway endpoint: S3, DynamoDB"]
  RT -->|"route tới pcx"| PEER["VPC Peering (non-transitive)"]
  SUB["Subnet mỗi AZ"] --> IFE["Interface endpoint: ENI + SG"]
  IFE --> PL["AWS PrivateLink"]
  PL -.-> NLB["NLB (dịch vụ bên thứ ba)"]
  DNS["Private DNS (R53 private hosted zone)"] --> IFE
  ONP["On-prem qua VPN / Direct Connect"] --> IFE
  ONP -.->|"không dùng được"| GWE
  GWE --> POL["Endpoint policy + bucket policy aws:SourceVpce"]
  PEER -->|"nhiều VPC, cần transitive"| TGW["Transit Gateway"]
```

## Liên kết sang section khác
- Nền tảng VPC: [[VPC Routing and Internet Gateway]], [[NAT Gateway]], [[Security Groups]], [[NACL]]
- DNS cho endpoint: [[R53 Private Hosted Zones]]
- Dịch vụ public vs private: [[AWS Public vs Private Services]]
- Phân tích log: [[CloudWatch Logs]], [[Athena]]
- Bước tiếp theo khi nối nhiều mạng: [[Transit Gateway]], [[Direct Connect]]

## 🎯 Top mẹo thi của section
- Cần **nội dung packet** hoặc giám sát **real-time** → không phải Flow Logs (chỉ metadata, có độ trễ). ([[VPC Flow Logs]])
- ACCEPT inbound rồi REJECT outbound trong cùng luồng → **NACL** chặn chiều trả lời. Truy vấn SQL rẻ → **S3 + Athena**; cần alarm/metric filter → **CloudWatch Logs**. ([[VPC Flow Logs]])
- IPv6 instance ra Internet nhưng **không cho Internet vào** → **Egress-Only IGW**, không phải NAT Gateway hay IGW thường. ([[Egress-Only Internet Gateway]])
- Instance private cần **S3/DynamoDB**, không qua Internet, rẻ nhất → **Gateway endpoint** (miễn phí). ([[Gateway VPC Endpoints]])
- Gateway endpoint **HA sẵn, không thuộc AZ** → "tạo mỗi AZ một gateway endpoint" là sai. Không có Security Group. ([[Gateway VPC Endpoints]])
- On-prem (VPN/DX) hoặc VPC peer cần truy cập S3 riêng tư → **interface endpoint cho S3**; gateway endpoint chỉ dùng được từ trong VPC, cùng region. ([[Gateway VPC Endpoints]], [[Interface VPC Endpoints]])
- Interface endpoint **không HA mặc định** → mỗi AZ một endpoint. Ứng dụng không sửa được → bật **Private DNS**. ([[Interface VPC Endpoints]])
- Nhắc **route table/prefix list** → gateway; nhắc **DNS/ENI/private IP/Security Group/PrivateLink** → interface. ([[Compare - Gateway vs Interface Endpoints]])
- Giới hạn VPC chỉ truy cập vài bucket → **endpoint policy**; bucket chỉ nhận traffic từ VPC → bucket policy với **`aws:SourceVpce`**. ([[Compare - Gateway vs Interface Endpoints]])
- VPC Peering **không transitive**: A-B + B-C không cho A-C; nhiều VPC cần hub-and-spoke → **Transit Gateway**. ([[VPC Peering]])
- **CIDR trùng** → không peering được; peering tạo xong vẫn không thông → kiểm tra **route table cả hai phía** và SG/NACL. ([[VPC Peering]])
- Tham chiếu **SG ID của VPC peer** chỉ được khi **cùng region**; cross-region peering mã hóa, đi trên AWS backbone. ([[VPC Peering]])
