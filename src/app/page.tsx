"use client";
import React, { useState, useEffect, useRef } from 'react';
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
  genre?: string;
  content: string;
  createdAt?: string;
}

// Hàm tính thời gian trôi qua
function timeAgo(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  return `${days} ngày`;
}

const GENRES = ["Tất cả", "Nhạc Trẻ", "Nhạc Trữ tình", "Nhạc Vàng", "Nhạc Ngoại lời Việt", "Nhạc Đỏ", "Thánh Ca", "Khác"];

const SAMPLE_SONGS = [
  {
    title: "Tình Chúa Cao Vời",
    artist: "Lm. Duy Thiên",
    key: "Am",
    rhythm: "Slow Ballad",
    genre: "Thánh Ca",
    content: `Tình yêu [Am]Chúa cao vời biết [C]bao làm sao [Em]biết đáp đền thế [Am]nào
Để cho cân xứng Chúa [C]ơi để [Em]cho cân xứng Chúa [Am]ơi
Ôi tình yêu thương Chúa cao [C]vời tình [Dm]yêu thương Chúa muôn [Am]đời
Người [C]yêu con từ ngàn [Am]xưa từ khi chưa có đồi [C]non
Từ khi chưa có trời [F]cao chưa có [G]vầng trăng với ngàn [C]sao
Gọi [Am]con giữa muôn muôn [Em]người tìm [G]con giữa nơi bùn [Am]nhơ`
  },
  {
    title: "Tuổi Hồng Thơ Ngây",
    artist: "Ẩn danh",
    key: "C",
    rhythm: "Ballad",
    genre: "Nhạc Trẻ",
    content: `[C]Tuổi hồng thơ ngây dưới [Em]mái trường
[F]Tuổi thơ đã đi qua rồi [G]để lại trong tôi một [C]nỗi buồn
[C]Ngày mai đi xa xa [Em]mái trường
[F]Bạn bè thân yêu ơi [G]xin hãy nhớ bao kỷ [C]niệm.`
  }
];

