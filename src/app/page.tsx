"use client";
import React, { useState, useEffect } from 'react';
import { 
  transposeChord, 
  parseLyricLine, 
  getToneList, 
  getStepBetweenKeys 
} from '@/lib/chord';

interface Song {
  id: number;
  title: string;
  artist?: string;
  key: string;
  rhythm?: string;
  content: string;
}

// 3 Bài hát mẫu chuẩn
const SAMPLE_SONGS = [
  {
    title: "Tuổi Hồng Thơ Ngây",
    artist: "Ẩn danh",
    key: "C",
    rhythm: "Ballad",
    content: `[C]Tuổi hồng thơ ngây dưới [Em]mái trường
[F]Tuổi thơ đã đi qua rồi [G]để lại trong tôi một [C]nỗi buồn
[C]Ngày mai đi xa xa [Em]mái trường
[F]Bạn bè thân yêu ơi [G]xin hãy nhớ bao kỷ [C]niệm.`
  },
  {
    title: "Diễm Xưa",
    artist: "Trịnh Công Sơn",
    key: "Am",
    rhythm: "Slow Rock",
    content: `Mưa vẫn mưa [Am]bay trên tầng tháp [C]cổ
Dài tay em [Dm]mấy thuở mắt xanh [Am]xao
Nghe lá thu [Dm]mưa reo mòn gót [E7]nhỏ
Đường dài hun [Dm]hút cho mắt thêm [E7]sâu.

Mưa vẫn hay [Am]mưa trên hàng lá [C]nhỏ
Buổi chiều ngồi [Dm]ngóng những chuyến mưa [Am]qua
Trên bước chân [Dm]em âm thầm lá [E7]đổ
Chợt hồn xanh [E7]buốt cho mình xót [Am]xa.`
  },
  {
    title: "Nhỏ Ơi",
    artist: "Chí Tài",
    key: "C",
    rhythm: "Slow Surf",
    content: `Lần đầu ta gặp [C]nhỏ, trong nắng chiều bay [Em]bay
Ngập ngừng ta hỏi [F]nhỏ, nhỏ bảo nhỏ không [C]tên
Ừ thì nhỏ không [Dm]tên, bây giờ thuở ấy [G7]đang xa
Lòng ta thấy buồn [C]hiu.`
  }
];

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [step, setStep] = useState(0);
  const [loadingSample, setLoadingSample] = useState(false);

  // --- STATE TÍNH NĂNG MỚI (Toolbar) ---
  const [fontSize, setFontSize] = useState(16); // Mặc định chữ nhỏ gọn 16px
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1); // Tốc độ cuộn (1x, 2x, 3x)
  
  // Logic Tự động cuộn trang (Auto-scroll)
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout;
    if (isScrolling) {
      // Tốc độ 1x = 40ms, 2x = 20ms, 3x = 13ms (số ms càng nhỏ cuộn càng nhanh)
      const speedDelay = 40 / scrollSpeed; 
      scrollInterval = setInterval(() => {
        window.scrollBy(0, 1);
      }, speedDelay);
    }
    return () => clearInterval(scrollInterval);
  }, [isScrolling, scrollSpeed]);
  // ------------------------------------

  const [searchQuery, setSearchQuery] = useState('');
  const [showSongListModal, setShowSongListModal] = useState(false);
  const [showToneModal, setShowToneModal] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('C');
  const [rhythm, setRhythm] = useState('Ballad');
  const [content, setContent] = useState('');

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/songs');
      if (!res.ok) throw new Error('Lỗi tải bài hát');
      const data: Song[] = await res.json();
      setSongs(data);

      if (selectedSong) {
        const updatedSelected = data.find(s => s.id === selectedSong.id);
        setSelectedSong(updatedSelected || (data.length > 0 ? data[0] : null));
      } else if (data.length > 0) {
        setSelectedSong(data[0]);
      }
    } catch (error: any) {
      console.error('Lỗi khi tải bài hát:', error);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const handleLoadSampleSongs = async () => {
    setLoadingSample(true);
    try {
      for (const song of SAMPLE_SONGS) {
        await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(song),
        });
      }
      await fetchSongs();
    } catch (error: any) {
      alert("❌ Lỗi khi nạp bài mẫu: " + error.message);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleOpenAddForm = () => {
    setIsEditing(false);
    setEditId(null);
    setTitle('');
    setArtist('');
    setKey('C');
    setRhythm('Ballad');
    setContent('');
    setShowForm(true);
  };

  const handleOpenEditForm = (song: Song) => {
    setIsEditing(true);
    setEditId(song.id);
    setTitle(song.title);
    setArtist(song.artist || '');
    setKey(song.key);
    setRhythm(song.rhythm || '');
    setContent(song.content);
    setShowForm(true);
  };

  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return alert('Vui lòng nhập tên bài và nội dung!');

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const payload = isEditing 
        ? { id: editId, title, artist, key, rhythm, content }
        : { title, artist, key, rhythm, content };

      const res = await fetch('/api/songs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Không thể lưu bài hát vào Database');

      setShowForm(false);
      await fetchSongs();
    } catch (error: any) {
      alert("❌ Lỗi: " + error.message);
    }
  };

  const handleDeleteSong = async (songId: number) => {
    if (!window.confirm("🗑️ Bạn có chắc chắn muốn xóa bài hát này khỏi Database?")) {
      return;
    }
    try {
      const res = await fetch(`/api/songs?id=${songId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa bài hát');

      if (selectedSong?.id === songId) {
        setSelectedSong(null);
      }
      await fetchSongs();
    } catch (error: any) {
      alert("❌ Lỗi xóa bài hát: " + error.message);
    }
  };

  const handleSelectTone = (targetKey: string) => {
    if (!selectedSong) return;
    const newStep = getStepBetweenKeys(selectedSong.key, targetKey);
    setStep(newStep);
    setShowToneModal(false);
  };

  const filteredSongs = songs.filter(song => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    return (
      song.title.toLowerCase().includes(q) ||
      (song.artist && song.artist.toLowerCase().includes(q))
    );
  });

  const currentDisplayKey = selectedSong 
    ? transposeChord(selectedSong.key, step) 
    : '';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-16">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-md">
              H∀V
            </div>
            <div>
              <h1 className="text-xl font-bold text-teal-700">Hợp Âm Việt Cá Nhân</h1>
              <p className="text-xs text-slate-400">
                Chạy trên OrbStack • Domain: <span className="font-mono text-slate-600">hopam.local</span>
              </p>
            </div>
          </div>

          <div className="relative flex-1 max-w-md mx-2">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Tìm bài hát, ca sĩ, nhạc sĩ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-100 border border-slate-200 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                >✕</button>
              )}
            </div>

            {searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-40 max-h-80 overflow-y-auto animate-fadeIn">
                {filteredSongs.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {filteredSongs.map(song => (
                      <li key={song.id}>
                        <button
                          onClick={() => {
                            setSelectedSong(song);
                            setStep(0);
                            setSearchQuery('');
                          }}
                          className="w-full text-left p-3 hover:bg-teal-50 transition flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-sm text-slate-800">{song.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {song.artist || "Ẩn danh"} • {song.rhythm || "Ballad"}
                            </div>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 bg-teal-100 text-teal-700 rounded-lg">
                            {song.key}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Không tìm thấy bài hát nào phù hợp với "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSongListModal(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-full transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <span>📂 Danh Sách Bài</span>
              <span className="bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">{songs.length}</span>
            </button>
            {songs.length === 0 && (
              <button
                onClick={handleLoadSampleSongs}
                disabled={loadingSample}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-full shadow transition cursor-pointer"
              >
                {loadingSample ? "⏳..." : "⚡ Tạo Mẫu"}
              </button>
            )}
            <button
              onClick={showForm ? () => setShowForm(false) : handleOpenAddForm}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full shadow transition cursor-pointer"
            >
              {showForm ? '✕ Đóng' : '+ Thêm Bài Hát'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* FORM: Thêm & Chỉnh Sửa */}
        {showForm && (
          <div className="mb-8 bg-white p-6 rounded-2xl border border-teal-200 shadow-xl relative animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h2 className="font-bold text-lg text-teal-700">
                {isEditing ? '✏️ Chỉnh Sửa Bài Hát' : '🎸 Thêm Bài Hát Vào Kho'}
              </h2>
            </div>
            <form onSubmit={handleSaveSong} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TÊN BÀI HÁT *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TÁC GIẢ</label>
                  <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ĐIỆU NHẠC</label>
                  <input type="text" value={rhythm} onChange={(e) => setRhythm(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TONE GỐC</label>
                  <input type="text" value={key} onChange={(e) => setKey(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-bold text-red-600" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">LỜI BÀI HÁT KÈM HỢP ÂM *</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm leading-relaxed" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition cursor-pointer">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition cursor-pointer">
                  {isEditing ? '✔ Lưu Cập Nhật' : '✔ Lưu Vào Database'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 space-y-4">
            {selectedSong ? (
              <>
                {/* 1. BANNER */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl p-6 md:p-8 shadow-md">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">{selectedSong.title}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-semibold">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                          ♫ Tác giả: <strong className="text-white">{selectedSong.artist || "Ẩn danh"}</strong>
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                          ♩ Điệu: <strong className="text-amber-300">{selectedSong.rhythm || "Ballad"}</strong>
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                          ⊙ Tone Gốc: <strong className="text-white">{selectedSong.key}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenEditForm(selectedSong)} className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer">✏️ Sửa</button>
                      <button onClick={() => handleDeleteSong(selectedSong.id)} className="bg-red-500/30 hover:bg-red-500/40 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer">🗑️ Xóa</button>
                    </div>
                  </div>
                </div>

                {/* 2. SIÊU TOOLBAR (Chỉnh Tone + Cỡ Chữ + Tự động cuộn) */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-center gap-4">
                  
                  {/* Nhóm 1: Chỉnh Tone (Nút -1 ở trái, Tone ở giữa, +1 ở phải) */}
                  <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase mx-2 hidden sm:block">Tone:</span>
                    <button 
                      onClick={() => setStep(s => s - 1)}
                      className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm font-extrabold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      -1
                    </button>
                    
                    <button
                      onClick={() => setShowToneModal(true)}
                      className="mx-1.5 px-4 h-9 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-md shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>[{currentDisplayKey}]</span>
                      <span className="text-[10px]">▼</span>
                    </button>

                    <button 
                      onClick={() => setStep(s => s + 1)}
                      className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm font-extrabold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      +1
                    </button>

                    {step !== 0 && (
                      <button onClick={() => setStep(0)} className="text-xs text-teal-600 font-bold px-3 hover:bg-teal-50 h-9 rounded-md transition ml-1 cursor-pointer">
                        Gốc
                      </button>
                    )}
                  </div>

                  {/* Nhóm 2: Chỉnh Cỡ Chữ (Font Size) */}
                  <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase mx-2 hidden sm:block">Font:</span>
                    <button 
                      onClick={() => setFontSize(f => Math.max(12, f - 2))}
                      className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      title="Thu nhỏ chữ"
                    >
                      A-
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-teal-600">{fontSize}</span>
                    <button 
                      onClick={() => setFontSize(f => Math.min(36, f + 2))}
                      className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      title="Phóng to chữ"
                    >
                      A+
                    </button>
                  </div>

                  {/* Nhóm 3: Tự Động Cuộn Trang */}
                  <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase mx-2 hidden sm:block">Cuộn:</span>
                    <button 
                      onClick={() => setIsScrolling(!isScrolling)}
                      className={`px-3 h-9 rounded-md border shadow-sm font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                        isScrolling 
                          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isScrolling ? '⏸ Dừng' : '▶ Chạy'}
                    </button>

                    {isScrolling && (
                      <div className="flex items-center gap-1 ml-1.5">
                        {[1, 2, 3].map(speed => (
                          <button
                            key={speed}
                            onClick={() => setScrollSpeed(speed)}
                            className={`w-7 h-9 text-xs font-bold rounded-md transition cursor-pointer ${
                              scrollSpeed === speed 
                                ? 'bg-teal-600 text-white shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                </div>

                {/* 3. KHUNG HIỂN THỊ LỜI & HỢP ÂM INLINE (Có thay đổi Size chữ) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-10">
                  <div className="space-y-4 text-left">
                    {selectedSong.content.split('\n').map((line: string, lineIdx: number) => {
                      if (!line.trim()) {
                        return <div key={lineIdx} className="h-4" />;
                      }

                      const parsed: { chord?: string; text: string }[] = parseLyricLine(line);
                      return (
                        <div 
                          key={lineIdx} 
                          className="text-slate-800 font-normal transition-all duration-200"
                          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                        >
                          {parsed.map((item: { chord?: string; text: string }, idx: number) => {
                            const displayChord = item.chord
                              ? transposeChord(item.chord, step)
                              : null;
                            return (
                              <React.Fragment key={idx}>
                                {displayChord && (
                                  <span 
                                    className="text-red-600 font-bold mr-1.5 inline-block select-none"
                                    style={{ fontSize: `${fontSize * 0.95}px` }} // Hợp âm luôn nhỏ hơn chữ 1 chút xíu
                                  >
                                    [{displayChord}]
                                  </span>
                                )}
                                <span>{item.text}</span>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
                <div className="text-5xl mb-4">🎸</div>
                <h3 className="font-bold text-xl text-slate-700">Chưa có bài hát nào được chọn</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Hãy bấm vào nút <span className="text-teal-600 font-bold">📂 Danh Sách Bài</span> ở trên menu hoặc gõ từ khóa vào ô tìm kiếm để chọn bài hát.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-20">
              <h3 className="font-bold text-slate-700 text-base mb-3 flex items-center gap-2 border-b pb-3">
                <span className="text-teal-600">●</span>
                <span>Khu Vực Tiện Ích Mở Rộng</span>
              </h3>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 my-4">
                <span className="text-3xl block mb-2">📻</span>
                <p className="font-bold text-xs text-slate-600 mb-1">Sẵn sàng cho tính năng tương lai</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">(Vị trí chuẩn để thêm video bài hát, danh sách phát...)</p>
              </div>
            </div>
          </div>

        </div>

        {/* MODAL DANH SÁCH BÀI HÁT */}
        {showSongListModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📂</span>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Kho Bài Hát Cá Nhân</h3>
                    <p className="text-xs text-slate-400">Tổng số: <strong className="text-teal-600">{songs.length}</strong> bài hát</p>
                  </div>
                </div>
                <button onClick={() => setShowSongListModal(false)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold transition cursor-pointer">✕</button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {songs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="mb-3">Chưa có bài hát nào trong kho.</p>
                    <button onClick={() => { setShowSongListModal(false); handleLoadSampleSongs(); }} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-full text-xs cursor-pointer">⚡ Tạo Mẫu</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {songs.map(song => {
                      const isSelected = selectedSong?.id === song.id;
                      return (
                        <button key={song.id} onClick={() => { setSelectedSong(song); setStep(0); setShowSongListModal(false); }} className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${isSelected ? 'bg-teal-50 border-teal-400 shadow-sm' : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50'}`}>
                          <div className="pr-2">
                            <div className={`font-bold text-sm ${isSelected ? 'text-teal-700' : 'text-slate-800'}`}>{song.title}</div>
                            <div className="text-xs text-slate-400 mt-1">{song.artist || "Ẩn danh"} • {song.rhythm || "Ballad"}</div>
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">{song.key}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL CHỌN TONE */}
        {showToneModal && selectedSong && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">⊙</span>
                  <h3 className="font-bold text-slate-800 text-lg">Chọn Nhanh Tone Nhạc</h3>
                </div>
                <button onClick={() => setShowToneModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-6">
                {getToneList(selectedSong.key).map((toneName) => {
                  const isCurrent = toneName === currentDisplayKey;
                  return (
                    <button key={toneName} onClick={() => handleSelectTone(toneName)} className={`py-2.5 px-2 rounded-xl font-bold text-sm border transition cursor-pointer text-center ${isCurrent ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600'}`}>{toneName}</button>
                  );
                })}
              </div>
              <button onClick={() => { setStep(0); setShowToneModal(false); }} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
                ↩ Đặt về Tone Gốc ({selectedSong.key})
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}