import { Client } from "@elastic/elasticsearch";

const node = process.env.ELASTICSEARCH_NODE || "http://localhost:9200";
const username = process.env.ELASTICSEARCH_USERNAME;
const password = process.env.ELASTICSEARCH_PASSWORD;
const apiKey = process.env.ELASTICSEARCH_API_KEY;

const clientOptions: any = {
  node,
};

if (apiKey) {
  clientOptions.auth = { apiKey };
} else if (username && password) {
  clientOptions.auth = { username, password };
}

const elasticClient = new Client(clientOptions);

// Basic error logging using Client Diagnostic Events
elasticClient.diagnostic.on("response", (error) => {
  if (error) {
    console.error("Elasticsearch request error:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
  }
});

/**
 * Pings the Elasticsearch cluster to check its health.
 * Performs a fail-soft verification and logs success or warning/error.
 */
export async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    console.log(`Pinging Elasticsearch at node: ${node}...`);
    // client.ping() returns true if the request was successful, false otherwise
    const alive = await elasticClient.ping();
    if (alive) {
      console.log("Successfully connected to Elasticsearch.");
      return true;
    } else {
      console.warn("Elasticsearch is unreachable or ping returned false.");
      return false;
    }
  } catch (error: any) {
    console.error("Elasticsearch health check failed on startup:", error?.message || error);
    return false;
  }
}

export default elasticClient;
