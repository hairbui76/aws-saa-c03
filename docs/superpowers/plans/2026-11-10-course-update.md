# Cập nhật web theo bản khóa SAA-C03 mới: kế hoạch thực hiện

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Mục tiêu:** Nội dung web khớp với bản khóa mới (376 video). Người đang học dở thấy ngay chỗ đổi qua popup "Có gì mới", ❗ đỏ/xanh, nhãn "MỚI", khung trong bài và ❗ ở heading.

**Kiến trúc:**
- Một file dữ liệu đợt cập nhật `web/updates.json`, do người làm điền.
- Một module thuần `web/scripts/lib/updates.mjs` kiểm tra file này và dựng dữ liệu cho giao diện. `build-content.mjs` gọi module và **dừng build nếu dữ liệu sai**.
- Phía giao diện, mọi thứ đọc từ `public/content/updates.json` và trường `u` / `update` trong JSON chương và bài.
- Phần nội dung (ghi chú, sơ đồ, quiz, thuyết minh) làm theo từng nhóm mục của khóa. Mỗi nhóm theo cùng một quy trình (xem "Quy trình nội dung").

**Công nghệ:** Node 22 (`node:test`, chạy thẳng `.ts` nhờ type stripping như `gen-narration.mjs` đang làm), Vite + React 19 + TS, ffmpeg, Python venv (edge-tts, faster-whisper) đặt ngoài repo.

**Spec:** `docs/superpowers/specs/2026-11-10-course-update-design.md`. Người làm phải đọc spec trước khi bắt đầu.

## Ràng buộc chung

- **Không đổi tên, không xóa, không chuyển chương file ghi chú hiện có.** Id bài = slug tên file; dữ liệu người học gắn vào id đó.
- Không đánh số lại chương `00`–`21`. Chương mới: `22 Systems Manager`, `23 Elastic Beanstalk`. Video "Exam Prep" vào `00 Course and Exam`.
- Ghi chú hiện có không đổi thứ tự trong "Lộ trình học". Bài mới chèn ngay sau bài hiện có đứng gần trước nó nhất theo thứ tự khóa mới; không có thì đặt cuối.
- "Cập nhật" chỉ khi **khác về nội dung** (định nghĩa ở spec mục 3.1). Chỉ đổi câu chữ hay chỉ đổi kịch bản Animals4life → Aus-E-Mart/RooTube thì không tính.
- Animals4life, `Lab - Architecture Evolution`, `Lab - Serverless App Pet-Cuddle-o-Tron`, lab Site2Site VPN (nếu có ghi chú riêng) và toàn bộ chương `02 Tech Fundamentals` (nếu bản mới thật sự không còn) xếp loại `removed`. Không sửa nội dung các ghi chú này.
- Phần bị bỏ trong một ghi chú: giữ nội dung, đưa heading vào `dropped`.
- Frame, transcript và công cụ phân tích để trong `/home/hairbui76/Videos/saa/work/` (**ngoài repo**). Không commit, không đưa lên web.
- Bài mới làm đủ bộ:
  - frontmatter `tags`, `aliases`, `videos`
  - TL;DR và các mục chuẩn như `data/14 Serverless and Application Services/AppFlow.md`
  - Excalidraw `.excalidraw.md` và `.svg`
  - 5 câu quiz
  - thuyết minh có `sig` đúng
  - mp3 edge-tts
  - từ viết tắt mới
  - wikilink từ bài cũ liên quan
- Viết tiếng Việt, giữ thuật ngữ AWS bằng tiếng Anh. Kiến thức thêm ngoài bài giảng ghi rõ "(Bổ sung…, bài không nói)".
- Làm trên nhánh `course-update-2026-11`. **Không push `main`, không merge khi chưa hỏi chủ repo** (push `main` sẽ deploy web thật).
- `cd web && npm run build` và `cd web && npm test` phải qua ở cuối mỗi task.
- Không gán lại câu hỏi bộ đề (`web/practice/*.json`), không đưa frame lên web.
- Chỉ ra **một đợt** `2026-11-10`. Video lỗi hoặc thiếu thì ghi lại và báo, không chặn cả đợt.

## Review Focus

