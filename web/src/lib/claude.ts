import Anthropic from '@anthropic-ai/sdk';
import type { Lesson } from './content';
import type { Settings } from './store';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

const TUTOR = `Bạn là trợ giảng ôn thi AWS Certified Solutions Architect – Associate (SAA-C03) trong một web học tập.
Người học đang đọc một bài học; nội dung bài nằm trong thẻ <lesson>. Trả lời bằng tiếng Việt, giữ thuật ngữ và tên dịch vụ AWS bằng tiếng Anh.
- Ưu tiên kiến thức trong bài; khi cần kiến thức ngoài bài, nói rõ là ngoài bài.
- Khi bài ghi "khóa học nói X; hiện nay là Y", giải thích cả hai và nhắc rằng đề thi thường theo khóa học.
- Gắn câu trả lời với cách đề SAA-C03 hỏi: từ khóa trong đề, đáp án dễ nhầm và vì sao sai.
- Ngắn gọn, dùng gạch đầu dòng và bảng markdown khi giúp so sánh. Không lặp lại cả bài.`;

function lessonContext(lesson: Lesson) {
  const body = lesson.body.replace(/```diagram\n[^\n]*\n```/g, '');
  return `<lesson title="${lesson.title}" chapter="${lesson.chapterId} ${lesson.chapterTitle}">
TL;DR: ${lesson.tldr}

${body}
</lesson>`;
}

export class ChatError extends Error {}

/**
 * Streams a tutor answer. Calls api.anthropic.com directly from the browser with the
 * learner's own key (stored only in their localStorage).
 */
export async function streamAnswer(opts: {
  settings: Settings;
  lesson: Lesson;
  history: ChatMsg[];
  onText: (delta: string) => void;
  signal: AbortSignal;
}) {
  const { settings, lesson, history, onText, signal } = opts;
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
  // Haiku has no server-side refusal fallback; Opus/Sonnet route declines to Anthropic's recommended model.
  const fallback = settings.model !== 'claude-haiku-5-5';
  try {
    const stream = client.beta.messages.stream(
      {
        model: settings.model,
        max_tokens: 16000,
        output_config: { effort: settings.effort },
        ...(fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        system: [
          { type: 'text', text: TUTOR },
          // lesson text is identical across turns of the same lesson -> cache it
          { type: 'text', text: lessonContext(lesson), cache_control: { type: 'ephemeral' } },
        ],
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      },
      { signal }
    );
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') onText(event.delta.text);
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      throw new ChatError('Claude từ chối trả lời câu này. Thử diễn đạt lại câu hỏi nhé.');
    }
  } catch (e) {
    if (e instanceof ChatError) throw e;
    if (e instanceof Anthropic.APIUserAbortError) return;
    if (e instanceof Anthropic.AuthenticationError) throw new ChatError('API key không hợp lệ. Kiểm tra lại trong Cài đặt.');
    if (e instanceof Anthropic.PermissionDeniedError)
      throw new ChatError('API key không có quyền dùng model này. Thử đổi model trong Cài đặt.');
    if (e instanceof Anthropic.NotFoundError) throw new ChatError('Không tìm thấy model. Đổi model trong Cài đặt.');
    if (e instanceof Anthropic.RateLimitError) throw new ChatError('Đang bị giới hạn tốc độ (rate limit). Đợi một chút rồi hỏi lại.');
    if (e instanceof Anthropic.BadRequestError) throw new ChatError(`Yêu cầu không hợp lệ: ${e.message}`);
    if (e instanceof Anthropic.APIConnectionError) throw new ChatError('Không kết nối được tới Anthropic API. Kiểm tra mạng.');
    if (e instanceof Anthropic.APIError) throw new ChatError(`Lỗi API ${e.status ?? ''}: ${e.message}`);
    throw e;
  }
}
