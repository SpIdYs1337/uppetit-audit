'use client';

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
import type { Role } from '@prisma/client';

export type PublicUser = {
  id: string; name: string | null; login: string; email?: string | null; phone?: string | null;
  role: Role; isActive?: boolean; hasPassword?: boolean; inviteExpiresAt?: string | null; totpEnabled?: boolean;
  locations?: { id: string; name: string }[]; managedLocations?: { id: string; name: string }[];
};
export type UserChanges = { id?: string; name?: string; login?: string; email?: string; phone?: string | null;
  role?: Role; isActive?: boolean; reissueInvite?: boolean; revokeSessions?: boolean };
export type UserSaveResult = Partial<PublicUser> & { inviteToken?: string; token?: string; expiresAt?: string };

export function useUsers() {
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR<PublicUser[]>(
    session?.user ? ['/api/users', session.user.id, session.user.role] : null, ([url]: [string, string, string]) => fetcher(url));
  async function change(method: string, body?: object, id?: string): Promise<UserSaveResult> {
    const res = await fetch('/api/users' + (id ? '?id=' + encodeURIComponent(id) : ''), {
      method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error || 'Не удалось сохранить изменения');
    await mutate(); return result;
  }
  return {
    users: data || [], isLoading, isError: !!error, error, refresh: mutate,
    saveUser: (body: UserChanges, isUpdate: boolean) => change(isUpdate ? 'PUT' : 'POST', body),
    deleteUser: (id: string) => change('DELETE', undefined, id),
    resetPassword: (id: string) => change('PUT', { id, resetPassword: true }),
  };
}
