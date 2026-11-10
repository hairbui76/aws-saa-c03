---
tags: [saa-c03, s05-s3, s3, security, encryption, kms]
aliases: [Key Management Service, AWS KMS, KMS key, CMK, Customer Master Key, DEK, Data Encryption Key]
lessons: ["0094 Key Management Service KMS", "0095 DEMO KMS Encrypting the battleplans with KMS"]
videos: ["079 [ASSOCIATESHARED] Key Management Service (KMS)", "080 [SHAREDALL] [DEMO] KMS - Encrypting a Secret with KMS"]
---
# KMS

> **TL;DR:** AWS Key Management Service là dịch vụ **regional, public** để tạo, lưu, quản lý **cryptographic key** và thực hiện thao tác mã hóa/giải mã. Nguyên tắc nền tảng: **key không bao giờ rời khỏi KMS** (và mặc định không rời region). KMS key chỉ mã hóa trực tiếp được tối đa **4 KB**; dữ liệu lớn hơn dùng **Data Encryption Key (DEK)** theo mô hình envelope encryption.

## 🖼️ Sơ đồ
![[KMS.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[KMS.svg]]*

![[KMS - keys.excalidraw]]
*Mở bằng plugin Excalidraw để chỉnh sửa · ảnh tĩnh: [[KMS - keys.svg]]*

## Khái niệm cốt lõi
- **Regional + public service**: mỗi region là một KMS tách biệt; nằm ở AWS public zone, truy cập được từ bất kỳ đâu tới được zone đó (vẫn cần quyền). Xem [[AWS Public vs Private Services]].
- Hỗ trợ **symmetric** và **asymmetric** key (xem [[Encryption Fundamentals]]); bài này mặc định nói về symmetric.
- Thực hiện thao tác mật mã: Encrypt, Decrypt, ReEncrypt, GenerateDataKey...
- **Key không bao giờ rời KMS**: KMS tạo key hoặc cho import key, dùng key để thực hiện thao tác, nhưng không cho export key ra ngoài. Key không bao giờ lưu dạng plaintext trên đĩa (chỉ plaintext tạm trong bộ nhớ).
- Chuẩn tuân thủ: KMS đạt **FIPS 140-3 Level 3** (chuẩn bảo mật của Mỹ, gặp rất nhiều khi làm với các sản phẩm bảo mật). Bản khóa cũ nói KMS chỉ Level 2 và dùng Level 3 làm điểm phân biệt với [[CloudHSM]]; nay mốc Level 3 không còn tách được hai dịch vụ. (Bổ sung, bài không nói: khi đề yêu cầu **HSM riêng, single-tenant, khách hàng tự quản HSM** thì đáp án vẫn là CloudHSM.)

### KMS key
- Tên cũ: **CMK (Customer Master Key)**, nay gọi là **KMS key**.
- Là một **container logic** chứa: key ID, creation date, **key policy** (resource policy), description, key state, và **physical backing key material**.
- Key material do KMS **sinh ra** hoặc **import** vào.
- Dùng trực tiếp để mã hóa/giải mã dữ liệu **tối đa 4 KB**. Thực tế KMS key chủ yếu dùng cho dữ liệu nhỏ hoặc để **sinh key khác** (DEK).

### Luồng Encrypt / Decrypt trực tiếp
```mermaid
sequenceDiagram
  participant A as Ashley
  participant K as KMS
  A->>K: CreateKey (KMS lưu key dạng encrypted)
  A->>K: Encrypt(KeyId, plaintext ≤ 4KB)
  K->>K: Kiểm tra quyền, giải mã KMS key, mã hóa dữ liệu
  K-->>A: Ciphertext
  A->>K: Decrypt(ciphertext) — không cần chỉ KeyId
  K->>K: Đọc KeyId nằm trong ciphertext, kiểm tra quyền decrypt
  K-->>A: Plaintext
```
- **Decrypt không cần chỉ định key**: thông tin key nằm sẵn trong ciphertext.
- Quyền tách biệt từng thao tác (`kms:Encrypt`, `kms:Decrypt`, `kms:CreateKey`...) → **role separation**: admin quản lý key có thể **không** đọc được dữ liệu; người chỉ được encrypt mà không được decrypt...

### Data Encryption Key (DEK) — envelope encryption
- Sinh bằng API **`GenerateDataKey`** từ một KMS key; dùng cho dữ liệu > 4 KB.
- KMS trả về **hai bản** của DEK:
  1. **Plaintext DEK** — dùng ngay để mã hóa dữ liệu.
  2. **Ciphertext DEK** — chính DEK đó đã được mã hóa bằng KMS key.
- **KMS không lưu, không theo dõi DEK** và **không tự mã hóa dữ liệu bằng DEK**; bạn hoặc dịch vụ dùng KMS (vd. S3) làm việc đó.
- Quy trình mã hóa: GenerateDataKey → mã hóa dữ liệu bằng plaintext DEK → **xóa plaintext DEK** → lưu **ciphertext DEK cạnh dữ liệu đã mã hóa**.
- Quy trình giải mã: gửi ciphertext DEK cho KMS Decrypt → nhận plaintext DEK → giải mã dữ liệu → xóa plaintext DEK.
- Một DEK có thể dùng cho 1 hay hàng triệu file, tùy yêu cầu. **S3 sinh một DEK riêng cho mỗi object** (xem [[S3 Encryption]], [[S3 Bucket Keys]]).

```mermaid
flowchart LR
  K["KMS key (không rời KMS)"] -->|"GenerateDataKey"| P["Plaintext DEK"]
  K -->|"GenerateDataKey"| C["Ciphertext DEK"]
  P -->|"mã hóa"| D["Dữ liệu đã mã hóa"]
  P -.->|"xóa sau khi dùng"| X["(discard)"]
  C -->|"lưu cùng"| D
```

### Loại key
| Loại | Ai tạo/quản lý | Đặc điểm |
|---|---|---|
| **AWS owned keys** | AWS, dùng chung cho nhiều account | Chạy ngầm, bạn không thấy, gần như không cần quan tâm |
| **AWS managed keys** (customer owned) | AWS tự tạo khi một dịch vụ (vd. S3) dùng KMS lần đầu, tên dạng `aws/s3` | Không tùy biến key policy được; rotation **bắt buộc**, khoảng **1 năm/lần**, không tắt được |
| **Customer managed keys** (customer owned) | Bạn tạo tường minh | Cấu hình được nhiều hơn: sửa key policy, **cho phép cross-account**, bật/tắt rotation, import material... |

- **Rotation**: thay physical backing material. KMS key giữ cả **backing key hiện tại và mọi backing key cũ**, nên dữ liệu mã hóa bằng bản cũ vẫn giải mã được.
  - Customer managed key: rotation **tùy chọn, mặc định tắt**; bật lên thì khoảng 1 năm một lần, và console cho **chọn chu kỳ rotate**. (Bổ sung, bài không nói: chu kỳ chọn được 90–2560 ngày, có thể rotate on-demand.)
- **Alias**: tên tắt trỏ tới key (vd. `alias/cat-robot`), cho phép đổi key phía sau mà không đổi ứng dụng. **Alias cũng là per-region**: cùng tên alias ở mỗi region trỏ tới key khác nhau.
- **Multi-region keys**: có tồn tại (key được replicate sang region khác), nhưng mặc định key là single-region.

## Key policy và quyền
- Mỗi KMS key **luôn có một key policy** (resource policy, giống bucket policy nhưng cho key). Customer managed key thì sửa được.
- **Khác với hầu hết dịch vụ**: KMS **không mặc định tin account chứa nó**. Phải có statement trong key policy cho phép account, ví dụ `Principal: {"AWS": "arn:aws:iam::111122223333:root"}`, `Action: kms:*`.
  - Có statement này → mới dùng được **IAM identity policy** để cấp quyền cho user/role (vd. `kms:Encrypt`, `kms:Decrypt` trên `arn:aws:kms:*:111122223333:key/*`).
  - Không có → mọi quyền phải ghi trực tiếp trong key policy. Môi trường bảo mật cao có thể cố tình bỏ account trust.
- Ba cách cấp quyền: **Key policy**, **Key policy + IAM policy**, **Key policy + Grants**.

## Demo / Lab
Kịch bản: Aus-E-Mart cần mã hóa **Stripe webhook secret** mà web app dùng để nói chuyện với cổng thanh toán Stripe.
1. KMS console (us-east-1) → Create key. Chi phí: khoảng **1 USD mỗi key mỗi tháng**, cộng vài cent cho mỗi **10.000 API call**.
2. Key type **Symmetric**; key usage **Encrypt and decrypt** (lựa chọn khác: **Generate and verify MAC** cho HMAC). Asymmetric dùng khi cần cặp public/private key giữa nhiều bên.
3. Advanced: key material origin = **KMS** (lựa chọn khác: **External key manager** bên ngoài AWS, hoặc **AWS CloudHSM**, xem [[CloudHSM]]); **Single-Region key** (Multi-Region key nếu cần dùng ở region khác).
4. Alias kiểu `aussiemart/stripe-webhook-key` (ID của key dài, khó nhớ). Chọn **key administrators** (quản lý key) và **key users** (dùng key để encrypt/decrypt); demo cho iamadmin cả hai vai trò dù trái best practice.
5. Đọc key policy wizard sinh ra:
   - Statement đầu có Principal là account root **không** nói về root user; nó cho phép **dùng IAM identity policy** để cấp quyền trên key cho identity trong account. Xóa statement này thì chỉ còn các quyền ghi thẳng trong key policy.
   - Statement cho admin (create, describe, list, delete, tag...) và statement cho user dùng key (encrypt, decrypt...).
   - Statement cho phép tạo, liệt kê, thu hồi **grant** cho AWS service: để dịch vụ như RDS hay S3 dùng key thay mặt user.
   - Sau khi tạo, phần lớn cấu hình của key không đổi được, nên xem kỹ ở bước review.
6. Tab key rotation: customer managed **mặc định tắt**, bật được và **chọn chu kỳ**; AWS managed keys **luôn bật**, khoảng mỗi năm.
7. CloudShell: tạo file chứa secret → `aws kms encrypt --key-id alias/<alias> --plaintext fileb://<file> --output text --query CiphertextBlob | base64 --decode > <file>.enc` (output KMS là base64 nên phải decode thành binary). Ứng dụng thật sẽ gọi KMS qua SDK.
8. `aws kms decrypt --ciphertext-blob fileb://<file>.enc --output text --query Plaintext | base64 --decode` → lấy lại secret, **không cần chỉ key**. Có thể tách identity: admin tạo secret, identity của ứng dụng chỉ được decrypt.
9. Dọn dẹp: xóa file, **Schedule key deletion**, waiting period **7–30 ngày** (chọn 7) → Pending deletion. Xóa key không đảo ngược được: ứng dụng còn dùng key sẽ hỏng.

## 🎯 Mẹo thi SAA-C03
- KMS **regional**, key **không rời region và không rời KMS** (trừ multi-region keys). Cần dùng ở region khác → multi-region key hoặc re-encrypt.
- KMS key mã hóa trực tiếp tối đa **4 KB**; lớn hơn → **GenerateDataKey** / envelope encryption.
- KMS đạt **FIPS 140-3 Level 3** theo bài mới, nên "Level 3" một mình không còn là dấu hiệu chọn CloudHSM. Dấu hiệu chọn **[[CloudHSM]]**: HSM **riêng, single-tenant**, khách hàng **tự quản** HSM (bổ sung, bài KMS không nói).
- KMS tính phí theo key (khoảng 1 USD/tháng) và theo số API call; key policy luôn có, statement trust account là thứ cho phép dùng IAM policy.
- Cần **cross-account** dùng key, sửa key policy, kiểm soát rotation → **customer managed key** (AWS managed key không làm được).
- Cần **role separation** (admin không đọc được dữ liệu) → KMS với quyền tách biệt, hoặc SSE-KMS trên S3 (xem [[S3 Encryption]]).
- Key policy phải trust account thì IAM policy mới có tác dụng; xóa nhầm statement này có thể khóa luôn quyền truy cập key.
- Xóa key: không xóa ngay, có **waiting period 7–30 ngày** (mặc định 30).
- KMS là nền tảng cho mã hóa ở [[S3 Encryption]], [[EBS Encryption]], [[RDS Security]], [[Secrets Manager]], [[SSM Parameter Store]] (SecureString).

## Liên kết
- Tiên quyết: [[Encryption Fundamentals]], [[IAM Identity Policies]], [[AWS Public vs Private Services]]
- Liên quan: [[S3 Encryption]], [[S3 Bucket Keys]], [[EBS Encryption]], [[RDS Security]], [[Secrets Manager]], [[SSM Parameter Store]], [[CloudTrail]] (ghi lại mọi API call tới KMS)
- Phân biệt với: [[CloudHSM]]
