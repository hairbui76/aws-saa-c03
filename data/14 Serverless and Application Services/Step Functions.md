---
tags: [saa-c03, s14-serverless-and-application-services, serverless, workflow, orchestration]
aliases: [AWS Step Functions, SFN, State Machine, Amazon States Language, ASL, Croc Snack Bot]
lessons: ["0253 Step Functions"]
videos: ["236 [ASSOCIATESHARED] Step Functions"]
---
# Step Functions

> **TL;DR:** Step Functions cho phép xây dựng **state machine**, tức các **workflow serverless chạy dài** có điểm đầu, điểm cuối và các **state** ở giữa. Dịch vụ này giải quyết hạn chế của [[Lambda]] (timeout 15 phút, stateless) khi cần ghép nhiều bước, giữ dữ liệu giữa các bước và điều phối nhiều dịch vụ AWS.

## 🖼️ Sơ đồ
![[Step Functions.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[Step Functions.svg]]*

## Khái niệm cốt lõi
### Vì sao cần Step Functions
- Lambda được thiết kế cho function **nhỏ, tập trung**, không chứa cả ứng dụng, và **timeout 15 phút**.
- Về lý thuyết có thể **xâu chuỗi Lambda** (function này gọi function kia để "được thêm 15 phút"), nhưng làm vậy **rất rối khi scale**. Thêm nữa môi trường Lambda stateless, dữ liệu phải tự chuyển giữa các lần chạy.
- Ví dụ: đơn hàng in ảnh thú cưng lên kính/kim loại/giấy có thể kéo dài hơn 15 phút, có nhiều điểm rẽ nhánh, đôi khi cần người can thiệp, và có **trạng thái** (đơn hàng) cần giữ. Tương tự quy trình Amazon: tìm hàng, lấy hàng, đóng gói, kiểm tra, đặt vận chuyển, gửi đi.

### State machine
- **State machine** = workflow: start → các **state** → end.
- State có thể *làm việc* hoặc *ra quyết định*; mọi state đều **nhận input, biến đổi và xuất output**, nên dữ liệu được duy trì giữa các bước.
- **Thời gian chạy tối đa của một execution: 1 năm** (Standard).
- Định nghĩa bằng **Amazon States Language (ASL)**, dựa trên **[[JSON]]**; dùng làm template để tạo và export state machine.
- Quyền gọi dịch vụ khác: state machine **assume [[IAM Roles|IAM role]]** khi chạy.
- Cách khởi chạy: [[API Gateway]], IoT Rules, [[EventBridge]], [[Lambda]], hoặc thủ công. Thường dùng cho **xử lý backend**.

### Standard vs Express
| | **Standard** | **Express** |
|---|---|---|
| Mặc định | Có | Không |
| Thời gian tối đa | **1 năm** | **5 phút** |
| Phù hợp | Workflow chạy dài, có trạng thái, cần audit | Xử lý event **khối lượng lớn**: IoT streaming, transform dữ liệu, mobile backend |
| Ngữ nghĩa thực thi | **Exactly-once**: an toàn cho việc **không bao giờ được lặp** (vd. thu tiền) | **At-least-once**: một phần việc có thể lặp lại, workload phải chịu được (at-most-once cho kiểu sync là bổ sung theo tài liệu AWS, bài không nói) |
| Chọn khi | Việc chạy dài hoặc chỉ được xảy ra **một lần** | Việc **khối lượng lớn, ngắn**, kiểu transaction |

- Chọn loại workflow **khi tạo state machine**; lựa chọn này **cố định**, **không đổi được** sau khi tạo (ảnh hưởng tốc độ, thời lượng tối đa và một số tính năng).

### Các loại state
| State | Chức năng |
|---|---|
| **Succeed / Fail** | Tới đây thì execution kết thúc thành công / thất bại |
| **Wait** | Dừng một khoảng thời gian, hoặc tới một thời điểm cụ thể (lấy từ input) |
| **Choice** | Rẽ nhánh theo input (vd. tồn kho khác nhau thì xử lý khác nhau) |
| **Parallel** | Tạo các nhánh chạy **song song** |
| **Map** | Nhận một **danh sách** (vd. các item trong đơn hàng) và chạy cùng tập hành động cho **từng phần tử** |
| **Task** | **Một đơn vị công việc**: gọi dịch vụ khác như Lambda, [[AWS Batch]], DynamoDB, ECS, SNS, SQS, Glue, SageMaker AI... |
| **Pass** | Chuyển input thẳng sang output, **tùy chọn biến đổi hoặc chèn dữ liệu cố định**; hữu ích để test hoặc tái cấu trúc dữ liệu giữa các state |

- State machine **không tự làm việc**: nó **điều phối (orchestrate)**. Các state luồng (Choice, Wait, Parallel, Map) điều khiển dòng chảy; **Task** state giao việc cho dịch vụ bên ngoài.

## Cách hoạt động / Kiến trúc: Croc Snack Bot
Cá sấu **CoolCrock** lúc nào cũng đói, muốn nhắc "người hầu" Bob mang snack tới; khoảng cách giữa các lần có thể vài phút, **hơn 15 phút, thậm chí nhiều giờ** → không dùng Lambda đơn lẻ được → dùng Step Functions. Bob không phải lúc nào cũng ở nhà nên cần nhắc qua **email** (khi ở máy tính) và **SMS** (khi ra ngoài).

```mermaid
flowchart LR
  B["Bob (browser)"] --> S3["S3 static website"]
  B --> APIGW["API Gateway"] --> AL["API_Lambda"] --> SM
  subgraph SM["State Machine"]
    T["Timer (Wait)"] --> C{"Choice"}
    C --> E["EmailOnly (Task)"]
    C --> ES["EmailAndSMS (Task)"]
    C --> S["SMSOnly (Task)"]
  end
  E --> EL["email_reminder_lambda"] --> SES["SES -> email"]
  ES --> EL
  ES --> SL["sms_reminder_lambda"] --> SNS["SNS -> SMS"]
  S --> SL
```

1. Bob tải web app phía client (HTML + JS) từ S3 bucket; đặt lời nhắc snack (thời gian chờ, kênh nhắc: email / SMS / cả hai).
2. Request đi qua [[API Gateway]] → **API Lambda** → khởi chạy execution của state machine, truyền theo toàn bộ input.
3. **Timer** (Wait) chờ đúng số giây → **Choice** chọn 1 trong 3 nhánh → **Task** gọi một hoặc cả hai Lambda: email qua **SES**, SMS qua [[SNS]].
4. Toàn bộ ứng dụng là serverless; state machine đóng vai **điều phối** cả giải pháp. Bài nói sẽ có demo, nhưng trong khóa mới mục này hiện chỉ là "(Coming Soon) Build A Serverless App - Croc Snack Bot", chưa có video; bản triển khai của khóa cũ: [[Lab - Serverless App Pet-Cuddle-o-Tron]].

## 🎯 Mẹo thi SAA-C03
- Workflow **dài hơn 15 phút**, **nhiều bước**, có **rẽ nhánh/song song/chờ**, cần **giữ trạng thái**, hoặc có **bước phê duyệt của con người** → **Step Functions**, không xâu chuỗi Lambda.
- **Standard = tối đa 1 năm**, mặc định, chạy dài, **exactly-once** (việc không được lặp như thanh toán). **Express = tối đa 5 phút**, **at-least-once**, cho khối lượng event lớn (IoT, streaming, mobile backend). Loại workflow **không đổi được** sau khi tạo.
- Từ khóa: "orchestrate", "state machine", "coordinate multiple AWS services", "visual workflow" → Step Functions.
- Định nghĩa bằng **ASL (JSON)**; quyền qua **IAM role**.
- Khởi chạy từ API Gateway, EventBridge, Lambda, IoT Rules.
- Phân biệt: [[SQS]] = hàng đợi decouple; [[SNS]] = pub/sub; [[EventBridge]] = định tuyến event; Step Functions = **điều phối luồng có trạng thái**.

## Liên kết
- Tiên quyết: [[Lambda]], [[Serverless Architecture]], [[JSON]]
- Dùng cùng: [[API Gateway]], [[SNS]], [[SQS]], [[EventBridge]], [[IAM Roles]], [[ECS]]
- Thực hành: [[Lab - Serverless App Pet-Cuddle-o-Tron]]
- Phân biệt với: [[EventBridge]], [[SQS]], [[Event-Driven Architecture]]
