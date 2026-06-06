import sys
from dotenv import load_dotenv
import os

load_dotenv()

from langchain_community.graphs import Neo4jGraph
from langchain.chains import GraphCypherQAChain
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

CYPHER_PROMPT = PromptTemplate(
    input_variables=["schema", "question"],
    template="""Task: Generate a Cypher statement to query a graph database.

Rules:
- Nodes have NO specific type labels (no :Person, :Company etc.) — omit label filters entirely.
- Use toLower() for all string comparisons to handle case differences.
- Use CONTAINS or toLower() equality for name/id matching, e.g.: WHERE toLower(n.id) CONTAINS toLower('novatech')
- Only use relationship types and properties that appear in the schema.
- Return only the Cypher statement, no explanations.

Schema:
{schema}

Question: {question}
Cypher:""",
)

question = sys.argv[1]

graph = Neo4jGraph(
    url=os.environ["NEO4J_URI"],
    username=os.environ["NEO4J_USERNAME"],
    password=os.environ["NEO4J_PASSWORD"],
    database=os.environ["NEO4J_DATABASE"],
)

llm = ChatOpenAI(
    model="gpt-5.4-mini",
    openai_api_key=os.environ["UNI_API_KEY"],
    openai_api_base=os.environ["UNI_API_BASE_URL"],
)

chain = GraphCypherQAChain.from_llm(
    llm=llm,
    graph=graph,
    verbose=True,
    allow_dangerous_requests=True,
    cypher_prompt=CYPHER_PROMPT,
)

result = chain.invoke({"query": question})
print(result["result"])
