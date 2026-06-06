# Knowledge Graph Demo (GraphRAG)

A minimal **GraphRAG** (Graph-based Retrieval-Augmented Generation) prototype. It reads a short unstructured text, automatically extracts entities and relationships via an LLM, stores them with vector embeddings in a Neo4j graph database, and answers natural-language questions using two distinct retrieval strategies.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Language | Python 3.10+ |
| Orchestration | LangChain (`langchain`, `langchain-community`, `langchain-experimental`) |
| Graph DB | Neo4j AuraDB (free cloud tier) |
| LLM | OpenAI-compatible endpoint (`gpt-5.4-mini`) |
| Embeddings | OpenAI-compatible endpoint (`qwen3-embedding-8b`) |

---

## Project Structure

```
.
├── .env                  # credentials — not committed (see setup below)
├── requirements.txt
├── data/
│   ├── sample.txt        # German-language demo text (people, companies, cities)
│   └── fleetwood_mac.txt # second demo text
├── ingest.py             # Step 1: extract graph + compute & store embeddings
├── query_cypher.py       # Step 2a: question answering via LLM-generated Cypher
└── query_vector.py       # Step 2b: question answering via vector search + graph traversal
```

---

## Setup

### 1. Prerequisites

- Python 3.10+
- A free [Neo4j AuraDB](https://neo4j.com/cloud/aura/) instance
- Access to an OpenAI-compatible LLM & embedding API

### 2. Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
NEO4J_URI=neo4j+s://<your-aura-instance>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<your-password>
NEO4J_DATABASE=neo4j
UNI_API_KEY=<your-api-key>
UNI_API_BASE_URL=<openai-compatible-base-url>
```

---

## Running the Demo

### Step 1 — Ingest a text file

Reads the text, extracts a knowledge graph via `LLMGraphTransformer`, writes nodes & relationships to Neo4j, generates a 2–3 sentence LLM summary for any `Person` nodes missing a description, and stores vector embeddings on every node.

```bash
python ingest.py data/sample.txt
```

> **Note:** Each run clears the database first (`MATCH (n) DETACH DELETE n`), so ingesting a new file replaces the previous graph.

### Step 2a — Query with Cypher (Strategy A)

The LLM translates your question into a Cypher query, executes it against Neo4j, and returns a natural-language answer. Best for precise, structural questions.

```bash
python query_cypher.py "Who founded NovaTech?"
python query_cypher.py "Where does Lukas Brenner live?"
```

### Step 2b — Query with Vector Search + Graph Traversal (Strategy B)

Your question is embedded, the 3 most semantically similar nodes are found, and a 3-hop neighbourhood is traversed to build context. Best for fuzzy or multi-hop questions.

```bash
python query_vector.py "Where does a friend of the NovaTech founder live?"
python query_vector.py "Who works in AI research?"
```

---

## How It Works

```
Text file
   │
   ▼
LLMGraphTransformer  ──►  Neo4j graph (nodes + relationships)
                               │
                    Embeddings (qwen3-embedding-8b)
                               │
                    ┌──────────┴──────────┐
                    │                     │
             Cypher QA Chain       Vector search
             (exact structure)    + 3-hop traversal
                    │                     │
                    └──────────┬──────────┘
                               │
                         LLM final answer
```

### Retrieval strategies compared

| | Cypher (A) | Vector + Traversal (B) |
|---|---|---|
| Strength | Precise structural queries | Fuzzy / semantic matching, multi-hop |
| Weakness | Fails if LLM generates invalid Cypher | May include noisy context |
| Good question example | "Who is the CEO of X?" | "Who is connected to someone working in AI?" |
