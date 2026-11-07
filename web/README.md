# SAA-C03 Sketchbook

Web học ôn thi AWS SAA-C03, dựng từ các note trong `../data`.

```bash
npm install
npm run dev      # dựng lại public/content từ ../data rồi chạy http://localhost:5173
npm run build    # bản tĩnh trong dist/ (deploy lên host tĩnh nào cũng được)
```

- `scripts/build-content.mjs`: đọc `../data` (note, MOC, sơ đồ Excalidraw) và `quizzes/*.json`, ghi JSON vào `public/content/`. Sửa note thì chạy lại `npm run dev` hoặc `npm run content`.
- `quizzes/<chương>.json`: câu hỏi cuối bài. Key là tên file note (không có `.md`).
- Luyện đề thi thử: đề gốc nằm ở `../data/99 Banks/<đề>.json` (tiếng Anh, đáp án dạng chữ cái). `practice/<đề>.json` gắn từng câu (`no`) vào 1–3 bài (`lessons`, bài chính đứng đầu), kèm giải thích tiếng Việt (`explain`) và `doubt` khi đáp án trong bộ đề có thể sai. Thêm đề mới thì thêm cả file mapping cùng tên; đề chưa có mapping sẽ bị bỏ qua khi build. Các câu này được nối vào sau quiz của bài trong phần "Kiểm tra cuối bài" (giữ tiếng Anh, có nhãn "Đề X · câu Y").
- `src/lib/diagram.ts`: chuyển sơ đồ Excalidraw thành animation từng bước (zone → mũi tên ①②③ hoặc theo độ sâu đồ thị → hàng của bảng → ghi chú ⚠).
- Thuyết minh giọng AI cho video sơ đồ (chạy trên máy rồi commit kết quả, CI không chạy):
  1. `npm run content` rồi `node scripts/gen-narration.mjs`: Claude Opus 5.5 (Batch API, cần `ANTHROPIC_API_KEY`) viết lời thuyết minh cho từng bước, lưu vào `narration/<bài>.json`. Chỉ những sơ đồ chưa có hoặc đã đổi thứ tự bước mới được viết lại.
  2. `python scripts/tts.py` (cần `pip install edge-tts`): đọc thành mp3 bằng giọng `vi-VN-HoaiMyNeural`, lưu vào `public/audio/`. Câu nào đã có file rồi thì bỏ qua.
- Hỏi Claude: người học tự nhập Anthropic API key; key chỉ lưu trong localStorage và gọi thẳng `api.anthropic.com` từ trình duyệt. Hội thoại lưu theo từng bài trong localStorage (tối đa 40 tin nhắn gần nhất mỗi bài, 60 bài gần nhất), có trong file export; mỗi câu trả lời có nút "Lưu vào ghi chú".
- Tiến độ học lưu trong localStorage, export/import file JSON trong Cài đặt (file export gồm cả ghi chú và lộ trình).
- Ghi chú: mỗi bài có ô "Ghi chú của tôi" (Markdown, tự lưu); trang `#/notes` gom tất cả và tải về `.md`.
- Highlight: bôi đen chữ trong bài để tô màu (4 màu), ghi chú riêng cho đoạn đó hoặc trích vào ghi chú bài. Đoạn tô lưu dạng trích dẫn + ngữ cảnh rồi tìm lại khi mở bài, vẽ bằng CSS Custom Highlight API nên không sửa DOM của React (`src/lib/anchor.ts`, `src/components/LessonMarks.tsx`).
- Vẽ trên sơ đồ: nút "Vẽ" ở tab Hình tĩnh (bút 4 màu, bút dạ quang, tẩy, hoàn tác). Nét vẽ lưu theo tọa độ của sơ đồ nên đúng chỗ khi zoom, đổi cỡ màn hình, toàn màn hình (`src/components/DiagramInk.tsx`). Ghi chú, highlight và nét vẽ đều nằm trong file export tiến độ.
- Lộ trình: trang `#/roadmap` cho tải file mẫu JSON (sinh từ danh sách chương/bài hiện tại, xem `src/lib/roadmap.ts`), sửa rồi tải lên để theo dõi hạn từng giai đoạn.
- Video bài giảng gốc (`../videos`) chỉ phát khi chạy `npm run dev` hoặc `npm run preview` trên máy, không nằm trong bản build.
- `public/CNAME` = `saa.hairbui76.id.vn` (dùng cho GitHub Pages; host khác thì bỏ qua).