1. **Heading có emoji hoặc dấu tiếng Việt** (vd `🎯 Mẹo thi SAA-C03`, `Khái niệm cốt lõi`): id build tạo ra phải trùng id mà `Sections` gắn lên thẻ. Lệch là ❗ ở heading và nút cuộn trong khung cập nhật âm thầm không hoạt động. Test được đặt ở Task 1.
2. **Không có `web/updates.json`** (đợt sau xóa nhầm, hoặc build trên máy khác): build vẫn chạy, không popup, không dấu, không crash. Test được đặt ở Task 2.
3. **Import file tiến độ cũ không có `updatesSeen`**, hoặc import từ máy đã xem đợt mới hơn: không reset, không làm popup bật lại, luôn giữ mã đợt mới hơn. Test được đặt ở Task 3.
4. **localStorage bị chặn** (chế độ riêng tư) hoặc **màn hình điện thoại hẹp**: popup vẫn đóng được, danh sách dài (≥22 bài `removed` của chương 02) cuộn được, nút "Đã hiểu" luôn trong tầm bấm. Kiểm thủ công ở Task 3.
5. **Web thật không có video local**: bài trỏ video mới 3 chữ số vẫn hiện tiêu đề bài giảng và không hiện ô video hỏng. Test được đặt ở Task 2, kiểm thủ công ở Task 5.

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `web/updates.json` (mới) | Dữ liệu đợt cập nhật, người làm điền |
| `web/scripts/lib/updates.mjs` (mới) | Hàm thuần: `slugify`, `noteHeadings`, `validateBatch`, `buildUpdatesIndex`, `lessonUpdate`, `parseVideoRef`, `indexVideos`, `courseCoverage` |
| `web/scripts/build-content.mjs` (sửa) | Đọc `updates.json` và `videos:`, gọi lib, ghi `updates.json` ra content, thêm `u` và `update` |
| `web/scripts/course-coverage.mjs` (mới) | Đối chiếu manifest với `videos:` của các ghi chú (công cụ dev) |
| `web/scripts/narration-todo.mjs` (mới) | Liệt kê hoặc kiểm tra sơ đồ thiếu thuyết minh hay có `sig` lỗi thời |
| `web/tests/*.test.mjs` (mới) | Test `node:test` |
| `web/src/lib/updates.ts` (mới) | Kiểu dữ liệu và hàm thuần phía client: `shouldShowWhatsNew`, `newerBatchId`, `chapterUpdateCounts` |
| `web/src/lib/store.ts` (sửa) | Store `saa.updates.v1`, export/import `updatesSeen` |
| `web/src/components/UpdateMark.tsx` (mới) | ❗ đỏ / ❗ xanh / nhãn MỚI, cùng `UpdateLegend` |
| `web/src/components/WhatsNew.tsx` (mới) | Popup "Có gì mới" |
| `web/src/components/UpdateBanner.tsx` (mới) | Khung đầu bài |
| `web/src/components/Sections.tsx` (sửa) | ❗ cạnh heading đã đổi hoặc bị bỏ |
| `web/src/App.tsx`, `pages/Chapter.tsx`, `pages/Lesson.tsx`, `pages/Home.tsx`, `styles.css`, `vite.config.ts` (sửa) | Gắn giao diện; phát video bản mới khi chạy local |
| `data/**` | Nội dung |
| `/home/hairbui76/Videos/saa/work/` (ngoài repo) | venv, `tools/`, `transcripts/`, `frames/`, `candidates.tsv`, `unmapped.txt`, `findings/` |

### Định dạng `web/updates.json` (quyết định của người lập kế hoạch)

```json
{
  "id": "2026-11-10",
  "date": "2026-11-10",
  "title": "Cập nhật theo bản khóa SAA-C03 mới (376 video)",
  "pages": ["Exam Cheat Sheet: thêm mẹo về …"],
  "missing": [],
  "lessons": {
    "AppFlow": { "kind": "updated", "summary": "…", "changed": ["Khái niệm cốt lõi"], "dropped": [] },
    "Systems Manager": { "kind": "new", "summary": "…" },
    "Animals4life": { "kind": "removed", "summary": "khóa mới dùng kịch bản Aus-E-Mart" },
    "Exam Technique": { "dropped": ["Question Technique"] }
  }
}
```

- Key là **tên file ghi chú** (không có `.md`).
- `changed` và `dropped` là **nguyên văn** heading `## ` trong ghi chú.
- Không có `kind` nghĩa là bài chỉ có phần bị bỏ: không ❗ trong danh sách, chỉ ❗ xanh ở heading.
- Với `removed`, `summary` là lý do, hiện trong ngoặc của dòng "không còn trong bản khóa mới (…)".

### Tham chiếu video bản mới (quyết định của người lập kế hoạch)

- Thêm frontmatter `videos: ["123 Tiêu đề video mới"]` (3 chữ số = `video_order` trong manifest). **Giữ nguyên `lessons:`** (số cũ).
- Bài `removed` không có `videos:`.
- Khi có `videos:`, build lấy bài giảng từ `videos:`, không lấy từ `lessons:`.
- Video local được phục vụ ở `/videos-new/` từ `aws-saa-c03/videos-new`: symlink tới `../SAA-C03-newest/videos`, thêm vào `.gitignore`.
- `Lecture.video` thành **đường dẫn URL tương đối đã encode** (`videos/0272_x.mp4` hoặc `videos-new/14_Serverless…/123_x.mp4`), để `Lesson.tsx` không tự ghép thư mục nữa.

---

### Task 0: Nhánh và commit spec

- [ ] **Bước 1:** `git switch -c course-update-2026-11`, sau đó `git add docs/ && git commit -m "docs: spec và kế hoạch cập nhật theo bản khóa mới"`. Kết quả mong đợi: `git log -1` hiện commit này và `git status` sạch.

### Task 1: Thư viện đợt cập nhật (kiểm tra và dựng dữ liệu)

**Files:**
- Tạo `web/scripts/lib/updates.mjs`, `web/tests/updates.test.mjs`
- Sửa `web/package.json`: thêm `"test": "node --test tests/"`

**Interfaces (Produces):**
- `slugify(s: string): string`: chuyển nguyên văn hàm hiện có trong `build-content.mjs` sang đây và export.
- `noteHeadings(body: string): string[]`: các dòng `## ` ngoài code fence, đã trim, bỏ `## `.
- `validateBatch(batch, notes): string[]`
  - `notes: {name, chapterId, headings: string[], videos: string[], quizCount: number, diagramCount: number}[]`
  - Trả về danh sách lỗi; rỗng là hợp lệ.
- `buildUpdatesIndex(batch, chapters): UpdatesIndex | null`
  - `chapters: {id, num, title, lessons: {id, name}[]}[]` theo thứ tự hiển thị.
  - Trả về `{id, date, title, pages, missing, counts:{new, updated, removed}, chapters: [{id, num, title, items: [{id, name, kind, summary}]}]}`. Chỉ gồm bài có `kind` và chương có ít nhất một bài như vậy.
  - Trả về `null` khi `batch` là `null`.
- `lessonUpdate(batch, name): {kind?, date, summary?, changed: {title, id}[], dropped: {title, id}[]} | null`, với `id = slugify(title)`.

