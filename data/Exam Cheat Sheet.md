---
tags: [saa-c03, cheat-sheet]
aliases: [Cheat Sheet, Ôn nhanh SAA-C03]
---
# Exam Cheat Sheet: AWS SAA-C03

> Trang ôn nhanh trước giờ thi, gom theo **chủ đề thi** (không theo section khóa học). Chi tiết nằm trong note được link. Quay về [[00 Home]] · Kỹ năng làm bài: [[Exam Technique]].
>
> Quy ước: "khóa học: X; nay: Y" = con số trong khóa học đã thay đổi. Đề thi thường vẫn dùng con số của khóa học.

---

## 1. Từ khóa trong đề → dịch vụ nên chọn

### Bảo mật & IAM
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| App trên EC2/Lambda/container cần gọi AWS API | **IAM Role** (instance profile, task role), không dùng access key | [[EC2 Instance Roles]] |
| Hàng triệu user web/mobile, đăng nhập Google/Facebook | **Cognito Identity Pool** (web identity federation) | [[Cognito]] |
| Chặn mọi account dùng region/service X, giới hạn cả root của member account | **SCP** ở root/OU | [[Service Control Policies]] |
| Dựng nhanh landing zone multi-account có guardrail | **Control Tower** | [[AWS Control Tower]] |
| Secret + **rotation tự động** (nhất là mật khẩu RDS) | **Secrets Manager** | [[Secrets Manager]] |
| Cấu hình phân cấp, rẻ, SecureString, AMI mới nhất | **SSM Parameter Store** | [[SSM Parameter Store]] |
| FIPS 140-2 **Level 3**, single-tenant, PKCS#11/JCE/CNG | **CloudHSM** | [[CloudHSM]] |
| SQL injection, XSS, geo match, rate limit HTTP | **WAF** (ALB, CloudFront, API Gateway) | [[WAF]] |
| DDoS 24/7 response team, bồi hoàn chi phí scale | **Shield Advanced** | [[Shield]] |
| PII/dữ liệu nhạy cảm trong **S3** | **Macie** | [[Macie]] |
| CVE, CIS Benchmark, port lộ ra Internet | **Inspector** | [[Inspector]] |
| Threat detection từ CloudTrail + VPC Flow Logs + DNS logs | **GuardDuty** (→ EventBridge → Lambda) | [[GuardDuty]] |
| "Ai đã gọi API / xóa resource?" | **CloudTrail** | [[CloudTrail]] |
| Lịch sử cấu hình, resource có compliant không | **AWS Config** | [[AWS Config]] |

### Networking (VPC, hybrid, DNS)
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Private subnet ra Internet (IPv4), không nhận kết nối vào | **NAT Gateway** trong public subnet, mỗi AZ một cái | [[NAT Gateway]] |
| IPv6 outbound-only | **Egress-Only IGW** | [[Egress-Only Internet Gateway]] |
| Chặn một IP/dải IP độc hại | **NACL** deny rule | [[NACL]] |
| Truy cập S3/DynamoDB private, rẻ nhất | **Gateway endpoint** | [[Gateway VPC Endpoints]] |
| Truy cập service private từ on-prem/peer, expose service sang VPC khác | **Interface endpoint / PrivateLink** (+ NLB) | [[Interface VPC Endpoints]] |
| Nhiều VPC + on-prem, transitive, hub-and-spoke | **Transit Gateway** | [[Transit Gateway]] |
| Kết nối mã hóa tới on-prem trong vài giờ, rẻ | **Site-to-Site VPN** | [[Site-to-Site VPN]] |
| Latency ổn định, > 1.25 Gbps, không qua Internet | **Direct Connect** | [[Direct Connect]] |
| Mã hóa traffic chạy trên DX | **IPsec VPN qua public VIF** | [[Direct Connect Public VIF and VPN]] |
| Firewall/IDS/IPS bên thứ ba inline, GENEVE | **Gateway Load Balancer** | [[Gateway Load Balancer]] |
| Path/host-based routing, nhiều domain HTTPS (SNI) | **ALB** | [[Compare - ALB vs NLB]] |
| UDP, IP tĩnh, TLS end-to-end tới instance | **NLB** (TCP listener) | [[SSL Offload and Session Stickiness]] |
| Trỏ apex domain tới ELB/CloudFront/S3 | **Alias record** | [[CNAME vs Alias]] |

