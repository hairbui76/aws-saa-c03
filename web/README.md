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
- Hỏi Claude: người học tự nhập Anthropic API key; key chỉ lưu trong localStorage và gọi thẳng `api.anthropic.com` từ trình duyệt.
- Tiến độ học lưu trong localStorage, export/import file JSON trong Cài đặt.
- Video bài giảng gốc (`../videos`) chỉ phát khi chạy `npm run dev` hoặc `npm run preview` trên máy, không nằm trong bản build.
- `public/CNAME` = `saa.hairbui76.id.vn` (dùng cho GitHub Pages; host khác thì bỏ qua).
