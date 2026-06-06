import sys
from dotenv import load_dotenv
import os
import openai
from langchain_community.graphs import Neo4jGraph
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
UNI_API_KEY = os.getenv("UNI_API_KEY")
UNI_API_BASE_URL = os.getenv("UNI_API_BASE_URL")

question = sys.argv[1]

oai = openai.OpenAI(api_key=UNI_API_KEY, base_url=UNI_API_BASE_URL)
embedding_response = oai.embeddings.create(model="qwen3-embedding-8b", input=[question])
embedding = embedding_response.data[0].embedding

graph = Neo4jGraph(url=NEO4J_URI, username=NEO4J_USERNAME, password=NEO4J_PASSWORD, database=os.getenv("NEO4J_DATABASE"))

vector_results = graph.query(
    """
    CALL db.index.vector.queryNodes('node_embeddings', 3, $embedding)
    YIELD node, score
    RETURN node.id AS id, node.name AS name, labels(node) AS labels, score
    """,
    params={"embedding": embedding},
)

print("=== Entry Nodes (Vector Search) ===")
for r in vector_results:
    print(f"  [{r['labels']}] {r['name']} (id={r['id']}, score={r['score']:.4f})")

triples = []
for r in vector_results:
    node_id = r["id"]
    hops = graph.query(
        """
        MATCH (start)-[r]-(neighbor)
        WHERE start.id = $node_id
        RETURN start.id AS from_id, type(r) AS relation, neighbor.id AS to_id
        """,
        params={"node_id": node_id},
    )
    for h in hops:
        triple = f"({h['from_id']})-[{h['relation']}]->({h['to_id']})"
        if triple not in triples:
            triples.append(triple)

    hop2_ids = list({h["to_id"] for h in hops})
    for hop1_id in hop2_ids:
        hops2 = graph.query(
            """
            MATCH (start)-[r]-(neighbor)
            WHERE start.id = $node_id
            RETURN start.id AS from_id, type(r) AS relation, neighbor.id AS to_id
            """,
            params={"node_id": hop1_id},
        )
        for h in hops2:
            triple = f"({h['from_id']})-[{h['relation']}]->({h['to_id']})"
            if triple not in triples:
                triples.append(triple)

        hop2_neighbors = list({h["to_id"] for h in hops2})
        for hop2_id in hop2_neighbors:
            hops3 = graph.query(
                """
                MATCH (start)-[r]-(neighbor)
                WHERE start.id = $node_id
                RETURN start.id AS from_id, type(r) AS relation, neighbor.id AS to_id
                """,
                params={"node_id": hop2_id},
            )
            for h in hops3:
                triple = f"({h['from_id']})-[{h['relation']}]->({h['to_id']})"
                if triple not in triples:
                    triples.append(triple)

context = "\n".join(triples)

print("\n=== Traversal Context (Triples) ===")
print(context)

llm = ChatOpenAI(
    model="gpt-5.4-mini",
    openai_api_key=UNI_API_KEY,
    openai_api_base=UNI_API_BASE_URL,
)

prompt = f"""Beantworte die folgende Frage basierend auf dem gegebenen Graphen-Kontext.

Kontext:
{context}

Frage: {question}
Antwort:"""

response = llm.invoke([HumanMessage(content=prompt)])

print("\n=== Antwort ===")
print(response.content)
