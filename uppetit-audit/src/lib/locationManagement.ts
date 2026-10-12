import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { parseReportRange } from './reportDates';

const date = z.union([z.string().max(40).refine(value => {
  try { parseReportRange(value, null); return !!value; } catch { return false; }
}, 'Некорректная дата'), z.date()]).nullable().optional();
export const managerIds = z.array(z.string().min(1).max(200)).max(200).transform(ids => [...new Set(ids)]);
export const locationFields = {
  name: z.string().trim().min(1, 'Название обязательно').max(200),
  address: z.string().trim().max(1000).nullable().optional(),
  tuIds: managerIds.optional(), isActive: z.boolean().optional(), activeFrom: date, activeTo: date,
};
export const locationCreateSchema = z.object({ ...locationFields, tuIds: managerIds.default([]), isActive: z.boolean().default(true) });
export const locationPatchSchema = z.object({ ...locationFields, name: locationFields.name.optional() });
export type LocationInput = z.infer<typeof locationPatchSchema>;
export const locationBulkSchema = z.object({ ids: z.array(z.string().min(1).max(200)).min(1).max(200).transform(ids => [...new Set(ids)]),
  isActive: z.boolean().optional(), tuIds: managerIds.optional(), assignmentMode: z.enum(['ADD', 'REPLACE']).default('ADD')
}).refine(data => data.isActive !== undefined || data.tuIds !== undefined, 'Укажите изменение');

export class LocationInputError extends Error {}
export function validateLocationPeriod(from: string | Date | null | undefined, to: string | Date | null | undefined) {
  if (from && to && new Date(from) > new Date(to)) throw new LocationInputError('Дата окончания должна быть не раньше даты начала.');
}
export async function validateManagers(tx: Prisma.TransactionClient, ids: string[]) {
  if (ids.length && await tx.user.count({ where: { id: { in: ids }, role: 'TU' } }) !== ids.length) {
    throw new LocationInputError('Один из выбранных сотрудников недоступен или больше не является ТУ. Обновите список.');
  }
}
export function locationUpdateData(data: LocationInput): Prisma.LocationUncheckedUpdateInput {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.address !== undefined ? { address: data.address || null } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    ...(data.activeFrom !== undefined ? { activeFrom: data.activeFrom ? new Date(data.activeFrom) : null } : {}),
    ...(data.activeTo !== undefined ? { activeTo: data.activeTo ? new Date(data.activeTo) : null } : {}),
    ...(data.tuIds !== undefined ? { tuId: null, tus: { set: data.tuIds.map(id => ({ id })) } } : {}),
  };
}
export async function applyLocationBulk(tx: Prisma.TransactionClient, input: z.infer<typeof locationBulkSchema>) {
  const locations = await tx.location.findMany({ where: { id: { in: input.ids } }, select: { id: true, tuId: true, tus: { select: { id: true } } } });
  if (locations.length !== input.ids.length) throw new LocationInputError('Одна из выбранных точек удалена. Обновите список.');
  if (input.tuIds) await validateManagers(tx, input.tuIds);
  for (const location of locations) {
    const ids = input.tuIds === undefined ? undefined : input.assignmentMode === 'REPLACE' ? input.tuIds
      : [...new Set([...location.tus.map(t => t.id), ...(location.tuId ? [location.tuId] : []), ...input.tuIds])];
    await tx.location.update({ where: { id: location.id }, data: locationUpdateData({ isActive: input.isActive, tuIds: ids }) });
  }
  return locations.length;
}
