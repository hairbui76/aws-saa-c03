---
tags: [saa-c03, s02-tech-fundamentals, cloudformation, iac, security]
aliases: [JavaScript Object Notation]
lessons: ["0022 JSON101 JavaScript Object Notation"]
---
# JSON

> **TL;DR:** JSON (JavaScript Object Notation) là định dạng **trao đổi dữ liệu nhẹ**, dễ cho người đọc/viết và máy parse/sinh. Trong AWS, JSON được dùng cho **cả CloudFormation template lẫn policy document (IAM, resource policy)** — nên hữu dụng hơn [[YAML]] trong AWS.

## 🖼️ Sơ đồ
![[JSON.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[JSON.svg]]*

## Khái niệm cốt lõi
- Hai thành phần chính:
  - **Object**: tập **key: value không thứ tự**, bao bằng **ngoặc nhọn `{}`** — tương đương *dictionary* trong YAML.
  - **Array**: tập **giá trị có thứ tự**, cách nhau bằng dấu phẩy, bao bằng **ngoặc vuông `[]`** — tương đương *list* trong YAML.
- **Value** có thể là: string, number, object, array, boolean (`true`/`false`), `null`.
- Mọi tài liệu JSON **bắt đầu bằng một object top-level** `{ ... }`.
- Object lồng trong object; array có thể chứa object, object lại chứa array... → biểu diễn cấu trúc phức tạp.
- **Thụt lề không quan trọng**: mọi thứ đã được bao bằng nháy kép, `{}` và `[]` nên vị trí/khoảng trắng tự do. Thụt lề chỉ để đẹp/dễ đọc.
  - Hệ quả: JSON "khoan dung" hơn về spacing, ít lỗi kiểu thụt sai như YAML; nhưng lúc đầu có thể trông khó đọc hơn (nhiều dấu ngoặc).
- Adrian thích JSON hơn YAML (dễ đọc/viết, ít sai) — nhưng với AWS đây là **sở thích cá nhân**, trừ policy bắt buộc JSON.

## Cách hoạt động / Kiến trúc
Ví dụ đơn giản — object top-level với 3 key, mỗi value là array:
```json
{
  "cats": ["roffle", "truffles", "penny", "winkie"],
  "colors": ["mixed", "mixed", "grey", "white"],
  "numofeyes": ["2", "2", "2", "1"]
}
```
Object nhỏ `{"roffle": "cat", "sparky": "dog"}` và array `["cat", "cat", "chicken", "cat"]` (array cho phép trùng lặp, giữ thứ tự).
Ví dụ lồng object (mỗi tên mèo là key, value là object):
```json
{
  "roffle":   { "color": ["black", "white"], "numofeyes": 2 },
  "winkie":   { "color": "white", "numofeyes": 1 }
}
```
Cùng template CloudFormation tạo S3 bucket như trong note [[YAML]]:
```json
{
  "Resources": {
    "s3bucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": { "BucketName": "ac1337catpics" }
    }
  }
}
```
- `Resources` → object; `s3bucket` → object chứa `Type` (string: loại resource) và `Properties` (object chứa `BucketName`). Biết `s3bucket` nằm trong `Resources` là nhờ **ngoặc nhọn**, không phải thụt lề.

## Bảng so sánh / số liệu
| | JSON | [[YAML]] |
|---|---|---|
| Key-value không thứ tự | object `{}` | dictionary |
| Danh sách có thứ tự | array `[]` | list (`-`) |
| Thụt lề | Không bắt buộc | **Bắt buộc**, là cú pháp |
| CloudFormation | Có | Có |
| IAM identity policy / resource policy | **Có (chỉ JSON)** | Không |
| Comment | Không hỗ trợ | Có (`#`) |

## 🎯 Mẹo thi SAA-C03
- **Policy quyền** ([[IAM Identity Policies]], bucket policy, [[Service Control Policies|SCP]], KMS key policy...) luôn là JSON → phải đọc hiểu được cấu trúc `Version`, `Statement` (array các object), `Effect`, `Action`, `Resource`, `Condition`.
- Template CloudFormation trong đề có thể ở JSON hoặc YAML — cấu trúc logic giống hệt nhau.
- Lời khuyên của Adrian: học **đọc** JSON/YAML trước, rồi mới học viết.

## Liên kết
- So sánh với: [[YAML]]
- Dùng trong: [[IAM Identity Policies]], [[IAM Basics]], [[S3 Security]] (bucket policy), [[KMS]] (key policy), [[Service Control Policies]], [[CloudFormation Basics]]
- Liên quan: [[CFN Physical and Logical Resources]]
