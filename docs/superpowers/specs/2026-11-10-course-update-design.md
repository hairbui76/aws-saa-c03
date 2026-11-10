# Cập nhật web theo bản khóa SAA-C03 mới nhất (2026-11)

*Bản thiết kế, viết 2026-11-10. Nguồn: trao đổi với chủ repo (hairbui76).*

## 1. Mục đích và lý do

Web `saa.hairbui76.id.vn` dựng từ ghi chú tiếng Việt trong `data/`, viết theo **bản khóa cũ** của Adrian Cantrill (video đánh số `0001`–`0385`, ghi trong frontmatter `lessons:` của mỗi ghi chú). Adrian vừa ra **bản khóa mới**: 376 video, 24 mục. Bản này có bài mới, có bài nội dung đổi, và bỏ một số bài cũ.

Cần làm hai việc:

1. Nội dung web khớp với bản khóa mới: thêm bài mới, sửa bài có thay đổi.
2. **Người đang học dở biết ngay** chỗ nào trên web đã đổi và đổi ở đâu, để không phải đọc lại từ đầu mà vẫn không bỏ sót.

## 2. Nguồn dữ liệu

Bản khóa mới đã tải về máy, nằm ngoài repo, ở `/home/hairbui76/Videos/saa/SAA-C03-newest/`:

- `manifest.json`: danh sách 376 video. Mỗi video có `video_order`, `section_order`, `section_title`, `title`, `status`, `output_file`, `subtitle_status`, `duration_seconds`…
- `videos/<NN_Mục>/<NNN>_<tên>.mp4` (1080p) và `<NNN>_<tên>.en.vtt` (phụ đề tiếng Anh).
- Khoảng 10% video **không có phụ đề** (`subtitle_status: not_advertised`, do khóa không cung cấp). Với các bài này, nội dung phải lấy từ frame và từ nghe/hiểu bài qua hình.
- Lúc viết tài liệu này, script tải vẫn đang chạy (đã xong khoảng 330/376, dự kiến xong khoảng trưa 2026-11-10). Các bài cuối (CloudFormation, DynamoDB, Systems Manager, Elastic Beanstalk, ML, Exam Prep) chỉ xử lý được khi video đã về; kiểm tra `status: complete` trong manifest.

**Cách đọc bài:** đọc phụ đề `.vtt` để biết bài nói gì. Dùng `ffmpeg` cắt frame (theo thay đổi cảnh, hoặc theo khoảng thời gian với bài ít đổi cảnh) để đọc slide, sơ đồ, bảng số liệu và màn hình console mà phụ đề không có. **Frame chỉ là tư liệu để viết cho đúng**: không đưa lên web, không commit, chỉ để trong thư mục tạm ngoài repo.

## 3. Mục tiêu

### 3.1 Phân loại toàn bộ bài

Đối chiếu từng video của bản mới với ghi chú hiện có. Mỗi ghi chú thường gom nhiều video, ví dụ bài lý thuyết kèm `[DEMO]` của nó. Tên bài giữa hai bản viết khác nhau rất nhiều nên **không khớp được bằng tên**. Phải khớp theo nội dung. Ví dụ "SQS Delay Queues", "Amazon MQ", "Kinesis Video Streams" đã có ghi chú dù tên video mới khác.

Mỗi ghi chú hoặc bài rơi vào một trong bốn loại:

| Loại | Nghĩa | Việc phải làm |
|---|---|---|
| **Mới** | Bản mới có, web chưa có ghi chú nào nói tới | Viết ghi chú mới đủ bộ (mục 3.3) |
| **Cập nhật** | Ghi chú có rồi nhưng video mới nói **khác về nội dung** | Sửa phần liên quan, ghi lại đổi gì |
| **Không còn trong khóa** | Ghi chú có trên web nhưng bản mới không còn bài tương ứng (vd: cả chương `02 Tech Fundamentals`) | **Giữ nguyên nội dung**, chỉ đánh dấu xanh dương |
| **Không đổi** | Khớp với video mới | Không làm gì, ngoài cập nhật tham chiếu video (mục 3.5) |

"**Khác về nội dung**" là: thông tin sai hoặc lỗi thời so với video mới; video mới thêm khái niệm, tính năng, số liệu, giới hạn hay mẹo thi mà ghi chú chưa có; hoặc video bỏ hay đổi cách giải thích một ý quan trọng. Chỉ khác cách diễn đạt thì **không** tính là cập nhật. Đổi tên dịch vụ (vd Kinesis Data Firehose → Amazon Data Firehose) thì tính là cập nhật, và cập nhật cả tên gọi trong ghi chú; tên file giữ nguyên, tên mới thêm vào `aliases`.

