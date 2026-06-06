# Spezifikation: KnowledgeDB Web App

Diese Datei beschreibt die Web-App, die den Neo4j-Graphen interaktiv im Browser anzeigt — als Alternative zur Neo4j-Weboberfläche. Die Architektur ist so ausgelegt, dass zukünftige Features (Suche, LLM-Chat) sauber integriert werden können.

---

## 1. Ziel & Scope (v1)

**In Scope:**
- Graph-Visualisierung aller Nodes und Edges aus Neo4j
- Force-directed Layout (frei schwebende Knoten, interaktiv)
- Cypher-Query-Editor: eigene Abfragen ausführen, Ergebnis als Graph anzeigen
- Detail-Panel: Klick auf Knoten zeigt alle Properties
- Label-Filter: Node-Typen per Toggle ein-/ausblenden
- Drag & Drop, Zoom, Pan

**Explizit nicht in Scope (v1):**
- Authentifizierung (App läuft intern/lokal)
- Volltext-Suche (v2)
- LLM-Chat-Fenster (v3)
- Schreibzugriff auf den Graphen

---

## 2. Tech Stack

| Schicht | Technologie | Begründung |
|---|---|---|
| Runtime | **Bun** | Schneller JS-Runtime, built-in HTTP-Server, TypeScript out-of-the-box |
| Backend API | **Bun HTTP (Elysia)** | Leichtgewichtiges, Bun-natives Web-Framework mit TypeScript-Support |
| Frontend Build | **Vite + React 18** | Schnelles HMR in dev, einfacher Build |
| Graph-Rendering | **react-force-graph** | React-native, D3-Force-Simulation, 2D/3D umschaltbar, aktiv gepflegt |
| Neo4j Treiber | **neo4j-driver** (JS) | Offizieller Treiber, unterstützt `neo4j+s://` (AuraDB) |
| Styling | **Tailwind CSS** | Utility-first, kein komplexes Setup |

---

## 3. Architektur

```
Browser (React)
    │
    │  HTTP/JSON (fetch)
    ▼
Bun Backend (Elysia)          ← einziger Einstiegspunkt
    ├── /api/graph             ← Knoten + Kanten laden
    ├── /api/cypher            ← Custom-Query ausführen
    ├── /api/schema            ← Labels & Relationship-Types
    │   [v2] /api/search       ← Volltextsuche (Placeholder-Route)
    │   [v3] /api/chat         ← LLM-Chat (Proxy zur Uni-API)
    │
    │  neo4j-driver
    ▼
Neo4j AuraDB (Cloud)
```

Das Backend fungiert als einzige Schnittstelle zur Datenbank. Das Frontend kennt Neo4j nicht direkt — das hält die Credentials sicher und macht den Austausch der DB-Schicht einfach.

---

## 4. API-Endpunkte (v1)

### `GET /api/graph`
Lädt den gesamten Graphen (alle Nodes + alle Relationships).

**Response:**
```json
{
  "nodes": [
    { "id": "4:abc:1", "labels": ["Person"], "properties": { "name": "Alice", "age": 30 } }
  ],
  "edges": [
    { "id": "5:abc:1", "type": "KNOWS", "startNodeId": "4:abc:1", "endNodeId": "4:abc:2", "properties": {} }
  ]
}
```

### `POST /api/cypher`
Führt eine benutzerdefinierte Cypher-Abfrage aus. **Nur READ** (kein CREATE/DELETE/MERGE).

**Request:**
```json
{ "query": "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50" }
```

**Response:** gleiches Format wie `/api/graph`

**Sicherheit:** Backend prüft, ob die Query ein Write-Statement enthält (`CREATE`, `MERGE`, `DELETE`, `SET`, `REMOVE`, `DROP`) und lehnt sie mit 400 ab.

### `GET /api/schema`
Gibt alle verfügbaren Node-Labels und Relationship-Types zurück.

**Response:**
```json
{
  "nodeLabels": ["Person", "Organization", "Location"],
  "relationshipTypes": ["KNOWS", "WORKS_AT", "LOCATED_IN"]
}
```

### [v2] `GET /api/search?q=...`
Placeholder — noch nicht implementiert. Route existiert, gibt 501 zurück.

### [v3] `POST /api/chat`
Placeholder — noch nicht implementiert. Wird die Uni-API (`UNI_API_BASE_URL`) als Proxy aufrufen.

---

## 5. Frontend-Komponenten

```
App
├── GraphViewer          ← Haupt-Canvas (react-force-graph)
│   └── NodeTooltip      ← Hover-Preview
├── Sidebar (rechts)
│   ├── DetailPanel      ← Eigenschaften des angeklickten Knotens
│   └── [v3] ChatPanel   ← LLM-Chat-Fenster (Placeholder-Div, ausgegraut)
├── Toolbar (oben)
│   ├── CypherEditor     ← Textarea + "Run"-Button
│   └── LabelFilter      ← Toggle-Buttons pro Node-Label
└── StatusBar (unten)    ← Anzahl Nodes/Edges, Verbindungsstatus
```