### Compute
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Container, không quản lý server | **ECS/EKS trên Fargate** | [[ECS Launch Types EC2 vs Fargate]] |
| Kubernetes, tránh lock-in, đang chạy K8s on-prem | **EKS** | [[EKS]] |
| Event-driven, chạy ≤ 15 phút | **Lambda** | [[Lambda]] |
| HPC, tightly coupled, latency thấp giữa node | **Cluster placement group** + enhanced networking/EFA | [[EC2 Placement Groups]] |
| License theo socket/core, BYOL | **Dedicated Host** | [[Dedicated Hosts]] |
| Batch chịu gián đoạn, rẻ nhất | **Spot** | [[EC2 Purchase Options]] |
| Tải 24/7, 1–3 năm; chuyển dần EC2 → Fargate → Lambda | **RI / Savings Plans** (Compute SP) | [[Reserved Instances and Savings Plans]] |
| Memory, disk, app log của EC2/on-prem | **CloudWatch Agent** | [[CloudWatch Agent]] |

### Storage (S3/EBS/EFS/FSx)
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Shared file system cho nhiều EC2 Linux, NFS, multi-AZ | **EFS** | [[EFS]] |
| Windows, SMB, AD, DFS, VSS | **FSx for Windows** | [[FSx for Windows]] |
| HPC/ML, Lustre, xử lý nhanh dữ liệu S3 | **FSx for Lustre** | [[FSx for Lustre]] |
| User ở xa region upload chậm | **S3 Transfer Acceleration** | [[S3 Performance Optimization]] |
| WORM, kể cả root không xóa được | **Object Lock Compliance mode** | [[S3 Object Lock]] |
| Người không có account AWS tải/up 1 object private, có hạn | **Presigned URL** | [[S3 Presigned URLs]] |
| Replicate có SLA 15 phút | **S3 RTC** | [[S3 Replication]] |
| Backup tập trung đa dịch vụ/account, backup không thể xóa | **AWS Backup** (+ Vault Lock) | [[AWS Backup]] |

### Database
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Scale đọc, báo cáo làm chậm DB chính | **Read Replica** | [[RDS Read Replicas]] |
| HA trong region, synchronous | **RDS Multi-AZ** | [[RDS Multi-AZ]] |
| "Too many connections", Lambda + RDS, failover trong suốt | **RDS Proxy** | [[RDS Proxy]] |
| Relational, tải thất thường, dev/test tắt khi rảnh | **Aurora Serverless** | [[Aurora Serverless]] |
| DR cross-region relational, RPO ~1 s | **Aurora Global Database** | [[Aurora Global Database]] |
| NoSQL ghi ở nhiều region (active-active) | **DynamoDB Global Tables** | [[DynamoDB Global Tables]] |
| Cache DynamoDB, microsecond | **DAX** | [[DAX]] |
| Cache generic, session store, sub-ms | **ElastiCache** (Redis nếu cần HA/backup) | [[ElastiCache]] |
| Data warehouse, OLAP, petabyte | **Redshift** | [[Redshift]] |
| SQL ad-hoc trên S3/log, serverless | **Athena** | [[Athena]] |

### Decoupling & Serverless
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Decouple, buffer, worker pool, asynchronous | **SQS** | [[SQS]] |
| Thứ tự + không trùng (exactly-once) | **SQS FIFO** | [[SQS Standard vs FIFO]] |
| Một event → nhiều xử lý độc lập | **SNS fan-out → nhiều SQS** | [[SNS]] |
| Ingest streaming real-time, nhiều consumer, replay | **Kinesis Data Streams** | [[Kinesis Data Streams]] |
| Đổ stream vào S3/Redshift/OpenSearch, ít vận hành | **Kinesis Data Firehose** (near real-time) | [[Kinesis Data Firehose]] |
| Workflow nhiều bước, > 15 phút, có phê duyệt | **Step Functions** | [[Step Functions]] |
| Cron serverless, phản ứng thay đổi trạng thái | **EventBridge** | [[EventBridge]] |
| JMS/AMQP/MQTT, migrate broker on-prem | **Amazon MQ** | [[Amazon MQ]] |