- [ ] **Bước 1: Viết test (sẽ fail)** trong `web/tests/updates.test.mjs`:
  - `slugify khớp slug() phía client`: với `['🎯 Mẹo thi SAA-C03', 'Khái niệm cốt lõi', 'Cách hoạt động / Kiến trúc', 'Đổi tên: Data Firehose']`, `slugify(x) === slug(x)`, trong đó `slug` import từ `../src/lib/content.ts`.
  - `noteHeadings bỏ qua code fence`: body `'## A\n```\n## not\n```\n## B '` cho ra `['A', 'B']`.
  - `validateBatch hợp lệ`: batch mẫu đủ 4 dạng (`updated`, `new`, `removed`, chỉ `dropped`), notes khớp, kết quả `[]`.
  - `validateBatch bắt lỗi`: mỗi trường hợp sau sinh **đúng một** lỗi có chứa tên ghi chú.
    - Key không phải ghi chú.
    - `kind` lạ.
    - `updated` thiếu `summary`.
    - `updated` mà `changed` và `dropped` đều rỗng.
    - Heading không tồn tại.
    - Heading nằm ở cả `changed` lẫn `dropped`.
    - Không có `kind` mà `dropped` rỗng.
    - `new` có `quizCount` 4.
    - `new` có `diagramCount` 0.
    - `new` hoặc `updated` có `videos` rỗng.
    - `removed` có `videos`.
  - `validateBatch kiểm tra id/date`: `id: '2026-11'` cho ra lỗi có chứa `id`.
  - `buildUpdatesIndex`:
    - Đếm `counts` đúng.
    - Bài chỉ có `dropped` không nằm trong `items` và không được đếm.
    - Chương và bài theo đúng thứ tự `chapters` đầu vào.
    - Chương không có mục nào bị bỏ ra.
    - `buildUpdatesIndex(null, chapters) === null`.
  - `lessonUpdate`:
    - `changed: ['🎯 Mẹo thi SAA-C03']` cho ra `{title: '🎯 Mẹo thi SAA-C03', id: slugify('🎯 Mẹo thi SAA-C03')}`.
    - Bài không có trong batch thì trả về `null`.
- [ ] **Bước 2:** `cd web && npm test`. Kết quả mong đợi: FAIL (`Cannot find module …/updates.mjs`).
- [ ] **Bước 3:** Viết `updates.mjs` theo đúng các interface trên. Lỗi viết tiếng Việt, mở đầu bằng `updates.json:` và có tên ghi chú.
- [ ] **Bước 4:** `npm test`. Kết quả mong đợi: tất cả PASS.
- [ ] **Bước 5:** Commit `feat(updates): kiểm tra và dựng dữ liệu đợt cập nhật`.

### Task 2: Build đọc đợt cập nhật và video bản mới

**Files:**
- Sửa `web/scripts/build-content.mjs`, `web/vite.config.ts`, `.gitignore`
- Thêm vào `web/scripts/lib/updates.mjs`: `parseVideoRef`, `indexVideos`
- Test: `web/tests/videos.test.mjs`, `web/tests/build.test.mjs`

**Interfaces:**
- Consumes: mọi export ở Task 1.
- Produces:
  - `parseVideoRef(s: string): {num: string, title: string} | null`
    - Nhận `"123 Tiêu đề"` (đúng 3 chữ số, cách một dấu cách).
    - Chuỗi khác (kể cả số cũ 4 chữ số) trả về `null`.
  - `indexVideos(dir: string): Map<string, string>`
    - Duyệt đệ quy, chỉ lấy file `^\d{3}_.*\.mp4$`.
    - Value là đường dẫn tương đối dùng `/`.
    - Thư mục không tồn tại thì trả về `Map` rỗng.
  - Đầu ra build:
    - `public/content/updates.json`, chỉ ghi khi có batch.
    - `index.json`: thêm `u?: 'new'|'updated'|'removed'` vào mỗi `LessonRef`.
    - `c/<id>.json`: thêm `u` như trên.
    - `l/<id>.json`: thêm `update` (giá trị của `lessonUpdate`, bỏ key khi là `null`).
    - `lectures[].video`: đường dẫn URL tương đối, đã encode từng đoạn, hoặc `null`.

- [ ] **Bước 1: Viết test (sẽ fail).**
  - `videos.test.mjs`:
    - `parseVideoRef('123 Amazon AppFlow')` → `{num: '123', title: 'Amazon AppFlow'}`.
    - `parseVideoRef('0272 Amazon AppFlow')` → `null`.
    - `indexVideos` trên thư mục tạm (`fs.mkdtempSync`) gồm `14_A/123_x.mp4`, `14_A/123_x.en.vtt`, `b.mp4` → `Map {'123' => '14_A/123_x.mp4'}`.
    - `indexVideos('/không/có')` có `.size === 0`.
  - `build.test.mjs`: chạy `node scripts/build-content.mjs` bằng `execFileSync` ba lần.
    - Lần 1 với `web/updates.json` hiện có. Mong đợi: exit 0, có `public/content/updates.json`.
    - Lần 2 với biến môi trường `SAA_UPDATES=/không/có.json`. Mong đợi: exit 0, **không** có `public/content/updates.json`, không lesson nào có trường `u`.
    - Lần 3 với `SAA_UPDATES` trỏ tới file tạm có key `"Không có bài này"`. Mong đợi: exit khác 0, stderr chứa `Không có bài này`.
    - Cuối test chạy lại build bình thường.
