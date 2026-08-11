import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. Lấy danh sách bài hát (GET /api/songs)
export async function GET() {
  try {
    const songs = await prisma.song.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(songs);
  } catch (error) {
    console.error('Lỗi GET /api/songs:', error);
    return NextResponse.json(
      { error: 'Không thể đọc dữ liệu bài hát từ SQLite.' },
      { status: 500 }
    );
  }
}

// 2. Thêm bài hát mới (POST /api/songs)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newSong = await prisma.song.create({
      data: {
        title: body.title,
        artist: body.artist || 'Ẩn danh',
        key: body.key || 'C',
        rhythm: body.rhythm || 'Ballad',
        content: body.content,
      },
    });
    return NextResponse.json(newSong);
  } catch (error) {
    console.error('Lỗi POST /api/songs:', error);
    return NextResponse.json(
      { error: 'Không thể lưu bài hát vào SQLite.' },
      { status: 500 }
    );
  }
}

// 3. Sửa bài hát (PUT /api/songs)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Thiếu ID bài hát' }, { status: 400 });
    }

    const updatedSong = await prisma.song.update({
      where: { id: Number(body.id) },
      data: {
        title: body.title,
        artist: body.artist || 'Ẩn danh',
        key: body.key || 'C',
        rhythm: body.rhythm || 'Ballad',
        content: body.content,
      },
    });
    return NextResponse.json(updatedSong);
  } catch (error) {
    console.error('Lỗi PUT /api/songs:', error);
    return NextResponse.json(
      { error: 'Không thể cập nhật bài hát trong SQLite.' },
      { status: 500 }
    );
  }
}

// 4. Xóa bài hát (DELETE /api/songs?id=...)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID bài hát' }, { status: 400 });
    }

    await prisma.song.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi DELETE /api/songs:', error);
    return NextResponse.json(
      { error: 'Không thể xóa bài hát trong SQLite.' },
      { status: 500 }
    );
  }
}