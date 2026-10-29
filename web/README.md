# SAA-C03 Sketchbook

Web học ôn thi AWS SAA-C03, dựng từ các note trong `../data`.

```bash
npm install
npm run dev      # dựng lại public/content từ ../data rồi chạy http://localhost:5173
npm run build    # bản tĩnh trong dist/ (deploy lên host tĩnh nào cũng được)
```

- `scripts/build-content.mjs`: đọc `../data` (note, MOC, sơ đồ Excalidraw) và `quizzes/*.json`, ghi JSON vào `public/content/`. Sửa note thì chạy lại `npm run dev` hoặc `npm run content`.
- `quizzes/<chương>.json`: câu hỏi cuối bài. Key là tên file note (không có `.md`).
- `src/lib/diagram.ts`: chuyển sơ đồ Excalidraw thành animation từng bước (zone → mũi tên ①②③ hoặc theo độ sâu đồ thị → hàng của bảng → ghi chú ⚠).
- Thuyết minh giọng AI cho video sơ đồ (chạy trên máy rồi commit kết quả, CI không chạy):
  1. `npm run content` rồi `node scripts/gen-narration.mjs`: Claude Opus 5.5 (Batch API, cần `ANTHROPIC_API_KEY`) viết lời thuyết minh cho từng bước, lưu vào `narration/<bài>.json`. Chỉ những sơ đồ chưa có hoặc đã đổi thứ tự bước mới được viết lại.
  2. `python scripts/tts.py` (cần `pip install edge-tts`): đọc thành mp3 bằng giọng `vi-VN-HoaiMyNeural`, lưu vào `public/audio/`. Câu nào đã có file rồi thì bỏ qua.
- Hỏi Claude: người học tự nhập Anthropic API key; key chỉ lưu trong localStorage và gọi thẳng `api.anthropic.com` từ trình duyệt.
- Tiến độ học lưu trong localStorage, export/import file JSON trong Cài đặt.
- Video bài giảng gốc (`../videos`) chỉ phát khi chạy `npm run dev` hoặc `npm run preview` trên máy, không nằm trong bản build.
- `public/CNAME` = `saa.hairbui76.id.vn` (dùng cho GitHub Pages; host khác thì bỏ qua).
