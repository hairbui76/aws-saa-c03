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
| Dựng nhanh landing zone multi-account có guardrail | **Control Tower** (controls: preventative = SCP, detective = Config, proactive = kiểm tra CloudFormation trước khi tạo) | [[AWS Control Tower]] |
| Nhân viên SSO một identity vào nhiều account trong org + business app (AD, Okta, Entra ID) | **IAM Identity Center** (permission set gán cho group trên account) | [[IAM Identity Center]] |
| IdP doanh nghiệp tương thích **SAML 2.0** (ADFS), cấu hình federation thủ công | **SAML 2.0 federation**: `AssumeRoleWithSAML` → credentials tạm thời (1 h mặc định, tối đa 12 h) | [[SAML 2.0 Identity Federation]] |
| User cần pass role có sẵn cho service, không được tạo/sửa role | **`iam:PassRole`** (+ `iam:PassedToService`; role và user cùng account) | [[Service-linked Roles and PassRole]] |
| Báo cáo compliance của AWS (SOC, PCI, ISO) cho auditor | **AWS Artifact** | [[AWS Artifact and License Manager]] |
| Secret + **rotation tự động** (nhất là mật khẩu RDS) | **Secrets Manager** | [[Secrets Manager]] |
| Cấu hình phân cấp, rẻ, SecureString, AMI mới nhất | **SSM Parameter Store** | [[SSM Parameter Store]] |
| HSM riêng **single-tenant**, khách hàng tự quản, PKCS#11/JCE/CNG (KMS nay cũng FIPS 140-3 Level 3 nên "Level 3" một mình không đủ) | **CloudHSM** | [[CloudHSM]] |
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
| Private subnet ra Internet (IPv4), không nhận kết nối vào | **NAT Gateway**: zonal thì đặt trong public subnet, mỗi AZ một cái; regional thì một NATGW cho cả VPC (AWS trải qua các AZ) | [[NAT Gateway]] |
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
| Chắc chắn launch được ở một AZ (sự kiện, Black Friday), không cam kết dài hạn | **On-Demand Capacity Reservation** (+ Savings Plans nếu cần giảm giá) | [[Reserved Instances and Savings Plans]] |
| Tải 24/7, 1–3 năm; chuyển dần EC2 → Fargate → Lambda | **RI / Savings Plans** (Compute SP) | [[Reserved Instances and Savings Plans]] |
| Memory, disk, app log của EC2/on-prem | **CloudWatch Agent** | [[CloudWatch Agent]] |

### Storage (S3/EBS/EFS/FSx)
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Shared file system cho nhiều EC2 Linux, NFS, multi-AZ | **EFS** | [[EFS]] |
| Windows, SMB, AD, DFS, VSS | **FSx for Windows** | [[FSx for Windows]] |
| HPC/ML, Lustre, xử lý nhanh dữ liệu S3 | **FSx for Lustre** | [[FSx for Lustre]] |
| User ở xa region upload chậm | **S3 Transfer Acceleration** (accelerate endpoint, chỉ trả phí khi được tăng tốc) | [[S3 Performance Optimization]] |
| Quy định bắt buộc mã hóa **2 lớp** at rest trên S3 | **DSSE-KMS** | [[S3 Encryption]] |
| Web ở domain A đọc object / gọi API ở domain B bị chặn | **CORS configuration** ở phía B | [[CORS]] |
| Chia sẻ dataset lớn, người tải trả phí transfer | **S3 Requester Pays** (requester đã xác thực + `x-amz-request-payer`) | [[S3 Requester Pays]] |
| Danh sách object định kỳ + trạng thái mã hóa / replication / storage class | **S3 Inventory** (daily/weekly, CSV/ORC/Parquet) | [[S3 Inventory]] |
| Hiệu năng S3 cao nhất, độ trễ thấp cho ML/analytics, compute cùng AZ | **S3 Express One Zone** (directory bucket) | [[S3 Storage Classes]] |
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
| Đổ stream vào S3/Redshift/OpenSearch, ít vận hành | **Amazon Data Firehose** (near real-time) | [[Kinesis Data Firehose]] |
| Workflow nhiều bước, > 15 phút, có phê duyệt | **Step Functions** | [[Step Functions]] |
| Cron serverless (rate / cron / at, có time zone) | **EventBridge Scheduler** | [[EventBridge]] |
| Phản ứng thay đổi trạng thái, đổi event trước khi tới target | **EventBridge rule** (+ input transformer) | [[EventBridge]] |
| Hàng nghìn job tính toán song song, có queue + ưu tiên | **AWS Batch** | [[AWS Batch]] |
| Distributed tracing qua nhiều dịch vụ, service map | **X-Ray** | [[X-Ray]] |
| Test app mobile/web trên thiết bị thật | **AWS Device Farm** | [[Device Farm]] |
| JMS/AMQP/MQTT, migrate broker on-prem | **Amazon MQ** | [[Amazon MQ]] |

