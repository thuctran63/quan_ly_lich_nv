import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = 'phungnong';

if (!uri) {
  console.warn('MONGODB_URI chưa set — dùng bộ nhớ tạm (chỉ dev local)');
}

let clientPromise;

function getClient() {
  if (!uri) return null;

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getSchedules() {
  const client = await getClient();
  if (!client) return null;
  return client.db(dbName).collection('schedules');
}
