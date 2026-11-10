---
tags: [saa-c03, s20-nosql-and-analytics, database, dynamodb, performance]
aliases: [DynamoDB RCU WCU, DynamoDB Capacity, DynamoDB Consistency, Query vs Scan, DynamoDB On-Demand vs Provisioned, DynamoDB Partitions, DynamoDB Capacity Planning]
lessons: ["0351 DynamoDB Operations Consistency and Performance PART1", "0352 DynamoDB Operations Consistency and Performance PART2"]
videos: ["334 [ASSOCIATESHARED] DynamoDB Consistency", "335 [ASSOCIATESHARED] DynamoDB Capacity", "336 [ASSOCIATESHARED] DynamoDB Capacity Planning", "337 [ASSOCIATESHARED] DynamoDB Query and Scan"]
---
# DynamoDB Operations and Performance

> **TL;DR:** DynamoDB có hai capacity mode: **on-demand (mặc định)** và provisioned. Với provisioned, 1 RCU = 4 KB đọc/giây (strongly consistent), 1 WCU = 1 KB ghi/giây, mọi operation làm tròn lên tối thiểu 1 đơn vị. Query chỉ đọc theo một giá trị partition key nên rẻ; Scan đọc cả table nên linh hoạt nhưng tốn capacity. Eventually consistent read (mặc định) rẻ bằng một nửa strongly consistent read, ở cả hai capacity mode.