### HA/DR & Global
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Cache nội dung HTTP cho user toàn cầu | **CloudFront** | [[CloudFront Architecture]] |
| TCP/UDP toàn cầu, 2 anycast static IP, failover không phụ thuộc TTL | **Global Accelerator** | [[Global Accelerator]] |
| User chỉ được vào S3 qua CloudFront | **OAC** + bucket policy | [[CloudFront OAI and OAC]] |
| Active-passive, trang bảo trì trên S3 | **R53 Failover routing** | [[R53 Failover Routing]] |
| Độ trễ cực thấp cho user ở một thành phố lớn (game, VDI) | **Local Zone** | [[AWS Local Zones]] |
| Compute ở mobile edge trong mạng 5G | **Wavelength Zone** | [[AWS Global Infrastructure]] |
| Dùng AWS nhưng workload/dữ liệu phải ở on-premises | **Outposts** | [[AWS Global Infrastructure]] |

### Monitoring / Governance / IaC
| Từ khóa trong đề | Chọn | Note |
|---|---|---|
| Deploy cùng hạ tầng ra nhiều account + region | **CloudFormation StackSets** | [[CFN StackSets]] |
| Stack chỉ hoàn tất khi bootstrap EC2 xong | **CreationPolicy + cfn-signal** | [[CFN Wait Conditions and cfn-signal]] |
| Xóa stack nhưng giữ DB/dữ liệu | **DeletionPolicy Retain/Snapshot** | [[CFN Deletion Policy]] |
| Cảnh báo khi chi phí **dự báo** vượt mức | **AWS Budgets** | [[AWS Budgets]] |
| Xem, lọc, dự báo chi phí trên console | **Cost Explorer** (hourly có phí) | [[AWS Cost Management]] |
| Dữ liệu billing chi tiết nhất cho Athena / QuickSight / BI | **CUR 2.0 qua Data Exports** → S3 (CSV/Parquet) | [[AWS Cost Management]] |
| Chargeback chi phí theo phòng ban / dự án | **Cost allocation tags** (phải activate) | [[AWS Cost Management]] |
| End user tự launch hạ tầng theo mẫu chuẩn, không có quyền hạ tầng | **AWS Service Catalog** (product, portfolio) | [[AWS Service Catalog]] |
| Nhiều account dùng **chung** subnet / TGW / dedicated host, không nhân bản | **RAM** (Resource Access Manager; bật organization sharing để share cho OU) | [[AWS Resource Access Manager]] |
| Chặn launch EC2 vượt số license (SQL Server, Windows…) | **License Manager**: self-managed license gắn AMI / launch template | [[AWS Artifact and License Manager]] |
| Chạm giới hạn tài nguyên khi mở rộng / sang region mới | **Service Quotas** → Request increase (theo region; CloudWatch alarm khi gần chạm) | [[Service Quotas]] |
| Account mới trong Organization cần sẵn quota cao | **Quota request template** | [[Service Quotas]] |
| Alarm báo nhầm vì spike ngắn | **Evaluation periods + datapoints to alarm** (M of N) | [[CloudWatch Basics]] |

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
| Thứ tự | FIFO (300 msg/s, 3.000 với batching; high-throughput mode cao hơn) | FIFO topic (thứ tự + dedup, chỉ tới SQS) | Trong mỗi shard |
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
| Intelligent-Tiering | ≥3 | – | (< 128 KB không tự chuyển, không phí monitoring) | ms, phí monitoring; Archive Access 90–730 ngày, Deep Archive Access 183–730 ngày (tùy chọn) | Pattern không biết trước |
| Standard-IA | ≥3 | 30 ngày | 128 KB | ms, phí/GB | Ít truy cập (~tháng), quan trọng |
| One Zone-IA | **1** | 30 ngày | 128 KB | ms, phí/GB | Dữ liệu tạo lại được, bản replica |
| Glacier Instant Retrieval | ≥3 | 90 ngày | 128 KB | ms, phí cao hơn | Ít truy cập (~quý), cần ngay |
| Glacier Flexible Retrieval | ≥3 | 90 ngày | +40 KB metadata / object | Expedited 1–5 phút, Standard 3–5 h, Bulk 5–12 h (miễn phí) | Archive, chờ phút–giờ |
| Glacier Deep Archive | ≥3 | 180 ngày | +40 KB metadata / object | Standard ~12 h, Bulk ≤ 48 h | Compliance nhiều năm, rẻ nhất |
| Express One Zone | **1 (bạn chọn)** | – | – | nhanh hơn Standard; storage đắt hơn, request rẻ hơn ~50% | ML / analytics cần độ trễ thấp, chỉ cho bản sao (directory bucket) |

