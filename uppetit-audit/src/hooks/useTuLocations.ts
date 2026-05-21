import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { fetcher } from '@/lib/fetcher';
import { Location, Audit, User, Checklist } from '@prisma/client';
export type EnrichedAudit = Audit & { 
  location?: Location | null; 
  user?: User | null; 
  checklist?: Checklist | null; 
};

export function useTuLocations() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const { data: allLocations, isLoading: locLoading } = useSWR<Location[]>('/api/locations', fetcher);
  const { data: allAudits, isLoading: audLoading } = useSWR<EnrichedAudit[]>('/api/audits', fetcher);

  const myLocations = allLocations?.filter(loc => loc.tuId === userId) || [];
  const myLocationIds = myLocations.map(l => l.id);

  const myAudits = allAudits?.filter(aud => aud.locationId && myLocationIds.includes(aud.locationId)) || [];

  return {
    locations: myLocations,
    audits: myAudits,
    isLoading: status === 'loading' || locLoading || audLoading,
  };
}