---
tags: [saa-c03, s07-ec2, ec2, storage, ebs, block-storage, resilience]
aliases: [Elastic Block Store, EBS Volume, EBS Volumes]
lessons: ["0130 Elastic Block Store EBS Service Architecture", "0137 DEMO EBS Volumes PART1", "0138 DEMO EBS Volumes PART2", "0139 DEMO EBS Volumes PART3"]
videos: ["124 [ASSOCIATESHARED] Elastic Block Store (EBS) Service Architecture", "131 [ASSOCIATESHARED] [DEMO] EBS Volumes - PART1", "132 [ASSOCIATESHARED] [DEMO] EBS Volumes - PART2"]
---
# EBS

> **TL;DR:** Elastic Block Store (EBS) cung cấp **block storage qua mạng** cho EC2 dưới dạng **volume**. Volume là **persistent** (sống độc lập với instance), nhưng là dịch vụ **AZ-scoped**: chỉ gắn vào instance cùng AZ và chịu ảnh hưởng nếu cả AZ hỏng. Muốn di chuyển hoặc bảo vệ dữ liệu ra ngoài AZ thì dùng **snapshot** lưu trong S3.

## 🖼️ Sơ đồ
![[EBS.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[EBS.svg]]*

## Khái niệm cốt lõi
- **Block storage**: EBS lấy đĩa vật lý thô và cấp phát một phần thành **volume**; đọc/ghi theo block ID. Xem [[Storage Fundamentals]].
- Volume có thể **không mã hóa** hoặc **mã hóa bằng KMS** (xem [[EBS Encryption]], [[KMS]]).
- Instance nhìn volume như **một block device thô bình thường**; OS tự tạo file system (ext3, ext4, XFS trên Linux; NTFS trên Windows). EBS volume trông giống hệt mọi thiết bị lưu trữ khác với EC2.
- **AZ-scoped**: EBS ở mỗi AZ là một deployment riêng, cô lập. Không truy cập chéo AZ, không chéo region.
- **Resilient trong AZ**: dữ liệu được replicate qua nhiều thiết bị vật lý trong AZ, nên một đĩa hỏng không sao. Nhưng **AZ hỏng → volume trong AZ đó hỏng** (cùng với instance).
- **Gắn vào một instance** tại một thời điểm qua storage network (mặc định nên nghĩ như vậy). Có thể **detach rồi attach** sang instance khác cùng AZ.
- **Multi-Attach**: một số loại volume (io1/io2) cho phép gắn **nhiều instance cùng lúc**, dùng cho cluster. Ứng dụng cluster phải tự quản lý ghi đồng thời để tránh hỏng dữ liệu.
- **Persistent, không gắn với vòng đời instance**:
  - Instance chuyển host → volume đi theo.
  - Instance stop/start hoặc restart → volume vẫn giữ nguyên.
  - Dữ liệu tồn tại tới khi bạn **xóa volume**.
- **Snapshot** sao lưu volume vào S3 (do EBS quản lý) → **regionally resilient** (replicate qua nhiều AZ). Từ snapshot có thể tạo volume ở **AZ khác**, hoặc **copy snapshot sang region khác** rồi tạo volume ở đó. Xem [[EBS Snapshots]].
- Có nhiều loại volume: SSD (general purpose, provisioned IOPS), HDD cơ, với kích thước và hiệu năng khác nhau. Xem [[EBS Volume Types]].
- **Tính tiền theo GB-tháng**: 1 GB trong 1 tháng = 2 GB trong nửa tháng = 0.5 GB trong 2 tháng. Một số loại volume tính thêm cho hiệu năng nâng cao (ví dụ IOPS provision thêm).

## Cách hoạt động / Kiến trúc

```mermaid
flowchart TB
    subgraph R1["us-east-1"]
      subgraph AZA["AZ-A"]
        IA["EC2 instance"] <--> VA["EBS volume"]
      end
      subgraph AZB["AZ-B"]
        IB["EC2 instance"] <--> VB["EBS volume<br/>(tạo từ snapshot)"]
      end
      S3A["S3 (snapshot)<br/>replicate 3+ AZ trong region"]
      VA -- "snapshot" --> S3A
      S3A -- "create volume" --> VB
      IB -. "KHÔNG gắn chéo AZ" .-x VA
    end
    subgraph R2["ap-southeast-2"]
      S3B["Snapshot copy"] -- "create volume" --> VC["EBS volume"] <--> IC["EC2 instance"]
    end
    S3A -- "copy snapshot sang region khác<br/>(global resilience, DR, migration)" --> S3B
```

- EBS replicate **trong một AZ** → AZ failure = mất volume.
- Snapshot lưu trên S3 → replicate qua **3+ AZ** trong region → tạo volume ở AZ khác được.
- Copy snapshot qua region → **global resilience** (DR, migration).

## Demo / Lab
Stack CloudFormation `EBSDemo` tạo VPC Aus-E-Mart và ba instance (Graviton, rẻ): AZA instance 1, AZA instance 2 (cùng `us-east-1a`) và AZB instance 1 (`us-east-1b`); mỗi instance có boot volume 8 GB.

**Phần 1: tạo và dùng volume**
1. *Create volume*: console liệt kê gp3/gp2, io1/io2, HDD st1/sc1 và standard (magnetic thế hệ trước). Chọn **gp3**, 10 GiB, giữ IOPS mặc định. Phải chọn **AZ** (`us-east-1a`); có thể tạo từ snapshot và bật encryption (demo không dùng).
2. Trạng thái: `creating` → `available` → attach → `in-use`. Khi attach, **chỉ thấy instance cùng AZ** (không thấy instance AZB). Chọn device name `/dev/sdf`; console nhắc tên trong OS có thể khác: trên instance hiện đại (Nitro) volume hiện ra là **`/dev/nvme1n1`**.
3. Trong OS (kết nối bằng EC2 Instance Connect):
   - `lsblk` liệt kê block device (root 8G, volume mới 10G).
   - `sudo file -s /dev/nvme1n1` → `data` nghĩa là chưa có file system.
   - `sudo mkfs -t xfs /dev/nvme1n1` tạo file system XFS; chạy lại `file -s` thấy đã có file system.
   - Tạo thư mục `/ebstest`, `sudo mount /dev/nvme1n1 /ebstest`, tạo file `testfile.txt`.

**Phần 2: persistence, đổi instance, đổi AZ**
4. **Reboot** → `df -k` không thấy volume vì mount thủ công không tự mount lại (production thì cấu hình `/etc/fstab`, có ghi chú trong command list) → mount lại → file test vẫn còn: volume persistent qua reboot.
5. Stop AZA instance 1, **detach** volume, **attach** sang AZA instance 2 → `file -s` thấy sẵn file system, mount là thấy file test: volume độc lập với instance.
6. Muốn đưa sang AZ B: stop instance 2, detach, **create snapshot** (lần đầu là full nên mất vài phút) → *Create volume from snapshot* ở `us-east-1b` (đổi được type, size, IOPS) → attach vào AZB instance 1, mount → thấy cùng dữ liệu.
7. Snapshot có **Copy snapshot** sang region khác (ví dụ `ap-southeast-1`) để chuyển dữ liệu (và instance) qua region.
8. Dọn dẹp: xóa snapshot, stop instance rồi detach/xóa hai volume đã tạo, xóa stack.
- (Bản khóa cũ dùng gp2 với device `/dev/xvdf`, có làm mẫu fstab bằng `blkid` + `mount -a`, và gộp demo Instance Store vào phần 3. Bài mới tách demo Instance Store thành bài riêng, xem [[Instance Store]].)

**Rút ra:** EBS tạo trong một AZ, chỉ gắn instance cùng AZ, chuyển giữa các instance mà giữ dữ liệu; snapshot (S3, regional) giúp chuyển sang AZ khác và copy qua region.

## 🎯 Mẹo thi SAA-C03
- **EBS là AZ-scoped**: không attach chéo AZ. Cần dữ liệu ở AZ khác → **snapshot → create volume ở AZ đích**. Ở region khác → **copy snapshot** sang region đó.
- **EBS persistent**: sống sót qua stop/start, reboot, chuyển host. Đối lập với [[Instance Store]] (ephemeral).
- AZ hỏng thì volume hỏng. Bảo vệ khỏi AZ failure → snapshot thường xuyên (có thể tự động hóa bằng [[AWS Backup]] hoặc Data Lifecycle Manager).
- Mặc định **một volume ↔ một instance**. Đề nhắc chia sẻ block volume cho cluster → **Multi-Attach (io1/io2)**, ứng dụng phải tự quản lý ghi. Cần chia sẻ file system cho nhiều instance/AZ → [[EFS]].
- Volume nhanh nhưng instance không đủ băng thông EBS → bottleneck ở instance (xem [[Enhanced Networking and EBS Optimized]]).
- Billing theo **GB-tháng đã provision** (không phải dung lượng đã dùng), cộng phí hiệu năng với một số loại.

## Liên kết
- Tiên quyết: [[Storage Fundamentals]], [[EC2 Architecture and Resilience]]
- Liên quan: [[EBS Volume Types]], [[EBS Snapshots]], [[EBS Encryption]], [[AMI]], [[KMS]], [[AWS Backup]], [[EC2 Instance Connect and SSH]]
- Phân biệt với: [[Instance Store]], [[Compare - EBS vs Instance Store]], [[EFS]]
