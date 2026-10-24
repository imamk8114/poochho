export type Metric = 'count' | 'avg_resolution_days' | 'resolution_rate';
export type GroupBy = 'district' | 'category' | 'status' | 'month' | 'none';
export type ChartKind = 'auto' | 'bar' | 'line' | 'map';

/**
 * The only thing a question can turn into. Whatever interprets the question (a language model or the local
 * parser) must produce this closed shape, so the app never runs generated code or free-form queries.
 */
export interface QueryPlan {
  metric: Metric;
  groupBy: GroupBy;
  filters: {
    districts?: string[];
    categories?: string[];
    statuses?: string[];
    /** "YYYY-MM", inclusive. */
    from?: string;
    to?: string;
  };
  sort?: 'desc' | 'asc';
  limit?: number;
  chart?: ChartKind;
}

export interface ResultRow {
  key: string;
  label: string;
  value: number;
  /** Complaints behind the value, so averages and rates can be read in context. */
  count: number;
  lat?: number;
  lon?: number;
}

export interface QueryResult {
  plan: QueryPlan;
  rows: ResultRow[];
  total: { value: number; count: number };
  /** Chart actually drawn, after resolving "auto" and impossible combinations. */
  chart: 'bar' | 'line' | 'map' | 'number';
  ms: number;
}