### HA/DR & Global
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Cache nội dung HTTP cho user toàn cầu | **CloudFront** | [[CloudFront Architecture]] |
| TCP/UDP toàn cầu, 2 anycast static IP, failover không phụ thuộc TTL | **Global Accelerator** | [[Global Accelerator]] |
| User chỉ được vào S3 qua CloudFront | **OAC** + bucket policy | [[CloudFront OAI and OAC]] |
| Active-passive, trang bảo trì trên S3 | **R53 Failover routing** | [[R53 Failover Routing]] |

### Monitoring / Governance / IaC
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Deploy cùng hạ tầng ra nhiều account + region | **CloudFormation StackSets** | [[CFN StackSets]] |
| Stack chỉ hoàn tất khi bootstrap EC2 xong | **CreationPolicy + cfn-signal** | [[CFN Wait Conditions and cfn-signal]] |
| Xóa stack nhưng giữ DB/dữ liệu | **DeletionPolicy Retain/Snapshot** | [[CFN Deletion Policy]] |
| Cảnh báo khi chi phí **dự báo** vượt mức | **AWS Budgets** | [[AWS Budgets]] |

### Migration
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Migrate DB, downtime tối thiểu | **DMS full load + CDC** (thêm **SCT** nếu đổi engine) | [[DMS]] |
| Chuyển file online NFS/SMB → S3/EFS/FSx, có lịch, retry | **DataSync** | [[DataSync]] |
| 10 TB–10 PB, mạng yếu, offline | **Snowball / Snowball Edge** | [[Snow Family]] |
| On-prem dùng storage AWS lâu dài (file/volume/tape) | **Storage Gateway** | [[Storage Gateway]] |
| Đối tác upload qua SFTP/FTPS/AS2 vào S3 | **Transfer Family** | [[Transfer Family]] |

### ML services
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Sentiment, entity, key phrase trong text | **Comprehend** | [[Comprehend]] |
| Phân tích ảnh/video, khuôn mặt, kiểm duyệt | **Rekognition** (live video: + Kinesis Video Streams) | [[Rekognition]] |
| Trích text/bảng/form từ tài liệu scan | **Textract** | [[Textract]] |
| Speech → text / text → speech / dịch | **Transcribe / Polly / Translate** | [[Transcribe]] |
| Chatbot hội thoại / enterprise search | **Lex / Kendra** | [[Lex]] |

---

## 2. Bảng so sánh cho các cặp hay nhầm

### Security Group vs NACL → [[Compare - Security Groups vs NACL]]
| | Security Group | NACL |
|---|---|---|
| Trạng thái | **Stateful** (response tự qua) | **Stateless** (mở cả ephemeral 1024–65535) |
| Gắn vào | **ENI** | **Subnet** (1 subnet = đúng 1 NACL) |
| Rule | Chỉ ALLOW | ALLOW + **DENY**, xét theo số nhỏ → lớn, khớp đầu tiên thì dừng |
| Tham chiếu | Được tham chiếu SG khác, self-reference | Chỉ IP/CIDR, port, protocol |
| Traffic cùng subnet | Có tác dụng | **Không** tác dụng |
| Mặc định | Mới tạo: chặn inbound, cho outbound | Default NACL: cho tất cả; **custom NACL mới: chặn tất cả** |

### ALB vs NLB vs GWLB → [[Compare - ALB vs NLB]], [[Gateway Load Balancer]]
| | ALB | NLB | GWLB |
|---|---|---|---|
| Layer | L7 (HTTP/HTTPS/WebSocket) | L4 (TCP/UDP/TLS) | L3 (GENEVE, UDP 6081) |
| Routing | Path, host, header, query | Theo port | Đẩy traffic qua appliance |
| TLS | Terminate (offload/bridging) | **Pass-through** được (end-to-end) | Không xử lý |
| IP tĩnh | Không | **Có** (1 IP/AZ, gắn EIP) | Không |
| Stickiness | Cookie | Không (cookie) | Flow stickiness |
| Đặc biệt | WAF, auth Cognito/OIDC, Lambda target | PrivateLink, độ trễ cực thấp | Firewall/IDS bên thứ ba |