## 🖼️ Sơ đồ
![[DynamoDB Operations and Performance.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[DynamoDB Operations and Performance.svg]]*

![[DynamoDB Operations and Performance - consistency.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[DynamoDB Operations and Performance - consistency.svg]]*

## Capacity modes

| | **On-demand** | **Provisioned** |
|---|---|---|
| Mặc định | **Có**: mode mặc định khi tạo table | Không |
| Khi nào dùng | Tải **không biết trước / khó đoán**, hoặc ưu tiên **admin overhead thấp nhất** | Tải biết trước, **dùng đều đặn**, muốn tối ưu chi phí |
| Cấu hình | Không đặt gì, DynamoDB tự lo | Đặt **RCU** và **WCU** cho từng table (thủ công hoặc auto scaling) |
| Tính tiền | Giá theo **mỗi triệu read/write request unit** | Theo RCU/WCU đã đặt |
| Giá | **Đắt hơn tính trên mỗi request**; bản khóa cũ nêu có thể đắt tới **~5 lần** provisioned (bài mới không nói con số) | Chỉ rẻ hơn khi capacity **được dùng hết đều đặn**; có thể mua reserved capacity |

- Ví dụ của bài: table chỉ bận **1 giờ mỗi ngày**. Provisioned phải trả cho capacity đỉnh **suốt 24 giờ**; on-demand chỉ tính tiền **giờ bận** đó.
- Có thể chuyển đổi giữa hai mode cả khi table đã có dữ liệu: **on-demand → provisioned lúc nào cũng được**; **provisioned → on-demand tối đa 4 lần trong cửa sổ trượt 24 giờ**.
- Ghi chú hiện nay: từ cuối 2024 AWS đã giảm giá on-demand khoảng 50%, nên khoảng chênh với provisioned nhỏ hơn con số trong khóa học; ý tưởng "on-demand = trả thêm để đổi lấy ít quản trị" vẫn đúng.

### Auto scaling cho provisioned
- Đặt **minimum**, **maximum** và **target utilization**. **CloudWatch** báo hiệu năng của table cho **Application Auto Scaling**, dịch vụ này tăng/giảm RCU/WCU trong khoảng min–max để giữ mức sử dụng gần target.
- "Best of both worlds": vẫn kiểm soát capacity như provisioned nhưng không phải trả cho capacity thừa quá lâu.

### Đơn vị capacity (provisioned)
- **1 RCU** = 1 lần đọc tới **4 KB mỗi giây** (strongly consistent).
- **1 WCU** = 1 lần ghi tới **1 KB mỗi giây**. Ghi không có khái niệm strongly/eventually (consistency chỉ nói về đọc).
- **Mọi operation tiêu tối thiểu 1 đơn vị**, làm tròn lên: đọc item 1 KB vẫn tốn 1 RCU; đọc item 400 KB (tối đa) tốn **100 RCU** (strongly consistent) hoặc **50 RCU** (eventually consistent).
- Ghi đắt hơn đọc (1 KB vs 4 KB) vì mọi lệnh ghi phải vào **leader node** (xem phần consistency), nên ghi khó scale bằng đọc.

### Burst pool và throttling
- Mỗi table có **burst pool** cho RCU và WCU = **300 giây** capacity đã đặt.
- RCU/WCU đặt ra là cho **mức trung bình bền vững**; đừng dựa vào burst pool vì các tác vụ sửa đổi table khác cũng dùng chung pool này.
- Cạn pool + capacity thiếu → lỗi **`ProvisionedThroughputExceededException`**, request bị **throttle**. Cách xử lý: chờ rồi retry (exponential backoff) hoặc tăng capacity.

### Partition: dữ liệu được chia ra sao
- Bên dưới, DynamoDB **chia dữ liệu của table thành các partition**, đặt trên storage node do AWS quản lý (mỗi partition vẫn được replicate với leader node như phần consistency). Partitioning là thứ giúp DynamoDB scale và chạy nhanh.
- **Partition key quyết định item rơi vào partition nào** → chọn partition key kém sẽ ảnh hưởng hiệu năng. Ví dụ của bài: table đơn hàng Aus-E-Mart, PK = quốc gia: một partition chứa toàn bộ item AU, partition khác chứa cả US và JP; cách gom do AWS quyết định để đáp ứng capacity.
- On-demand: AWS lo toàn bộ, bạn trả theo mức dùng. Provisioned: capacity đặt ngay từ đầu quyết định tài nguyên cấp cho table (trả kể cả khi không dùng); auto scaling cho bạn kiểm soát gián tiếp số storage node được dùng.

## Query vs Scan

Ví dụ của bài: table thời tiết, **PK = sensor ID**, **SK = ngày trong tuần**.

### Query
- **Bắt buộc** cung cấp **đúng một giá trị PK**; tùy chọn thêm một giá trị SK hoặc một **khoảng SK**.
- Trả về 0, 1 hoặc nhiều item. Capacity tiêu = **tổng kích thước các item trả về**.
- Ví dụ: Query(PK=1) trả 2 item 2.5 KB + 1.5 KB = 4 KB → **1 RCU**. Nếu tách thành 2 query riêng (PK=1,SK=MON và PK=1,SK=TUE) thì tốn **2 RCU** cho cùng dữ liệu → nên lấy càng nhiều dữ liệu cần thiết trong **một** operation càng tốt.
- Có thể chỉ yêu cầu một vài attribute (projection) hoặc filter thêm, nhưng phần bị lọc **vẫn bị tính capacity** — DynamoDB luôn đọc/ghi **nguyên cả item**. Vì thế nên giữ item nhỏ.
- Hạn chế: chỉ truy vấn được theo PK hoặc PK+SK. Muốn truy vấn theo attribute khác một cách hiệu quả → dùng [[DynamoDB Indexes LSI and GSI|index]].

### Scan
- Đi qua **toàn bộ table**, từng item một. Lọc được theo **bất kỳ attribute nào**, điều kiện gì cũng được.
- Tiêu capacity cho **mọi item đã quét qua**, kể cả item bị loại.
- Ví dụ: Scan tìm ngày nắng trên table có item 5K + 4K + 2K + 3K = 14 KB → **4 RCU** (strongly consistent; eventually consistent thì một nửa), dù chỉ trả về 5K + 4K; phần còn lại bị bỏ đi nhưng vẫn tính tiền.
- **Linh hoạt nhất nhưng kém hiệu quả nhất.**

```mermaid
flowchart TB
    Q["Query: 1 giá trị PK (+ SK / range SK tùy chọn)"] --> QC["Tính capacity = item trả về"]
    S["Scan: toàn bộ table, filter attribute bất kỳ"] --> SC["Tính capacity = MỌI item đã đọc"]
```

## Consistency model

- Mỗi item được sao chép ra **nhiều storage node ở các AZ khác nhau** (trong bài: 3 node ở AZ-A/B/C).
- Một node được bầu làm **leader**; bầu lại tự động nếu leader hỏng.
- **Ghi luôn vào leader**. Leader có dữ liệu mới thì là "consistent", rồi bắt đầu sao chép sang các node khác (thường chỉ mất vài millisecond, tùy tải và giả định không lỗi).

```mermaid
sequenceDiagram
    participant Bob as Writer
    participant L as Leader node (AZ-B)
    participant C as Node AZ-C
    participant A as Node AZ-A
    Bob->>L: Write (luôn vào leader)
    L->>C: replicate (ms)
    L-->>A: replicate (chưa xong)
    Note over A: Đọc eventually consistent trúng node này có thể ra dữ liệu cũ
    Note over L: Strongly consistent read luôn đọc ở leader
```

| | **Eventually consistent read** | **Strongly consistent read** |
|---|---|---|
| Mặc định | **Có** | Không: phải **yêu cầu rõ trên từng lệnh đọc** |
| Node phục vụ | Một node **ngẫu nhiên** | Luôn là **leader** |
| Dữ liệu | Có thể (hiếm) **cũ** nếu đọc ngay sau khi ghi | Luôn mới nhất |
| Scale | Tốt hơn | Kém hơn |
| Chi phí | **50%** — 1 RCU đọc được **8 KB/s**; giảm 50% áp dụng cho cả **RCU provisioned** lẫn **read request unit on-demand** | Giá đầy đủ — 1 RCU = 4 KB/s |

- Phải chọn mô hình phù hợp: dữ liệu tồn kho, dữ liệu y tế quan trọng... cần strongly consistent; ứng dụng chịu được độ trễ nhỏ thì dùng eventually consistent để tiết kiệm.
- Xem thêm [[ACID vs BASE]].

## Tính RCU/WCU

**Ghi (WCU):**
1. WCU mỗi item = **ROUNDUP(item size / 1 KB)**.
2. Nhân với số lần ghi **mỗi giây**.
- Ví dụ: 10 item/giây, 2.5 KB → ROUNDUP(2.5) = 3 WCU/item × 10 = **30 WCU**.

**Đọc (RCU):**
1. RCU mỗi item = **ROUNDUP(item size / 4 KB)**.
2. Nhân với số lần đọc mỗi giây → RCU cho **strongly consistent**.
3. Chia 2 → RCU cho **eventually consistent**.
- Ví dụ: 10 item/giây, 2.5 KB → 1 RCU/item × 10 = **10 RCU** (strong) hoặc **5 RCU** (eventual).

> Lưu ý đề có thể cho "60 item mỗi phút" → đổi về **mỗi giây** (= 1/s) trước khi tính, vì RCU/WCU tính theo giây.

- Ví dụ của bài là đơn hàng Aus-E-Mart: mỗi đơn là một item ~2.5 KB, giờ cao điểm 10 đơn/giây, khách liên tục làm mới trang trạng thái đơn (10 lần đọc/giây) và ứng dụng chịu được dữ liệu hơi cũ → 30 WCU và 5 RCU.
- **Cùng phép tính áp dụng cho on-demand**: on-demand tính tiền theo **request unit** với đúng kích thước 1 KB (ghi) / 4 KB (đọc), eventually consistent vẫn một nửa → dùng cách tính này để ước lượng hóa đơn on-demand.

## 🎯 Mẹo thi SAA-C03
- Nhớ chắc: **RCU = 4 KB/s**, **WCU = 1 KB/s**, làm tròn lên theo **từng item**, tối thiểu 1 đơn vị/operation.
- **Eventually consistent = mặc định và nửa giá** (gấp đôi lượng đọc cho cùng RCU, cả provisioned lẫn on-demand). Đề cần "luôn đọc dữ liệu mới nhất ngay sau khi ghi" → **strongly consistent read**, phải yêu cầu rõ trên từng lệnh đọc.
- Tải **không đoán trước / spiky / mới ra mắt / muốn ít quản trị** → **on-demand** (cũng là mode mặc định). Tải ổn định, dùng đều, muốn rẻ → **provisioned** (+ auto scaling min/max/target, reserved capacity).
- Provisioned → on-demand chỉ đổi được **4 lần / 24 giờ**; chiều ngược lại không giới hạn.
- Partition key quyết định dữ liệu chia vào partition nào → thiết kế PK kém làm giảm hiệu năng.
- `ProvisionedThroughputExceededException` → capacity thiếu (hoặc hot partition); giải pháp: tăng capacity / auto scaling / on-demand, retry với backoff; đọc nhiều lặp lại thì cân nhắc [[DAX]].
- **Query** khi biết PK; **Scan** là tốn kém nhất — câu hỏi tối ưu chi phí/hiệu năng thường đáp án là "tránh Scan, dùng Query + index ([[DynamoDB Indexes LSI and GSI|GSI/LSI]])".
- Filter/projection **không giảm** capacity tiêu thụ.

## Liên kết
- Tiên quyết: [[DynamoDB Architecture]], [[ACID vs BASE]]
- Liên quan: [[DynamoDB Indexes LSI and GSI]], [[DAX]], [[DynamoDB Global Tables]]
- So sánh mô hình consistency: [[S3 Basics]], [[RDS Read Replicas]] (đọc từ replica cũng có thể trễ)
- Section: [[_MOC 20 NoSQL and Analytics]]
