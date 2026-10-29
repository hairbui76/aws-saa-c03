---
tags: [saa-c03, s13-ha-and-scaling, compute, ec2, auto-scaling]
aliases: [Launch Template, Launch Configuration, Launch Configurations, LT, LC]
lessons: ["0227 Launch Configuration and Templates"]
---
# Launch Templates

> **TL;DR:** Launch Configuration (LC) và Launch Template (LT) là tài liệu **định nghĩa trước cấu hình EC2 instance**: AMI, instance type, storage, key pair, network, Security Group, user data, IAM role. [[Auto Scaling Groups|ASG]] dùng chúng để biết cần dựng **cái gì**. LT là phiên bản mới, là **superset** của LC, có **versioning** và dùng được để launch EC2 trực tiếp. AWS khuyến nghị dùng LT.

## 🖼️ Sơ đồ
![[Launch Templates.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[Launch Templates.svg]]*

## Khái niệm cốt lõi
- Mọi thứ thường khai báo lúc launch instance đều đặt được trong LC/LT:
  - [[AMI]], instance type và size ([[EC2 Instance Types]]), cấu hình storage ([[EBS]]), key pair.
  - Networking và [[Security Groups]].
  - **User data** ([[EC2 User Data Bootstrapping]]) và **IAM role** qua instance profile ([[EC2 Instance Roles]]).
- **Cả hai đều không sửa được (immutable)**: định nghĩa một lần là cấu hình đó bị khóa.
  - **LC**: không có version. Muốn đổi thì tạo LC mới rồi gắn LC mới vào ASG.
  - **LT**: có **versions**. Tạo version mới, có version mặc định/latest, và ASG trỏ tới một version cụ thể.
- LT hỗ trợ tính năng mới mà LC không có: **T2/T3 Unlimited** (CPU credit), **[[EC2 Placement Groups|placement groups]]**, **capacity reservations**, **Elastic Graphics**, cùng các loại instance đời mới.

## Cách hoạt động / Kiến trúc
```mermaid
flowchart LR
    LC["Launch Configuration (không sửa, không version)"] --> ASG["Auto Scaling Group"]
    LT["Launch Template (có version)"] --> ASG
    LT --> EC2["Launch EC2 trực tiếp (Console / CLI)"]
```
- **LC chỉ có một công dụng**: cấp cấu hình EC2 cho ASG.
- **LT có hai công dụng**: cấp cấu hình cho ASG, và **launch EC2 trực tiếp** từ console/CLI để tiết kiệm thời gian, không phải nhập lại cấu hình.
- Phân vai: **ASG quyết định WHEN và WHERE** (khi nào, subnet nào); **LT/LC quyết định WHAT** (instance gì, cấu hình ra sao).

## Bảng so sánh / số liệu
| Tiêu chí | Launch Configuration | Launch Template |
|---|---|---|
| Editable | Không | Không (nhưng tạo được version mới) |
| Versioning | Không | Có |
| Dùng với ASG | Có | Có |
| Launch EC2 trực tiếp | Không | Có |
| T2/T3 Unlimited, placement group, capacity reservation, Elastic Graphics | Không | Có |
| Khuyến nghị | Legacy | **Dùng cái này** |

> Cập nhật 2026: AWS đã **deprecate** Launch Configuration. LC không hỗ trợ các instance type ra mắt sau cuối 2022, và account mới (từ 10/2024) không tạo được LC nữa. Khóa học chỉ nói "AWS recommend LT".

## 🎯 Mẹo thi SAA-C03
- Đáp án nào dùng **Launch Template** thường đúng hơn Launch Configuration, nhất là khi đề nhắc **versioning**, Spot/On-Demand mix, placement group hay T3 Unlimited.
- Cần **sửa cấu hình** của LC thì phải **tạo LC mới** rồi cập nhật ASG. Với LT thì tạo **version mới**.
- "ASG = when & where, LT = what": đề hỏi đổi AMI hoặc instance type cho ASG thì câu trả lời là sửa LT (version mới), không phải sửa ASG.
- Muốn instance trong ASG có quyền gọi AWS API thì gắn **IAM role (instance profile)** trong LT. Đừng nhúng access key vào user data.

## Liên kết
- Tiên quyết: [[EC2 Basics]], [[AMI]], [[EC2 User Data Bootstrapping]], [[EC2 Instance Roles]]
- Liên quan: [[Auto Scaling Groups]], [[ASG Scaling Policies]], [[Security Groups]], [[EC2 Placement Groups]], [[Lab - Architecture Evolution]]
- Phân biệt với: [[CloudFormation Basics]] (IaC cho toàn bộ stack, còn LT chỉ là cấu hình một instance)
