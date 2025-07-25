-- Enable pgvector extension (Neon has this pre-installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector columns to analyses table
ALTER TABLE analyses ADD COLUMN embedding vector(1024);
ALTER TABLE analyses ADD COLUMN embedding_model varchar(100) DEFAULT 'voyage-3.5';
ALTER TABLE analyses ADD COLUMN embedding_created_at timestamp;

-- Create HNSW index for vector similarity search (optimized for Neon)
CREATE INDEX analyses_embedding_hnsw_idx ON analyses USING hnsw (embedding vector_cosine_ops);