- [ ] **Bước 2:** `npm test`. Kết quả mong đợi: các test mới FAIL.
- [ ] **Bước 3: Viết code.**
  - Build đọc batch từ `process.env.SAA_UPDATES || web/updates.json`. File không có thì batch = `null`.
  - `validateBatch` có lỗi thì in từng lỗi ra stderr và `process.exit(1)`.
  - `quizCount` và `diagramCount` lấy từ `quizByLesson` và số embed `![[….excalidraw]]` trong body.
  - Thư mục video mới: `VIDEOS_NEW = path.resolve(WEB, '../videos-new')`.
  - `vite.config.ts`: `localVideos()` mount thêm `/videos-new`.
  - Thêm `videos-new` vào `.gitignore`.
  - Tạo symlink: `ln -s ../SAA-C03-newest/videos videos-new` ở gốc repo.
  - Tạo `web/updates.json` ban đầu: `{"id":"2026-11-10","date":"2026-11-10","title":"Cập nhật theo bản khóa SAA-C03 mới (376 video)","pages":[],"missing":[],"lessons":{}}`.
  - In thêm một dòng log `updates: X mới, Y cập nhật, Z không còn trong khóa`.
- [ ] **Bước 4:** `npm test && npm run build`. Kết quả mong đợi: PASS, dòng log `updates: 0 mới, 0 cập nhật, 0 không còn trong khóa`.
- [ ] **Bước 5:** Sửa `Lesson.tsx`: `useVideosAvailable` và `<video src>` dùng thẳng `l.video`. Tạo `web/src/lib/updates.ts` chỉ với các kiểu `UpdateKind = 'new' | 'updated' | 'removed'`, `LessonUpdate`, `UpdatesIndex` (cùng hình với Task 1). Thêm `u?: UpdateKind` vào `LessonRef` và `update?: LessonUpdate` vào `Lesson` trong `src/lib/content.ts`. Chạy `npm run build`, kết quả mong đợi: PASS.
- [ ] **Bước 6:** Commit `feat(build): đọc updates.json và tham chiếu video bản mới`.

### Task 3: Store và popup "Có gì mới"

**Files:**
- Tạo `web/src/lib/updates.ts`, `web/src/components/WhatsNew.tsx`, `web/tests/client-updates.test.mjs`
- Sửa `web/src/lib/store.ts`, `web/src/App.tsx`, `web/src/styles.css`

**Interfaces:**
- Consumes: `public/content/updates.json` (Task 2).
- Produces, thêm vào `src/lib/updates.ts` (các kiểu đã có từ Task 2; file không import store, không import React):
  - `shouldShowWhatsNew(seen: string | null | undefined, batchId: string | undefined): boolean`: chỉ `true` khi có `batchId` và `seen !== batchId`.
  - `newerBatchId(a?: string | null, b?: string | null): string | null`: giá trị lớn hơn theo so sánh chuỗi, bỏ qua giá trị rỗng.
  - `chapterUpdateCounts(lessons: {u?: UpdateKind}[]): {new: number, updated: number, removed: number}`.
- Trong `store.ts`:
  - `export const updatesSeen = createStore<{ seen: string | null }>('saa.updates.v1', { seen: null })`.
  - `ExportFile.updatesSeen?: string | null`.
  - Export ghi `updatesSeen.get().seen`.
  - Import kiểu `replace`: lấy giá trị trong file, nếu file **có** trường này.
  - Import kiểu `merge`: dùng `newerBatchId`.
- `WhatsNew({ data, onClose }: { data: UpdatesIndex; onClose: () => void })`.

- [ ] **Bước 1: Viết test** `client-updates.test.mjs` (import `../src/lib/updates.ts`):
  - `shouldShowWhatsNew(null, '2026-11-10') === true`
  - `shouldShowWhatsNew('2026-11-10', '2026-11-10') === false`
  - `shouldShowWhatsNew('2026-11-10', undefined) === false`
  - `shouldShowWhatsNew(undefined, '2026-11-10') === true`
  - `newerBatchId('2026-11-10', undefined) === '2026-11-10'`
  - `newerBatchId('2026-11-10', '2027-01-02') === '2027-01-02'`
  - `newerBatchId(null, null) === null`
  - `chapterUpdateCounts([{u:'new'},{u:'updated'},{u:'updated'},{}])` → `{new:1, updated:2, removed:0}`
- [ ] **Bước 2:** `npm test`. Kết quả mong đợi: FAIL.
- [ ] **Bước 3:** Viết `updates.ts`, rồi chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Bước 4: Store.** Thêm phần store và export/import như trong Interfaces.
- [ ] **Bước 5: Popup.**
  - **Hành vi:**
    - `App` tải `updates.json` bằng `useJson`.
    - Mở tự động khi `shouldShowWhatsNew(updatesSeen.get().seen, data.id)`.
    - Mọi cách đóng (nút "Đã hiểu", Esc, bấm nền) đều gọi `updatesSeen.set({ seen: data.id })`.
  - **Header:** nút `pill` "Có gì mới" (icon lucide `Sparkles`), mở lại popup bất cứ lúc nào. Nút chỉ hiện khi có data.
  - **Nội dung popup:**
    - Câu tóm tắt: "Cập nhật ngày 10/11/2026: thêm X bài mới, sửa Y bài, Z bài không còn trong khóa mới".
    - `UpdateLegend` (Task 4).
    - Danh sách nhóm theo chương. Bài `new`/`updated` hiện `UpdateMark` + link `/l/<id>` + tóm tắt. Bài `removed` của chương gom thành một dòng gồm các link tiêu đề.
    - Mỗi dòng trong `pages` có tiền tố 📋, không icon ❗.
    - `missing` (nếu có) hiện ở cuối.
    - Bấm link bài thì đóng popup (cũng đánh dấu đã xem).
  - **Bố cục:** theo khung modal của `SettingsDialog`. Thân popup `max-height: min(70vh, 640px); overflow: auto`. Nút "Đã hiểu" nằm ngoài vùng cuộn.
