import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const songs = await prisma.song.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(songs);
  } catch (error) {
    console.error('Lỗi GET /api/songs:', error);
    return NextResponse.json({ error: 'Không thể đọc dữ liệu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newSong = await prisma.song.create({
      data: {
        title: body.title,
        artist: body.artist || 'Ẩn danh',
        key: body.key || 'C',
        rhythm: body.rhythm || 'Ballad',
        genre: body.genre || 'Khác',
        notes: body.notes || '',
        isFavorite: body.isFavorite || false,
        content: body.content,
      },
    });
    return NextResponse.json(newSong);
  } catch (error) {
    return NextResponse.json({ error: 'Không thể lưu bài hát' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    const updatedSong = await prisma.song.update({
      where: { id: Number(body.id) },
      data: {
        title: body.title,
        artist: body.artist || 'Ẩn danh',
        key: body.key || 'C',
        rhythm: body.rhythm || 'Ballad',
        genre: body.genre || 'Khác',
        notes: body.notes || '',
        isFavorite: body.isFavorite ?? false,
        content: body.content,
      },
    });
    return NextResponse.json(updatedSong);
  } catch (error) {
    return NextResponse.json({ error: 'Không thể cập nhật' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    await prisma.song.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Không thể xóa' }, { status: 500 });
  }
}
