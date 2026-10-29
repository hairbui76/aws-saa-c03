"""Render narration/*.json to mp3 voice-over clips in public/audio/ (run locally, results are committed).

    python scripts/tts.py

Each clip is named by a hash of voice + rate + text, so unchanged lines are never re-rendered
and build-content.mjs can find a clip from the text alone (same hash there).
"""
import asyncio
import hashlib
import json
import pathlib
import shutil
import sys

import edge_tts

VOICE = "vi-VN-HoaiMyNeural"
RATE = "+6%"

WEB = pathlib.Path(__file__).resolve().parent.parent
NARRATION = WEB / "narration"
AUDIO = WEB / "public" / "audio"
FFMPEG = shutil.which("ffmpeg")


def clip_name(text: str) -> str:
    return hashlib.sha1(f"{VOICE}|{RATE}|{text}".encode()).hexdigest()[:16] + ".mp3"


async def render(text: str, out: pathlib.Path, sem: asyncio.Semaphore) -> bool:
    async with sem:
        for attempt in range(4):
            try:
                tmp = out.with_suffix(".part")
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(tmp))
                if FFMPEG:  # speech is fine at 32 kbps mono; keeps the repo ~1/3 smaller
                    small = out.with_suffix(".small.mp3")
                    proc = await asyncio.create_subprocess_exec(
                        FFMPEG, "-v", "error", "-y", "-i", str(tmp), "-ac", "1", "-b:a", "32k", str(small)
                    )
                    if await proc.wait() == 0:
                        small.replace(tmp)
                tmp.replace(out)
                return True
            except Exception as e:  # network hiccups: back off and retry
                if attempt == 3:
                    print(f"! failed: {text[:60]}… ({e})", file=sys.stderr)
                    return False
                await asyncio.sleep(2 * (attempt + 1))
    return False


async def main() -> None:
    AUDIO.mkdir(parents=True, exist_ok=True)
    texts = set()
    for f in NARRATION.glob("*.json"):
        if f.name.startswith("."):
            continue
        for d in json.loads(f.read_text(encoding="utf-8")).values():
            texts.update(d["steps"])
    todo = [t for t in texts if not (AUDIO / clip_name(t)).exists()]
    print(f"tts: {len(texts)} lines, {len(todo)} to render with {VOICE} {RATE}")
    sem = asyncio.Semaphore(6)
    results = await asyncio.gather(*(render(t, AUDIO / clip_name(t), sem) for t in todo))
    print(f"tts: rendered {sum(results)}, failed {len(results) - sum(results)}")
    # drop clips whose line no longer exists (narration was rewritten)
    keep = {clip_name(t) for t in texts}
    stale = [f for f in AUDIO.glob("*.mp3") if f.name not in keep]
    for f in stale:
        f.unlink()
    if stale:
        print(f"tts: removed {len(stale)} unused clips")


if __name__ == "__main__":
    asyncio.run(main())
