// Centralized type exports for cleaner imports
// Following Firegeo patterns for better organization

// Analysis types
export * from './analysis';

// Firecrawl types  
export * from './firecrawl';

// UI types
export * from './ui';

// Auth types (re-export existing)
export * from './better-auth';
export * from './polar';

// Common utility types
export type Awaited<T> = T extends Promise<infer U> ? U : T;
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

// Database Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimestampedEntity {
  createdAt: Date;
  updatedAt: Date;
}

// Search and Filtering
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Environment Types
export type Environment = 'development' | 'staging' | 'production';

// Generic Event Types
export interface CustomEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
  source?: string;
}

// Utility function types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Status types commonly used across the app
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data?: T;
  loading: boolean;
  error?: string;
  status: Status;
}

// Generic CRUD operations
export interface CrudOperations<T, CreateInput = Partial<T>, UpdateInput = Partial<T>> {
  create: (input: CreateInput) => Promise<T>;
  read: (id: string) => Promise<T>;
  update: (id: string, input: UpdateInput) => Promise<T>;
  delete: (id: string) => Promise<boolean>;
  list: (params?: SearchParams) => Promise<SearchResult<T>>;
}