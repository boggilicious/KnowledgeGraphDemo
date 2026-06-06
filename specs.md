# Spezifikation: KI-gestützter Knowledge Graph Prototyp (GraphRAG)

Dieses Dokument ist die technische Spezifikation für einen GraphRAG-Prototypen, dessen Zweck ausschließlich das Demonstrieren der Technologie ist. Randfälle, Fehlerbehandlung und Produktionsreife sind explizit nicht im Scope.

---

## 1. Projekt-Übersicht & Zielsetzung

Ziel ist der Aufbau einer minimalen **GraphRAG-Pipeline** (Graph-based Retrieval-Augmented Generation). Das System liest einen kurzen unstrukturierten Text ein, extrahiert mittels LLM automatisch Entitäten und Relationen, speichert diese mit Embeddings in einer Neo4j-Graphdatenbank und beantwortet natürlichsprachliche Fragen über zwei verschiedene Retrieval-Strategien.

---

## 2. Tech-Stack & Infrastruktur

* **Programmiersprache:** Python 3.10+
* **Orchestrierung & KI-Anbindung:** `langchain`, `langchain-community`, `langchain-experimental`
* **Datenbank:** Neo4j, gehostet via kostenlosem *Neo4j AuraDB Cloud Tier*
* **LLM:** Universitäts-API (OpenAI-kompatibler Endpunkt), Modell: `gpt-5.4-mini`
* **Embedding-Modell:** Universitäts-API, Modell: `Qwen3-Embedding-8B`
* **Vektor-Integration:** `Neo4jVector` aus `langchain-community`
* **Interface:** CLI (Kommandozeile)
* **Umgebungsvariablen (`.env`):**
  * `NEO4J_URI=neo4j+s://...`
  * `NEO4J_USERNAME=neo4j`
  * `NEO4J_PASSWORD=...`
  * `UNI_API_KEY=...`
  * `UNI_API_BASE_URL=...`

---

## 3. Kernkomponenten & Pipeline

### Komponente A: Ingestion & Dynamische Extraktion (`ingest.py`)

* **Eingabe:** Dateipfad zu einer Textdatei im Repository (via CLI-Argument, z.B. `python ingest.py data/sample.txt`)
* **Einschränkungen Eingabetext:** Nur kurze Texte (max. ~1 Seite / ~500 Wörter). Kein Chunking notwendig, der gesamte Text wird als einzelner String verarbeitet.
* **Extraktion:** LangChain `LLMGraphTransformer` mit dem konfigurierten LLM. Keine vordefinierten Node-Labels oder Kanten-Typen — die Ontologie wird vollständig dynamisch durch das LLM bestimmt.
* **Ausgabe:** Graph-Dokument (Nodes & Edges), geschrieben in die Neo4j-DB via `Neo4jGraph.add_graph_documents()`.
* **Deduplication:** Keine Merge-Logik. Jeder Ingest-Lauf schreibt neue Nodes/Edges unabhängig.

### Komponente B: Embedding-Indizierung (Teil von `ingest.py`)

* **Ausführung:** Direkt im Anschluss an die Graph-Extraktion, als zweiter Schritt in `ingest.py`.
* **Welche Nodes:** Alle vom `LLMGraphTransformer` erzeugten Nodes.
* **Embedding-Text pro Node:** Konkatenation aus `Label + Name + Properties` des jeweiligen Knotens, z.B. `"Person John Doe age:30 occupation:engineer"`. Kanten erhalten keine Embeddings.
* **Modell:** `Qwen3-Embedding-8B` via Universitäts-API (OpenAI-kompatibler `/embeddings`-Endpunkt).
* **Speicherung:** Vektor-Embeddings werden direkt auf den Neo4j-Nodes als Property persistiert und über einen nativen Neo4j-Vektorindex (`Neo4jVector`) indiziert.

### Komponente C: Retrieval-Strategie A — Cypher-Generierung (`query_cypher.py`)

* **Ansatz:** Das LLM übersetzt die natürlichsprachliche Frage direkt in eine Cypher-Abfrage. Die Abfrage wird gegen Neo4j ausgeführt, das strukturierte Ergebnis wird ans LLM zurückgegeben, das daraus eine natürlichsprachliche Antwort formuliert.
* **LangChain-Klasse:** `GraphCypherQAChain`
* **Eingabe:** Natürlichsprachliche Frage als CLI-Argument (z.B. `python query_cypher.py "Wer gründete TechCorp?"`)
* **Ausgabe:** Natürlichsprachliche Antwort auf der Konsole.
* **Stärke dieser Strategie:** Präzise strukturierte Abfragen, auch über tiefe Relationen, solange das LLM valides Cypher erzeugt.

### Komponente D: Retrieval-Strategie B — Vektor-Suche + Graph-Traversal (`query_vector.py`)

* **Ansatz:** Die Frage wird in einen Embedding-Vektor umgewandelt. Über semantische Ähnlichkeitssuche (`Neo4jVector`) werden relevante Einstiegsknoten im Graphen gefunden. Von diesen Knoten aus wird der Graph traversiert, um verbundene Fakten zu aggregieren. Der gesammelte Kontext wird ans LLM übergeben, das eine Antwort generiert.
* **Traversal-Tiefe:** Maximal **3 Hops** von jedem Einstiegsknoten.
* **Top-K Einstiegsknoten:** Die **3 semantisch ähnlichsten** Nodes werden als Startpunkte gewählt.
* **Kontext-Aufbau:** Alle Nodes und Kanten innerhalb der 3-Hop-Nachbarschaft werden als strukturierter Text (Tripel-Format: `(Node)-[RELATION]->(Node)`) zusammengestellt und ans LLM übergeben.
* **LangChain-Klasse:** `Neo4jVector` für die Suche; manueller Cypher-Traversal für die Nachbarschaft; `ChatOpenAI` für die finale Antwort.
* **Eingabe:** Natürlichsprachliche Frage als CLI-Argument (z.B. `python query_vector.py "Wo wohnt ein Freund der TechCorp-Gründerin?"`)
* **Ausgabe:** Natürlichsprachliche Antwort auf der Konsole, ergänzt um die gefundenen Einstiegsknoten und deren Traversal-Kontext zur Nachvollziehbarkeit.
* **Stärke dieser Strategie:** Findet semantisch verwandte Konzepte auch ohne exakte Namensübereinstimmung; kann Zusammenhänge über mehrere Hops erschließen.

---

## 4. Projektstruktur

```
KnowledgeDB/
├── .env                    # API-Keys und DB-Credentials (nicht in Git)
├── requirements.txt
├── data/
│   └── sample.txt          # Beispieltext für Demo-Zwecke
├── ingest.py               # Komponente A + B: Extraktion & Embedding
├── query_cypher.py         # Komponente C: Cypher-basiertes Retrieval
└── query_vector.py         # Komponente D: Vektor + Traversal Retrieval
```

---

## 5. Abhängigkeiten (`requirements.txt`)

```
langchain
langchain-community
langchain-experimental
neo4j
openai
python-dotenv
```

---

## 6. Demo-Ablauf

1. Beispieltext in `data/sample.txt` ablegen (kurzer Text mit Personen, Firmen, Orten und Relationen — ideal für mehrstufige Fragen).
2. `python ingest.py data/sample.txt` — Graph aufbauen und Embeddings indizieren.
3. `python query_cypher.py "Frage"` — Strategie A testen.
4. `python query_vector.py "Frage"` — Strategie B testen.
5. Beide Antworten und deren Retrieval-Wege vergleichen.
