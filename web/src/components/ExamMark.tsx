import { Target } from 'lucide-react';

/** 🎯 + count: this lesson has questions from the practice tests (../data/99 Banks). */
export default function ExamMark({ n, main, label }: { n?: number; main?: number; label?: boolean }) {
  if (!n) return null;
  const title =
    `Có ${n} câu trong bộ đề luyện thi` + (main ? ` (${main} câu lấy bài này làm chủ đề chính)` : '') + ', nằm trong phần Kiểm tra cuối bài';
  return (
    <span className={`exam-mark ${main ? 'main' : ''}`} title={title} aria-label={title}>
      <Target size={label ? 15 : 12} strokeWidth={2.4} />
      {label ? `Có trong đề luyện thi · ${n} câu` : n}
    </span>
  );
}