**Đổi kịch bản demo** (chủ repo đã đồng ý): khóa cũ dùng công ty mẫu **Animals4life**, khóa mới dùng **Aus-E-Mart (AEM)** và **RooTube**.
- Phần demo chỉ đổi tên kịch bản, còn kiến thức AWS giữ nguyên: sửa tên và chi tiết kịch bản trong phần demo cho khớp video mới. Trường hợp này **không** tính là cập nhật (không ❗ đỏ, không đưa vào popup).
- Nếu demo mới dạy thêm hoặc khác về kiến thức AWS thì tính là cập nhật như bình thường.
- Ghi chú riêng về **kịch bản Animals4life** và các **ghi chú lab** mà khóa mới đã gỡ, chỉ còn mục "(Coming Soon)" không có video (`Lab - Architecture Evolution`, `Lab - Serverless App Pet-Cuddle-o-Tron`, và lab Site2Site VPN nếu có ghi chú riêng), xếp vào loại **"không còn trong khóa"** (❗ xanh dương).

**Một phần của ghi chú không còn trong khóa** *(quyết định của người viết tài liệu)*: ví dụ hai video "Question Technique" cũ trong `Exam Technique.md` đã bị bỏ. **Giữ nguyên nội dung phần đó** và đánh **❗ xanh dương** ở heading `##` của phần đó, nghĩa là "phần này không còn trong khóa mới". Cách này giống với cách xử lý cả ghi chú không còn trong khóa. Nếu ghi chú đó có thêm thay đổi khác thì vẫn tính là bài **cập nhật** (❗ đỏ trong danh sách bài). Nếu chỉ có phần bị bỏ thì không tính là cập nhật, chỉ có ❗ xanh ở heading.

### 3.2 Chương

- Giữ nguyên số và tên các chương hiện có (`00`–`21`), **không đánh số lại**.
- Thêm chương mới ở cuối: **`22 Systems Manager`** (4 video) và **`23 Elastic Beanstalk`** (10 video). Mỗi chương có `_MOC` với "Lộ trình học" theo đúng định dạng các MOC hiện có, vì build dựa vào đó để sắp thứ tự bài.
- Video "Exam Prep" (kỹ thuật làm bài thi) đưa vào chương `00 Course and Exam`.
- Bài mới thuộc mục đã có thì xếp vào chương tương ứng, chèn vào "Lộ trình học" của MOC. Vị trí là ngay sau bài hiện có đứng gần trước nó nhất trong thứ tự khóa mới; không có thì đặt cuối.
- **Ghi chú hiện có không di chuyển sang chương khác và không sắp xếp lại** trong "Lộ trình học", kể cả khi khóa mới đã đổi chỗ chủ đề (vd Dedicated Hosts). Lý do: giữ ổn định thứ tự học và lộ trình mà người học đang theo. *(quyết định của người viết tài liệu)*
- Cập nhật `00 Home.md` và các chỗ khác đang liệt kê chương (nếu có) để thấy hai chương mới.

### 3.3 Bài mới: làm đủ bộ như bài cũ

Theo đúng mẫu ghi chú hiện có. Xem vài bài làm mẫu, ví dụ `data/14 Serverless and Application Services/AppFlow.md`:

