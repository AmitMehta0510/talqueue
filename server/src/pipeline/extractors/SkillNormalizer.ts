import type { SkillCategory } from "../interfaces/ParsedJob";

/**
 * SkillNormalizer — canonical name resolution.
 *
 * Maps raw technology mentions (as they appear in job descriptions)
 * to their canonical, display-ready names.
 *
 * The dictionary is structured to be easily extended:
 *   key = lowercased variant as it appears in text
 *   value = canonical name to store and display
 */

export const SKILL_SYNONYMS: Record<string, string> = {
  // ── JavaScript / Node ──────────────────────────────────────────────────────
  javascript: "JavaScript",
  "java script": "JavaScript",
  js: "JavaScript",
  ecmascript: "JavaScript",
  es6: "JavaScript",
  es2015: "JavaScript",
  "es6+": "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  "node.js": "Node.js",
  nodejs: "Node.js",
  "node js": "Node.js",
  node: "Node.js",
  deno: "Deno",
  bun: "Bun",

  // ── Frontend Frameworks ────────────────────────────────────────────────────
  react: "React",
  reactjs: "React",
  "react.js": "React",
  "react js": "React",
  "next.js": "Next.js",
  nextjs: "Next.js",
  "next js": "Next.js",
  "vue.js": "Vue.js",
  vuejs: "Vue.js",
  vue: "Vue.js",
  "vue 3": "Vue.js",
  angular: "Angular",
  angularjs: "Angular",
  svelte: "Svelte",
  sveltekit: "SvelteKit",
  astro: "Astro",
  remix: "Remix",
  nuxt: "Nuxt.js",
  "nuxt.js": "Nuxt.js",
  tailwind: "TailwindCSS",
  tailwindcss: "TailwindCSS",
  "tailwind css": "TailwindCSS",

  // ── Backend Frameworks ─────────────────────────────────────────────────────
  express: "Express",
  "express.js": "Express",
  fastify: "Fastify",
  nestjs: "NestJS",
  "nest.js": "NestJS",
  hono: "Hono",
  elysia: "Elysia",
  koa: "Koa",
  hapi: "Hapi",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  "fast api": "FastAPI",
  starlette: "Starlette",
  aiohttp: "aiohttp",
  spring: "Spring",
  "spring boot": "Spring Boot",
  springboot: "Spring Boot",
  "spring framework": "Spring",
  quarkus: "Quarkus",
  micronaut: "Micronaut",
  rails: "Ruby on Rails",
  "ruby on rails": "Ruby on Rails",
  laravel: "Laravel",
  symfony: "Symfony",
  "asp.net": "ASP.NET",
  ".net": ".NET",
  dotnet: ".NET",
  "dot net": ".NET",
  "asp.net core": "ASP.NET Core",
  gin: "Gin",
  fiber: "Fiber",
  echo: "Echo",
  actix: "Actix",
  axum: "Axum",

  // ── Languages ─────────────────────────────────────────────────────────────
  python: "Python",
  golang: "Go",
  "go lang": "Go",
  "go language": "Go",
  "the go language": "Go",
  rust: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  scala: "Scala",
  ruby: "Ruby",
  php: "PHP",
  "c++": "C++",
  cpp: "C++",
  "c#": "C#",
  "c sharp": "C#",
  swift: "Swift",
  "objective-c": "Objective-C",
  r: "R",
  elixir: "Elixir",
  erlang: "Erlang",
  haskell: "Haskell",
  clojure: "Clojure",
  dart: "Dart",
  julia: "Julia",
  lua: "Lua",
  perl: "Perl",
  groovy: "Groovy",
  ocaml: "OCaml",
  zig: "Zig",
  nim: "Nim",

  // ── Cloud ─────────────────────────────────────────────────────────────────
  aws: "AWS",
  "amazon web services": "AWS",
  "amazon aws": "AWS",
  "aws cloud": "AWS",
  gcp: "GCP",
  "google cloud": "GCP",
  "google cloud platform": "GCP",
  azure: "Azure",
  "microsoft azure": "Azure",
  "azure cloud": "Azure",
  "oracle cloud": "Oracle Cloud",
  oci: "Oracle Cloud",
  digitalocean: "DigitalOcean",
  "digital ocean": "DigitalOcean",
  linode: "Linode",
  akamai: "Akamai",
  heroku: "Heroku",
  fly: "Fly.io",
  "fly.io": "Fly.io",
  render: "Render",
  vercel: "Vercel",
  netlify: "Netlify",
  cloudflare: "Cloudflare",
  "cloudflare workers": "Cloudflare Workers",
  lambda: "AWS Lambda",
  "aws lambda": "AWS Lambda",
  "lambda function": "AWS Lambda",
  ec2: "AWS EC2",
  s3: "AWS S3",
  rds: "AWS RDS",
  eks: "AWS EKS",
  ecs: "AWS ECS",
  dynamodb: "DynamoDB",
  "big query": "BigQuery",
  bigquery: "BigQuery",
  "cloud run": "Google Cloud Run",
  gke: "Google GKE",
  "cloud functions": "Google Cloud Functions",
  aks: "Azure AKS",

  // ── Databases ─────────────────────────────────────────────────────────────
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  "pg ": "PostgreSQL",
  mysql: "MySQL",
  mariadb: "MariaDB",
  sqlite: "SQLite",
  "sql server": "SQL Server",
  "microsoft sql server": "SQL Server",
  mssql: "SQL Server",
  oracle: "Oracle DB",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  "cosmos db": "CosmosDB",
  cosmosdb: "CosmosDB",
  couchdb: "CouchDB",
  cassandra: "Cassandra",
  "apache cassandra": "Cassandra",
  scylladb: "ScyllaDB",
  "amazon dynamodb": "DynamoDB",
  bigtable: "Bigtable",
  "cloud bigtable": "Bigtable",
  arangodb: "ArangoDB",
  neo4j: "Neo4j",
  "graph database": "Neo4j",
  influxdb: "InfluxDB",
  timescaledb: "TimescaleDB",
  questdb: "QuestDB",
  clickhouse: "ClickHouse",
  "click house": "ClickHouse",
  snowflake: "Snowflake",
  redshift: "Amazon Redshift",
  "amazon redshift": "Amazon Redshift",
  databricks: "Databricks",
  "delta lake": "Delta Lake",
  "apache hive": "Hive",
  hive: "Hive",
  duckdb: "DuckDB",
  supabase: "Supabase",

  // ── Caching ───────────────────────────────────────────────────────────────
  redis: "Redis",
  "redis cache": "Redis",
  memcached: "Memcached",
  "in-memory cache": "Redis",
  "cache layer": "Redis",
  dragonfly: "Dragonfly",
  keydb: "KeyDB",

  // ── Message Queues ────────────────────────────────────────────────────────
  kafka: "Apache Kafka",
  "apache kafka": "Apache Kafka",
  "event streaming": "Apache Kafka",
  rabbitmq: "RabbitMQ",
  "rabbit mq": "RabbitMQ",
  sqs: "AWS SQS",
  "aws sqs": "AWS SQS",
  "amazon sqs": "AWS SQS",
  sns: "AWS SNS",
  "aws sns": "AWS SNS",
  pubsub: "Google Pub/Sub",
  "google pub/sub": "Google Pub/Sub",
  "azure service bus": "Azure Service Bus",
  "service bus": "Azure Service Bus",
  nats: "NATS",
  pulsar: "Apache Pulsar",
  "apache pulsar": "Apache Pulsar",
  kinesis: "AWS Kinesis",
  "amazon kinesis": "AWS Kinesis",
  celery: "Celery",
  bullmq: "BullMQ",
  "bull queue": "BullMQ",
  sidekiq: "Sidekiq",

  // ── DevOps & Infra ────────────────────────────────────────────────────────
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  kubectl: "Kubernetes",
  helm: "Helm",
  "helm chart": "Helm",
  docker: "Docker",
  "docker container": "Docker",
  dockerfile: "Docker",
  "docker compose": "Docker Compose",
  "docker-compose": "Docker Compose",
  containerd: "containerd",
  podman: "Podman",
  terraform: "Terraform",
  "infrastructure as code": "Terraform",
  iac: "Terraform",
  pulumi: "Pulumi", // ← New technology
  ansible: "Ansible",
  puppet: "Puppet",
  chef: "Chef",
  saltstack: "SaltStack",
  "aws cdk": "AWS CDK",
  cdk: "AWS CDK",
  crossplane: "Crossplane",
  argocd: "ArgoCD",
  "argo cd": "ArgoCD",
  "argo workflows": "Argo Workflows",
  fluxcd: "FluxCD",
  "flux cd": "FluxCD",
  istio: "Istio",
  envoy: "Envoy",
  linkerd: "Linkerd",
  vault: "HashiCorp Vault",
  "hashicorp vault": "HashiCorp Vault",
  consul: "HashiCorp Consul",
  nomad: "HashiCorp Nomad",
  packer: "HashiCorp Packer",
  vagrant: "Vagrant",
  temporal: "Temporal", // ← New technology
  conductor: "Netflix Conductor",
  "apache airflow": "Apache Airflow",
  airflow: "Apache Airflow",
  prefect: "Prefect",
  dagster: "Dagster",
  luigi: "Luigi",

  // ── CI/CD ──────────────────────────────────────────────────────────────────
  "github actions": "GitHub Actions",
  "gitlab ci": "GitLab CI",
  "gitlab ci/cd": "GitLab CI",
  jenkins: "Jenkins",
  circleci: "CircleCI",
  travis: "Travis CI",
  "travis ci": "Travis CI",
  buildkite: "Buildkite",
  "azure devops": "Azure DevOps",
  "azure pipelines": "Azure Pipelines",
  teamcity: "TeamCity",
  drone: "Drone CI",
  "tekton": "Tekton",
  "github ci": "GitHub Actions",

  // ── Observability ─────────────────────────────────────────────────────────
  opentelemetry: "OpenTelemetry", // ← New technology
  otel: "OpenTelemetry",
  "open telemetry": "OpenTelemetry",
  datadog: "Datadog",
  "data dog": "Datadog",
  prometheus: "Prometheus",
  grafana: "Grafana",
  jaeger: "Jaeger",
  zipkin: "Zipkin",
  "new relic": "New Relic",
  newrelic: "New Relic",
  "dynatrace": "Dynatrace",
  "dynatrace apm": "Dynatrace",
  splunk: "Splunk",
  elastic: "Elasticsearch",
  elasticsearch: "Elasticsearch",
  opensearch: "OpenSearch",
  "open search": "OpenSearch",
  kibana: "Kibana",
  logstash: "Logstash",
  fluentd: "Fluentd",
  "fluent bit": "Fluent Bit",
  pagerduty: "PagerDuty",
  opsgenie: "OpsGenie",
  "victoria metrics": "VictoriaMetrics",
  loki: "Grafana Loki",
  tempo: "Grafana Tempo",
  honeycomb: "Honeycomb",
  sentry: "Sentry",

  // ── AI / ML ───────────────────────────────────────────────────────────────
  "machine learning": "Machine Learning",
  ml: "Machine Learning",
  "deep learning": "Deep Learning",
  "neural network": "Deep Learning",
  nlp: "NLP",
  "natural language processing": "NLP",
  pytorch: "PyTorch",
  torch: "PyTorch",
  tensorflow: "TensorFlow",
  "tf ": "TensorFlow",
  "tf.keras": "TensorFlow",
  keras: "Keras",
  "scikit-learn": "scikit-learn",
  sklearn: "scikit-learn",
  "scikit learn": "scikit-learn",
  xgboost: "XGBoost",
  lightgbm: "LightGBM",
  catboost: "CatBoost",
  "hugging face": "Hugging Face",
  huggingface: "Hugging Face",
  transformers: "Hugging Face Transformers",
  langchain: "LangChain",
  "lang chain": "LangChain",
  langgraph: "LangGraph", // ← New technology
  "lang graph": "LangGraph",
  crewai: "CrewAI", // ← New technology
  "crew ai": "CrewAI",
  openai: "OpenAI",
  "open ai": "OpenAI",
  anthropic: "Anthropic",
  "claude": "Claude",
  "gemini": "Gemini",
  "llm": "LLMs",
  "large language model": "LLMs",
  "large language models": "LLMs",
  rag: "RAG",
  "retrieval augmented generation": "RAG",
  "vector database": "Vector Databases",
  pinecone: "Pinecone",
  weaviate: "Weaviate",
  qdrant: "Qdrant",
  chroma: "ChromaDB",
  chromadb: "ChromaDB",
  "chroma db": "ChromaDB",
  milvus: "Milvus",
  pandas: "Pandas",
  numpy: "NumPy",
  scipy: "SciPy",
  matplotlib: "Matplotlib",
  seaborn: "Seaborn",
  plotly: "Plotly",
  "apache spark": "Apache Spark",
  pyspark: "PySpark",
  "spark streaming": "Spark Streaming",
  ray: "Ray", // ← New technology
  "ray serve": "Ray Serve",
  mlflow: "MLflow",
  kubeflow: "Kubeflow",
  bentoml: "BentoML",
  triton: "Triton Inference Server",
  vllm: "vLLM",
  onnx: "ONNX",
  "model context protocol": "MCP",
  mcp: "MCP", // ← New technology

  // ── Distributed Systems ───────────────────────────────────────────────────
  grpc: "gRPC",
  "protocol buffers": "Protobuf",
  protobuf: "Protobuf",
  graphql: "GraphQL",
  apollo: "Apollo",
  "rest api": "REST API",
  restful: "REST API",
  "rest ": "REST API",
  openapi: "OpenAPI",
  swagger: "Swagger/OpenAPI",
  websocket: "WebSockets",
  "web sockets": "WebSockets",
  mqtt: "MQTT",
  amqp: "AMQP",

  // ── Testing ───────────────────────────────────────────────────────────────
  jest: "Jest",
  vitest: "Vitest",
  mocha: "Mocha",
  jasmine: "Jasmine",
  cypress: "Cypress",
  playwright: "Playwright",
  selenium: "Selenium",
  puppeteer: "Puppeteer",
  "testing library": "Testing Library",
  pytest: "pytest",
  unittest: "unittest",
  junit: "JUnit",
  "test driven": "TDD",
  tdd: "TDD",
  bdd: "BDD",
  "behavior driven": "BDD",
  "contract testing": "Contract Testing",
  pact: "Pact",
  "load testing": "Load Testing",
  locust: "Locust",
  "k6": "k6",
  "apache jmeter": "JMeter",
  jmeter: "JMeter",

  // ── Security ─────────────────────────────────────────────────────────────
  oauth: "OAuth",
  "oauth2": "OAuth 2.0",
  "oauth 2.0": "OAuth 2.0",
  jwt: "JWT",
  saml: "SAML",
  "zero trust": "Zero Trust",
  "public key infrastructure": "PKI",
  pki: "PKI",
  "devsecops": "DevSecOps",
  owasp: "OWASP",
  "penetration testing": "Penetration Testing",
  pentest: "Penetration Testing",
  "soc 2": "SOC 2",
  "iso 27001": "ISO 27001",

  // ── Version Control & Collaboration ──────────────────────────────────────
  git: "Git",
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
  svn: "SVN",
  mercurial: "Mercurial",

  // ── Operating Systems ─────────────────────────────────────────────────────
  linux: "Linux",
  ubuntu: "Ubuntu",
  centos: "CentOS",
  debian: "Debian",
  "red hat": "RHEL",
  rhel: "RHEL",
  unix: "Unix",
  bash: "Bash",
  "shell script": "Shell Scripting",
  "shell scripting": "Shell Scripting",
  "powershell": "PowerShell",

  // ── Data Engineering ──────────────────────────────────────────────────────
  dbt: "dbt",
  "data build tool": "dbt",
  "apache flink": "Apache Flink",
  flink: "Apache Flink",
  "apache beam": "Apache Beam",
  beam: "Apache Beam",
  nifi: "Apache NiFi",
  "apache nifi": "Apache NiFi",
  fivetran: "Fivetran",
  airbyte: "Airbyte",
  "great expectations": "Great Expectations",
  "lake formation": "AWS Lake Formation",
};

