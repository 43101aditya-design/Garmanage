import { useSqlStore } from '../../store/sqlStore';
import { SqlOperationType } from '../../types';

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const emitSqlLog = (
  query: string,
  operationType: SqlOperationType,
  tableName: string,
  rowsAffected: number,
  executionTimeMs: number,
  primaryKey?: string,
  beforeData?: Record<string, any>,
  afterData?: Record<string, any>
) => {
  useSqlStore.getState().addLog({
    query,
    operation_type: operationType,
    table_name: tableName,
    rows_affected: rowsAffected,
    execution_status: 'Success',
    execution_time_ms: executionTimeMs,
    transaction_status: 'COMMIT',
    primary_key: primaryKey,
    before_data: beforeData,
    after_data: afterData
  });
};