**Zustandsmodell (React Context oder Zustand):**
```ts
interface AppState {
  graphData: { nodes: Node[]; links: Edge[] }   // react-force-graph Format
  selectedNode: Node | null
  activeLabels: Set<string>
  cypherQuery: string
  loading: boolean
  error: string | null
}
```

### Farbcodierung
Jedes Node-Label bekommt automatisch eine konsistente Farbe (deterministisch aus Label-Name gehasht). Dieselbe Farbe erscheint in den Label-Filter-Toggles.

---

## 6. Datenmodell (Frontend)

react-force-graph erwartet dieses Format:

```ts
interface GraphNode {
  id: string               // Neo4j element ID
  label: string            // Primäres Label (erstes in der Liste)
  labels: string[]         // Alle Labels
  name: string             // Anzeige-Name (properties.name / properties.id / id)
  properties: Record<string, unknown>
  // intern von react-force-graph befüllt:
  x?: number; y?: number; vx?: number; vy?: number
}

interface GraphLink {
  id: string
  source: string           // startNodeId
  target: string           // endNodeId
  type: string             // Relationship-Type
  properties: Record<string, unknown>
}
```

---

## 7. Projektstruktur

```
KnowledgeDB/
├── webapp/
│   ├── SPECS.md               ← diese Datei
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts       ← Elysia-Server, Route-Registrierung
│   │   │   ├── neo4j.ts       ← Neo4j-Driver Singleton
│   │   │   ├── routes/
│   │   │   │   ├── graph.ts
│   │   │   │   ├── cypher.ts
│   │   │   │   └── schema.ts
│   │   │   └── utils/
│   │   │       └── serialize.ts  ← Neo4j Record → JSON (Integer-Handling)
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── api/
│       │   │   └── client.ts    ← fetch-Wrapper für alle API-Calls
│       │   ├── components/
│       │   │   ├── GraphViewer.tsx
│       │   │   ├── DetailPanel.tsx
│       │   │   ├── CypherEditor.tsx
│       │   │   ├── LabelFilter.tsx
│       │   │   └── StatusBar.tsx
│       │   ├── hooks/
│       │   │   └── useGraph.ts  ← Datenfetch + State-Management
│       │   └── utils/
│       │       └── colors.ts    ← Label → Farbe Mapping
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
├── .env                         ← gemeinsam genutzt, NEO4J_* Variablen
└── ...                          ← bestehende Python-Dateien unverändert
```

---

## 8. Umgebungsvariablen

Die bestehende `.env` wird vom Bun-Backend direkt gelesen. Keine neue Datei nötig.

| Variable | Genutzt von | Beschreibung |
|---|---|---|
| `NEO4J_URI` | Backend | Verbindungs-URI (AuraDB: `neo4j+s://...`) |
| `NEO4J_USERNAME` | Backend | Datenbanknutzer |
| `NEO4J_PASSWORD` | Backend | Passwort |
| `NEO4J_DATABASE` | Backend | Datenbankname |
| `UNI_API_KEY` | Backend (v3) | Für späteres LLM-Chat-Feature |
| `UNI_API_BASE_URL` | Backend (v3) | Für späteres LLM-Chat-Feature |
| `PORT` | Backend | API-Port (Default: `3001`) |

---

## 9. Erweiterungspunkte (Architektur-Hinweise)

### v2 — Suche
- Backend: `GET /api/search?q=...` ruft Neo4j Fulltext-Index auf oder nutzt Vektor-Ähnlichkeitssuche (bereits über Python-Pipeline aufgebaut).
- Frontend: `SearchBar`-Komponente in der Toolbar; Ergebnis-Nodes werden im GraphViewer hervorgehoben.

### v3 — LLM-Chat
- Backend: `POST /api/chat` proxied zur Uni-API (OpenAI-kompatibel). Kann Kontext aus dem aktuell angezeigten Graphen mitsenden (selektierter Knoten, aktive Cypher-Query).
- Frontend: `ChatPanel` in der rechten Sidebar, implementiert als Sliding-Panel. Placeholder-Div ist bereits in der Layout-Struktur reserviert.
- Integration: Chat kann Graph steuern — LLM antwortet mit einer Cypher-Query, die automatisch im `CypherEditor` ausgeführt wird.

---

## 10. Entwicklungsstart

```bash
# Backend
cd webapp/backend
bun install
bun run dev     # startet auf :3001

# Frontend
cd webapp/frontend
bun install
bun run dev     # startet auf :5173 (Vite), proxied /api → :3001
```

---

## 11. Bekannte Einschränkungen (v1)

- Große Graphen (> 500 Nodes) sind nicht optimiert — kein Paginierung, kein Expand-on-Click.
- Kein Write-Zugriff über die Web-App.
- Cypher-Editor validiert nur grob (Keyword-Check) — kein vollständiger Parser.
- Kein Error-Recovery bei Verbindungsverlust zur DB (nur Fehlermeldung im StatusBar).