- [ ] **Bước 6:** Chạy `npm run build`, kết quả mong đợi: PASS.
  - Tạm thêm 1 bài `updated` vào `web/updates.json` để thử.
  - `npm run dev`, mở web và kiểm:
    - popup hiện;
    - đóng xong tải lại trang thì popup không hiện;
    - nút "Có gì mới" mở lại được;
    - Export rồi Import vẫn giữ trạng thái đã xem;
    - ở 360px rộng, danh sách cuộn được và nút "Đã hiểu" bấm được;
    - giao diện tối rõ ràng.
  - Bỏ bài thử khỏi `updates.json` trước khi commit.
- [ ] **Bước 7:** Commit `feat(ui): popup "Có gì mới" và lưu đợt đã xem`.

### Task 4: Dấu trên danh sách bài và thẻ chương

**Files:**
- Tạo `web/src/components/UpdateMark.tsx`
- Sửa `web/src/pages/Chapter.tsx`, `web/src/pages/Lesson.tsx` (sidebar, danh sách mobile, cạnh tiêu đề), `web/src/pages/Home.tsx`, `web/src/styles.css`

**Interfaces:**
- Consumes: `LessonRef.u`, `chapterUpdateCounts`.
- Produces:
  - `UpdateMark({ kind, size? }: { kind?: UpdateKind; size?: number })`
    - Trả về `null` khi không có `kind`.
    - `updated`: ❗ màu `--upd-changed`, `title` "Bài có cập nhật theo bản khóa mới".
    - `removed`: ❗ màu `--upd-removed`, `title` "Bài không còn trong bản khóa mới, giữ lại để tham khảo".
    - `new`: chip chữ "MỚI", nền `--upd-new`.
    - Có `aria-label` bằng đúng `title`.
  - `UpdateLegend()`: một dòng giải thích ba dấu.

- [ ] **Bước 1:** Thêm biến CSS `--upd-changed`, `--upd-changed-soft`, `--upd-removed`, `--upd-removed-soft`, `--upd-new` cho cả theme sáng và tối, đặt cạnh `--red`/`--blue` hiện có. ❗ dùng icon lucide `CircleAlert` tô bằng `currentColor`, để màu xanh và đỏ đều điều khiển được.
- [ ] **Bước 2: Gắn `UpdateMark`** cạnh `ExamMark` ở:
  - danh sách của `Chapter.tsx`;
  - sidebar `lesson-side`;
  - danh sách `mobile-lessons`;
  - `lesson-title-row`. Ở đây đọc `kind` từ `lesson.update?.kind`.
- [ ] **Bước 3:** `Chapter.tsx` hiện `UpdateLegend` phía trên danh sách khi chương có ít nhất một bài mang `u`.
- [ ] **Bước 4:** `Home.tsx`: thẻ chương thêm một dòng giống `exam-mark ch`, chỉ hiện các phần khác 0: "2 bài mới · 3 cập nhật · 1 không còn trong khóa".
- [ ] **Bước 5:** `npm run build`, kết quả mong đợi: PASS. Thêm tạm một bài mỗi loại vào `updates.json`, chạy `npm run dev`, kiểm ở chương, sidebar, mobile, tiêu đề bài và trang chủ (sáng và tối). Đã đánh dấu xong bài và mở bài rồi thì dấu vẫn còn. Bỏ dữ liệu thử.
- [ ] **Bước 6:** Commit `feat(ui): dấu ❗ và nhãn MỚI trên danh sách bài`.

### Task 5: Khung đầu bài và ❗ ở heading

**Files:**
- Tạo `web/src/components/UpdateBanner.tsx`
- Sửa `web/src/components/Sections.tsx`, `web/src/pages/Lesson.tsx`, `web/src/styles.css`

**Interfaces:**
- Consumes: `Lesson.update: LessonUpdate | undefined`.
- Produces:
  - `Sections` nhận thêm prop `marks?: Record<string, 'changed' | 'dropped'>`, key là `section.id`. Heading có mark thì hiện ❗ đỏ (`changed`) hoặc ❗ xanh (`dropped`) sau chữ heading, kèm `title`:
    - `changed`: "Mục này đổi theo video mới (đợt …)".
    - `dropped`: "Phần này không còn trong bản khóa mới".
  - `UpdateBanner({ update })`:
    - `updated`: khung tông `--upd-changed-soft`, ghi "Bài này cập nhật ngày 10/11/2026 theo video mới", tiếp theo là `summary`. Sau đó là danh sách nút tên mục, bấm thì `document.getElementById(id)?.scrollIntoView({behavior:'smooth'})`. Mục `dropped` liệt kê riêng, gắn ❗ xanh.
    - `removed`: một dòng tông `--upd-removed-soft`, "Bài này không còn trong bản khóa mới (summary), giữ lại để tham khảo."
    - `new`: chip MỚI + "Bài mới thêm ngày 10/11/2026 theo bản khóa mới."
    - Không có `kind` nhưng có `dropped`: khung xanh liệt kê các phần không còn trong khóa.

- [ ] **Bước 1:** Viết code như trên. Trong `Lesson.tsx`, đặt `UpdateBanner` ngay dưới `lesson-title-row` và truyền `marks` dựng từ `lesson.update` vào `Sections`.
- [ ] **Bước 2:** `npm run build`, kết quả mong đợi: PASS.
  - Thêm tạm `"AppFlow": {"kind":"updated","summary":"thử","changed":["🎯 Mẹo thi SAA-C03"],"dropped":[]}` vào `updates.json`.
  - Mở `#/l/appflow`, kiểm:
    - khung hiện ra;
    - bấm tên mục thì cuộn tới đúng mục;
    - heading Mẹo thi có ❗ đỏ;
    - giao diện tối rõ ràng.
  - Bỏ dữ liệu thử.
- [ ] **Bước 3:** Kiểm phát video local.
  - Tạm thêm `videos: ["123 <tiêu đề thật của video 123>"]` vào một ghi chú.
  - `npm run dev`, kiểm mục "📺 Bài giảng gốc" phát được video mới.
  - `npm run build && npm run preview` trên bản build (vẫn có video) cũng phát được.
  - Bỏ thay đổi thử.
