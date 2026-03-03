const { QdrantClient } = require('@qdrant/js-client-rest');
const dotenv = require('dotenv');

dotenv.config();

async function resetQdrant() {
    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url) {
        console.error('QDRANT_URL missing');
        return;
    }

    const client = new QdrantClient({ url, apiKey });
    const collectionName = 'jarvis_episodes';

    try {
        console.log(`Checking collection: ${collectionName}...`);
        const collections = await client.getCollections();
        const exists = collections.collections.some(c => c.name === collectionName);

        if (exists) {
            console.log(`Deleting existing collection: ${collectionName}...`);
            await client.deleteCollection(collectionName);
        }

        console.log(`Creating fresh collection: ${collectionName} (Size: 1536, Distance: Cosine)...`);
        await client.createCollection(collectionName, {
            vectors: {
                size: 1536,
                distance: 'Cosine'
            }
        });

        console.log('Qdrant Reset Complete.');
    } catch (err) {
        console.error(`Reset failed: ${err.message}`);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

resetQdrant();