- Frontmatter `tags`, `aliases`, `lessons`.
- `# Tiêu đề`, `> **TL;DR:**`, `## 🖼️ Sơ đồ` (nhúng Excalidraw và link SVG), `## Khái niệm cốt lõi`, `## Cách hoạt động / Kiến trúc`, `## Bảng so sánh / số liệu`, `## 🎯 Mẹo thi SAA-C03`, `## Liên kết` (wikilink sang bài liên quan và về MOC).
- Viết tiếng Việt, giữ thuật ngữ AWS bằng tiếng Anh như các bài cũ. Phần bổ sung ngoài bài giảng ghi rõ "(Bổ sung…, bài không nói)" như bài mẫu.
- **Sơ đồ Excalidraw** `_diagrams/<tên>.excalidraw.md` và **ảnh tĩnh** `_diagrams/<tên>.svg`, cùng định dạng với sơ đồ hiện có, để `src/lib/diagram.ts` dựng được video từng bước.
- **5 câu quiz** trong `web/quizzes/<chương>.json` (key là tên file ghi chú, không có `.md`), cùng định dạng câu hỏi hiện có.
- **Thuyết minh video sơ đồ**: máy không có `ANTHROPIC_API_KEY` nên **người làm tự viết lời thuyết minh** vào `web/narration/<lessonId>.json`, theo định dạng `{ [diagramName]: { sig, steps: string[] } }`. `sig` phải tính đúng như `stepSig()` trong `scripts/gen-narration.mjs` để script về sau không coi là lỗi thời. Sau đó cài `edge-tts` và chạy `python scripts/tts.py` để tạo mp3 giọng `vi-VN-HoaiMyNeural` vào `web/public/audio/`.
- Từ viết tắt mới chưa có trong `web/abbreviations.json` thì thêm vào.
- Thêm wikilink từ các bài cũ liên quan sang bài mới khi hợp lý, để bài mới không bị cô lập.

### 3.4 Bài cập nhật

- Chỉ sửa phần nội dung bị ảnh hưởng, giữ nguyên phần còn lại và văn phong.
- Nếu thay đổi làm sơ đồ, quiz hoặc thuyết minh sai hay thiếu thì sửa luôn những phần đó (thuyết minh sửa cùng cách như mục 3.3).
- Với mỗi bài cập nhật, ghi lại: **tóm tắt một dòng đổi gì**, và **các mục (heading `##`) đã đổi** để web đánh dấu (mục 4).

### 3.5 Tham chiếu video

Frontmatter `lessons:` của mỗi ghi chú đang trỏ tới số video bản cũ (`"0272 Amazon AppFlow"`). Build dùng 4 chữ số đầu để tìm file trong `../videos` khi chạy local (`vite.config.ts`, `videoByNum` trong `build-content.mjs`). Cần cập nhật để ghi chú trỏ tới (các) video tương ứng của **bản mới**, và để chạy local phát được video bản mới. Ghi chú loại "không còn trong khóa" giữ tham chiếu cũ.

### 3.6 Trang tổng hợp (chủ repo đã đồng ý)

Cập nhật luôn các trang tổng hợp theo nội dung mới:
- `data/Exam Cheat Sheet.md`: thêm, sửa mẹo theo bài mới và bài cập nhật.
- Phần "Top mẹo thi" và concept map trong `_MOC` của từng chương.
- Số liệu ở trang chủ (`00 Home.md`: số bài, số sơ đồ…).

Trong popup "Có gì mới" có thêm **một dòng riêng** cho trang tổng hợp, ví dụ "Exam Cheat Sheet đã cập nhật: thêm mẹo về X, Y". Các trang này **không** gắn icon ❗.

### 3.7 Dữ liệu "đợt cập nhật"

Kết quả phân loại lưu thành **một file dữ liệu trong repo**, do người làm điền, build đọc vào. Tối thiểu gồm:

- Mã đợt (vd `2026-11-10`) và ngày.
- Danh sách bài **mới**, **cập nhật** (kèm tóm tắt một dòng và các mục đã đổi) và **không còn trong khóa**.
- Với từng bài: các heading **đã đổi** (đánh ❗ đỏ) và các heading **không còn trong khóa** (đánh ❗ xanh dương).

Build đưa dữ liệu này vào `public/content/` để giao diện dùng. Đợt sau thì thay bằng dữ liệu của đợt đó.

## 4. Giao diện đánh dấu thay đổi

Mọi đánh dấu đều dựa trên dữ liệu đợt cập nhật **gần nhất**.

### 4.1 Popup "Có gì mới"

- Khi mở web, nếu trình duyệt **chưa thấy mã đợt hiện tại** thì hiện popup giữa màn hình.
- Nội dung: "Cập nhật ngày …: thêm X bài mới, sửa Y bài, Z bài không còn trong khóa mới". Bên dưới là danh sách **nhóm theo chương**, mỗi bài có tóm tắt một dòng và link mở thẳng bài đó.
- Nút "Đã hiểu" để đóng. Đóng rồi thì không tự hiện lại cho đợt đó. Mã đợt đã xem lưu trong localStorage và có trong file export/import tiến độ như các dữ liệu khác.
- Header có mục **"Có gì mới"** để mở lại popup bất cứ lúc nào.

### 4.2 Dấu trên danh sách bài

