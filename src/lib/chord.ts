const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
};

function normalizeNote(note: string): string {
  return FLAT_TO_SHARP[note] || note;
}

// 1. Hàm nâng/hạ tone cho hợp âm (vd: transposeChord("Am", 2) => "Bm")
export function transposeChord(chord: string, steps: number): string {
  const rootMatch = chord.match(/^[A-G](b|#)?/);
  if (!rootMatch) return chord;

  const root = normalizeNote(rootMatch[0]);
  const suffix = chord.slice(rootMatch[0].length);
  const currentIndex = NOTES.indexOf(root);
  if (currentIndex === -1) return chord;

  const newIndex = (currentIndex + steps + 120) % 12;
  return NOTES[newIndex] + suffix;
}

// 2. Tách hợp âm và lời bài hát
export function parseLyricLine(line: string) {
  const parts = line.split(/(\[[^\]]+\])/);
  const result: { chord?: string; text: string }[] = [];
  let currentChord: string | undefined = undefined;

  for (const part of parts) {
    if (part.startsWith('[') && part.endsWith(']')) {
      currentChord = part.slice(1, -1);
    } else {
      result.push({ chord: currentChord, text: part });
      currentChord = undefined;
    }
  }
  return result;
}

// 3. Tạo danh sách 12 Tone (Trưởng hoặc Thứ) dựa trên Tone gốc của bài hát
export function getToneList(originalKey: string): string[] {
  const isMinor = originalKey.trim().endsWith('m') && !originalKey.trim().endsWith('dim');
  const suffix = isMinor ? 'm' : '';
  return NOTES.map(note => note + suffix);
}

// 4. Tính số bước dịch Tone giữa 2 Key (vd: từ 'Am' sang 'Cm' => +3 bước)
export function getStepBetweenKeys(originalKey: string, targetKey: string): number {
  const root1Match = originalKey.match(/^[A-G](b|#)?/);
  const root2Match = targetKey.match(/^[A-G](b|#)?/);
  if (!root1Match || !root2Match) return 0;

  const idx1 = NOTES.indexOf(normalizeNote(root1Match[0]));
  const idx2 = NOTES.indexOf(normalizeNote(root2Match[0]));
  if (idx1 === -1 || idx2 === -1) return 0;

  return (idx2 - idx1 + 12) % 12;
}