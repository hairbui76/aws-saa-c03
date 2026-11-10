---
tags: [saa-c03, s03-aws-fundamentals, global-infrastructure, networking, compute]
aliases: [Local Zones, Local Zone, LZ]
lessons: ["0375 AWS Local Zones"]
videos: ["019 [ASSOCIATESHARED] AWS Global Infrastructure"]
---
# AWS Local Zones

> **TL;DR:** Local Zone là hạ tầng AWS đặt ở một **thành phố lớn**, phần mở rộng của một **parent region** (khóa mới gọi là "mini region" chỉ có một số dịch vụ như EC2, storage; bản khóa cũ ví như "AZ đặt gần bạn"), để chạy tài nguyên với **độ trễ cực thấp** tới người dùng/văn phòng ở đó. Đổi lại nó chỉ là **một zone**, không có resilience sẵn, và không phải dịch vụ nào cũng hỗ trợ.

## 🖼️ Sơ đồ
![[AWS Local Zones.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[AWS Local Zones.svg]]*

## Khái niệm cốt lõi
- **Theo khóa mới** (Local Zone được giới thiệu ở cuối bài [[AWS Global Infrastructure]], không còn bài riêng):
  - Local Zone là hạ tầng AWS đặt ở **thành phố lớn**, là **phần mở rộng của parent region**. Có thể coi như một **"mini AWS region"** giúp người dùng ở đó truy cập dịch vụ nhanh hơn.
  - **Không phải region đầy đủ**: chỉ có **một số dịch vụ** như EC2 và storage.
  - Use case kinh điển: ứng dụng mà vài ms độ trễ cũng làm trải nghiệm "giật", ví dụ **game server**, **virtual desktop infrastructure (VDI)**.
  - AWS tự xây Local Zone ở nơi có **đủ nhu cầu** cho dịch vụ độ trễ thấp nhưng **chưa đủ** để mở cả một region.
  - Hai lựa chọn "đưa AWS lại gần" khác được giới thiệu cùng lúc: **Wavelength Zone** (trong mạng 5G) và **Outposts** (phần cứng AWS trong data center của bạn).
- Các ý dưới đây (vấn đề giải quyết, cách đặt tên, Direct Connect, private networking) là từ bài Local Zones riêng của bản khóa cũ.
- **Vấn đề giải quyết:** kiến trúc region + AZ thông thường scale tốt và chịu lỗi AZ tốt, nhưng các AZ có thể cách văn phòng/người dùng **hàng trăm km**. Dù đi cáp quang, kể cả qua [[Direct Connect]], khoảng cách vật lý vẫn gây độ trễ vài ms — đáng kể với ứng dụng nhạy độ trễ (ví dụ giao dịch tài chính).
- **Parent region:** mỗi Local Zone gắn với một region "cha" trong cùng vùng địa lý.
- **Cách đặt tên:** `<tên region>-<mã thành phố quốc tế>-<số>`:
  - `us-west-2-las-1` → Las Vegas, parent là `us-west-2` (Oregon).
  - `us-west-2-lax-1a`, `us-west-2-lax-1b` → **hai** Local Zone cùng ở Los Angeles (một thành phố có thể có nhiều Local Zone).
  - Nhìn tên là biết parent region.
- Mỗi Local Zone là **điểm hạ tầng độc lập**: có kết nối Internet riêng và thường **hỗ trợ Direct Connect** → kết nối riêng, hiệu năng cao từ văn phòng tới Local Zone.
- **Private networking với parent region**: subnet trong Local Zone hoạt động như subnet bình thường, có kết nối private với phần còn lại của VPC.

## Cách hoạt động / Kiến trúc
- Với **EC2 và VPC**: VPC của parent region được **mở rộng** bằng cách tạo **subnet trong Local Zone**; sau đó chạy EC2 và tài nguyên khác trong subnet đó như bình thường, hưởng độ trễ cực thấp (xem [[VPC Subnets]]).
- Một số thứ **vẫn dựa vào parent region**. Ví dụ điển hình: **[[EBS Snapshots]]** của volume trong Local Zone được lưu vào **S3 ở parent region** → snapshot vẫn hưởng replication qua nhiều AZ của region như bình thường.

```mermaid
flowchart LR
    subgraph REG["Parent region us-west-2"]
        subgraph VPC["VPC"]
            A["Subnet us-west-2a"]
            B["Subnet us-west-2b"]
            C["Subnet us-west-2c"]
            L1["Subnet us-west-2-lax-1a"]
            L2["Subnet us-west-2-las-1"]
        end
        S3["S3 (EBS snapshots)"]
    end
    LAX["Local Zone LA<br/>(us-west-2-lax-1a)"] --- L1
    LAS["Local Zone Las Vegas<br/>(us-west-2-las-1)"] --- L2
    BIZ["Văn phòng ở LA"] -- "Direct Connect / Internet<br/>độ trễ rất thấp" --> LAX
    L1 -. "EBS snapshot về parent" .-> S3
```

## Bảng so sánh / số liệu

| | AZ trong region | Local Zone |
|---|---|---|
| Vị trí | Trong region, có thể xa người dùng hàng trăm km | Ở thành phố gần người dùng/văn phòng |
| Resilience | Nhiều AZ → thiết kế HA được trong region | **"1" zone**, không có resilience sẵn (như một AZ đơn) |
| Độ trễ | Thấp | **Thấp nhất có thể** |
| Hỗ trợ dịch vụ | Đầy đủ | Hạn chế; nhiều dịch vụ phải **opt-in**, có giới hạn |
| Phụ thuộc | — | Dùng parent region cho một số chức năng (ví dụ EBS snapshot) |

## 🎯 Mẹo thi SAA-C03
- Từ khóa **"lowest possible latency"/"highest performance" cho người dùng ở một thành phố/văn phòng cụ thể** → nghĩ tới **Local Zones**.
- Local Zone = **một zone**, **không có resilience sẵn**; cần HA thì vẫn phải thiết kế thêm (nhiều zone/region) — xem [[HA vs FT vs DR]].
- Nghĩ về nó như **một AZ nhưng gần bạn**. Giống [[CloudFront Architecture|CloudFront edge location]] ở chỗ nằm gần người dùng hơn region, nhưng Local Zone chạy được compute/subnet của VPC.
- **Direct Connect tới Local Zone được hỗ trợ** — dùng cho nhu cầu hiệu năng cực cao.
- **EBS snapshot đi về parent region** (lưu trên S3 của region cha).
- Không phải dịch vụ nào cũng có ở Local Zone; nhiều cái opt-in → luôn kiểm tra tài liệu AWS cho khu vực cụ thể.
- Phân biệt ba lựa chọn: **Local Zone** = gần người dùng ở **thành phố lớn** (game, VDI); **Wavelength Zone** = compute trong **mạng 5G** cho ứng dụng di động/IoT; **Outposts** = phần cứng AWS **on-premises** cho workload hybrid hoặc quy định bắt dữ liệu ở tại chỗ.

## Liên kết
- Tiên quyết: [[AWS Global Infrastructure]], [[EC2 Architecture and Resilience]], [[VPC Sizing and Structure]]
- Liên quan: [[VPC Subnets]], [[EBS Snapshots]], [[Direct Connect]], [[HA vs FT vs DR]]
- Phân biệt với: [[CloudFront Architecture]], [[Global Accelerator]]
- Section: [[_MOC 03 AWS Fundamentals]]
