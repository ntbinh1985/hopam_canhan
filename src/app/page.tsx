"use client";
import React, { useState, useEffect, useRef } from 'react';
import { transposeChord, parseLyricLine, getToneList, getStepBetweenKeys, getTargetKey } from '@/lib/chord';

interface Song {
  id: number;
  title: string;
  artist?: string;
  key: string;
  rhythm?: string;
  genre?: string;
  notes?: string;
  youtubeLinks?: string;
  isFavorite?: boolean;
  content: string;
  createdAt?: string;
}

interface YoutubeVideo {
  url: string;
  title: string;
}

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

function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

const GENRES = ["Tất cả", "Thánh Ca", "Nhạc Vàng", "Nhạc Trẻ", "Nhạc Trữ tình", "Nhạc Ngoại lời Việt", "Khác"];

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // States Toolbar & Fullscreen
  const [step, setStep] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTwoColumns, setIsTwoColumns] = useState(false); // Chế độ 1 cột hay 2 cột
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSongListModal, setShowSongListModal] = useState(false);
  const [showToneModal, setShowToneModal] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("Tất cả");

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('C');
  const [rhythm, setRhythm] = useState('Ballad');
  const [genre, setGenre] = useState('Thánh Ca');
  const [notes, setNotes] = useState('');
  const [youtubeLinks, setYoutubeLinks] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [content, setContent] = useState('');

  // States Metronome & Youtube
  const [bpm, setBpm] = useState(100);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [beatIndicator, setBeatIndicator] = useState(false);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideo[]>([]);
  
  const formRef = useRef<HTMLDivElement>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Tự động tắt cuộn, thoát Fullscreen khi chuyển view
  useEffect(() => {
    if (showForm || showSongListModal || showToneModal || !selectedSong) {
      setIsScrolling(false);
      setIsFullscreen(false);
    }
    setActiveVideoIdx(0); 
  }, [selectedSong, showForm, showSongListModal, showToneModal]);

  // TỰ ĐỘNG TẢI TÊN VIDEO YOUTUBE BẰNG NOEMBED API
  useEffect(() => {
    if (selectedSong?.youtubeLinks) {
      const links = selectedSong.youtubeLinks.split('\n').filter(l => l.trim() !== '');
      Promise.all(links.map(async (url) => {
        try {
          const res = await fetch(`https://noembed.com/embed?url=${url}`);
          const data = await res.json();
          return { url, title: data.title || 'Video tham khảo' };
        } catch {
          return { url, title: 'Video tham khảo' };
        }
      })).then(data => setYoutubeVideos(data));
    } else {
      setYoutubeVideos([]);
    }
  }, [selectedSong]);

  // METRONOME LOGIC
  const playClick = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.frequency.value = 800; 
    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);

    setBeatIndicator(true);
    setTimeout(() => setBeatIndicator(false), 100);
  };

  useEffect(() => {
    if (isMetronomePlaying) {
      playClick(); 
      metronomeIntervalRef.current = setInterval(playClick, (60 / bpm) * 1000);
    } else {
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
    }
    return () => {
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
    };
  }, [isMetronomePlaying, bpm]);

  // AUTO-SCROLL LOGIC (Hỗ trợ cả chế độ thường và Fullscreen)
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout;
    if (isScrolling) {
      const speedDelay = 40 / scrollSpeed; 
      scrollInterval = setInterval(() => {
        if (isFullscreen && fullScreenRef.current) {
          fullScreenRef.current.scrollBy(0, 1);
        } else {
          window.scrollBy(0, 1);
        }
      }, speedDelay);
    }
    return () => clearInterval(scrollInterval);
  }, [isScrolling, scrollSpeed, isFullscreen]);

  // DATABASE FETCHING
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

  const scrollToForm = () => {
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleOpenAddForm = () => {
    setIsScrolling(false); setIsEditing(false); setEditId(null);
    setTitle(''); setArtist(''); setKey('C'); setRhythm('Ballad'); setGenre('Thánh Ca'); 
    setNotes(''); setYoutubeLinks(''); setIsFavorite(false); setContent('');
    setShowForm(true); scrollToForm();
  };

  const handleOpenEditForm = (song: Song) => {
    setIsScrolling(false); setIsEditing(true); setEditId(song.id);
    setTitle(song.title); setArtist(song.artist || ''); setKey(song.key); 
    setRhythm(song.rhythm || ''); setGenre(song.genre || 'Khác'); 
    setNotes(song.notes || ''); setYoutubeLinks(song.youtubeLinks || ''); 
    setIsFavorite(song.isFavorite || false); setContent(song.content);
    setShowForm(true); scrollToForm();
  };

  const handleSaveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return alert('Vui lòng nhập tên bài và nội dung!');
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const payload = isEditing 
        ? { id: editId, title, artist, key, rhythm, genre, notes, youtubeLinks, isFavorite, content }
        : { title, artist, key, rhythm, genre, notes, youtubeLinks, isFavorite, content };

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

  const handleToggleFavorite = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedStatus = !song.isFavorite;
      await fetch('/api/songs', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...song, isFavorite: updatedStatus })
      });
      await fetchSongs();
    } catch (error) {
      console.error(error);
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
    setStep(newStep); setShowToneModal(false);
  };

  const filteredSongs = songs.filter(song => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    return song.title.toLowerCase().includes(q) || (song.artist && song.artist.toLowerCase().includes(q));
  });

  const homeFilteredSongs = selectedGenre === "Tất cả" ? songs : songs.filter(s => s.genre === selectedGenre);
  const favoriteSongs = songs.filter(s => s.isFavorite);
  const currentDisplayKey = selectedSong ? getTargetKey(selectedSong.key, step) : '';

  // COMPONENT HIỂN THỊ LỜI BÀI HÁT (Dùng chung cho cả 2 màn hình)
  const renderLyrics = () => {
    if (!selectedSong) return null;
    return selectedSong.content.split('\n').map((line: string, lineIdx: number) => {
      if (!line.trim()) return <div key={lineIdx} className="h-2" />;

      const parsed: { chord?: string; text: string }[] = parseLyricLine(line);
      return (
        <div key={lineIdx} className="text-slate-800 font-normal transition-all duration-200 mb-1 break-inside-avoid" style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}>
          {parsed.map((item: { chord?: string; text: string }, idx: number) => {
            const displayChord = item.chord ? transposeChord(item.chord, step, currentDisplayKey) : null;
            return (
              <React.Fragment key={idx}>
                {displayChord && (
                  <span className="text-red-600 font-bold mr-1.5 inline-block select-none" style={{ fontSize: `${fontSize * 0.9}px` }}>[{displayChord}]</span>
                )}
                <span>{item.text}</span>
              </React.Fragment>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-16">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <button onClick={() => setSelectedSong(null)} className="flex items-center gap-3 cursor-pointer group text-left">
            <div className="bg-teal-600 group-hover:bg-teal-700 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-md transition">H∀V</div>
            <div>
              <h1 className="text-xl font-bold text-teal-700 group-hover:text-teal-800 transition">Hợp Âm Cá Nhân</h1>
              <p className="text-xs text-slate-400">Trang Chủ Hợp Âm</p>
            </div>
          </button>

          <div className="relative flex-1 max-w-md mx-2">
            <div className="relative">
              <input type="text" placeholder="🔍 Tìm bài hát, ca sĩ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-4 pr-10 py-2 bg-slate-100 border border-slate-200 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs cursor-pointer">✕</button>}
            </div>
            {searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-80 overflow-y-auto animate-fadeIn">
                {filteredSongs.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {filteredSongs.map(song => (
                      <li key={song.id}>
                        <button onClick={() => { setSelectedSong(song); setStep(0); setSearchQuery(''); }} className="w-full text-left p-3 hover:bg-teal-50 transition flex items-center justify-between cursor-pointer">
                          <div>
                            <div className="font-bold text-sm text-slate-800">{song.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{song.artist}</div>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 bg-teal-100 text-teal-700 rounded-lg">{song.key}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <div className="p-4 text-center text-xs text-slate-400">Không tìm thấy "{searchQuery}"</div>}
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TÊN BÀI HÁT *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none" required />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TÁC GIẢ</label>
                  <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ĐIỆU</label>
                  <input type="text" value={rhythm} onChange={(e) => setRhythm(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">THỂ LOẠI</label>
                  <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none bg-white">
                    {GENRES.filter(g => g !== "Tất cả").map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TONE</label>
                  <input type="text" value={key} onChange={(e) => setKey(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-teal-500 outline-none font-bold text-red-600 text-center" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">LỜI BÀI HÁT KÈM HỢP ÂM [C] *</label>
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} className="w-full p-3 border rounded-lg focus:ring-teal-500 outline-none font-mono text-sm leading-relaxed" required />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">GHI CHÚ / SOLO TAB (Không bắt buộc)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Nhập tab guitar, câu solo..." className="w-full p-3 border border-slate-200 rounded-lg focus:ring-teal-500 outline-none font-mono text-sm leading-relaxed bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">LINK YOUTUBE THAM KHẢO (Mỗi link 1 dòng)</label>
                    <textarea value={youtubeLinks} onChange={(e) => setYoutubeLinks(e.target.value)} rows={3} placeholder="https://youtube.com/watch?v=...\nhttps://youtu.be/..." className="w-full p-3 border border-slate-200 rounded-lg focus:ring-teal-500 outline-none text-sm leading-relaxed bg-slate-50" />
                  </div>
                  <label className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 cursor-pointer">
                    <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} className="w-5 h-5 text-amber-500 accent-amber-500 cursor-pointer" />
                    <span className="font-bold text-amber-700 text-sm">⭐ Đưa vào danh sách Yêu Thích</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 text-slate-600 bg-slate-100 rounded-lg cursor-pointer font-semibold">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg cursor-pointer hover:bg-teal-700 shadow-md">
                  {isEditing ? '✔ Lưu Cập Nhật' : '✔ Lưu Vào Kho'}
                </button>
              </div>
            </form>
          </div>
        )}

        {!selectedSong ? (
          
          /* TRANG CHỦ DASHBOARD */
          <div className="space-y-8 animate-fadeIn">
            {favoriteSongs.length > 0 && (
              <section className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-200 shadow-sm">
                <h2 className="text-xl font-extrabold text-amber-700 flex items-center gap-2 mb-4">
                  <span>⭐</span> Bài Hát Đang Tập / Yêu Thích
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                  {favoriteSongs.map((song) => (
                    <div key={song.id} onClick={() => setSelectedSong(song)} className="min-w-[260px] bg-white border border-amber-100 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition snap-start group">
                      <div>
                        <h3 className="font-bold text-slate-800 truncate pr-2 group-hover:text-amber-700 transition">{song.title}</h3>
                        <p className="text-xs text-slate-500 truncate">{song.artist || "Ẩn danh"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-md">{song.key}</span>
                        <button onClick={(e) => handleToggleFavorite(song, e)} className="text-amber-400 hover:text-amber-600 text-lg transition cursor-pointer">★</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4"><span className="text-teal-600">⚡</span> Mới Cập Nhật</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                {songs.slice(0, 8).map((song, idx) => (
                  <div key={song.id} onClick={() => setSelectedSong(song)} className="min-w-[280px] bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-teal-400 hover:shadow-md transition snap-start">
                    <div className="w-12 h-12 bg-slate-100 text-teal-700 rounded-xl flex items-center justify-center font-black text-lg border border-slate-200">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{song.title}</h3>
                      <p className="text-xs text-slate-500 truncate">{song.artist || "Ẩn danh"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button onClick={(e) => handleToggleFavorite(song, e)} className="text-lg transition cursor-pointer hover:scale-110">
                        {song.isFavorite ? '⭐' : <span className="text-slate-300">☆</span>}
                      </button>
                      <div className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(song.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex flex-wrap gap-2 mb-6">
                {GENRES.map(g => (
                  <button key={g} onClick={() => setSelectedGenre(g)} className={`px-4 py-2 rounded-full text-sm font-semibold transition border cursor-pointer ${selectedGenre === g ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50 hover:text-teal-700'}`}>
                    {g === "Thánh Ca" ? "✝️" : g === "Nhạc Trẻ" ? "🔥" : g === "Nhạc Trữ tình" ? "💕" : g === "Nhạc Vàng" ? "📻" : "🎵"} {g}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {homeFilteredSongs.map(song => (
                  <div key={song.id} onClick={() => setSelectedSong(song)} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-teal-300 transition">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate pr-2">{song.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 truncate">{song.artist || "Ẩn danh"} • {song.rhythm || "Ballad"}</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={(e) => handleToggleFavorite(song, e)} className="text-base cursor-pointer hover:scale-110 transition">
                          {song.isFavorite ? '⭐' : <span className="text-slate-300 hover:text-amber-400">☆</span>}
                        </button>
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">{song.key}</span>
                      </div>
                      <span className="text-[10px] text-teal-600 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">{song.genre || 'Khác'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

        ) : (
          
          /* CHI TIẾT BÀI HÁT (2 Cột cố định) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            
            {/* CỘT TRÁI (8/12): Lời bài hát & Toolbar */}
            <div className="lg:col-span-8 space-y-4">
              
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl p-6 md:p-8 shadow-md relative">
                <button onClick={() => {setSelectedSong(null); setStep(0); setIsMetronomePlaying(false); setIsFullscreen(false);}} className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-md transition cursor-pointer">
                  ← Về Trang Chủ
                </button>
                
                <div className="mt-6 flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                      {selectedSong.title}
                      <button onClick={(e) => handleToggleFavorite(selectedSong, e)} className="text-2xl hover:scale-110 transition cursor-pointer drop-shadow-md">
                        {selectedSong.isFavorite ? '⭐' : <span className="opacity-40 hover:opacity-100 text-white">☆</span>}
                      </button>
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-semibold">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-sm">♫ {selectedSong.artist || "Ẩn danh"}</span>
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-sm">♩ {selectedSong.rhythm || "Ballad"}</span>
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-sm">🏷 {selectedSong.genre || "Khác"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:mt-0">
                    <button onClick={() => handleOpenEditForm(selectedSong)} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-white/20 shadow-sm">✏️ Sửa</button>
                    <button onClick={() => handleDeleteSong(selectedSong.id)} className="bg-red-500/80 hover:bg-red-500 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-red-400 shadow-sm">🗑️ Xóa</button>
                  </div>
                </div>
              </div>

              {/* TOOLBAR */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button onClick={() => setStep(s => s - 1)} className="w-8 h-8 rounded-md bg-white border border-slate-200 font-extrabold text-slate-600 hover:bg-slate-100">-</button>
                  <button onClick={() => setShowToneModal(true)} className="mx-1.5 px-3 h-8 bg-teal-600 text-white font-extrabold text-xs rounded-md flex items-center gap-1">
                    <span>[{currentDisplayKey}]</span>▼
                  </button>
                  <button onClick={() => setStep(s => s + 1)} className="w-8 h-8 rounded-md bg-white border border-slate-200 font-extrabold text-slate-600 hover:bg-slate-100">+</button>
                </div>

                <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button onClick={() => setFontSize(f => Math.max(12, f - 2))} className="w-8 h-8 bg-white border border-slate-200 rounded-md font-bold text-slate-600">A-</button>
                  <button onClick={() => setFontSize(f => Math.min(36, f + 2))} className="w-8 h-8 bg-white border border-slate-200 rounded-md font-bold text-slate-600 ml-1">A+</button>
                </div>

                <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button onClick={() => setIsScrolling(!isScrolling)} className={`px-3 h-8 rounded-md border shadow-sm font-bold text-xs flex items-center gap-1.5 ${isScrolling ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-700 border-slate-200'}`}>
                    {isScrolling ? '⏸ Dừng' : '▶ Cuộn'}
                  </button>
                  {isScrolling && (
                    <div className="flex items-center gap-1 ml-1.5">
                      {[0.5, 1, 2, 3].map(speed => (
                        <button key={speed} onClick={() => setScrollSpeed(speed)} className={`w-6 h-8 text-xs font-bold rounded-md ${scrollSpeed === speed ? 'bg-teal-600 text-white' : 'text-slate-500'}`}>{speed}x</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* NÚT FULLSCREEN */}
                <button onClick={() => setIsFullscreen(true)} className="ml-auto px-4 h-10 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-2 transition cursor-pointer">
                  🔲 Toàn màn hình
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-10">
                {renderLyrics()}
              </div>
            </div>

            {/* CỘT PHẢI (4/12): CỐ ĐỊNH KHI CUỘN */}
            <div className="lg:col-span-4 self-start sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto space-y-6 pb-6 pr-2">
              
              {/* 1. GHI CHÚ / SOLO TAB */}
              <div className="bg-[#FFFDF5] rounded-2xl border border-amber-200 p-5 shadow-sm">
                <h3 className="font-extrabold text-amber-700 text-sm mb-3 flex items-center gap-2 border-b border-amber-200/50 pb-2">
                  <span>📝</span> GHI CHÚ / SOLO TAB
                </h3>
                {selectedSong.notes ? (
                  <div className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-slate-700 bg-white border border-amber-100 p-4 rounded-xl shadow-inner overflow-x-auto">
                    {selectedSong.notes}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-amber-600/70 mb-2 italic">Chưa có ghi chú.</p>
                    <button onClick={() => handleOpenEditForm(selectedSong)} className="px-4 py-1.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">+ Thêm</button>
                  </div>
                )}
              </div>

              {/* 2. YOUTUBE PLAYLIST */}
              {youtubeVideos.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="text-red-500 text-lg">▶️</span> VIDEO THAM KHẢO
                  </h3>
                  
                  {(() => {
                    const videoId = getYoutubeId(youtubeVideos[activeVideoIdx].url);
                    return videoId ? (
                      <div className="aspect-video w-full rounded-xl overflow-hidden mb-3 bg-black">
                        <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}`} title="YouTube video" frameBorder="0" allowFullScreen></iframe>
                      </div>
                    ) : (
                      <div className="aspect-video w-full rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 mb-3 border border-slate-200">Link lỗi</div>
                    );
                  })()}

                  {youtubeVideos.length > 1 && (
                    <div className="flex flex-col gap-2">
                      {youtubeVideos.map((vid, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setActiveVideoIdx(idx)}
                          className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer truncate w-full ${
                            activeVideoIdx === idx ? 'bg-red-50 text-red-600 border border-red-200 shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          🎵 {vid.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. METRONOME */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 shadow-lg text-white">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2"><span className="text-teal-400">⏱️</span> METRONOME</h3>
                  <div className={`w-3 h-3 rounded-full shadow-lg ${beatIndicator ? 'bg-teal-400 shadow-teal-400/50' : 'bg-slate-600'}`} />
                </div>
                
                <div className="text-center mb-5">
                  <div className="text-5xl font-black tracking-tighter mb-1">{bpm}</div>
                  <div className="text-[10px] uppercase font-bold text-teal-400 tracking-widest">Nhịp / Phút</div>
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <button onClick={() => setBpm(b => Math.max(40, b - 5))} className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 font-bold">-</button>
                  <input type="range" min="40" max="240" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="flex-1 h-2 bg-slate-600 rounded-lg accent-teal-500" />
                  <button onClick={() => setBpm(b => Math.min(240, b + 5))} className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 font-bold">+</button>
                </div>

                <button onClick={() => setIsMetronomePlaying(!isMetronomePlaying)} className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide uppercase transition shadow-lg ${isMetronomePlaying ? 'bg-red-500 shadow-red-500/20' : 'bg-teal-500 shadow-teal-500/20'}`}>
                  {isMetronomePlaying ? '■ Dừng Nhịp' : '▶ Bắt Đầu'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* OVERLAY: FULLSCREEN CHIA 2 CỘT */}
        {isFullscreen && selectedSong && (
          <div ref={fullScreenRef} className="fixed inset-0 bg-white z-[100] overflow-y-auto pb-20 animate-fadeIn">
            <div className="max-w-6xl mx-auto px-6 py-10">
              
              <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">{selectedSong.title}</h1>
                <p className="text-slate-500 mt-3 font-semibold text-sm">
                  {selectedSong.artist || "Ẩn danh"} • {selectedSong.rhythm || "Ballad"} • {selectedSong.genre || "Khác"}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 mb-10 bg-slate-50 py-3 px-6 rounded-full border border-slate-200 sticky top-4 z-50 shadow-sm w-max mx-auto">
                <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
                  <span className="text-xs font-bold text-slate-400 uppercase mr-1">Tone</span>
                  <button onClick={() => setStep(s => s - 1)} className="w-8 h-8 bg-white border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-100">-</button>
                  <button onClick={() => setShowToneModal(true)} className="px-3 h-8 bg-teal-600 text-white font-bold text-xs rounded shadow-sm">[{currentDisplayKey}] ▼</button>
                  <button onClick={() => setStep(s => s + 1)} className="w-8 h-8 bg-white border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-100">+</button>
                </div>

                <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
                  <span className="text-xs font-bold text-slate-400 uppercase mr-1">Size</span>
                  <button onClick={() => setFontSize(f => Math.max(12, f - 2))} className="w-8 h-8 bg-white border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-100">A-</button>
                  <button onClick={() => setFontSize(f => Math.min(36, f + 2))} className="w-8 h-8 bg-white border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-100">A+</button>
                </div>

                <button onClick={() => setIsScrolling(!isScrolling)} className={`px-4 h-8 rounded border font-bold text-xs transition ${isScrolling ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                  {isScrolling ? '⏸ Dừng cuộn' : '▶ Cuộn trang'}
                </button>

                <button onClick={() => setIsTwoColumns(!isTwoColumns)} className="px-4 h-8 rounded border bg-white text-slate-700 font-bold text-xs hover:bg-slate-100 transition">
                  {isTwoColumns ? '📄 1 Trang' : '📖 2 Cột'}
                </button>

                <button onClick={() => { setIsFullscreen(false); setIsScrolling(false); }} className="ml-2 px-4 h-8 rounded border border-slate-300 bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition shadow-md">
                  ✖ Thoát
                </button>
              </div>

              {/* Lời bài hát Fullscreen */}
              <div className={`text-left max-w-5xl mx-auto ${isTwoColumns ? 'md:columns-2 gap-16' : ''}`}>
                {renderLyrics()}
              </div>

            </div>
          </div>
        )}

        {/* MODAL KHO BÀI V VÀ TONE... */}
        {showSongListModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
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
