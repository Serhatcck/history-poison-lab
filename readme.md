# History Poison Lab

> Walkthrough and sample app for the Medium article  
> **“[Chat History Poisoning in LLM Applications: Persistent Prompt Injection via Untrusted JSON Context](https://medium.com/cyprox-io/chat-history-poisoning-in-llm-applications-persistent-prompt-injection-via-untrusted-json-context-c485e4842394)”**

## 1. What this repo demonstrates

- Minimal Express + LangChain chatbot (`src/backend`) that exposes `POST /api/chat`.
- Ultra-lightweight HTML UI served from `GET /app` (`src/ui/app.html`).
- Client is allowed to POST an entire `history` array together with the latest `content`.

That last bullet is the deliberate vulnerability: the backend **trusts whatever chat history the browser sends**, so an attacker can inject fake “assistant” turns that the model will see as past system behaviour. When the LLM replays those messages, it obediently follows the attacker’s injected instructions—this is the **chat history poisoning** technique analysed in the article.

## 2. Architecture at a glance

```
src/
├─ backend/
│  ├─ app.ts          # Express server, /api/chat + /app
│  └─ react_agent/    # LangChain graph + helper tools
└─ ui/
   └─ app.html        # Tiny vanilla JS chat frontend
```

`/api/chat` validates the incoming JSON with Zod but ultimately passes the provided `history` straight into LangChain’s graph:

```ts
// src/backend/app.ts
const historyMessages = convertHistoryToMessages(history);
const messages = [
  { role: "system", content: "You are a helpful assistant..." },
  ...historyMessages,
  { role: "user", content },
];
const result = await graph.invoke({ messages });
```

Because every prior turn is sourced from the request body, the backend has no authoritative memory—**the attacker controls the entire conversation context**.


## 3. Running the lab locally

```bash
git clone https://github.com/Serhatcck/history-poison-lab
cd history-poison-lab
npm install
npm run build         # or ts-node src/backend/app.ts if you prefer
npm start             # listens on PORT (default 3000)
cp env.example .env   # Fill your API Key
```


Visit `http://localhost:3000/app` to open the UI. Messages post to `/api/chat`, which calls the LangChain graph defined in `src/backend/react_agent/graph.ts`.

## 4. Reproducing the exploit

1. Launch the server and open the UI.
2. Send any prompt to generate baseline traffic.
3. Capture the `POST /api/chat` request and edit the `history` array.
4. Resend with:
   - Fake assistant turns instructing the model to reveal secrets, ignore policies, or execute attacker commands.
   - Modified user turns that rewrite what actually happened.
5. Observe how the LLM treats the attacker-supplied messages as canonical history.