- [ ] **Bước 4:** Cập nhật `web/README.md`:
  - định dạng `updates.json` và luật kiểm tra;
  - frontmatter `videos:` và symlink `videos-new`;
  - `npm test`;
  - `course-coverage.mjs`, `narration-todo.mjs` (Task 6);
  - cách ra đợt sau (thay `updates.json`).
- [ ] **Bước 5:** Commit `feat(ui): khung cập nhật đầu bài và ❗ ở heading`.

### Task 6: Công cụ phân tích khóa mới (ngoài repo) và kiểm tra độ phủ

**Files:**
- Tạo `web/scripts/course-coverage.mjs`, `web/scripts/narration-todo.mjs`
- Thêm vào `web/scripts/lib/updates.mjs`: `courseCoverage`
- Test: thêm vào `web/tests/videos.test.mjs`
- Ngoài repo: `/home/hairbui76/Videos/saa/work/{venv,tools,transcripts,frames,findings}`

**Interfaces (Produces):**
- `courseCoverage(manifestVideos: {video_order: number, title: string, section_order: number}[], noteRefs: {name: string, videos: string[]}[], allow: Set<string>): {unmapped: {num, title, section}[], unknown: {name, ref}[], multi: {num, notes: string[]}[]}`
  - `unknown`: ref trỏ tới số không có trong manifest, hoặc tiêu đề khác với tiêu đề trong manifest.
  - `multi`: chỉ để biết thông tin, không phải lỗi. Một video dùng cho nhiều ghi chú là hợp lệ.
- `node scripts/course-coverage.mjs <manifest> [--allow <file>] [--section N]`:
  - In ra `unmapped` và `unknown`.
  - Exit 1 nếu `unmapped` hoặc `unknown` không rỗng (đã lọc theo `--section`).
  - File allow: mỗi dòng `NNN  lý do`.
- `node scripts/narration-todo.mjs [--check] [lessonId…]`:
  - Đọc `public/content/l/*.json`. Với mỗi sơ đồ, tính `stepSig(buildModel(d))` (import `../src/lib/diagram.ts` như `gen-narration.mjs`).
  - Không có `--check`: in ra những sơ đồ chưa có thuyết minh hoặc có `sig` khác, kèm `name`, `sig`, số bước và `stepContents` của từng bước.
  - Có `--check`: exit 1 nếu có sơ đồ `sig` lỗi thời (ở bất kỳ bài nào), hoặc sơ đồ của bài `new` (theo `updates.json`) chưa có thuyết minh.

- [ ] **Bước 1:** Thêm test `courseCoverage` vào `videos.test.mjs`. Dữ liệu: 3 video; ghi chú A tham chiếu `001` và `002`; ghi chú B tham chiếu `002` và `009`; allow `{'003'}`. Kết quả mong đợi:
  - `unmapped` rỗng;
  - `unknown` có đúng `{name:'B', ref:'009 …'}`;
  - `multi` có `002`;
  - nếu bỏ allow thì `unmapped` có `003`.
- [ ] **Bước 2:** `npm test` FAIL. Viết code, rồi `npm test` PASS.
- [ ] **Bước 3:** Chạy `node scripts/narration-todo.mjs --check` trên repo hiện tại. Kết quả mong đợi: exit 0 (thuyết minh hiện có đều đúng `sig`). Nếu exit 1 thì đó là lỗi có sẵn: ghi lại và báo, **không** sửa trong task này.
- [ ] **Bước 4: Công cụ ngoài repo**, đặt trong `/home/hairbui76/Videos/saa/work/tools/`.
  - `python3 -m venv ../venv && ../venv/bin/pip install edge-tts faster-whisper`.
  - **`vtt2txt.py <manifest>`:**
    - Với mỗi video `complete` có `.en.vtt`, ghi `transcripts/NNN.txt`.
    - Dòng đầu: `NNN | mục | tiêu đề | thời lượng`.
    - Bỏ timestamp và các dòng trùng lặp do cue cuộn. Cứ mỗi phút chèn một mốc `[mm:ss]`.
  - **`whisper.py <manifest>`:**
    - Dùng cho video không có phụ đề (`subtitle_status != downloaded`).
    - `faster-whisper`, model `small.en`, `device=cpu`, `compute_type=int8`, chạy song song theo số nhân CPU.
    - Ghi `transcripts/NNN.txt` cùng định dạng, dòng đầu có thêm `(whisper)`.
    - Nếu whisper không cài được hoặc quá chậm (hơn 3 lần thời lượng video), bỏ qua: bài đó dựa vào frame và báo lại.
  - **`frames.sh NNN [scene]`:**
    - `ffmpeg -i <mp4> -vf "select='gt(scene,0.3)',scale=1280:-1" -vsync vfr frames/NNN/%04d.jpg`.
    - Nếu ra ít hơn 1 frame/2 phút thì chạy thêm `fps=1/30`.
  - **`candidates.py <manifest>`:**
    - Với mỗi video mới, so tiêu đề (difflib) với các mục `lessons:` cũ của mọi ghi chú.
    - Ghi `candidates.tsv`: `NNN, tiêu đề, ghi chú khả dĩ nhất, tiêu đề cũ, điểm`.
    - **Chỉ là điểm xuất phát**; spec bắt buộc khớp theo nội dung.
  - Chạy cả ba bước:
    - Mong đợi: có 321 transcript từ vtt.
    - Mong đợi: có transcript cho 55 video không phụ đề, hoặc danh sách video whisper thất bại.
    - Mong đợi: có `candidates.tsv` đủ 376 dòng.
- [ ] **Bước 5:** Commit `feat(tools): course-coverage và narration-todo` (chỉ phần trong repo).

