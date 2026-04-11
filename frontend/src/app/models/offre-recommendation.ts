import { ClientKpi } from './client-kpi';
import { Offre } from './offre';

export interface OffreRecommendation {
  id: number;
  clientKpi: ClientKpi;
  aiRecommendedOffre: Offre | null;
  aiReason: string;
  finalOffre: Offre | null;
  status: 'PENDING' | 'ACCEPTED' | 'OVERRIDDEN' | 'SENT';
  sentAt: string | null;
  createdAt: string;
}
