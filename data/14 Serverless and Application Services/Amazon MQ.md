---
tags: [saa-c03, s14-serverless-and-application-services, messaging, hybrid, migration, decoupling]
aliases: [MQ, Amazon MQ Broker, Managed ActiveMQ, ActiveMQ, RabbitMQ, Managed RabbitMQ]
lessons: ["0271 Amazon MQ 101"]
videos: ["248 Amazon MQ 101"]
---
# Amazon MQ

> **TL;DR:** Amazon MQ là **message broker mã nguồn mở được AWS quản lý** (hai engine: **Apache ActiveMQ** và **RabbitMQ**), cung cấp cả **queue** lẫn **topic** qua các **chuẩn mở** (JMS, AMQP, MQTT, OpenWire, STOMP). Đây là đường để **đưa hệ thống messaging on-prem sẵn có lên AWS mà gần như không sửa ứng dụng**. Điều cần nhớ nhất: broker MQ **mặc định là private, chạy trong VPC**, không phải public service như [[SNS]]/[[SQS]], nên cần **private networking** (trừ khi bật **public accessibility** lúc tạo broker).

## 🖼️ Sơ đồ
![[Amazon MQ.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[Amazon MQ.svg]]*

## Khái niệm cốt lõi
- Hình dung như **SNS + SQS gộp lại nhưng dùng chuẩn mở**:
  - **Queue** → giao tiếp one-to-one (giống [[SQS]]).
  - **Topic** → giao tiếp one-to-many (giống [[SNS]]).
  - Cả hai có trong **cùng một sản phẩm**.
- **Vì sao cần MQ?** SNS và SQS dùng **AWS API riêng**. Doanh nghiệp lớn thường đã có hệ thống messaging/queuing on-prem tuân theo chuẩn công nghiệp. Chuyển sang SNS/SQS nghĩa là **phải sửa code**. Muốn migrate mà không sửa thì cần một broker **tuân chuẩn**: đó là Amazon MQ.
- **Engine**: bản managed của hai broker mã nguồn mở rất phổ biến: **Apache ActiveMQ** và **RabbitMQ**.
- **API/giao thức nhận diện**: **JMS API**, **AMQP**, **MQTT**, **OpenWire**, **STOMP**.
- **"Managed" nhưng khác kiểu SNS/SQS**: bạn nhận về **broker server** chứ không phải một endpoint vô hình:
  - **Single-instance broker**: cho test/dev hoặc khi muốn tiết kiệm.
  - Production với **ActiveMQ**: **active/standby HA pair**, hai broker ở **hai AZ**, dùng [[EFS]] làm **shared storage** (EFS bắt buộc ở chế độ này) nên dữ liệu được lưu dư thừa giữa các AZ.
  - Production với **RabbitMQ**: **cluster 3 node** trải qua các AZ.
- **Không phải public service (mặc định)**: broker **private**, nằm trong [[Custom VPC|VPC]]. Ai muốn dùng phải có đường mạng riêng vào VPC và cấu hình security phù hợp ([[Security Groups]]), **trừ khi bật public accessibility mode** khi tạo broker. Xem [[AWS Public vs Private Services]].
- **Tích hợp AWS hạn chế**: MQ làm việc với **CloudWatch, IAM và [[Lambda]]**, nhưng không dùng native với các dịch vụ khác như SNS/SQS: các dịch vụ AWS khác (CloudWatch alarm, S3 event, ASG notification...) được thiết kế để đẩy vào SNS/SQS, **không** đẩy vào MQ.
  - (Bổ sung, bài không nói: MQ có log, mã hóa [[KMS]]; Lambda dùng MQ làm event source mapping, xem [[Lambda]].)

## Cách hoạt động / Kiến trúc
Kịch bản điển hình: công ty có producer on-prem đang nói chuyện với một ActiveMQ broker on-prem, muốn **migrate** lên AWS hoặc **chạy song song (coexistence)** trong một giai đoạn.

```mermaid
flowchart LR
  subgraph OnPrem["On-premises"]
    P["Message producer"] --> B0["ActiveMQ broker on-prem"]
  end
  subgraph AWS["AWS VPC (2 AZ)"]
    subgraph AZA["AZ A"]
      B1["Amazon MQ broker (active)"]
    end
    subgraph AZB["AZ B"]
      B2["Amazon MQ broker (standby)"]
    end
    E["EFS shared storage"]
    B1 --- E
    B2 --- E
    App["Ứng dụng đã migrate"] -->|"JMS / AMQP / MQTT..."| B1
  end
  B0 <-->|"Site-to-Site VPN hoặc Direct Connect"| B1
```

1. Tạo **HA pair** Amazon MQ trong VPC trải trên 2 AZ (primary + standby, chung EFS).
2. Thiết lập **kết nối riêng** on-prem ↔ AWS: [[Site-to-Site VPN]] hoặc [[Direct Connect]].
3. Broker on-prem và cặp broker trên AWS giao tiếp qua kết nối đó. Ứng dụng nào đã chuyển lên AWS tiếp tục dùng **giao thức chuẩn** như cũ và vẫn hòa nhập với hệ thống on-prem.

## Bảng so sánh / số liệu

| | [[SNS]] / [[SQS]] | Amazon MQ |
|---|---|---|
| Giao diện | AWS API riêng | Chuẩn mở: JMS, AMQP, MQTT, OpenWire, STOMP |
| Mô hình | SNS = topic, SQS = queue (2 dịch vụ) | Queue **và** topic trong 1 broker |
| Vị trí mạng | **Public** AWS zone, truy cập từ mọi nơi có kết nối public endpoint | **Trong VPC, private mặc định**, cần private networking (public accessibility chỉ khi bật lúc tạo) |
| Kiểu quản lý | Serverless, tự scale, HA trong region | Broker instance: single (dev/test); prod: active/standby pair (ActiveMQ) hoặc cluster 3 node (RabbitMQ) |
| Tích hợp AWS | Native (CloudWatch, S3, ASG, CFN... publish/consume trực tiếp) | Hạn chế: CloudWatch, IAM, Lambda |
| Khi nào dùng | Ứng dụng **mới**, cần tích hợp AWS | **Migrate** hệ thống có sẵn, ít/không sửa code |

## 🎯 Mẹo thi SAA-C03
- **Mặc định** cho topic/queue trong thiết kế mới → **SNS hoặc SQS**.
- Cần **tích hợp AWS** (logging, permission, encryption, dịch vụ khác publish trực tiếp) → **SNS/SQS**.
- Đề nói **"migrate hệ thống messaging on-prem hiện có với ít/không thay đổi ứng dụng"** → **Amazon MQ**.
- Thấy từ khóa **JMS**, **AMQP**, **MQTT**, **OpenWire**, **STOMP**, **ActiveMQ** (hoặc RabbitMQ) → **Amazon MQ**.
- Bẫy hay gặp (giảng viên nói đã thấy trong đề): chọn MQ thì **phải có private networking** (VPN/Direct Connect/đường vào VPC) vì broker **mặc định private**. Public accessibility chỉ có khi bật lúc tạo broker; đề không nói thì đừng giả định MQ có public endpoint như SQS.
- HA production: **ActiveMQ** → active/standby trên 2 AZ + EFS; **RabbitMQ** → cluster 3 node trải qua các AZ.
- Câu hỏi **hybrid**: hệ thống cũ on-prem, cần migrate hoặc **coexist** với AWS → MQ là lựa chọn rất hợp.
- Không cần biết sâu về MQ cho kỳ thi; chỉ cần nhận diện **khi nào** chọn nó.

## Liên kết
- Tiên quyết: [[AWS Public vs Private Services]], [[Event-Driven Architecture]]
- Phân biệt với: [[SNS]], [[SQS]], [[Compare - SQS vs SNS vs Kinesis]], [[EventBridge]]
- Hạ tầng liên quan: [[Site-to-Site VPN]], [[Direct Connect]], [[EFS]], [[Custom VPC]], [[Security Groups]]
- Section: [[_MOC 14 Serverless and Application Services]]
