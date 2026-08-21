// Bảng 12 nốt cơ bản dùng dấu Thăng (#)
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// Bảng 12 nốt cơ bản dùng dấu Giáng (b)
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Quy đổi chéo để máy tính hiểu 2 nốt là 1
const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
};

// 12 Tone chuẩn cho Trưởng và Thứ (Sắp xếp khớp với hệ thống âm giai)
const STANDARD_MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const STANDARD_MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

// Danh sách các Tone ĐÍCH bắt buộc phải dùng hệ dấu Giáng (b) theo nhạc lý
const FLAT_KEYS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];

function normalizeToSharp(note: string): string {
  return FLAT_TO_SHARP[note] || note;
}

// 1. Hàm tìm ra Tone đích (Target Key) khi người dùng bấm + / -
export function getTargetKey(originalKey: string, steps: number): string {
  if (steps === 0) return originalKey;
  
  const isMinor = originalKey.trim().endsWith('m') && !originalKey.trim().endsWith('dim');
  const rootOnly = originalKey.replace(/m$/, '');
  
  const normRoot = normalizeToSharp(rootOnly);
  const currentIndex = SHARP_NOTES.indexOf(normRoot);
  if (currentIndex === -1) return originalKey;
  
  const newIndex = (currentIndex + steps + 120) % 12;
  const keysArray = isMinor ? STANDARD_MINOR_KEYS : STANDARD_MAJOR_KEYS;
  
  return keysArray[newIndex];
}

// 2. Hàm nâng/hạ tone ĐÃ ĐƯỢC LÀM THÔNG MINH (Tùy biến b hay # theo Tone đích)
export function transposeChord(chord: string, steps: number, targetKey: string): string {
  // Giữ nguyên 100% cách viết của tác giả nếu không dịch Tone
  if (steps === 0) return chord;

  const rootMatch = chord.match(/^[A-G](b|#)?/);
  if (!rootMatch) return chord;

  const root = normalizeToSharp(rootMatch[0]);
  const suffix = chord.slice(rootMatch[0].length);
  const currentIndex = SHARP_NOTES.indexOf(root);
  if (currentIndex === -1) return chord;

  const newIndex = (currentIndex + steps + 120) % 12;
  
  // KIỂM TRA NHẠC LÝ: Nếu Tone đích thuộc hệ Giáng -> Dùng mảng b. Nếu không -> Dùng mảng #
  const useFlats = FLAT_KEYS.includes(targetKey);
  const newRoot = useFlats ? FLAT_NOTES[newIndex] : SHARP_NOTES[newIndex];
  
  return newRoot + suffix;
}

// 3. Tách hợp âm và lời bài hát
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

// 4. Tạo danh sách 12 Tone để hiển thị trong Modal chọn Tone
export function getToneList(originalKey: string): string[] {
  const isMinor = originalKey.trim().endsWith('m') && !originalKey.trim().endsWith('dim');
  return isMinor ? STANDARD_MINOR_KEYS : STANDARD_MAJOR_KEYS;
}

// 5. Tính số bước dịch Tone khi người dùng bấm trực tiếp vào một Tone trong Modal
export function getStepBetweenKeys(originalKey: string, targetKey: string): number {
  const root1 = normalizeToSharp(originalKey.replace(/m$/, ''));
  const root2 = normalizeToSharp(targetKey.replace(/m$/, ''));
  
  const idx1 = SHARP_NOTES.indexOf(root1);
  const idx2 = SHARP_NOTES.indexOf(root2);
  if (idx1 === -1 || idx2 === -1) return 0;

  return (idx2 - idx1 + 12) % 12;
}