### Gateway vs Interface endpoint → [[Compare - Gateway vs Interface Endpoints]]
| | Gateway endpoint | Interface endpoint |
|---|---|---|
| Dịch vụ | **Chỉ S3, DynamoDB** | Hầu hết dịch vụ + bên thứ ba (PrivateLink) |
| Cơ chế | **Prefix list trong route table** | **ENI + private IP + DNS** |
| HA | Sẵn có, không thuộc AZ | **Theo AZ**: mỗi AZ một endpoint |
| Security Group | Không | **Có** |
| Từ on-prem/VPC peer | **Không** | **Có** |
| Giá | Miễn phí | Theo giờ/AZ + GB |
| Protocol | | Khóa học: chỉ TCP, IPv4; nay: có IPv6 |

### Site-to-Site VPN vs Direct Connect → [[Compare - VPN vs Direct Connect]]
| | Site-to-Site VPN | Direct Connect |
|---|---|---|
| Thời gian triển khai | **Vài giờ** | Tuần–tháng |
| Đường truyền | Qua Internet, mã hóa IPsec | Cáp vật lý riêng, **không mã hóa sẵn** |
| Băng thông | ~1.25 Gbps/tunnel | 1/10/100 Gbps (nay thêm 400); hosted từ 50 Mbps |
| Latency | Thay đổi | **Thấp, ổn định** |
| HA | 2 tunnel/connection; full HA cần 2 CGW | Không HA mặc định; nhiều DX ở nhiều location |
| Chi phí | Rẻ | Port + data out (data in miễn phí) |
| Vai trò kết hợp | Backup rẻ cho DX; cầu nối khi chờ DX | VPN over public VIF khi cần mã hóa |

### SQS vs SNS vs Kinesis Data Streams → [[Compare - SQS vs SNS vs Kinesis]]
| | SQS | SNS | Kinesis Data Streams |
|---|---|---|---|
| Mô hình | Queue, **pull** | Pub/sub, **push** | Stream, pull, nhiều consumer |
| Một message cho | **Một** consumer, xong thì xóa | **Mọi** subscriber | Mọi consumer, đọc lại được |
| Lưu giữ | 4 ngày mặc định, tối đa 14 ngày | Không lưu | 24 h mặc định, tối đa 365 ngày |
| Thứ tự | FIFO (300 msg/s, 3.000 với batching) | FIFO topic (nay có) | Trong mỗi shard |
| Scale | Tự động | Tự động | Thêm shard (1 MB/s vào, 2 MB/s ra mỗi shard) |
| Dùng khi | Decouple, worker pool | Fan-out, thông báo | Ingest real-time, replay, analytics |

### RDS Multi-AZ vs Read Replica vs Aurora → [[RDS Multi-AZ]], [[RDS Read Replicas]], [[Aurora]]
| | RDS Multi-AZ (instance) | RDS Read Replica | Aurora |
|---|---|---|---|
| Replication | **Synchronous** | **Asynchronous** | Storage dùng chung, 6 bản sao / 3 AZ |
| Mục đích | **HA** (standby không phục vụ đọc) | **Scale đọc**, DR cross-region | HA + scale đọc cùng lúc |
| Phạm vi | Một region | Cùng region hoặc cross-region | Một region; cross-region = Global Database |
| Failover | Tự động, đổi DNS CNAME, 60–120 s | **Thủ công** (promote), đổi endpoint | Tự động, nhanh hơn (replica promote) |
| Số replica | 1 standby (Multi-AZ Cluster: 2 reader đọc được) | 5 replica trực tiếp (theo khóa học) | 15 replica, reader endpoint |
| Chống data corruption | Không (lỗi đồng bộ sang) | Không | Backtrack / PITR |

