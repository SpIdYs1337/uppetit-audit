import { AuditHistoryView } from '@/components/audits/AuditHistoryView';

export default async function AuditHistoryPage({ searchParams }: { searchParams: Promise<{ audit?: string }> }) {
  const { audit } = await searchParams;
  return <AuditHistoryView initialAuditId={typeof audit === 'string' && audit.length <= 200 ? audit : undefined} />;
}
