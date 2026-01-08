
export interface CompanyRow {
  [key: string]: any;
  __description?: string;
  __sources?: string[];
  __status?: 'pending' | 'processing' | 'done' | 'error';
}

export interface ProcessingStats {
  total: number;
  processed: number;
  errors: number;
}
