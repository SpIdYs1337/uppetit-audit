import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth';
import { Role } from '@prisma/client'; 

export const dynamic = 'force-dynamic';

// --- ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ---

const checklistItemSchema = z.object({
  text: z.string().optional(),
  question: z.string().optional(),
  zone: z.string().nullable().optional().default('Основной раздел'),
  score: z.coerce.number().default(0), 
  isCritical: z.coerce.boolean().default(false),
  // Внедряем новое поле
  photoRequirement: z.enum(['OPTIONAL', 'REQUIRED', 'VIOLATION']).optional().default('OPTIONAL'),
});

type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

const itemsArraySchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return val;
}, z.array(checklistItemSchema));

const itemsArraySchemaPost = z.preprocess((val) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return val;
}, z.array(checklistItemSchema).min(1, 'Чек-лист должен содержать хотя бы один вопрос'));

const checklistPostSchema = z.object({
  title: z.string().min(1, 'Название чек-листа обязательно'),
  items: itemsArraySchemaPost, 
  redThreshold: z.coerce.number().optional().default(70),
  yellowThreshold: z.coerce.number().optional().default(90),
  allowedRoles: z.union([z.array(z.nativeEnum(Role)), z.string()]).optional().default([Role.AUDITOR, Role.TU]),
});

const checklistPutSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
  title: z.string().min(1, 'Название чек-листа обязательно'),
  items: itemsArraySchema.optional(),
  redThreshold: z.coerce.number().optional().default(70),
  yellowThreshold: z.coerce.number().optional().default(90),
  allowedRoles: z.union([z.array(z.nativeEnum(Role)), z.string()]).optional(),
  isArchived: z.boolean().optional(),
});

const checklistDeleteSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
});

function parseRoles(rolesRaw: unknown): Role[] {
  if (Array.isArray(rolesRaw)) return rolesRaw as Role[];
  if (typeof rolesRaw === 'string') {
    try {
      const parsed = JSON.parse(rolesRaw);
      if (Array.isArray(parsed)) return parsed as Role[];
    } catch { 
      return [rolesRaw as Role];
    }
  }
  return [Role.AUDITOR, Role.TU]; 
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const checklists = await prisma.checklist.findMany({
      include: {
        versions: {
          where: { isActive: true },
          include: { 
            items: { orderBy: { order: 'asc' } } 
          }
        }
      },
      orderBy: { title: 'asc' } 
    });

    const formattedChecklists = checklists.map(cl => {
      const activeVersion = cl.versions[0];
      return {
        id: cl.id,
        title: cl.title,
        isArchived: (cl as any).isArchived || false,
        redThreshold: cl.redThreshold,
        yellowThreshold: cl.yellowThreshold,
        allowedRoles: cl.allowedRoles,
        activeVersionId: activeVersion?.id,
        version: activeVersion?.version || 1, 
        items: activeVersion?.items || [] 
      };
    });

    return NextResponse.json(formattedChecklists);
  } catch (error: unknown) {
    console.error('Ошибка GET /api/checklists:', error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await request.json();
    const parsedData = checklistPostSchema.parse(body);
    const cleanRoles = parseRoles(parsedData.allowedRoles);

    const newChecklist = await prisma.checklist.create({
      data: {
        title: parsedData.title,
        redThreshold: parsedData.redThreshold,
        yellowThreshold: parsedData.yellowThreshold,
        allowedRoles: cleanRoles, 
        versions: {
          create: {
            version: 1,
            isActive: true,
            items: {
              create: parsedData.items.map((item: ChecklistItemInput, index: number) => ({
                text: item.text || item.question || 'Новый вопрос',
                zone: item.zone || 'Основной раздел',
                score: item.score,
                isCritical: item.isCritical,
                photoRequirement: item.photoRequirement,
                order: index
              }))
            }
          }
        }
      }
    });
    
    return NextResponse.json(newChecklist);
  } catch (error: unknown) { 
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    console.error('Ошибка POST /api/checklists:', error);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const body = await request.json();
    const parsedData = checklistPutSchema.parse(body);
    const cleanRoles = parsedData.allowedRoles ? parseRoles(parsedData.allowedRoles) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const cl = await tx.checklist.update({
        where: { id: parsedData.id },
        data: {
          title: parsedData.title,
          redThreshold: parsedData.redThreshold,
          yellowThreshold: parsedData.yellowThreshold,
          ...(cleanRoles && { allowedRoles: cleanRoles }),
          ...(parsedData.isArchived !== undefined && { isArchived: parsedData.isArchived }),
        }
      });

      if (parsedData.items && parsedData.items.length > 0) {
        const currentActive = await tx.checklistVersion.findFirst({
          where: { checklistId: parsedData.id, isActive: true },
          orderBy: { version: 'desc' }
        });
        
        const nextVersionNum = currentActive ? currentActive.version + 1 : 1;

        await tx.checklistVersion.updateMany({
          where: { checklistId: parsedData.id },
          data: { isActive: false }
        });

        await tx.checklistVersion.create({
          data: {
            checklistId: parsedData.id,
            version: nextVersionNum,
            isActive: true,
            items: {
              create: parsedData.items.map((item: ChecklistItemInput, index: number) => ({
                text: item.text || item.question || 'Новый вопрос',
                zone: item.zone || 'Основной раздел',
                score: item.score,
                isCritical: item.isCritical,
                photoRequirement: item.photoRequirement,
                order: index
              }))
            }
          }
        });
      }
      return cl;
    });

    return NextResponse.json(updated);
  } catch (error: unknown) { 
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    console.error('Ошибка PUT /api/checklists:', error);
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAuth([Role.ADMIN]);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const { id } = checklistDeleteSchema.parse({ id: searchParams.get('id') || '' });

    await prisma.checklist.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) { 
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные', details: error.issues }, { status: 400 });
    }
    console.error('Ошибка DELETE /api/checklists:', error);
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}