---

## Quy trình nội dung (dùng cho Task 7–18)

Mỗi task nội dung xử lý một nhóm mục của khóa mới, theo thứ tự sau:

1. **Đọc.**
   - Đọc transcript của mọi video trong nhóm.
   - Mở các ghi chú ứng viên trong `candidates.tsv`, cùng mọi ghi chú của chương đích.
   - Cắt frame (`frames.sh`) cho:
     - video không phụ đề;
     - video mà transcript nhắc tới slide, bảng hoặc số liệu cần đối chiếu;
     - demo console để biết giao diện hoặc tính năng đã đổi.
   - Đọc frame bằng tool Read (ảnh).
2. **Ghi kết quả đối chiếu** vào `work/findings/<task>.md`, ngoài repo. Mỗi video một dòng: `NNN → ghi chú | loại (new/updated/same/scenario-only) | khác gì (có dẫn chứng: mốc thời gian hoặc frame)`. Mỗi ghi chú của chương mà không có video nào khớp: ghi `removed` kèm lý do. **Không có dòng nào được thiếu dẫn chứng.**
3. **Tham chiếu.** Thêm `videos:` vào mọi ghi chú khớp, giữ `lessons:`. Video intro/outro hoặc video không đáng thành ghi chú thì gắn vào ghi chú gần nhất. Nếu thật sự không gắn được, ghi vào `work/unmapped.txt` kèm lý do.
4. **Sửa ghi chú "updated".**
   - Chỉ sửa phần bị ảnh hưởng, giữ nguyên văn phong.
   - Đổi tên dịch vụ: thêm tên mới vào `aliases` và cập nhật cách gọi trong bài.
   - Sửa luôn sơ đồ (`.excalidraw.md` và xuất lại `.svg` cùng nội dung), quiz và thuyết minh nếu chúng sai hoặc thiếu.
   - Ghi vào `web/updates.json`: `summary` (một dòng nói **đổi gì về kiến thức**), `changed`/`dropped` là heading nguyên văn.
5. **Viết bài "new"** đủ bộ theo ràng buộc chung:
   - Đặt vào chương đúng theo quy tắc chương.
   - Chèn dòng `N. [[Tên]]: tóm tắt` vào "Lộ trình học" của MOC theo quy tắc chèn. Đánh lại số thứ tự dòng nếu cần; thứ tự tương đối của bài cũ giữ nguyên.
   - Thêm 5 câu vào `web/quizzes/<NN>.json`. Chương mới thì tạo file `{"chapter": "<tên thư mục>", "lessons": {}}`.
   - Thêm từ viết tắt vào `web/abbreviations.json`.
   - Thêm wikilink từ ít nhất một bài cũ liên quan.
   - Sơ đồ mới: Excalidraw JSON theo đúng cấu trúc sơ đồ hiện có trong cùng chương, với bảng màu theo nhóm dịch vụ ghi ở `00 Home.md`. Xuất `.svg` có cùng nội dung.
6. **Thuyết minh.**
   - `npm run content`, sau đó `node scripts/narration-todo.mjs <lessonId…>`.
   - Viết `web/narration/<lessonId>.json` cho từng sơ đồ mới hoặc đổi, theo yêu cầu trong `SYSTEM` của `gen-narration.mjs`: số bước đúng bằng số bước của sơ đồ, mỗi bước 1–2 câu, không ký hiệu.
   - `sig` lấy từ output của `narration-todo.mjs`.
   - Chạy `node scripts/narration-todo.mjs --check`. Kết quả mong đợi: exit 0.
7. **MOC.** Cập nhật "Top mẹo thi" và concept map của chương nếu kiến thức đổi.
8. **Kiểm tra.** Mong đợi: tất cả qua.
   ```bash
   cd web && npm test && npm run build \
     && node scripts/course-coverage.mjs /home/hairbui76/Videos/saa/SAA-C03-newest/manifest.json \
          --allow /home/hairbui76/Videos/saa/work/unmapped.txt --section <từng mục của task> \
     && node scripts/narration-todo.mjs --check
   ```
   Build không in `unresolved wikilinks` mới so với trước task.
9. **Commit:** `content(<chương>): cập nhật theo bản khóa mới`.

Mỗi task nội dung còn có các điều kiện xong riêng:
- Mọi video của các mục trong task đã gắn vào ghi chú hoặc nằm trong `unmapped.txt`.
- Mọi ghi chú của chương đích đã có kết luận trong `findings`.
- `git diff --stat -- data` không có file nào bị đổi tên hay xóa (`git diff --diff-filter=DR --name-only` rỗng).

### Task 7: Mục 1 Introduction, 2 Course Fundamentals, 24 Exam Prep → chương 00, 01; xét chương 02

- Phạm vi: mục 1, 2, 24.
- Chương đích: `00 Course and Exam`, `01 Accounts and Basics`. Đồng thời xét toàn bộ `02 Tech Fundamentals`.
- Riêng:
  - Ghi chú về kịch bản **Animals4life** → `removed` (lý do: khóa mới dùng Aus-E-Mart/RooTube).
  - Hai video "Question Technique" cũ trong `Exam Technique.md`: nếu bản mới không còn thì đưa heading vào `dropped`.
  - Video Exam Prep: nếu khớp với `Exam Technique` thì là bài updated/same; nếu nội dung mới hẳn thì viết bài mới trong chương 00.
  - Mỗi ghi chú chương 02 phải được tìm trong toàn khóa mới, không chỉ mục 2, vì có thể đã chuyển sang mục khác. Không thấy thì `removed`.

### Task 8: Mục 3 AWS Fundamentals, 4 IAM/Organisations → chương 03, 04

### Task 9: Mục 5 S3 → chương 05

### Task 10: Mục 6 VPC Basics, 7 EC2 Basics → chương 06, 07