| Loại | Dấu |
|---|---|
| Cập nhật | **❗ màu đỏ** |
| Không còn trong khóa | **❗ màu xanh dương** |
| Mới | nhãn **"MỚI"** (khác với ❗) |

- Hiện ở mọi nơi đang có danh sách bài: danh sách bài của chương, thanh bên, đầu trang bài. Đặt cạnh dấu 🎯 bộ đề hiện có (`src/components/ExamMark.tsx` là tiền lệ).
- **Thẻ chương ở trang chủ** hiện số bài mới/cập nhật của chương.
- **Dấu không bao giờ tự mất**, kể cả khi người học đã mở bài. Dấu chỉ đổi khi có đợt cập nhật sau.
- Có tooltip hoặc chú thích để người học hiểu màu nào nghĩa là gì.

### 4.3 Bên trong bài

- **Bài cập nhật**: đầu bài có khung (tông đỏ nhạt) ghi "Bài này cập nhật ngày … theo video mới", kèm tóm tắt và danh sách các mục đã đổi; bấm vào thì cuộn tới mục đó. Mỗi heading của mục đã đổi có ❗ đỏ bên cạnh.
- **Bài không còn trong khóa**: đầu bài có dòng (tông xanh dương) "Bài này không còn trong bản khóa mới (…), giữ lại để tham khảo".
- **Phần không còn trong khóa** (mục 3.1): heading của phần đó có ❗ xanh dương. Nếu bài có khung cập nhật thì khung liệt kê luôn những phần này.
- **Bài mới**: đầu bài có nhãn "MỚI".
- Giao diện sáng/tối đều phải rõ (màu qua biến CSS trong `src/styles.css` như phần còn lại).

## 5. Không làm

- Không đưa frame hay ảnh chụp video lên web.
- Không đánh số lại hay đổi tên chương hoặc file ghi chú hiện có.
- Không gán lại câu hỏi bộ đề (`web/practice/*.json`) sang bài mới.
- Không sửa nội dung bài "không còn trong khóa".

## 6. Thất bại nếu…

- **Đổi tên hoặc xóa file ghi chú hiện có.** Id bài là slug của tên file, và tiến độ, ghi chú, highlight, nét vẽ, bookmark, chat của người học đều gắn vào id đó. Đổi tên là mất dữ liệu của họ.
- Bài mới viết sơ sài so với bài cũ, hoặc nội dung sai so với video.
- Bài bị đánh "cập nhật" chỉ vì đổi câu chữ, làm ❗ đỏ mất ý nghĩa; hoặc ngược lại, bỏ sót thay đổi thật.
- `npm run build` lỗi, hoặc web cũ bị hỏng tính năng (quiz, sơ đồ, luyện đề, export/import…).
- Popup hiện lại mỗi lần mở web, hoặc chặn người học không đóng được.

## 7. Ràng buộc và quy trình

- Build phải qua: `cd web && npm run build` (type-check + bundle).
- Cập nhật `web/README.md` cho phần đánh dấu cập nhật và file dữ liệu đợt cập nhật.
- **Không push lên `main` khi chưa hỏi chủ repo.** Push sẽ tự deploy GitHub Pages ra web thật. Commit lên nhánh riêng, chủ repo xem rồi mới merge/push.
- Chỉ dùng video có `status: complete`. Bài thuộc video chưa tải xong thì đợi.
- **Ra một đợt cập nhật duy nhất**, sau khi đã xử lý đủ 376 video. Có thể bắt đầu với các video đã về, nhưng chỉ đưa lên web khi xong hết. Nếu có video không tải được dù đã thử lại, đánh dấu video đó là thiếu và báo chủ repo. Không chặn cả đợt vì một video. *(quyết định của người viết tài liệu)*

## 8. Để người làm tự quyết

- Cách khớp video mới với ghi chú cũ (đọc phụ đề, so ý chính…), miễn là kết quả đúng theo nội dung.
- Định dạng và vị trí cụ thể của file dữ liệu đợt cập nhật (mục 3.7).
- Cách cắt frame (ngưỡng đổi cảnh, khoảng thời gian…).
- Cấu trúc component, tên class, cách đánh dấu heading đã đổi trong markdown hay trong dữ liệu.
- Định dạng tham chiếu video bản mới (mục 3.5), miễn là chạy local phát đúng video và không đụng số cũ.
- Thứ tự làm và cách chia việc.