### S3 storage classes → [[S3 Storage Classes]]
| Class | AZ | Min duration | Min size | Truy xuất | Dùng khi |
|---|---|---|---|---|---|
| Standard | ≥3 | – | – | ms, không phí | Mặc định, truy cập thường xuyên |
| Intelligent-Tiering | ≥3 | – | (< 128 KB không tự chuyển) | ms, phí monitoring | Pattern không biết trước |
| Standard-IA | ≥3 | 30 ngày | 128 KB | ms, phí/GB | Ít truy cập (~tháng), quan trọng |
| One Zone-IA | **1** | 30 ngày | 128 KB | ms, phí/GB | Dữ liệu tạo lại được, bản replica |
| Glacier Instant Retrieval | ≥3 | 90 ngày | 128 KB | ms, phí cao hơn | Ít truy cập (~quý), cần ngay |
| Glacier Flexible Retrieval | ≥3 | 90 ngày | 40 KB | Expedited 1–5 phút, Standard 3–5 h, Bulk 5–12 h | Archive, chờ phút–giờ |
| Glacier Deep Archive | ≥3 | 180 ngày | 40 KB | Standard ~12 h, Bulk ≤ 48 h | Compliance nhiều năm, rẻ nhất |

### EBS volume types → [[EBS Volume Types]]
| Loại | Max IOPS/volume | Max throughput | Boot | Dùng khi |
|---|---|---|---|---|
| gp3 | 16,000 (3,000 baseline) | 1,000 MB/s | Có | Mặc định, rẻ hơn gp2 ~20% |
| gp2 | 16,000 (3 IOPS/GB, burst) | 250 MB/s | Có | Legacy; volume nhỏ dễ cạn burst credit |
| io1/io2 | 64,000 | 1,000 MB/s | Có | DB cần IOPS cao, ổn định; Multi-Attach |
| io2 Block Express | 256,000 | 4,000 MB/s | Có | > 64,000 IOPS |
| st1 (HDD) | 500 | 500 MB/s | **Không** | Throughput tuần tự: big data, log, Kafka |
| sc1 (HDD) | 250 | 250 MB/s | **Không** | Dữ liệu lạnh, rẻ nhất |

Ghi chú: khóa học nói gp2 là mặc định; nay gp3 là mặc định và (2025) gp3 lên tới 80,000 IOPS / 2,000 MiB/s, đề vẫn dùng mốc 16,000. Khóa học nói io2 Block Express đang preview; nay mọi io2 chạy trên Block Express.

### EC2 purchase options → [[EC2 Purchase Options]], [[Reserved Instances and Savings Plans]]
| Option | Dùng khi | Lưu ý |
|---|---|---|
| On-Demand | Ngắn hạn, không biết trước, không chịu gián đoạn | Mặc định |
| Spot | Rẻ nhất, chịu gián đoạn, batch/stateless | **Không** dùng cho workload không chịu gián đoạn |
| Reserved Instances | 24/7, steady-state, 1/3 năm | Regional RI không giữ capacity; Zonal RI giữ |
| Savings Plans | Cam kết $/giờ 1/3 năm | Compute SP phủ EC2 + Fargate + Lambda |
| On-Demand Capacity Reservation | Cần capacity đảm bảo, không cam kết | Không giảm giá, trả cả khi không dùng |
| Dedicated Instances | Không chia sẻ phần cứng với khách khác | Không cần quản lý host |
| Dedicated Hosts | License theo socket/core, BYOL | Trả theo host; không dùng với placement group/RDS |
| Scheduled RI | Khóa học: tải định kỳ vài giờ/ngày | Nay: AWS không còn bán |

### Route 53 routing policies → [[R53 Routing Policies]]
| Policy | Health check | Dùng khi |
|---|---|---|
| Simple | **Không** | Một tài nguyên |
| Failover | Có (primary) | Active-passive, trang bảo trì S3 |
| Multivalue | Có | Trả tối đa 8 record healthy, ngẫu nhiên (không thay LB) |
| Weighted | Có | X% traffic, canary, A/B |
| Latency | Có | Latency thấp nhất, app nhiều region (1 record/region) |
| Geolocation | Có | Theo **vị trí khớp** (quốc gia/châu lục); cần record default |
| Geoproximity | Có | Theo **khoảng cách** + **bias** để dời traffic |

