import type {
  NextTurnView,
  QueueStateView,
  RecentAttentionRecordView,
  WaitingRoomMonitorView,
} from "../../services/api/types";

/**
 * Puerto de consultas — abstracción del canal HTTP GET hacia el backend.
 * La implementación concreta es HttpQueryAdapter.
 */
export interface IQueryGateway {
  getMonitor(queueId: string): Promise<WaitingRoomMonitorView>;
  getQueueState(queueId: string): Promise<QueueStateView>;
  getNextTurn(queueId: string): Promise<NextTurnView | null>;
  getRecentHistory(queueId: string, limit?: number): Promise<RecentAttentionRecordView[]>;
  rebuildProjection(queueId: string): Promise<void>;
}
