---
tags: [saa-c03, s19-cloudformation, cloudformation, iac, automation]
aliases: [Outputs, Stack Outputs, CFN Output]
lessons: ["0332 CloudFormation Outputs"]
---
# CFN Outputs

> **TL;DR:** `Outputs` là section **tùy chọn** để stack trả ra giá trị sau khi tạo xong: trạng thái, URL truy cập dịch vụ, ID resource... Output hiện trên console và CLI, được **stack cha đọc khi dùng nested stack**, và có thể **export** để stack khác dùng (cross-stack reference).

## 🖼️ Sơ đồ
![[CFN Outputs.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[CFN Outputs.svg]]*

## Khái niệm cốt lõi
- Template hợp lệ hoàn toàn **không cần** `Outputs`. Nhiều template không có.
- Giá trị khai báo trong `Outputs`:
  - hiện ở **CLI** và **console UI** (tab Outputs);
  - **trả về stack cha** khi dùng nested stack ([[CFN Nested Stacks]]);
  - có thể **export** để tạo **cross-stack reference** ([[CFN Cross-Stack References]]).
- Output chỉ có giá trị khi stack ở trạng thái `CREATE_COMPLETE`.

## Cách hoạt động / Kiến trúc
```yaml
Outputs:
  WordpressURL:
    Description: "Instance Web URL"
    Value: !Join [ '', [ 'https://', !GetAtt Instance.DNSName ] ]
```
- **`Description`**: hiện trên CLI/console và được trả cho stack cha. Best practice là viết mô tả rõ cho người chưa đọc template.
- **`Value`**: thứ stack phơi ra. Ở đây ghép chuỗi literal `https://` với thuộc tính `DNSName` của logical resource `Instance` bằng `!Join` và `!GetAtt` ([[CFN Intrinsic Functions]]). Kết quả là URL truy cập WordPress.
- **`Export: Name: ...`** (thêm khi cần): đưa giá trị vào danh sách export của region để stack khác `ImportValue`.

## 🎯 Mẹo thi SAA-C03
- Cần hiện thông tin truy cập (URL, IP, endpoint) sau khi deploy → **Outputs**.
- Stack cha muốn lấy giá trị từ stack con → stack con khai báo **Outputs**, stack cha dùng `!GetAtt StackCon.Outputs.TenOutput`. Stack cha **không** tham chiếu trực tiếp resource trong stack con được.
- Stack độc lập muốn dùng giá trị của stack khác → Outputs **+ Export**, bên dùng gọi `Fn::ImportValue`.

## Liên kết
- Tiên quyết: [[CloudFormation Basics]], [[CFN Intrinsic Functions]]
- Dùng trong: [[CFN Nested Stacks]], [[CFN Cross-Stack References]]
- Liên quan: [[CFN Template and Pseudo Parameters]] (input) và Outputs (output) là hai đầu vào/ra của một stack
- MOC: [[_MOC 19 CloudFormation]]