### Storage Gateway modes → [[Storage Gateway]]
| Mode | Giao thức on-prem | Dữ liệu chính ở đâu | Dùng khi |
|---|---|---|---|
| Volume Stored | iSCSI | **On-prem** (backup EBS snapshot lên AWS) | Backup/DR, cần low latency toàn bộ dữ liệu; **không** mở rộng capacity |
| Volume Cached | iSCSI | **AWS (S3)**, cache local | Hết chỗ on-prem, mở rộng capacity |
| Tape (VTL) | iSCSI | S3 → archive Glacier/Deep Archive | Thay tape library, giữ phần mềm backup |
| File | NFS/SMB | **Object trong bucket của bạn** | File share mở rộng lên S3, xử lý file bằng dịch vụ AWS |

### KMS vs CloudHSM → [[KMS]], [[CloudHSM]]
| | KMS | CloudHSM |
|---|---|---|
| Tenancy | Shared | **Single-tenant** |
| FIPS 140-2 | Khóa học: Level 2; nay: HSM đạt Level 3 | **Level 3** (đề: L3 → CloudHSM) |
| Kiểm soát key | AWS vận hành, IAM + key policy | **Chỉ khách hàng**, AWS không truy cập được |
| API | AWS API | PKCS#11, JCE, CNG |
| Tích hợp S3/EBS/RDS | **Native** | Không (trừ KMS custom key store) |
| HA | Có sẵn, regional | Tự dựng cluster ≥ 2 HSM ở nhiều AZ |
| Use case riêng | Mã hóa at rest dịch vụ AWS | SSL offload, Oracle TDE, private key của CA |

### CloudFront vs Global Accelerator → [[CloudFront Architecture]], [[Global Accelerator]]
| | CloudFront | Global Accelerator |
|---|---|---|
| Protocol | HTTP/HTTPS | **TCP/UDP** (cả non-HTTP) |
| Cache | **Có** (chỉ read/download) | **Không** |
| IP | Nhiều IP, đổi | **2 anycast static IP** |
| Tính năng | Signed URL/cookie, OAC, Lambda@Edge, WAF | Failover region nhanh, không phụ thuộc DNS TTL |
| Dùng khi | Phân phối nội dung, website | Game, IoT, VoIP, cần IP để whitelist |

### Chiến lược DR → [[RPO and RTO]], [[HA vs FT vs DR]]
| Strategy | RPO / RTO | Chi phí | Mô tả trên AWS |
|---|---|---|---|
| Backup & Restore | Giờ | Rẻ nhất | Snapshot/AWS Backup copy sang region khác, dựng lại khi có sự cố |
| Pilot Light | Chục phút | Thấp | Dữ liệu replicate liên tục (DB replica), compute tắt, bật lên bằng AMI/IaC |
| Warm Standby | Phút | Trung bình | Bản thu nhỏ chạy sẵn, scale lên khi failover (R53 failover) |
| Multi-site Active/Active | Gần 0 | Đắt nhất | Chạy đầy đủ ở nhiều region (Aurora Global, DynamoDB Global Tables, R53) |

---

## 3. Số liệu cần nhớ