### EBS volume types → [[EBS Volume Types]]
| Loại | Max IOPS/volume | Max throughput | Boot | Dùng khi |
|---|---|---|---|---|
| gp3 | 80,000 (3,000 baseline) | 2,000 MiB/s | Có | Mặc định, rẻ hơn gp2 ~20%, 1 GB–64 TB |
| gp2 | 16,000 (3 IOPS/GB, burst) | 250 MB/s | Có | Legacy; volume nhỏ dễ cạn burst credit (tụt về baseline) |
| io1 | 64,000 (50 IOPS/GB) | 1,000 MB/s | Có | DB cần IOPS cam kết, latency ổn định; Multi-Attach |
| io2 Block Express | 256,000 (1,000 IOPS/GB) | 4,000 MB/s | Có | > 64,000 IOPS, sub-ms, tới 64 TB (io2 = Block Express từ 2025) |
| st1 (HDD) | 500 | 500 MB/s | **Không** | Throughput tuần tự: big data, log, Kafka |
| sc1 (HDD) | 250 | 250 MB/s | **Không** | Dữ liệu lạnh, rẻ nhất |

Ghi chú: bài mới dạy gp3 là mặc định, tới 80,000 IOPS / 2,000 MiB/s; gp3 có trần IOPS cao hơn io1 nhưng không cam kết latency như provisioned IOPS. Instance non-Nitro chỉ 32,000 IOPS. Bản khóa cũ (và có thể bộ đề cũ) dùng mốc gp3 16,000 IOPS / 1,000 MiB/s.

