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
  artist?: string; // Tác Giả / Ca Sĩ
  key: string;
  rhythm?: string; // Điệu nhạc
  content: string;
}

// 3 Bài hát mẫu chuẩn Hợp Âm Việt
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

  // State Tìm Kiếm Bài Hát & Modal Danh Sách
  const [searchQuery, setSearchQuery] = useState('');
  const [showSongListModal, setShowSongListModal] = useState(false);
  const [showToneModal, setShowToneModal] = useState(false);

  // State Form Thêm / Chỉnh Sửa Bài Hát
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('C');
  const [rhythm, setRhythm] = useState('Ballad');
  const [content, setContent] = useState('');

  // 1. Tải danh sách bài hát từ SQLite
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

  // 2. Nạp 3 bài hát mẫu
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

  // 3. Mở form Thêm mới
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

  // 4. Mở form Chỉnh sửa
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

  // 5. Lưu bài hát (Thêm / Cập nhật)
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

  // 6. Xóa bài hát
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

  // 7. Chọn nhanh Tone nhạc
  const handleSelectTone = (targetKey: string) => {
    if (!selectedSong) return;
    const newStep = getStepBetweenKeys(selectedSong.key, targetKey);
    setStep(newStep);
    setShowToneModal(false);
  };

  // Lọc danh sách bài hát khi gõ từ khóa tìm kiếm
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
      {/* Top Navbar chuẩn Hợp Âm Việt */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          
          {/* Logo & Tên App */}
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-md">
              H∀V
            </div>
            <div>
              <h1 className="text-xl font-bold text-teal-700">
                Hợp Âm Việt Cá Nhân
              </h1>
              <p className="text-xs text-slate-400">
                Chạy trên OrbStack • Domain: <span className="font-mono text-slate-600">hopam.local</span>
              </p>
            </div>
          </div>

          {/* Ô Tìm Kiếm Bài Hát (Live Search) */}
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
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Kết Quả Tìm Kiếm Tức Thì */}
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

          {/* Các Nút Menu Bên Phải */}
          <div className="flex items-center gap-2">
            {/* Nút Danh Sách Bài Hát */}
            <button
              onClick={() => setShowSongListModal(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-full transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <span>📂 Danh Sách Bài</span>
              <span className="bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {songs.length}
              </span>
            </button>

            {songs.length === 0 && (
              <button
                onClick={handleLoadSampleSongs}
                disabled={loadingSample}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-full shadow transition flex items-center gap-1 cursor-pointer"
              >
                {loadingSample ? "⏳ Đang tạo..." : "⚡ Tạo Mẫu"}
              </button>
            )}

            <button
              onClick={showForm ? () => setShowForm(false) : handleOpenAddForm}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full shadow transition flex items-center gap-1 cursor-pointer"
            >
              {showForm ? '✕ Đóng' : '+ Thêm Bài Hát'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* FORM: Thêm & Chỉnh Sửa Bài Hát */}
        {showForm && (
          <div className="mb-8 bg-white p-6 rounded-2xl border border-teal-200 shadow-xl relative animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h2 className="font-bold text-lg text-teal-700">
                {isEditing ? '✏️ Chỉnh Sửa Bài Hát' : '🎸 Thêm Bài Hát Vào Kho Hợp Âm'}
              </h2>
              <span className="text-xs bg-teal-50 text-teal-600 px-2.5 py-1 rounded-full font-medium">
                Cú pháp: [C]Lời hát... [G]Lời hát...
              </span>
            </div>
            <form onSubmit={handleSaveSong} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TÊN BÀI HÁT *</label>
                  <input
                    type="text"
                    placeholder="VD: Nhỏ Ơi..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TÁC GIẢ</label>
                  <input
                    type="text"
                    placeholder="VD: Trịnh Công Sơn..."
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ĐIỆU NHẠC</label>
                  <input
                    type="text"
                    placeholder="VD: Ballad, Slow Rock..."
                    value={rhythm}
                    onChange={(e) => setRhythm(e.target.value)}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TONE GỐC</label>
                  <input
                    type="text"
                    placeholder="VD: C, Am..."
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-bold text-red-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">LỜI BÀI HÁT KÈM HỢP ÂM *</label>
                <textarea
                  placeholder="Lần đầu ta gặp [C]nhỏ, trong nắng chiều bay [Em]bay..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm leading-relaxed"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition cursor-pointer"
                >
                  {isEditing ? '✔ Lưu Cập Nhật' : '✔ Lưu Vào Database'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* BỐ CỤC 2 CỘT HIỆN ĐẠI: [Khung Trung Tâm: 8 Col] | [Tiện Ích Bên Phải: 4 Col] */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CỘT CHÍNH (8/12): Banner + Hợp Âm Inline (Được mở rộng rãi giống ảnh mẫu) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedSong ? (
              <>
                {/* 1. BANNER BÀI HÁT - Màu Xanh Teal sang trọng giống ảnh */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl p-6 md:p-8 shadow-md">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                        {selectedSong.title}
                      </h2>

                      {/* Các Nhãn Thông Tin (Tags) giống trong ảnh */}
                      <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-semibold">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                          ♫ Sáng tác: <strong className="text-white">{selectedSong.artist || "Ẩn danh"}</strong>
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                          ♩ Điệu: <strong className="text-amber-300">{selectedSong.rhythm || "Ballad"}</strong>
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                          ⊙ Tone Gốc: <strong className="text-white">{selectedSong.key}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Nút Sửa & Xóa trên Banner */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditForm(selectedSong)}
                        title="Chỉnh sửa bài hát"
                        className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteSong(selectedSong.id)}
                        title="Xóa bài hát"
                        className="bg-red-500/30 hover:bg-red-500/40 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. TOOLBAR HỢP ÂM CỰC CHUẨN (Thanh công cụ ngay dưới Banner) */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase ml-1">Tone Nhạc:</span>
                    
                    {/* Nút mở Modal Chọn Tone Nhạc */}
                    <button
                      onClick={() => setShowToneModal(true)}
                      className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>[{currentDisplayKey}]</span>
                      <span className="text-[10px]">▼</span>
                    </button>

                    {/* Nút Giảm / Tăng 1 Tone */}
                    <button
                      onClick={() => setStep(s => s - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer"
                      title="Hạ 1 Tone"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => setStep(s => s + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer"
                    >
                      +1
                    </button>
                  </div>

                  {/* Nút Reset về Tone Gốc */}
                  {step !== 0 && (
                    <button
                      onClick={() => setStep(0)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-teal-700 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      ↩ Về Tone Gốc ({selectedSong.key})
                    </button>
                  )}
                </div>

                {/* 3. KHUNG HIỂN THỊ LỜI & HỢP ÂM INLINE [Am] TRẮNG SÁNG */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-10">
                  <div className="space-y-3.5 text-left">
                    {selectedSong.content.split('\n').map((line: string, lineIdx: number) => {
                      if (!line.trim()) {
                        return <div key={lineIdx} className="h-4" />;
                      }

                      const parsed: { chord?: string; text: string }[] = parseLyricLine(line);
                      return (
                        <div 
                          key={lineIdx} 
                          className="text-slate-800 text-lg md:text-xl leading-relaxed font-normal"
                        >
                          {parsed.map((item: { chord?: string; text: string }, idx: number) => {
                            const displayChord = item.chord
                              ? transposeChord(item.chord, step)
                              : null;
                            return (
                              <React.Fragment key={idx}>
                                {displayChord && (
                                  <span className="text-red-600 font-bold mr-1 inline-block select-none">
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

          {/* CỘT PHẢI (4/12): Khu Vực Tiện Ích Mở Rộng Giống Khung Bên Phải Trong Ảnh */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-20">
              <h3 className="font-bold text-slate-700 text-base mb-3 flex items-center gap-2 border-b pb-3">
                <span className="text-teal-600">●</span>
                <span>Khu Vực Tiện Ích Mở Rộng</span>
              </h3>
              
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 my-4">
                <span className="text-3xl block mb-2">📻</span>
                <p className="font-bold text-xs text-slate-600 mb-1">
                  Sẵn sàng cho tính năng tương lai
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  (Vị trí chuẩn để bạn thêm video bài hát, danh sách phát, máy đếm nhịp hoặc ghi chú cá nhân...)
                </p>
              </div>

              {/* Box gợi ý nhanh */}
              <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-700">💡 Mẹo sử dụng:</div>
                <div>• Gõ từ khóa vào <b>ô tìm kiếm</b> để lọc nhanh bài hát.</div>
                <div>• Bấm nút <b>[{currentDisplayKey || 'C'}]</b> để chuyển tone trực tiếp cho cả câu hát.</div>
              </div>
            </div>
          </div>

        </div>

        {/* MODAL / POPUP: Danh Sách Toàn Bộ Bài Hát (Khi bấm nút "Danh Sách Bài") */}
        {showSongListModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📂</span>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Kho Bài Hát Cá Nhân</h3>
                    <p className="text-xs text-slate-400">
                      Tổng số: <strong className="text-teal-600">{songs.length}</strong> bài hát trong Database
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSongListModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body - Danh sách bài hát */}
              <div className="p-4 overflow-y-auto flex-1">
                {songs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="mb-3">Chưa có bài hát nào trong kho của bạn.</p>
                    <button
                      onClick={() => {
                        setShowSongListModal(false);
                        handleLoadSampleSongs();
                      }}
                      className="px-4 py-2 bg-amber-500 text-white font-bold rounded-full text-xs"
                    >
                      ⚡ Tạo 3 Bài Hát Mẫu
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {songs.map(song => {
                      const isSelected = selectedSong?.id === song.id;
                      return (
                        <button
                          key={song.id}
                          onClick={() => {
                            setSelectedSong(song);
                            setStep(0);
                            setShowSongListModal(false);
                          }}
                          className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50 border-teal-400 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="pr-2">
                            <div className={`font-bold text-sm ${isSelected ? 'text-teal-700' : 'text-slate-800'}`}>
                              {song.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {song.artist || "Ẩn danh"} • {song.rhythm || "Ballad"}
                            </div>
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                            {song.key}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setShowSongListModal(false)}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-full transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL / POPUP: Chọn Nhanh Tone Nhạc */}
        {showToneModal && selectedSong && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold">⊙</span>
                  <h3 className="font-bold text-slate-800 text-lg">Chọn Nhanh Tone Nhạc</h3>
                </div>
                <button
                  onClick={() => setShowToneModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Chọn tone mới để tự động dịch toàn bộ hợp âm trong bài:
              </p>

              <div className="grid grid-cols-4 gap-2 mb-6">
                {getToneList(selectedSong.key).map((toneName) => {
                  const isCurrent = toneName === currentDisplayKey;
                  return (
                    <button
                      key={toneName}
                      onClick={() => handleSelectTone(toneName)}
                      className={`py-2.5 px-2 rounded-xl font-bold text-sm border transition cursor-pointer text-center ${
                        isCurrent
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600'
                      }`}
                    >
                      {toneName}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setStep(0);
                  setShowToneModal(false);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                ↩ Đặt về Tone Gốc ({selectedSong.key})
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}