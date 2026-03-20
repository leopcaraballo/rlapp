import type {
  NextTurnView,
  AtencionStateView,
  RecentAttentionRecordView,
  AtencionMonitorView,
  AtencionFullStateView,
} from "../../services/api/types";

/**
 * Puerto de consultas — abstracción del canal HTTP GET hacia el backend.
 * La implementación concreta es HttpQueryAdapter.
 */
export interface IQueryGateway {
  getMonitor(serviceId: string): Promise<AtencionMonitorView>;
  getFullState(serviceId: string): Promise<AtencionFullStateView | null>;
  getQueueState(serviceId: string): Promise<AtencionStateView>;
  getNextTurn(serviceId: string): Promise<NextTurnView | null>;
  getRecentHistory(serviceId: string, limit?: number): Promise<RecentAttentionRecordView[]>;
  getConsultingRoomsState(serviceId: string): Promise<{ activeRooms: string[]; allRooms: string[] }>;
  rebuildProjection(serviceId: string): Promise<void>;
}
