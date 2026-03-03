/**
 * JARVIS Knowledge Module — Export all knowledge components
 *
 * Components:
 * - DocumentProcessor: Multi-source content extraction
 * - KnowledgeIngester: Content ingestion orchestration
 * - VectorStore: Semantic search & retrieval
 * - KnowledgeService: Central knowledge management
 */

export { default as DocumentProcessor } from './documentProcessor';
export type { DocumentMetadata, DocumentChunk } from './documentProcessor';

export { default as KnowledgeIngester } from './knowledgeIngester';
export type { IngestionJob } from './knowledgeIngester';

export { default as VectorStore } from './vectorStore';
export type { SearchResult } from './vectorStore';

export { default as KnowledgeService } from './knowledgeService';
export type { KnowledgeContext } from './knowledgeService';
