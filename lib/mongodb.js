import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = 'phungnong';

if (!uri) {
  console.warn('MONGODB_URI chưa set — dùng bộ nhớ tạm (chỉ dev local)');
}

let clientPromise;

function getClient() {
  if (!uri) return null;

  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri, { maxPoolSize: 10 });
    globalThis._mongoClientPromise = client.connect();
  }
  return globalThis._mongoClientPromise;
}

export async function getSchedules() {
  const client = await getClient();
  if (!client) return null;
  return client.db(dbName).collection('schedules');
}