### EC2 purchase options → [[EC2 Purchase Options]], [[Reserved Instances and Savings Plans]]
| Option | Dùng khi | Lưu ý |
|---|---|---|
| On-Demand | Ngắn hạn, không biết trước, không chịu gián đoạn | Mặc định |
| Spot | Rẻ nhất, chịu gián đoạn, batch/stateless, ECS/EKS, CI/CD | **Không** dùng cho workload không chịu gián đoạn; cảnh báo 2 phút (EventBridge + metadata); terminate / stop / hibernate |
| Reserved Instances | 24/7, steady-state, 1/3 năm | Standard / Convertible; Regional RI không giữ capacity; Zonal RI giữ; active rồi không hủy được |
| Savings Plans | Cam kết $/giờ 1/3 năm | Compute SP phủ EC2 + Fargate + Lambda; không giữ capacity; AWS khuyên dùng thay RI |
| On-Demand Capacity Reservation | Cần capacity đảm bảo, không cam kết | Trả giá On-Demand cả khi không dùng, không giảm giá; immediate / future-dated; open / targeted |
| Dedicated Instances | Không chia sẻ phần cứng với khách khác | Không cần quản lý host |
| Dedicated Hosts | License theo socket/core, BYOL; cách ly + kiểm soát host | Trả theo host, tự quản lý capacity; không dùng với placement group/RDS (khóa cũ) |
| Scheduled RI | Khóa cũ: tải định kỳ vài giờ/ngày | Đã deprecated, không mua được |

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
| FIPS | **140-3 Level 3** (bài KMS mới; khóa cũ nói 140-2 Level 2) | 140-2 **Level 3** (theo bài CloudHSM) |
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
| IAM | 5.000 user/account (hard limit, Service Quotas không cho tăng); user ≤ 10 group; 300 group/account (nay xin tăng tới 500); 2 access key/user |
| VPC | CIDR /28 → /16; mỗi subnet trừ **5 IP** (/28 → 11); router +1, DNS +2; default VPC 172.31.0.0/16, /20 mỗi AZ |
| LB subnet | Nên /27 (cần ≥ 8 IP trống) |
| EC2 | Metadata 169.254.169.254; user data ≤ 16 KB, chạy 1 lần; spread PG 7 instance/AZ |
| EBS | gp2 16K IOPS → io1 64K → gp3 80K → io2 Block Express 256K → (RAID 0 tới trần instance) → Instance Store hàng triệu; FSR tối đa 5/region |
| S3 | Object 0–50 TB (khóa cũ: 5 TB); single PUT ≤ 5 GB; multipart nên dùng từ 100 MB; RTC 15 phút; 200 OK = đã lưu durable |
| S3 bucket | Khóa cũ: 100 soft / 1.000 hard (khóa mới không nêu); nay: 10.000 mặc định (từ 11/2024) |
| S3 lifecycle | ≥ 30 ngày ở Standard trước khi sang IA; một rule qua Glacier IR phải ≥ 90 ngày mới sang Glacier Flexible; object < 128 KB mặc định không transition; min duration 30/90/180 ngày |
| S3 Object Lock | Bật được cho bucket mới hoặc có sẵn (khóa cũ: chỉ bucket mới); bucket default chỉ cho Retention, không cho Legal Hold |
| S3 encryption | SSE bắt buộc, mặc định SSE-S3 (khóa cũ: không header thì không mã hóa); 4 kiểu SSE: SSE-C (legacy, chặn mặc định), SSE-S3, SSE-KMS, DSSE-KMS |
| S3 Inventory | Daily / weekly; lần đầu tới 48 giờ, không ép chạy; target bucket cùng region |
| S3 Transfer Acceleration | Bật xong tới ~20 phút mới hiệu lực |
| S3 presigned URL bằng IAM role | Hết hiệu lực khi token role hết hạn: mặc định 1 h, tối đa 12 h |
| KMS | Mã hóa trực tiếp ≤ 4 KB; xóa key chờ 7–30 ngày; rotation CMK: mặc định tắt, ~1 năm (chọn được chu kỳ); ~1 USD/key/tháng; FIPS 140-3 Level 3 |
| CloudTrail | Event History 90 ngày; không real-time, log giao khoảng 5 phút một lần (khóa cũ: trong vòng 15 phút) |
| CloudWatch Logs | Retention mặc định vô thời hạn; log class Infrequent Access không có metric filter / Live Tail / subscription filter, không đổi log class sau khi tạo |
| SAML federation | Credentials tạm thời mặc định 1 h, tối đa 12 h |
| Cost | Cost Explorer multi-year 38 tháng (miễn phí); CUR giao ≤ 1 lần/ngày; tối đa 500 cost allocation tag active |
| SQS | Message ≤ 1 MB (khóa cũ: 256 KB); 1 request ≤ 10 message / 1 MB. Retention 4 ngày (1 phút–14 ngày); visibility 30 s (0–12 h); long poll ≤ 20 s; delay ≤ 15 phút |
| SQS FIFO | 300 msg/s, 3.000 với batching; high-throughput: ≥ 2.400 TPS, tới 70.000 TPS tùy region (×10 với batching); dedup cửa sổ 5 phút |
| Kinesis | Shard 1 MB/s (1.000 record/s) vào, 2 MB/s ra; retention 24 h → 365 ngày; provisioned hoặc on-demand. Firehose buffer S3 mặc định 5 MB / 300 s (1–128 MB, 0–900 s) |
| Lambda | Timeout 15 phút; memory 128 MB–10 GB; /tmp 512 MB–10 GB; ZIP 50 MB zipped / 250 MB unzipped, container image ≤ 10 GB |
| API Gateway | Timeout 29 s (504); cache 500 MB–237 GB, TTL 300 s (max 3.600 s); 429 = throttling |
| Step Functions | Standard ≤ 1 năm, exactly-once; Express ≤ 5 phút, at-least-once; không đổi loại sau khi tạo |
| EventBridge | Rule tối đa 5 target; schedule rule legacy chỉ UTC → EventBridge Scheduler có time zone |
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
- SCP: deny gắn ở root/OU chảy xuống, nhưng **allow phải có ở mọi tầng** root → OU → account; gỡ `FullAWSAccess` ở một OU mà không thay allow khác là account trong OU mất mọi quyền ([[Service Control Policies]]).
- RAM **chia sẻ** chứ không sao chép (StackSets mới tạo bản sao); không re-share được ([[AWS Resource Access Manager]]).
- Identity Center dành cho **workforce**; khách hàng đăng nhập Google/Facebook → Cognito ([[IAM Identity Center]]).
- AWS Config chỉ **phát hiện**, không **ngăn**. Muốn ngăn thì dùng IAM/SCP ([[AWS Config]]).
- GuardDuty phát hiện chứ không tự chặn; chặn L7 là việc của WAF, DDoS là Shield ([[GuardDuty]]).
- CloudTrail không real-time (log giao khoảng 5 phút một lần) ([[CloudTrail]]).
- Metric filter của CloudWatch Logs **không áp ngược** cho log đã có ([[CloudWatch Logs]]).
- AWS managed key (`aws/s3`) không dùng cross-account được. Cần customer managed key ([[S3 Encryption]]).
- ACM không gắn được vào EC2. Đặt ALB phía trước. Cert phải cùng region, riêng CloudFront ở us-east-1 ([[ACM]]).