| Chủ đề | Con số |
|---|---|
| IAM | 5.000 user/account; user ≤ 10 group; 300 group/account (nay xin tăng tới 500); 2 access key/user |
| VPC | CIDR /28 → /16; mỗi subnet trừ **5 IP** (/28 → 11); router +1, DNS +2; default VPC 172.31.0.0/16, /20 mỗi AZ |
| LB subnet | Nên /27 (cần ≥ 8 IP trống) |
| EC2 | Metadata 169.254.169.254; user data ≤ 16 KB, chạy 1 lần; spread PG 7 instance/AZ |
| EBS | gp2/gp3 16K IOPS → io1/io2 64K → Block Express 256K → Instance Store hàng trăm nghìn+ |
| S3 | Object 0–5 TB; single PUT ≤ 5 GB; multipart nên dùng từ 100 MB; RTC 15 phút; 200 OK = đã lưu durable |
| S3 bucket | Khóa học: 100 soft / 1.000 hard; nay: 10.000 mặc định (từ 11/2024) |
| S3 lifecycle | ≥ 30 ngày ở Standard trước khi sang IA; min duration 30/90/180 ngày |
| S3 Object Lock | Khóa học: chỉ bật khi tạo bucket; nay (11/2023): bật được cho bucket có sẵn đã bật versioning |
| S3 encryption | Khóa học: không header thì không mã hóa; nay (01/2023): mặc định SSE-S3 |
| KMS | Mã hóa trực tiếp ≤ 4 KB; xóa key chờ 7–30 ngày; rotation CMK: mặc định tắt, 1 năm (nay chỉnh 90–2560 ngày) |
| CloudTrail | Event History 90 ngày; giao log trễ ~15 phút |
| SQS | Message: khóa học 256 KB; nay 1 MiB (08/2025). Retention 4 ngày (1 phút–14 ngày); visibility 30 s (0–12 h); long poll ≤ 20 s; delay ≤ 15 phút |
| SQS FIFO | 300 msg/s, 3.000 với batching (nay có high-throughput FIFO) |
| Kinesis | Shard 1 MB/s (1.000 record/s) vào, 2 MB/s ra; retention 24 h → 365 ngày; Firehose buffer 1 MB / 60 s |
| Lambda | Timeout 15 phút; memory 128 MB–10 GB; /tmp 512 MB–10 GB |
| API Gateway | Timeout 29 s (504); cache 500 MB–237 GB, TTL 300 s (max 3.600 s); 429 = throttling |
| Step Functions | Standard ≤ 1 năm; Express ≤ 5 phút |
| DynamoDB | Item ≤ 400 KB; RCU 4 KB, WCU 1 KB; PITR 35 ngày; Streams 24 h |
| RDS | Automated backup ≤ 35 ngày; PITR ~5 phút; Multi-AZ failover 60–120 s (Multi-AZ Cluster ~35 s); IAM DB auth token 15 phút |
| Aurora | 6 bản sao / 3 AZ; 15 replica; 128 TiB; billing theo giây, tối thiểu 10 phút |
| Aurora Global | Replication ~1 s, RTO < 1 phút; secondary region: khóa học 5, nay 10; 16 replica mỗi secondary |
| Route 53 | 4 name server/zone; multivalue ≤ 8 record; health check 30 s (fast 10 s), ngưỡng 18%; string match 5.120 byte đầu |
| CloudFront | Default TTL 24 h; cert ACM ở **us-east-1** |
| ASG | Lifecycle hook timeout 3.600 s; health check grace 300 s (mặc định trên console; CLI/API là 0) |
| WAF | Inspect body 8 KB đầu |
| VPN / BGP | ~1.25 Gbps/tunnel (khóa học; nay TGW có tunnel băng thông lớn + ECMP); BGP TCP 179; private ASN 64512–65534 |
| Direct Connect | Port 1/10/100 Gbps (nay thêm 400 Gbps) |
| Snow | Snowball kinh tế 10 TB–10 PB; Snowmobile ≥ 10 PB (tới 100 PB), một site |
| Storage Gateway | Stored 16 TB/volume × 32 = 512 TB; Cached 32 TB/volume × 32 = 1 PB |
| AWS Backup | Cold storage ≥ 90 ngày; Vault Lock cool-off 72 h |
| Redshift | Auto snapshot ~8 h hoặc 5 GB; retention 1 ngày mặc định, tối đa 35 |
| ELB | Khóa học: 3 loại; nay: 4 (thêm GWLB) |
| EFS | Khóa học: Bursting/Provisioned; nay thêm **Elastic** (mặc định trên console) |

---

## 4. Bẫy thường gặp

**Bảo mật & IAM**
- Nhúng access key vào code/AMI/user data là đáp án sai kinh điển. Dùng role ([[EC2 Instance Roles]]).
- SCP **không cấp quyền**, chỉ giới hạn; management account không bị SCP ảnh hưởng ([[Service Control Policies]]).
- AWS Config chỉ **phát hiện**, không **ngăn**. Muốn ngăn thì dùng IAM/SCP ([[AWS Config]]).
- GuardDuty phát hiện chứ không tự chặn; chặn L7 là việc của WAF, DDoS là Shield ([[GuardDuty]]).
- CloudTrail không real-time (~15 phút) ([[CloudTrail]]).
- AWS managed key (`aws/s3`) không dùng cross-account được. Cần customer managed key ([[S3 Encryption]]).
- ACM không gắn được vào EC2. Đặt ALB phía trước. Cert phải cùng region, riêng CloudFront ở us-east-1 ([[ACM]]).

