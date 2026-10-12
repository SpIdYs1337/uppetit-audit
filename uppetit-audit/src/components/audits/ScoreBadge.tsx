import { Badge } from '@/components/ui';

export function ScoreBadge({ audit }: { audit: { score: number; maxScore: number | null; checklist?: { redThreshold?: number; yellowThreshold?: number } | null } }) {
  if (!audit.maxScore) return <Badge>Исторический результат</Badge>;
  const red = audit.checklist?.redThreshold ?? audit.maxScore * .7;
  const yellow = audit.checklist?.yellowThreshold ?? audit.maxScore * .9;
  return <Badge tone={audit.score >= yellow ? 'success' : audit.score >= red ? 'warning' : 'danger'}>{audit.score >= yellow ? 'Соответствует норме' : audit.score >= red ? 'Требует внимания' : 'Ниже нормы'}</Badge>;
}