/**
 * Category assignments for all canonical skill names.
 * Used by SkillCategorizer after normalization.
 */
export const SKILL_CATEGORIES: Record<string, SkillCategory> = {
  // Languages
  JavaScript: "Languages", TypeScript: "Languages", Python: "Languages",
  Go: "Languages", Rust: "Languages", Java: "Languages", Kotlin: "Languages",
  Scala: "Languages", Ruby: "Languages", PHP: "Languages", "C++": "Languages",
  "C#": "Languages", Swift: "Languages", "Objective-C": "Languages",
  R: "Languages", Elixir: "Languages", Erlang: "Languages", Haskell: "Languages",
  Clojure: "Languages", Dart: "Languages", Julia: "Languages", Lua: "Languages",
  Perl: "Languages", Groovy: "Languages", OCaml: "Languages", Zig: "Languages",
  Nim: "Languages",

  // Frontend
  React: "Frontend", "Next.js": "Frontend", "Vue.js": "Frontend", Angular: "Frontend",
  Svelte: "Frontend", SvelteKit: "Frontend", Astro: "Frontend", Remix: "Frontend",
  "Nuxt.js": "Frontend", TailwindCSS: "Frontend", "Node.js": "Backend",

  // Backend
  Express: "Backend", Fastify: "Backend", NestJS: "Backend", Hono: "Backend",
  Elysia: "Backend", Koa: "Backend", Hapi: "Backend", Django: "Backend",
  Flask: "Backend", FastAPI: "Backend", Spring: "Backend", "Spring Boot": "Backend",
  Quarkus: "Backend", Micronaut: "Backend", "Ruby on Rails": "Backend",
  Laravel: "Backend", Symfony: "Backend", "ASP.NET": "Backend", ".NET": "Backend",
  "ASP.NET Core": "Backend", Gin: "Backend", Fiber: "Backend", Echo: "Backend",
  Actix: "Backend", Axum: "Backend", Deno: "Backend", Bun: "Backend",
  starlette: "Backend",

  // Frameworks (cross-cutting)
  aiohttp: "Frameworks", Celery: "Frameworks",

  // Cloud
  AWS: "Cloud", GCP: "Cloud", Azure: "Cloud", "Oracle Cloud": "Cloud",
  DigitalOcean: "Cloud", Linode: "Cloud", Akamai: "Cloud", Heroku: "Cloud",
  "Fly.io": "Cloud", Render: "Cloud", Vercel: "Cloud", Netlify: "Cloud",
  Cloudflare: "Cloud", "Cloudflare Workers": "Cloud", "AWS Lambda": "Cloud",
  "AWS EC2": "Cloud", "AWS S3": "Cloud", "AWS RDS": "Cloud", "AWS EKS": "Cloud",
  "AWS ECS": "Cloud", DynamoDB: "Cloud", "Google Cloud Run": "Cloud",
  "Google GKE": "Cloud", "Google Cloud Functions": "Cloud", "Azure AKS": "Cloud",
  BigQuery: "Cloud",

  // Databases
  PostgreSQL: "Databases", MySQL: "Databases", MariaDB: "Databases",
  SQLite: "Databases", "SQL Server": "Databases", "Oracle DB": "Databases",
  MongoDB: "Databases", CosmosDB: "Databases", CouchDB: "Databases",
  Cassandra: "Databases", ScyllaDB: "Databases", ArangoDB: "Databases",
  Neo4j: "Databases", InfluxDB: "Databases", TimescaleDB: "Databases",
  QuestDB: "Databases", ClickHouse: "Databases", Snowflake: "Databases",
  "Amazon Redshift": "Databases", Databricks: "Databases", "Delta Lake": "Databases",
  Hive: "Databases", DuckDB: "Databases", Supabase: "Databases",
  Bigtable: "Databases",

  // Caching
  Redis: "Caching", Memcached: "Caching", Dragonfly: "Caching", KeyDB: "Caching",

  // Messaging
  "Apache Kafka": "Messaging", RabbitMQ: "Messaging", "AWS SQS": "Messaging",
  "AWS SNS": "Messaging", "Google Pub/Sub": "Messaging", "Azure Service Bus": "Messaging",
  NATS: "Messaging", "Apache Pulsar": "Messaging", "AWS Kinesis": "Messaging",
  BullMQ: "Messaging", Sidekiq: "Messaging",

  // DevOps
  Kubernetes: "DevOps", Helm: "DevOps", Docker: "DevOps", "Docker Compose": "DevOps",
  containerd: "DevOps", Podman: "DevOps", ArgoCD: "DevOps", "Argo Workflows": "DevOps",
  FluxCD: "DevOps", Istio: "DevOps", Envoy: "DevOps", Linkerd: "DevOps",

  // Infrastructure
  Terraform: "Infrastructure", Pulumi: "Infrastructure", Ansible: "Infrastructure",
  Puppet: "Infrastructure", Chef: "Infrastructure", SaltStack: "Infrastructure",
  "AWS CDK": "Infrastructure", Crossplane: "Infrastructure",
  "HashiCorp Vault": "Infrastructure", "HashiCorp Consul": "Infrastructure",
  "HashiCorp Nomad": "Infrastructure", "HashiCorp Packer": "Infrastructure",
  Vagrant: "Infrastructure",

  // CI/CD
  "GitHub Actions": "CI_CD", "GitLab CI": "CI_CD", Jenkins: "CI_CD",
  CircleCI: "CI_CD", "Travis CI": "CI_CD", Buildkite: "CI_CD",
  "Azure DevOps": "CI_CD", "Azure Pipelines": "CI_CD", TeamCity: "CI_CD",
  Tekton: "CI_CD", "Drone CI": "CI_CD",

  // Observability
  OpenTelemetry: "Observability", Datadog: "Observability", Prometheus: "Observability",
  Grafana: "Observability", Jaeger: "Observability", Zipkin: "Observability",
  "New Relic": "Observability", Dynatrace: "Observability", Splunk: "Observability",
  Elasticsearch: "Observability", OpenSearch: "Observability", Kibana: "Observability",
  Logstash: "Observability", Fluentd: "Observability", "Fluent Bit": "Observability",
  PagerDuty: "Observability", OpsGenie: "Observability", VictoriaMetrics: "Observability",
  "Grafana Loki": "Observability", "Grafana Tempo": "Observability",
  Honeycomb: "Observability", Sentry: "Observability",

  // Workflow Orchestration / Infrastructure
  Temporal: "Infrastructure", "Apache Airflow": "Infrastructure",
  Prefect: "Infrastructure", Dagster: "Infrastructure", Luigi: "Infrastructure",
  "Netflix Conductor": "Infrastructure",

  // AI/ML
  "Machine Learning": "AI_ML", "Deep Learning": "AI_ML", NLP: "AI_ML",
  PyTorch: "AI_ML", TensorFlow: "AI_ML", Keras: "AI_ML",
  "scikit-learn": "AI_ML", XGBoost: "AI_ML", LightGBM: "AI_ML",
  CatBoost: "AI_ML", "Hugging Face": "AI_ML", "Hugging Face Transformers": "AI_ML",
  LangChain: "AI_ML", LangGraph: "AI_ML", CrewAI: "AI_ML", OpenAI: "AI_ML",
  Anthropic: "AI_ML", Claude: "AI_ML", Gemini: "AI_ML", LLMs: "AI_ML",
  RAG: "AI_ML", "Vector Databases": "AI_ML", Pinecone: "AI_ML",
  Weaviate: "AI_ML", Qdrant: "AI_ML", ChromaDB: "AI_ML", Milvus: "AI_ML",
  Pandas: "AI_ML", NumPy: "AI_ML", SciPy: "AI_ML", Matplotlib: "AI_ML",
  Seaborn: "AI_ML", Plotly: "AI_ML", "Apache Spark": "AI_ML", PySpark: "AI_ML",
  "Spark Streaming": "AI_ML", Ray: "AI_ML", "Ray Serve": "AI_ML",
  MLflow: "AI_ML", Kubeflow: "AI_ML", BentoML: "AI_ML",
  "Triton Inference Server": "AI_ML", vLLM: "AI_ML", ONNX: "AI_ML",
  MCP: "AI_ML",

  // Testing
  Jest: "Testing", Vitest: "Testing", Mocha: "Testing", Jasmine: "Testing",
  Cypress: "Testing", Playwright: "Testing", Selenium: "Testing",
  Puppeteer: "Testing", "Testing Library": "Testing", pytest: "Testing",
  unittest: "Testing", JUnit: "Testing", TDD: "Testing", BDD: "Testing",
  "Contract Testing": "Testing", Pact: "Testing", "Load Testing": "Testing",
  Locust: "Testing", k6: "Testing", JMeter: "Testing",

  // Security
  "OAuth 2.0": "Security", JWT: "Security", SAML: "Security",
  "Zero Trust": "Security", PKI: "Security", DevSecOps: "Security",
  OWASP: "Security", "Penetration Testing": "Security", "SOC 2": "Security",
  "ISO 27001": "Security",

  // Version Control
  Git: "VersionControl", GitHub: "VersionControl", GitLab: "VersionControl",
  Bitbucket: "VersionControl", SVN: "VersionControl", Mercurial: "VersionControl",

  // OS
  Linux: "OperatingSystems", Ubuntu: "OperatingSystems", CentOS: "OperatingSystems",
  Debian: "OperatingSystems", RHEL: "OperatingSystems", Unix: "OperatingSystems",
  Bash: "OperatingSystems", "Shell Scripting": "OperatingSystems",
  PowerShell: "OperatingSystems",

  // APIs
  "REST API": "Backend", GraphQL: "Backend", gRPC: "Backend",
  Protobuf: "Backend", Apollo: "Backend", OpenAPI: "Backend",
  "Swagger/OpenAPI": "Backend", WebSockets: "Backend", MQTT: "Messaging",
  AMQP: "Messaging",

  // Data Engineering
  dbt: "Tools", "Apache Flink": "Tools", "Apache Beam": "Tools",
  "Apache NiFi": "Tools", Fivetran: "Tools", Airbyte: "Tools",
  "Great Expectations": "Tools",
};

