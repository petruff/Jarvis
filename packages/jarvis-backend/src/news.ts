import Parser from 'rss-parser';

export interface Article {
    title: string;
    source: string;
    url: string;
    publishedAt: string;
}

const parser = new Parser();

export const getLatestNews = async (topic: string = 'Artificial Intelligence'): Promise<Article[]> => {
    try {
        console.log(`[News] Fetching RSS feed for: ${topic}...`);
        // Google News RSS Feed
        const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
        const feed = await parser.parseURL(feedUrl);

        console.log(`[News] Found ${feed.items.length} articles.`);

        return feed.items.slice(0, 5).map(item => ({
            title: item.title || 'No Title',
            source: item.contentSnippet || 'Google News', // RSS parser sometimes puts source in contentSnippet or creator
            url: item.link || '',
            publishedAt: item.pubDate || new Date().toISOString()
        }));
    } catch (e: any) {
        console.error(`[News] Failed to fetch news: ${e.message}`);
        return [];
    }
};
