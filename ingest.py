import sys
from dotenv import load_dotenv
import os
from langchain_community.graphs import Neo4jGraph
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
import openai

load_dotenv()

NEO4J_URI = os.environ["NEO4J_URI"]
NEO4J_USERNAME = os.environ["NEO4J_USERNAME"]
NEO4J_PASSWORD = os.environ["NEO4J_PASSWORD"]
UNI_API_KEY = os.environ["UNI_API_KEY"]
UNI_API_BASE_URL = os.environ["UNI_API_BASE_URL"]


def main():
    path = sys.argv[1]
    text = open(path).read()
    print(f"Read {len(text.split())} words from {path}")

    graph = Neo4jGraph(
        url=NEO4J_URI,
        username=NEO4J_USERNAME,
        password=NEO4J_PASSWORD,
        database=os.environ["NEO4J_DATABASE"],
    )

    llm = ChatOpenAI(
        model="gpt-5.4-mini",
        openai_api_key=UNI_API_KEY,
        openai_api_base=UNI_API_BASE_URL,
    )

    transformer = LLMGraphTransformer(
        llm=llm,
        node_properties=[
            "description",
            "role",
            "birth_year",
            "death_year",
            "nationality",
        ],
        relationship_properties=[
            "description",
            "context",
            "since",
            "until",
        ],
        allowed_relationships=[
            # membership / career
            "MEMBER_OF", "FOUNDED", "FOUNDED_BY", "FOUNDED_IN",
            "LEFT", "REJOINED", "REUNITED", "RETIRED",
            "HIRED", "FIRED", "REPLACED",
            # creative
            "CREATED", "WROTE", "AUTHORED", "PRODUCED",
            "RELEASED", "COVERED", "RECORDED", "PERFORMED",
            "INSPIRED", "INFLUENCED",
            # personal
            "PARTNER", "MARRIED", "DIVORCED", "AFFAIR",
            "SIBLING", "CHILD_OF", "PARENT_OF",
            # other — MENTIONS intentionally excluded
            "HEARD", "MOVED_TO", "ASSOCIATED_WITH",
        ],
        additional_instructions="""
You MUST choose the most specific relationship type. Use this guide:

Career / membership:
  MEMBER_OF   — person is or was in a band or organisation
  LEFT        — person departed from a band or organisation
  REJOINED    — person returned to a band after leaving
  REUNITED    — band reformed after a breakup
  RETIRED     — person ended their career
  FOUNDED     — person started an organisation
  HIRED / FIRED / REPLACED — employment changes

Creative:
  WROTE / AUTHORED — wrote a song, album, book, or article
  PRODUCED    — produced a recording or project
  RELEASED    — officially released a work
  COVERED     — performed or recorded another artist's song
  RECORDED    — recorded a track or album
  PERFORMED   — performed live
  INSPIRED / INFLUENCED — one entity shaped another

Personal:
  MARRIED / DIVORCED — marital relationship
  AFFAIR      — romantic relationship outside marriage
  PARTNER     — long-term romantic partner (unmarried)
  SIBLING / CHILD_OF / PARENT_OF — family relationships

Other:
  HEARD       — person heard or discovered music or art
  MOVED_TO    — relocated to a place
  ASSOCIATED_WITH — use ONLY when absolutely no specific type fits

Never use MENTIONS. It is not allowed. If you are tempted to use MENTIONS,
ask yourself what the actual relationship is and pick the specific type instead.
""",
    )

    print("Clearing database...")
    graph.query("MATCH (n) DETACH DELETE n")

    doc = Document(page_content=text)   
    print("Extracting graph from text...")
    graph_docs = transformer.convert_to_graph_documents([doc])

    graph.add_graph_documents(graph_docs, baseEntityLabel=True, include_source=True)
    print(f"Wrote {len(graph_docs[0].nodes)} nodes and {len(graph_docs[0].relationships)} relationships to Neo4j")

    # Generate summaries for Person nodes that the extractor left without a description.
    print("Generating summaries for Person nodes without a description...")
    persons_without_summary = graph.query(
        "MATCH (p:Person) WHERE p.description IS NULL OR p.description = '' RETURN p.id AS id"
    )
    for row in persons_without_summary:
        person_id = row["id"]
        summary_response = llm.invoke(
            f"In 2-3 sentences, summarise who {person_id} is based on this article:\n\n{text[:6000]}"
        )
        summary = summary_response.content.strip()
        graph.query(
            "MATCH (p:Person {id: $id}) SET p.description = $description",
            {"id": person_id, "description": summary},
        )
        print(f"  Summarised: {person_id}")

    oai = openai.OpenAI(api_key=UNI_API_KEY, base_url=UNI_API_BASE_URL)

    nodes = graph_docs[0].nodes
    print(f"Computing embeddings for {len(nodes)} nodes...")
    for node in nodes:
        parts = [node.type, node.id]
        for k, v in (node.properties or {}).items():
            parts.append(f"{k}:{v}")
        embedding_text = " ".join(parts)

        response = oai.embeddings.create(
            model="qwen3-embedding-8b",
            input=embedding_text,
        )
        vector = response.data[0].embedding

        graph.query(
            "MATCH (n) WHERE n.id = $id SET n.embedding = $embedding",
            {"id": node.id, "embedding": vector},
        )
        print(f"  Stored embedding for {node.type}:{node.id}")

    graph.query(
        "CREATE VECTOR INDEX node_embeddings IF NOT EXISTS "
        "FOR (n:__Entity__) ON (n.embedding) "
        "OPTIONS {indexConfig: {`vector.dimensions`: 4096, `vector.similarity_function`: 'cosine'}}"
    )
    print("Vector index 'node_embeddings' ensured.")


if __name__ == "__main__":
    main()
