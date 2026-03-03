/**
 * Document Processor — Extract & Chunk Content
 *
 * Handles:
 * - PDF text extraction
 * - Video transcript extraction
 * - Podcast/audio transcription
 * - Article/web content parsing
 * - Smart chunking with overlap
 */

import pdfParse from 'pdf-parse';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DocumentMetadata {
  source: 'pdf' | 'video' | 'podcast' | 'article' | 'web';
  title: string;
  url?: string;
  duration?: number; // seconds
  language: string;
  processedAt: number;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  chunkIndex: number;
  tokens: number;
  embedding?: number[];
}

export class DocumentProcessor {
  private readonly CHUNK_SIZE = 512; // tokens
  private readonly CHUNK_OVERLAP = 50; // tokens

  /**
   * Process PDF from URL or file
   */
  async processPDF(
    source: string,
    title: string
  ): Promise<{ chunks: DocumentChunk[]; metadata: DocumentMetadata }> {
    try {
      let pdfBuffer: Buffer;

      if (source.startsWith('http')) {
        const response = await axios.get(source, { responseType: 'arraybuffer' });
        pdfBuffer = Buffer.from(response.data);
      } else {
        const fs = await import('fs');
        pdfBuffer = fs.readFileSync(source);
      }

      const data = await pdfParse(pdfBuffer);
      const text = data.text;

      const metadata: DocumentMetadata = {
        source: 'pdf',
        title,
        url: source.startsWith('http') ? source : undefined,
        language: 'en',
        processedAt: Date.now(),
      };

      const chunks = this.chunkText(text, metadata);
      return { chunks, metadata };
    } catch (error) {
      console.error('[DocumentProcessor] PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Process video transcript (using YouTube, Vimeo, etc.)
   */
  async processVideo(
    url: string,
    title: string
  ): Promise<{ chunks: DocumentChunk[]; metadata: DocumentMetadata; transcript: string }> {
    try {
      // Use yt-dlp to extract transcript (YouTube) or download captions
      const { stdout } = await execAsync(`yt-dlp --write-auto-subs --skip-download "${url}" -o - 2>/dev/null`);

      const metadata: DocumentMetadata = {
        source: 'video',
        title,
        url,
        language: 'en',
        processedAt: Date.now(),
      };

      const chunks = this.chunkText(stdout, metadata);
      return { chunks, metadata, transcript: stdout };
    } catch (error) {
      console.error('[DocumentProcessor] Video processing error:', error);
      throw new Error(`Failed to extract video transcript: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Process podcast/audio (transcribe with Whisper)
   */
  async processPodcast(
    audioUrl: string,
    title: string
  ): Promise<{ chunks: DocumentChunk[]; metadata: DocumentMetadata; transcript: string }> {
    try {
      // Download audio file
      const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(response.data);

      // Use OpenAI Whisper API for transcription
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const transcriptionResponse = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const transcript = transcriptionResponse.data.text;

      const metadata: DocumentMetadata = {
        source: 'podcast',
        title,
        url: audioUrl,
        language: 'en',
        processedAt: Date.now(),
      };

      const chunks = this.chunkText(transcript, metadata);
      return { chunks, metadata, transcript };
    } catch (error) {
      console.error('[DocumentProcessor] Podcast processing error:', error);
      throw new Error(`Failed to process podcast: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Process web article
   */
  async processArticle(
    url: string,
    title?: string
  ): Promise<{ chunks: DocumentChunk[]; metadata: DocumentMetadata }> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      // Extract text from HTML (simple approach)
      let text = response.data;
      text = text.replace(/<script[^>]*>.*?<\/script>/gs, '');
      text = text.replace(/<style[^>]*>.*?<\/style>/gs, '');
      text = text.replace(/<[^>]+>/g, ' ');
      text = text.replace(/\s+/g, ' ').trim();

      const metadata: DocumentMetadata = {
        source: 'web',
        title: title || url.split('/').pop() || 'Article',
        url,
        language: 'en',
        processedAt: Date.now(),
      };

      const chunks = this.chunkText(text, metadata);
      return { chunks, metadata };
    } catch (error) {
      console.error('[DocumentProcessor] Article processing error:', error);
      throw new Error(`Failed to process article: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Smart text chunking with overlap
   */
  private chunkText(text: string, metadata: DocumentMetadata): DocumentChunk[] {
    const words = text.split(/\s+/);
    const chunks: DocumentChunk[] = [];

    let currentChunk: string[] = [];
    let currentTokenCount = 0;

    for (const word of words) {
      const wordTokens = Math.ceil(word.length / 4); // Rough token estimation

      if (currentTokenCount + wordTokens > this.CHUNK_SIZE && currentChunk.length > 0) {
        // Save current chunk
        const chunkContent = currentChunk.join(' ');
        chunks.push({
          id: `${metadata.title}_${chunks.length}`,
          content: chunkContent,
          metadata,
          chunkIndex: chunks.length,
          tokens: currentTokenCount,
        });

        // Start new chunk with overlap
        const overlapWords = Math.ceil((this.CHUNK_OVERLAP / this.CHUNK_SIZE) * currentChunk.length);
        currentChunk = currentChunk.slice(-overlapWords);
        currentTokenCount = currentChunk.reduce((sum, w) => sum + Math.ceil(w.length / 4), 0);
      }

      currentChunk.push(word);
      currentTokenCount += wordTokens;
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        id: `${metadata.title}_${chunks.length}`,
        content: currentChunk.join(' '),
        metadata,
        chunkIndex: chunks.length,
        tokens: currentTokenCount,
      });
    }

    return chunks;
  }
}

export default DocumentProcessor;