export default function Home() {
  // ==========================================
  // 1. TOÀN BỘ KHAI BÁO STATE (Sắp xếp lên trên cùng để tránh lỗi)
  // ==========================================
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // States Toolbar
  const [step, setStep] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  
  // States Giao diện & Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [showSongListModal, setShowSongListModal] = useState(false);
  const [showToneModal, setShowToneModal] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("Tất cả");

  // States Form
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('C');
  const [rhythm, setRhythm] = useState('Ballad');
  const [genre, setGenre] = useState('Khác');
  const [content, setContent] = useState('');

  // Tham chiếu (Ref) tới phần tử Form để cuộn trang
  const formRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // 2. TOÀN BỘ EFFECTS (Nằm bên dưới state)
  // ==========================================
  
  // Tự động tắt cuộn khi có sự thay đổi View
  useEffect(() => {
    if (showForm || showSongListModal || showToneModal || !selectedSong) {
      setIsScrolling(false);
    }
  }, [selectedSong, showForm, showSongListModal, showToneModal]);

  // Auto-scroll logic
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout;
    if (isScrolling) {
      const speedDelay = 40 / scrollSpeed; 
      scrollInterval = setInterval(() => {
        window.scrollBy(0, 1);
      }, speedDelay);
    }
    return () => clearInterval(scrollInterval);
  }, [isScrolling, scrollSpeed]);

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/songs');
      if (!res.ok) return;
      const data: Song[] = await res.json();
      setSongs(data);

      if (selectedSong) {
        const updatedSelected = data.find(s => s.id === selectedSong.id);
        if (updatedSelected) setSelectedSong(updatedSelected);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  // ==========================================
  // 3. TOÀN BỘ FUNCTIONS
  // ==========================================
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
    } catch (error) {
      alert("Lỗi nạp bài mẫu");
    } finally {
      setLoadingSample(false);
    }
  };

  const scrollToForm = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleOpenAddForm = () => {
    setIsScrolling(false);
    setIsEditing(false);
    setEditId(null);
    setTitle(''); setArtist(''); setKey('C'); setRhythm('Ballad'); setGenre('Nhạc Trẻ'); setContent('');
    setShowForm(true);
    scrollToForm();
  };

  const handleOpenEditForm = (song: Song) => {
    setIsScrolling(false);
    setIsEditing(true);
    setEditId(song.id);
    setTitle(song.title); setArtist(song.artist || ''); setKey(song.key); 
    setRhythm(song.rhythm || ''); setGenre(song.genre || 'Khác'); setContent(song.content);
    setShowForm(true);
    scrollToForm();
  };

  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return alert('Vui lòng nhập tên bài và nội dung!');
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const payload = isEditing 
        ? { id: editId, title, artist, key, rhythm, genre, content }
        : { title, artist, key, rhythm, genre, content };

      await fetch('/api/songs', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      setShowForm(false);
      await fetchSongs();
      
      if (!isEditing) setSelectedSong(null); 
    } catch (error) {
      alert("Lỗi lưu bài hát");
    }
  };

  const handleDeleteSong = async (songId: number) => {
    if (!window.confirm("🗑️ Chắc chắn muốn xóa bài hát này?")) return;
    try {
      await fetch(`/api/songs?id=${songId}`, { method: 'DELETE' });
      if (selectedSong?.id === songId) setSelectedSong(null);
      await fetchSongs();
    } catch (error) {
      alert("Lỗi xóa bài hát");
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
    return song.title.toLowerCase().includes(q) || (song.artist && song.artist.toLowerCase().includes(q));
  });

  const homeFilteredSongs = selectedGenre === "Tất cả" 
    ? songs 
    : songs.filter(s => s.genre === selectedGenre);

  const currentDisplayKey = selectedSong ? transposeChord(selectedSong.key, step) : '';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-16">
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          
          <button onClick={() => setSelectedSong(null)} className="flex items-center gap-3 cursor-pointer group text-left">
            <div className="bg-teal-600 group-hover:bg-teal-700 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-md transition">
              H∀V
            </div>
            <div>
              <h1 className="text-xl font-bold text-teal-700 group-hover:text-teal-800 transition">Hợp Âm Việt Cá Nhân</h1>
              <p className="text-xs text-slate-400">Trang Chủ Hợp Âm</p>
            </div>
          </button>

          <div className="relative flex-1 max-w-md mx-2">
            <div className="relative">
              <input type="text" placeholder="🔍 Tìm bài hát, ca sĩ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-4 pr-10 py-2 bg-slate-100 border border-slate-200 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">✕</button>
              )}
            </div>
            {searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-80 overflow-y-auto animate-fadeIn">
                {filteredSongs.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {filteredSongs.map(song => (
                      <li key={song.id}>
                        <button onClick={() => { setSelectedSong(song); setStep(0); setSearchQuery(''); }} className="w-full text-left p-3 hover:bg-teal-50 transition flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm text-slate-800">{song.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{song.artist}</div>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 bg-teal-100 text-teal-700 rounded-lg">{song.key}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">Không tìm thấy "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowSongListModal(true)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-full border cursor-pointer">
              📂 Kho Bài <span className="ml-1 bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full">{songs.length}</span>
            </button>
            <button onClick={showForm ? () => setShowForm(false) : handleOpenAddForm} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full shadow cursor-pointer">
              {showForm ? '✕ Đóng' : '+ Thêm Mới'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* FORM THÊM / SỬA */}
        {showForm && (
          <div ref={formRef} className="mb-8 bg-white p-6 rounded-2xl border border-teal-200 shadow-xl relative animate-fadeIn scroll-mt-24">
            <h2 className="font-bold text-lg text-teal-700 mb-4 pb-2 border-b">{isEditing ? '✏️ Sửa Bài Hát' : '🎸 Thêm Bài Hát'}</h2>
            <form onSubmit={handleSaveSong} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TÊN BÀI HÁT *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TÁC GIẢ</label>
                  <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ĐIỆU NHẠC</label>
                  <input type="text" value={rhythm} onChange={(e) => setRhythm(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">THỂ LOẠI</label>
                  <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none bg-white">
                    {GENRES.filter(g => g !== "Tất cả").map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TONE GỐC</label>
                  <input type="text" value={key} onChange={(e) => setKey(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none font-bold text-red-600" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">LỜI BÀI HÁT KÈM HỢP ÂM [C] *</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full p-3 border rounded-lg focus:ring-teal-500 outline-none font-mono text-sm" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 text-slate-600 bg-slate-100 rounded-lg cursor-pointer">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg cursor-pointer">{isEditing ? 'Lưu Cập Nhật' : 'Lưu Vào Kho'}</button>
              </div>
            </form>
          </div>
        )}

        {!selectedSong ? (
          <div className="space-y-8 animate-fadeIn">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-teal-600">⚡</span> Mới Cập Nhật
                </h2>
                {songs.length === 0 && (
                  <button onClick={handleLoadSampleSongs} disabled={loadingSample} className="px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                    {loadingSample ? "Đang nạp..." : "+ Tạo Dữ Liệu Mẫu"}
                  </button>
                )}
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                {songs.slice(0, 8).map((song, idx) => (
                  <div 
                    key={song.id} 
                    onClick={() => setSelectedSong(song)}
                    className="min-w-[280px] bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-teal-400 hover:shadow-md transition snap-start"
                  >
                    <div className="w-12 h-12 bg-teal-600 text-white rounded-xl flex items-center justify-center font-black text-lg">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{song.title}</h3>
                      <p className="text-xs text-slate-500 truncate">{song.artist || "Ẩn danh"}</p>
                    </div>
                    <div className="text-[10px] text-slate-400 whitespace-nowrap">
                      {timeAgo(song.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex flex-wrap gap-2 mb-6">
                {GENRES.map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGenre(g)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition border cursor-pointer ${
                      selectedGenre === g 
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50 hover:text-teal-700'
                    }`}
                  >
                    {g === "Nhạc Trẻ" ? "🔥" : g === "Nhạc Trữ tình" ? "💕" : g === "Nhạc Vàng" ? "📻" : "🎵"} {g}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {homeFilteredSongs.map(song => (
                  <div 
                    key={song.id} 
                    onClick={() => setSelectedSong(song)}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-teal-300 transition"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800">{song.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{song.artist || "Ẩn danh"} • {song.rhythm || "Ballad"}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md mb-1">{song.key}</span>
                      <span className="text-[10px] text-teal-600 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">{song.genre || 'Khác'}</span>
                    </div>
                  </div>
                ))}
                {homeFilteredSongs.length === 0 && (
                  <div className="col-span-full py-10 text-center text-slate-400">
                    Không có bài hát nào trong thể loại này.
                  </div>
                )}
              </div>
            </section>
          </div>

        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            <div className="lg:col-span-8 space-y-4">
              
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl p-6 md:p-8 shadow-md relative">
                <button onClick={() => {setSelectedSong(null); setStep(0);}} className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-md transition cursor-pointer">
                  ← Về Trang Chủ
                </button>
                
                <div className="mt-6 flex flex-wrap justify-between items-start gap-4">
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
                        🏷 Thể loại: <strong className="text-white">{selectedSong.genre || "Khác"}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:mt-0">
                    <button onClick={() => handleOpenEditForm(selectedSong)} className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer">✏️ Sửa</button>
                    <button onClick={() => handleDeleteSong(selectedSong.id)} className="bg-red-500/30 hover:bg-red-500/40 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer">🗑️ Xóa</button>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase mx-2 hidden sm:block">Tone:</span>
                  <button onClick={() => setStep(s => s - 1)} className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm font-extrabold text-slate-600 hover:bg-slate-100 cursor-pointer">-1</button>
                  <button onClick={() => setShowToneModal(true)} className="mx-1.5 px-4 h-9 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer">
                    <span>[{currentDisplayKey}]</span><span className="text-[10px]">▼</span>
                  </button>
                  <button onClick={() => setStep(s => s + 1)} className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm font-extrabold text-slate-600 hover:bg-slate-100 cursor-pointer">+1</button>
                  {step !== 0 && <button onClick={() => setStep(0)} className="text-xs text-teal-600 font-bold px-3 hover:bg-teal-50 h-9 rounded-md ml-1 cursor-pointer">Gốc</button>}
                </div>

                <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase mx-2 hidden sm:block">Font:</span>
                  <button onClick={() => setFontSize(f => Math.max(12, f - 2))} className="w-9 h-9 bg-white border border-slate-200 rounded-md font-bold text-slate-600 cursor-pointer">A-</button>
                  <span className="w-8 text-center text-xs font-bold text-teal-600">{fontSize}</span>
                  <button onClick={() => setFontSize(f => Math.min(36, f + 2))} className="w-9 h-9 bg-white border border-slate-200 rounded-md font-bold text-slate-600 cursor-pointer">A+</button>
                </div>

                <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase mx-2 hidden sm:block">Cuộn:</span>
                  <button onClick={() => setIsScrolling(!isScrolling)} className={`px-3 h-9 rounded-md border shadow-sm font-bold text-xs flex items-center gap-1.5 cursor-pointer ${isScrolling ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-700 border-slate-200'}`}>
                    {isScrolling ? '⏸ Dừng' : '▶ Chạy'}
                  </button>
                  {isScrolling && (
                    <div className="flex items-center gap-1 ml-1.5">
                      {[0.5, 1, 2, 3].map(speed => (
                        <button key={speed} onClick={() => setScrollSpeed(speed)} className={`w-8 h-9 text-xs font-bold rounded-md cursor-pointer ${scrollSpeed === speed ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-10">
                <div className="text-left">
                  {selectedSong.content.split('\n').map((line: string, lineIdx: number) => {
                    if (!line.trim()) {
                      return <div key={lineIdx} className="h-2" />;
                    }

                    const parsed: { chord?: string; text: string }[] = parseLyricLine(line);
                    return (
                      <div 
                        key={lineIdx} 
                        className="text-slate-800 font-normal transition-all duration-200 mb-1" 
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
                      >
                        {parsed.map((item: { chord?: string; text: string }, idx: number) => {
                          const displayChord = item.chord ? transposeChord(item.chord, step) : null;
                          return (
                            <React.Fragment key={idx}>
                              {displayChord && (
                                <span className="text-red-600 font-bold mr-1.5 inline-block select-none" style={{ fontSize: `${fontSize * 0.9}px` }}>
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
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-20">
                <h3 className="font-bold text-slate-700 text-base mb-3 flex items-center gap-2 border-b pb-3">
                  <span className="text-teal-600">●</span> Tiện Ích Mở Rộng
                </h3>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 my-4">
                  <span className="text-3xl block mb-2">📻</span>
                  <p className="font-bold text-xs text-slate-600 mb-1">Tính năng tương lai</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">(Youtube, Metronome, Danh sách chờ...)</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {showSongListModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-extrabold text-slate-800 text-lg">📂 Kho Bài Hát Cá Nhân ({songs.length})</h3>
                <button onClick={() => setShowSongListModal(false)} className="w-8 h-8 rounded-full bg-slate-200 font-bold cursor-pointer">✕</button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                {songs.map(song => (
                  <button key={song.id} onClick={() => { setSelectedSong(song); setStep(0); setShowSongListModal(false); }} className="p-3.5 rounded-xl border text-left flex items-center justify-between hover:bg-teal-50 cursor-pointer">
                    <div>
                      <div className="font-bold text-sm text-slate-800">{song.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{song.artist} • {song.genre}</div>
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-1 bg-slate-100 rounded-lg">{song.key}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showToneModal && selectedSong && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-4 pb-3 border-b">
                <h3 className="font-bold text-slate-800 text-lg">Chọn Nhanh Tone</h3>
                <button onClick={() => setShowToneModal(false)} className="text-slate-400 font-bold cursor-pointer">✕</button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-6">
                {getToneList(selectedSong.key).map((toneName) => (
                  <button key={toneName} onClick={() => handleSelectTone(toneName)} className={`py-2.5 px-2 rounded-xl font-bold text-sm border cursor-pointer ${toneName === currentDisplayKey ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-700'}`}>{toneName}</button>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}