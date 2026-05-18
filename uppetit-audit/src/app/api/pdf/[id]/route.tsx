import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/requireAuth';
import { Document, Page, Text, View, StyleSheet, Font, renderToStream, Image } from '@react-pdf/renderer';
import { Audit, User, Location, ChecklistVersion, Checklist, ChecklistItem, Answer } from '@prisma/client';
import React from 'react';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// РЕГИСТРАЦИЯ ШРИФТОВ (Добавили Italic для курсива!)
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
    { 
      src: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf', 
      fontWeight: 400,
      fontStyle: 'italic'
    },
  ]
});

// СТИЛИ ДЛЯ PDF В ФИРМЕННЫХ ЦВЕТАХ (Black & #F25C05)
const styles = StyleSheet.create({
  page: { padding: 35, fontFamily: 'Roboto', fontSize: 10, color: '#27272a', backgroundColor: '#ffffff' },
  
  // Шапка
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 2, borderBottomColor: '#F25C05' },
  logo: { width: 140, height: 45, objectFit: 'contain' },
  headerTitleBlock: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 10, fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: 1 },
  headerSubtitle: { fontSize: 16, fontWeight: 'bold', color: '#18181b', marginTop: 4 },

  // Инфо-блок
  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  infoColumn: { width: '48%' },
  row: { flexDirection: 'row', marginBottom: 8 },
  label: { width: 80, color: '#71717a', fontSize: 9, textTransform: 'uppercase', fontWeight: 'bold' },
  value: { flex: 1, color: '#18181b', fontWeight: 'bold' },

  // Блок оценки
  scoreBlock: { backgroundColor: '#fafafa', padding: 15, borderRadius: 8, marginBottom: 25, borderLeftWidth: 4, borderLeftColor: '#F25C05' },
  scoreText: { fontSize: 14, color: '#18181b' },
  scoreHighlight: { fontWeight: 'bold', color: '#F25C05', fontSize: 16 },
  generalComment: { marginTop: 8, color: '#52525b', fontStyle: 'italic' },

  // Разделители и заголовки
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 10, marginBottom: 15, backgroundColor: '#18181b', paddingVertical: 6, paddingHorizontal: 10, color: '#ffffff', textTransform: 'uppercase', borderRadius: 4 },
  
  // Карточка ответа
  answerItem: { marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f4f4f5', borderBottomStyle: 'solid' },
  zone: { fontSize: 8, color: '#ffffff', backgroundColor: '#F25C05', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 4, marginBottom: 6, alignSelf: 'flex-start', textTransform: 'uppercase', fontWeight: 'bold' },
  question: { fontWeight: 'bold', marginBottom: 6, fontSize: 11, color: '#18181b', lineHeight: 1.3 },
  
  // Статусы
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusOk: { color: '#16a34a', fontWeight: 'bold', fontSize: 10 }, 
  statusBad: { color: '#ef4444', fontWeight: 'bold', fontSize: 10 }, 
  penaltyText: { color: '#ef4444', fontSize: 10, marginLeft: 4 },

  // Комментарии и фото
  commentBlock: { backgroundColor: '#f4f4f5', padding: 8, borderRadius: 4, marginTop: 6 },
  commentLabel: { fontSize: 8, color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  commentText: { color: '#3f3f46', fontSize: 10 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  photo: { width: 100, height: 100, objectFit: 'cover', borderRadius: 6, borderWidth: 1, borderColor: '#e4e4e7' }
});

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
const AuditPDF = ({ audit, maxScore, logoBase64 }: { audit: EnrichedAudit, maxScore: number, logoBase64: string }) => {
  const dateObj = new Date(audit.date);
  const dateStr = dateObj.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const employees = audit.shiftEmployees?.length ? audit.shiftEmployees.join(', ') : 'Не указаны';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* ШАПКА С ЛОГОТИПОМ */}
        <View style={styles.headerContainer}>
          {logoBase64 ? (
            <Image src={logoBase64} style={styles.logo} />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#18181b' }}>UPPETIT</Text>
          )}
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Отчет по аудиту</Text>
            <Text style={styles.headerSubtitle}>{audit.location?.name || 'Точка'}</Text>
          </View>
        </View>

        {/* ИНФОРМАЦИЯ ОБ АУДИТЕ В 2 КОЛОНКИ */}
        <View style={styles.infoContainer}>
          <View style={styles.infoColumn}>
            <View style={styles.row}><Text style={styles.label}>Чек-лист:</Text><Text style={styles.value}>{audit.checklistVersion?.checklist?.title} (v.{audit.checklistVersion?.version})</Text></View>
            
            {/* ИЗМЕНЕНО: Берем Имя, потом Логин, потом слепок auditorName */}
            <View style={styles.row}>
              <Text style={styles.label}>Аудитор:</Text>
              <Text style={styles.value}>
                {audit.user?.name || audit.user?.login || audit.auditorName || 'Неизвестно'}
              </Text>
            </View>
            
          </View>
          <View style={styles.infoColumn}>
            <View style={styles.row}><Text style={styles.label}>Дата:</Text><Text style={styles.value}>{dateStr} в {timeStr}</Text></View>
            <View style={styles.row}><Text style={styles.label}>На смене:</Text><Text style={styles.value}>{employees}</Text></View>
          </View>
        </View>

        {/* ИТОГОВЫЙ БАЛЛ */}
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreText}>
            Итоговая оценка: <Text style={styles.scoreHighlight}>{audit.score}</Text> из {maxScore} б.
          </Text>
          {audit.generalComment && (
            <Text style={styles.generalComment}>«{audit.generalComment}»</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Детализация проверки</Text>

        {/* СПИСОК ОТВЕТОВ */}
        {audit.answers.map((ans: Answer, idx: number) => (
          <View key={idx} style={styles.answerItem} wrap={false}>
            <Text style={styles.zone}>{ans.zone || 'Основной раздел'}</Text>
            <Text style={styles.question}>{ans.question}</Text>
            
            <View style={styles.statusRow}>
              {ans.isOk ? (
                <Text style={styles.statusOk}>✓ Соответствие нормам</Text>
              ) : (
                // Убрал фрагменты <>, обернул во View для безопасности
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.statusBad}>✗ Выявлено нарушение</Text>
                  <Text style={styles.penaltyText}>(-{ans.penalty} б.)</Text>
                </View>
              )}
            </View>

            {ans.comment && (
              <View style={styles.commentBlock}>
                <Text style={styles.commentLabel}>Комментарий проверяющего:</Text>
                <Text style={styles.commentText}>{ans.comment}</Text>
              </View>
            )}

            {/* БЛОК ФОТОГРАФИЙ */}
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

    // Читаем логотип из папки public и переводим в base64
    let logoBase64 = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo3.png');
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (e) {
      console.warn('Логотип logo3.png не найден в папке public:', e);
    }

    const maxScore = audit.checklistVersion?.items.reduce((sum: number, item: ChecklistItem) => sum + item.score, 0) || 0;

    const stream = await renderToStream(
      <AuditPDF audit={audit as EnrichedAudit} maxScore={maxScore} logoBase64={logoBase64} />
    );
    
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) { 
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