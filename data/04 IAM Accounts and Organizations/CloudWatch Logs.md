---
tags: [saa-c03, s04-iam-accounts-and-organizations, monitoring, logging, management]
aliases: [CW Logs, CloudWatch Logs, Log Group, Log Stream, Log Event, Metric Filter, Log Class, Infrequent Access log class, CloudWatch Logs Insights]
lessons: ["0082 CloudWatch Logs"]
videos: ["055 [ASSOCIATESHARED] CloudWatch Logs"]
---
# CloudWatch Logs

> **TL;DR:** CloudWatch Logs là dịch vụ **public**, **regional** để lưu trữ, giám sát và truy cập dữ liệu log. Cấu trúc: **log event** (timestamp + message) → **log stream** (chuỗi event từ cùng một nguồn) → **log group** (container chứa các stream cùng loại; nơi đặt retention, quyền truy cập, **log class**, **deletion protection**, metric filter). **Metric filter** biến mẫu trong log thành metric để đặt alarm (không áp ngược cho log cũ); **Logs Insights** truy vấn, phân tích log trên nhiều log group.

## 🖼️ Sơ đồ
![[CloudWatch Logs.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[CloudWatch Logs.svg]]*

## Khái niệm cốt lõi
- **Public service**: endpoint nằm trong AWS public zone, nên dùng được từ trong VPC, từ on-premises, thậm chí từ cloud khác, miễn có kết nối mạng và quyền AWS (xem [[AWS Public vs Private Services]]). Đây là mặc định; có thể đổi sang truy cập private bằng các dịch vụ mạng khác (bài không nói là dịch vụ nào; bổ sung: [[Interface VPC Endpoints]]).
- **Regional service** (ví dụ `us-east-1`).
- **Logging data** tối thiểu gồm **timestamp** (năm, tháng, ngày, giờ, phút, giây, múi giờ) + **dữ liệu**. Log từ AWS service thì dùng ngay được; log từ **nguồn bên ngoài** phải mã hóa **UTF-8**.
- Các cách đưa log vào:
  1. **Tích hợp sẵn với AWS service**: EC2, [[VPC Flow Logs]], [[Lambda]], [[CloudTrail]], Route 53... Bảo mật thường qua **IAM role / service role** (xem [[IAM Roles]]).
  2. **Unified CloudWatch Agent**: cho log OS/ứng dụng tùy chỉnh trên EC2, hoặc máy chủ bên ngoài AWS (on-prem). Xem [[CloudWatch Agent]].
  3. **AWS SDK** ghi log trực tiếp từ code. Thuộc phạm vi khóa developer/DevOps; với SAA chỉ cần nhớ hai cách trên.

## Cách hoạt động / Kiến trúc

| Thành phần | Mô tả | Ví dụ `/var/log/messages` trên nhiều EC2 |
|---|---|---|
| **Log event** | Một bản ghi: **timestamp + message**. Message được coi là khối dữ liệu thô, nhưng có thể định nghĩa cách tách field/cột | Một dòng mới được ghi vào `/var/log/messages` |
| **Log stream** | Chuỗi log event **có thứ tự từ cùng một nguồn** | Một stream cho mỗi instance |
| **Log group** | Container chứa nhiều log stream **cùng loại log**. Nơi cấu hình **retention**, **quyền truy cập**, **log class**, **deletion protection**, **metric filter**; cấu hình áp cho mọi stream bên trong | Một log group cho `/var/log/messages` |

```mermaid
flowchart LR
  SRC["Logging sources: AWS services, app, server, DB, API"] -->|"log events (timestamp + message)"| LS
  subgraph CWL["CloudWatch Logs (us-east-1)"]
    subgraph LG["Log Group: retention, permissions"]
      LS["Log Stream (instance 1)"]
      LS2["Log Stream (instance 2)"]
    end
  end
  LG --> MF["Metric Filter (tìm pattern)"]
  MF --> M["CloudWatch Metric"]
  M --> AL["Alarm → thông báo / hành động"]
```

### Cấu hình ở log group
| Thiết lập | Ý nghĩa |
|---|---|
| **Retention** | Giữ log bao lâu. Mặc định **vô thời hạn** (không bao giờ hết hạn), nên đặt lại để cắt bớt chi phí |
| **Access control** | Ai được đọc log của group (ví dụ chỉ DBA được xem log database) |
| **Log class** | **Standard**: đủ mọi tính năng. **Infrequent Access**: rẻ hơn nhưng **không có** metric filter, Live Tail, subscription filter. **Không đổi được** sau khi tạo log group |
| **Deletion protection** | Chặn xóa log (ví dụ access log phải giữ vì compliance) |

- Vì các thiết lập này đặt theo group, khi thiết kế hãy chia log group theo **loại dữ liệu** và theo **yêu cầu cấu hình** (retention, quyền, log class).
- Ví dụ Aus-E-Mart: web tier trên EC2 và database Aurora ở nhiều nơi. Log group cho access log web có metric filter tìm `403` → metric → alarm báo security team; log group cho database giữ **180 ngày**, chỉ DBA truy cập, metric filter tìm chữ `slow` để phát hiện timeout.

### Metric filter
- Định nghĩa **trên log group**, liên tục quét log event của mọi stream trong group để tìm pattern (mã lỗi ứng dụng, SSH login thất bại...).
- Mỗi lần khớp → **tăng một metric** trong CloudWatch → đặt **alarm** trên metric đó để thông báo admin hoặc kích hoạt hành động trong AWS/hệ thống ngoài (xem [[CloudWatch Basics]]).
- Ví dụ: instance Linux ghi log mỗi lần SSH thất bại → metric filter đếm → alarm khi vượt ngưỡng (ví dụ 5 lần trong 1 phút).
- Metric filter **không áp ngược (not retroactive)**: bật hôm nay thì chỉ đếm log từ hôm nay; log cũ không sinh metric.

### Logs Insights
- Môi trường **truy vấn tương tác** trên dữ liệu log: ngôn ngữ truy vấn riêng của Logs Insights, **OpenSearch PPL** và **SQL** cho phân tích phức tạp.
- Nằm "bên ngoài" từng log group: truy vấn **xuyên nhiều log group** để thấy bức tranh chung khi điều tra sự cố, tìm pattern, phân tích vận hành.

## 🎯 Mẹo thi SAA-C03
- CloudWatch Logs là **public service** và **regional**.
- Log OS/ứng dụng bên trong EC2 hoặc server on-prem → cần **CloudWatch Agent** (CloudWatch mặc định không thấy được bên trong instance).
- "Tạo metric/alarm từ nội dung log" → **metric filter** trên log group.
- **Retention** và **permissions** đặt ở **log group**, không phải từng stream. Retention mặc định là **vô thời hạn**.
- Log ít khi đọc, muốn rẻ → log class **Infrequent Access** (mất metric filter, Live Tail, subscription filter; chọn lúc tạo, không đổi được). Cần chặn xóa log vì compliance → **deletion protection**.
- Metric filter **không áp ngược** cho log đã có. Truy vấn, phân tích log trên nhiều log group → **Logs Insights**.
- Nhiều service đổ log vào đây: CloudTrail, Lambda, VPC Flow Logs, Route 53...

## Liên kết
- Tiên quyết: [[CloudWatch Basics]], [[AWS Public vs Private Services]]
- Dùng cùng: [[CloudTrail]], [[CloudWatch Agent]], [[VPC Flow Logs]], [[Lambda]]
- Liên quan: [[IAM Roles]], [[EventBridge]], [[S3 Access Logs]]
- Phân biệt với: [[CloudTrail]] (ghi lại *API call / hoạt động tài khoản*; CloudWatch Logs là *kho chứa log* nói chung), [[CloudWatch Basics]] (metrics)
- MOC: [[_MOC 04 IAM Accounts and Organizations]]