**Networking**
- Security Group không có deny. Chặn IP cụ thể dùng NACL ([[Compare - Security Groups vs NACL]]).
- NACL: rule DENY số lớn hơn ALLOW thì vô tác dụng; quên mở outbound ephemeral 1024–65535 ([[NACL]]).
- NAT Gateway: đặt trong **public** subnet, không có SG, chỉ HA trong một AZ ([[NAT Gateway]]).
- IPv6 + NAT Gateway là sai. IPv6 outbound-only dùng Egress-Only IGW ([[Egress-Only Internet Gateway]]).
- VPC peering **không transitive**, CIDR trùng thì không peer được ([[VPC Peering]]).
- "Gateway endpoint mỗi AZ" sai; "một interface endpoint là đủ HA" cũng sai ([[Compare - Gateway vs Interface Endpoints]]).
- Gateway endpoint không dùng được từ on-prem hay VPC peer ([[Gateway VPC Endpoints]]).
- Direct Connect không mã hóa sẵn, không HA mặc định, không kịp khi đề nói "trong vài ngày" ([[Direct Connect]]).
- VPN over DX dùng **public VIF**, không phải private VIF ([[Direct Connect Public VIF and VPN]]).
- CNAME không đặt ở apex domain. Dùng Alias ([[CNAME vs Alias]]).

**Compute & HA**
- ELB không có ASG thì không tự thay instance hỏng ([[Exam Technique]]).
- ASG launch rồi terminate liên tục: health check grace period quá ngắn ([[ASG Health Checks]]).
- App lỗi mà ASG không thay instance: chưa bật ELB health check trên ASG ([[ASG Health Checks]]).
- Spot không bao giờ dùng cho workload không chịu gián đoạn ([[EC2 Purchase Options]]).
- Instance Store mất dữ liệu khi stop/start, resize, host lỗi; reboot thì giữ ([[Instance Store]]).
- EBS chỉ trong một AZ. Sang AZ khác: snapshot → volume mới ([[EBS]]).
- AMI gắn với một region. Copy sang region khác cho ra AMI ID mới ([[AMI]]).
- Lambda đứng sau API Gateway chỉ có 29 s, không phải 15 phút ([[API Gateway]]).

**Storage**
- Versioning không tắt được, chỉ suspend; Replication và Object Lock đều cần versioning ([[S3 Versioning and MFA Delete]]).
- Bật replication không copy object cũ. Dùng S3 Batch Replication ([[S3 Replication]]).
- One Zone-IA cho dữ liệu quan trọng duy nhất là sai ([[S3 Storage Classes]]).
- Lifecycle sang IA sau 7 ngày là sai (cần ≥ 30 ngày) ([[S3 Lifecycle Configuration]]).
- EFS chỉ dùng cho Linux; Windows/SMB dùng FSx for Windows ([[EFS]]).
- Volume Gateway Stored không giải quyết thiếu capacity on-prem. Dùng Cached ([[Storage Gateway]]).
- Object Lock Compliance không gỡ được, kể cả root hay AWS Support ([[S3 Object Lock]]).

**Database & Decoupling**
- Multi-AZ (instance) không scale đọc; read replica không tự failover ([[RDS Multi-AZ]]).
- Data corruption: restore PITR, không dùng read replica vì replica cũng hỏng theo ([[RDS Backups and Restore]]).
- "Không được sửa code" thì ElastiCache gần như sai. Cân nhắc read replica hoặc DAX ([[ElastiCache]]).
- Firehose là **near real-time**. Đề đòi real-time thì chọn Kinesis Data Streams ([[Kinesis Data Firehose]]).
- Standard queue không đổi sang FIFO tại chỗ. Phải tạo queue mới đuôi `.fifo` ([[SQS Standard vs FIFO]]).
- Message xử lý trùng: tăng visibility timeout, không phải delay queue ([[SQS Delay Queues]]).
- Amazon MQ cần private networking, không có public endpoint như SQS ([[Amazon MQ]]).
