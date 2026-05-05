import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { Document, Page, Text, View, StyleSheet, Font, renderToStream, Image } from '@react-pdf/renderer';
import { Audit, User, Location, ChecklistVersion, Checklist, ChecklistItem, Answer } from '@prisma/client';
import React from 'react';

export const dynamic = 'force-dynamic';

// РЕГИСТРАЦИЯ ШРИФТОВ: Используем железобетонные ссылки со стабильного CDN (только обычный и жирный)
Font.register({
  family: 'Roboto',
  fonts: [
    { 
      src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf', 
      fontWeight: 400 
    },
    { 
      src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf', 
      fontWeight: 700 
    },
  ]
});

// СТИЛИ ДЛЯ PDF
const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Roboto', fontSize: 10, color: '#333' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#111' },
  infoBlock: { marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', borderBottomStyle: 'solid' },
  row: { flexDirection: 'row', marginBottom: 6 },
  label: { width: 120, color: '#777', fontWeight: 'bold' },
  value: { flex: 1 },
  scoreBlock: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 5, marginBottom: 20 },
  scoreText: { fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 15, marginBottom: 10, backgroundColor: '#e8f0fe', padding: 5, color: '#1967d2' },
  answerItem: { marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', borderBottomStyle: 'solid' },
  zone: { fontSize: 8, color: '#fff', backgroundColor: '#888', paddingVertical: 2, paddingHorizontal: 4, borderRadius: 3, marginBottom: 5, alignSelf: 'flex-start' },
  question: { fontWeight: 'bold', marginBottom: 4, fontSize: 11 },
  statusOk: { color: '#50cd89', fontWeight: 'bold', marginBottom: 2 },
  statusBad: { color: '#f1416c', fontWeight: 'bold', marginBottom: 2 },
  comment: { color: '#009ef7', marginTop: 4 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, gap: 5 },
  photo: { width: 120, height: 120, objectFit: 'cover', borderRadius: 4 }
});

// Составной тип для Аудита со всеми вложенными связями
type EnrichedAudit = Audit & {
  user: User | null;
  location: Location | null;
  checklistVersion: (ChecklistVersion & {
    checklist: Checklist;
    items: ChecklistItem[];
  }) | null;
  answers: Answer[];
};

// REACT-КОМПОНЕНТ ДЛЯ ВЕРСТКИ PDF
const AuditPDF = ({ audit, maxScore }: { audit: EnrichedAudit, maxScore: number }) => {
  const date = new Date(audit.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const employees = audit.shiftEmployees?.length ? audit.shiftEmployees.join(', ') : 'Не указаны';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Отчет о проверке: {audit.location?.name || 'Точка'}</Text>
        
        <View style={styles.infoBlock}>
          <View style={styles.row}><Text style={styles.label}>Чек-лист:</Text><Text style={styles.value}>{audit.checklistVersion?.checklist?.title} (v.{audit.checklistVersion?.version})</Text></View>
          <View style={styles.row}><Text style={styles.label}>Аудитор:</Text><Text style={styles.value}>{audit.user?.login}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Дата и время:</Text><Text style={styles.value}>{date}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Сотрудники:</Text><Text style={styles.value}>{employees}</Text></View>
        </View>

        <View style={styles.scoreBlock}>
          <Text style={styles.scoreText}>Итоговая оценка: {audit.score} / {maxScore} баллов</Text>
          {audit.generalComment && <Text style={{ marginTop: 10, color: '#555' }}>Комментарий: {audit.generalComment}</Text>}
        </View>

        <Text style={styles.sectionTitle}>Детализация ответов</Text>

        {audit.answers.map((ans: Answer, idx: number) => (
          <View key={idx} style={styles.answerItem} wrap={false}>
            <Text style={styles.zone}>{ans.zone || 'ОСНОВНОЙ РАЗДЕЛ'}</Text>
            <Text style={styles.question}>{ans.question}</Text>
            
            {ans.isOk ? (
              <Text style={styles.statusOk}>✓ Соответствие</Text>
            ) : (
              <Text style={styles.statusBad}>✗ Несоответствие (-{ans.penalty} б.)</Text>
            )}

            {ans.comment && <Text style={styles.comment}>Комментарий: {ans.comment}</Text>}

            {/* Блок фотографий */}
            {ans.photos && ans.photos.length > 0 && (
              <View style={styles.photosGrid}>
                {ans.photos.map((img: string, i: number) => (
                  <Image key={i} src={img} style={styles.photo} />
                ))}
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
};

// API ОБРАБОТЧИК
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const params = await context.params;
    const auditId = params?.id;

    if (!auditId) {
      return NextResponse.json({ error: 'ID аудита не передан' }, { status: 400 });
    }

    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        user: true,
        location: true,
        checklistVersion: {
          include: { 
            checklist: true, 
            items: { orderBy: { order: 'asc' } }
          }
        },
        answers: { orderBy: { id: 'asc' } }
      }
    });

    if (!audit) return NextResponse.json({ error: 'Аудит не найден' }, { status: 404 });

    const maxScore = audit.checklistVersion?.items.reduce((sum: number, item: ChecklistItem) => sum + item.score, 0) || 0;

    const stream = await renderToStream(<AuditPDF audit={audit as EnrichedAudit} maxScore={maxScore} />);
    
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) { // ReadableStream из renderToStream сложно типизировать без доп. библиотек
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="audit_${audit.id}.pdf"`,
      },
    });

  } catch (error: unknown) {
    console.error('Ошибка генерации PDF:', error);
    return NextResponse.json({ error: 'Ошибка при создании файла' }, { status: 500 });
  }
}