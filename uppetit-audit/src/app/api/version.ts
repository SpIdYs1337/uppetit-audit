import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version';

export async function GET() {
  // Отдаем актуальную версию, которая сейчас "залита" на сервер
  return NextResponse.json({ version: APP_VERSION });
}