### Task 11: Mục 8 Containers, 9 Advanced EC2, 10 Route 53 → chương 08, 09, 10

### Task 12: Mục 11 RDS, 12 Network Storage, 13 HA & Scaling → chương 11, 12, 13

### Task 13: Mục 14 Serverless and Application Services → chương 14

- 10 video không phụ đề, nên phải dùng transcript whisper và frame.
- Analytics (Kinesis, Glue…) có thể nằm ở đây, nhưng ghi chú cũ nằm ở chương 20 thì **vẫn để ở chương 20**.
- `Lab - Serverless App Pet-Cuddle-o-Tron` → `removed` nếu bản mới chỉ còn mục "(Coming Soon)" "Build A Serverless App - Croc Snack Bot".

### Task 14: Mục 15 Global Content Delivery, 16 Advanced VPC, 17 Hybrid & Migration → chương 15, 16, 17

- Lab Site2Site VPN: nếu có ghi chú lab riêng thì `removed`. Nếu đó là phần trong một ghi chú thì heading đó vào `dropped`.

### Task 15: Mục 18 Security/Deployments/Operations, 19 CloudFormation → chương 18, 19

- `Lab - Architecture Evolution` (tìm theo tên trong `data/`) → `removed` nếu khóa mới chỉ còn mục "(Coming Soon)".

### Task 16: Mục 20 NoSQL & DynamoDB → chương 20

- 9 video không phụ đề.

### Task 17: Mục 21 Systems Manager, 22 Elastic Beanstalk → chương mới 22, 23

- Tạo thư mục `data/22 Systems Manager/`, `data/23 Elastic Beanstalk/`, mỗi thư mục có `_MOC 22 Systems Manager.md` / `_MOC 23 Elastic Beanstalk.md` và `_diagrams/`.
- MOC theo đúng định dạng MOC chương 14:
  - đoạn mô tả đầu;
  - dòng điều hướng `← …`;
  - `## Lộ trình học`;
  - Top mẹo thi;
  - concept map.
- Elastic Beanstalk không có phụ đề, nên phải dùng whisper và frame.
- Mỗi ghi chú tham chiếu có sẵn của các chủ đề này ở chương cũ (nếu có, ví dụ ở chương 18) giữ nguyên chỗ; bài mới link sang.
- Tạo `web/quizzes/22.json`, `web/quizzes/23.json`.
- Thêm hai chương vào bảng chương trong `data/00 Home.md`.

### Task 18: Mục 23 Machine Learning 101 → chương 21

- 8 video, không có phụ đề.

### Task 19: Giọng đọc (TTS)

- [ ] **Bước 1:** `cd web && /home/hairbui76/Videos/saa/work/venv/bin/python scripts/tts.py`. Kết quả mong đợi: không có dòng `! failed`.
- [ ] **Bước 2:** `npm run build`. Kết quả mong đợi: dòng log có `voice clips` bằng tổng số bước thuyết minh, nghĩa là không thuyết minh nào thiếu mp3. Lệnh tính tổng số bước:
  ```bash
  node -e "let n=0;for(const f of require('fs').readdirSync('narration'))if(f.endsWith('.json'))for(const d of Object.values(require('./narration/'+f)))n+=d.steps.length;console.log(n)"
  ```
- [ ] **Bước 3:** Commit `content(audio): giọng đọc cho thuyết minh mới`.

### Task 20: Trang tổng hợp và hoàn tất đợt

- [ ] **Bước 1:** Sửa `data/Exam Cheat Sheet.md` theo các mẹo mới và mẹo đã đổi (lấy từ các mục 🎯 vừa sửa hoặc thêm). Mỗi nhóm thay đổi ghi một dòng vào `pages` của `updates.json`.
- [ ] **Bước 2:** `data/00 Home.md`:
  - số bài, số sơ đồ, số video và giờ theo bản mới;
  - bảng chương (thêm 22, 23; cột số bài);
  - dòng nói về Animals4life.

  Đếm số liệu từ output build. Ghi dòng vào `pages`.
- [ ] **Bước 3:** Điền `missing` trong `updates.json` nếu có video không tải được. Lúc lập kế hoạch: 376/376 đã `complete`, nên mong đợi là `[]`.
- [ ] **Bước 4: Kiểm tra toàn bộ.** Mong đợi: tất cả qua, `unmapped.txt` chỉ chứa video có lý do.
  ```bash
  cd web && npm test && npm run build \
    && node scripts/course-coverage.mjs /home/hairbui76/Videos/saa/SAA-C03-newest/manifest.json \
         --allow /home/hairbui76/Videos/saa/work/unmapped.txt \
    && node scripts/narration-todo.mjs --check \
    && git diff main --diff-filter=DR --name-only -- data
  ```
  Lệnh cuối mong đợi in ra rỗng.
- [ ] **Bước 5: Kiểm thủ công** trên `npm run preview`:
  - popup có đúng số bài và nhóm theo chương;
  - các dòng trang tổng hợp có trong popup;
  - mở ngẫu nhiên 3 bài updated (khung, cuộn, ❗ heading), 2 bài new (sơ đồ động có tiếng, quiz 5 câu), 1 bài removed;
  - chương 22 và 23 hiện ở trang chủ;
  - luyện đề, export/import vẫn chạy;
  - giao diện sáng/tối.
- [ ] **Bước 6:** Commit `content: hoàn tất đợt cập nhật 2026-11-10`.
- [ ] **Bước 7: Báo chủ repo** (không push `main`):
  - số bài mới, cập nhật và removed;
  - danh sách `unmapped`;
  - video whisper thất bại;
  - lỗi có sẵn phát hiện ở Task 6.

  Hỏi chủ repo có muốn push nhánh để xem trước hay merge vào `main` không.