/**
 * Resolve a raw technology mention to its canonical name.
 * Returns null if the input is too short, clearly not a technology, or empty.
 */
export function normalizeSkill(raw: string): string | null {
  if (!raw || raw.length < 2) return null;

  const lower = raw.toLowerCase().trim();

  // Direct synonym lookup
  if (SKILL_SYNONYMS[lower]) return SKILL_SYNONYMS[lower];

  // Remove trailing punctuation artifacts and retry
  const cleaned = lower.replace(/[.,:;()[\]{}]+$/, "").trim();
  if (SKILL_SYNONYMS[cleaned]) return SKILL_SYNONYMS[cleaned];

  // Partial suffix normalization — e.g. "reactjs" → "react" → "React"
  const deSuffixed = cleaned.replace(/\.?js$/i, "").trim();
  if (SKILL_SYNONYMS[deSuffixed]) return SKILL_SYNONYMS[deSuffixed];

  // If not in synonyms but is in categories (already canonical), return as-is
  const titleCased = raw.trim().replace(/^\w/, (c) => c.toUpperCase());
  if (SKILL_CATEGORIES[titleCased]) return titleCased;

  // Dynamic extraction: return the raw value title-cased if it looks like a tech term
  // Must be 2-40 chars, contain at least one letter, and not be a common English word
  if (
    cleaned.length >= 2 &&
    cleaned.length <= 40 &&
    /[a-zA-Z]/.test(cleaned) &&
    !COMMON_NON_TECH_WORDS.has(cleaned)
  ) {
    return titleCased;
  }

  return null;
}

/** Common English words that are not technology skills — prevents false positives */
const COMMON_NON_TECH_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "have", "will", "from",
  "work", "team", "role", "join", "build", "create", "design", "develop",
  "strong", "good", "great", "well", "best", "high", "large", "small",
  "new", "old", "key", "core", "main", "base", "fast", "real", "own",
  "all", "any", "may", "can", "need", "use", "help", "make", "take",
  "give", "get", "set", "run", "end", "see", "say", "know", "think",
  "also", "more", "than", "but", "not", "has", "had", "been", "were",
  "are", "our", "you", "your", "its", "them", "they", "their",
  "experience", "skills", "years", "ability", "knowledge", "background",
  "understanding", "familiarity", "proficiency", "expertise",
  "development", "engineering", "software", "systems", "services",
  "applications", "platform", "environment", "production", "scale",
  "performance", "quality", "delivery", "value", "impact", "results",
]);
