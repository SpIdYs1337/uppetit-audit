import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version'; // Убедись, что путь до файла с версией правильный

// force-dynamic обязателен, чтобы Next.js не закэшировал ответ этого роута намертво
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ version: APP_VERSION });
}