import { NextRequest, NextResponse } from 'next/server';

// POST /api/upload-image - Upload image to ImgBB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // ImgBB API Key - مجاني من imgbb.com
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY || 'd36eb4e8c4b4f8b9b3c7a5e6f2d1c0b9';

    // رفع الصورة على ImgBB
    const formData = new FormData();
    formData.append('image', image);
    formData.append('expiration', '2592000'); // 30 يوم

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success && result.data?.url) {
      return NextResponse.json({
        success: true,
        url: result.data.url,
        thumbnail: result.data.thumb?.url,
        medium: result.data.medium?.url,
      });
    }

    return NextResponse.json({
      error: result.error?.message || 'Failed to upload image',
    }, { status: 500 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: 'Failed to upload image',
    }, { status: 500 });
  }
}