**Networking**
- Security Group không có deny. Chặn IP cụ thể dùng NACL ([[Compare - Security Groups vs NACL]]).
- NACL: rule DENY số lớn hơn ALLOW thì vô tác dụng; quên mở outbound ephemeral 1024–65535 ([[NACL]]).
- NAT Gateway: không có SG. **Zonal** đặt trong **public** subnet, chỉ HA trong một AZ; **regional** chỉ chọn VPC, AWS tự trải qua các AZ. NAT giữa mạng private có CIDR chồng lấn: private NAT Gateway ([[NAT Gateway]]).
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
- Block Public Access bật ở mức account (hoặc organization) thì tắt ở bucket vẫn bị chặn ([[S3 Security]]).
- S3 Event Notifications gửi được thẳng tới EventBridge (cùng SNS, SQS, Lambda) ([[S3 Events]]).
- Requester Pays không dùng với static website hosting / anonymous; thiếu `x-amz-request-payer` → 403 ([[S3 Requester Pays]]).
- CORS không phải permission: bucket private vẫn cần bucket policy / presigned URL ([[CORS]]).
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
- Amazon MQ mặc định private, cần private networking; không có public endpoint như SQS trừ khi bật public accessibility lúc tạo broker ([[Amazon MQ]]).

**Khi làm bài**
- Không để trống câu nào: câu bỏ trống bị chấm sai, đoán sai không bị trừ điểm. Hết giờ thì đoán, dùng màn hình review để lọc câu chưa trả lời ([[Exam Technique]]).
