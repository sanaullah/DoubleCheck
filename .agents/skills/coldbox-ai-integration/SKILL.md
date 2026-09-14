---
name: coldbox-ai-integration
description: "Use this skill when integrating AI capabilities into a ColdBox application using the BoxLang AI library (bx-ai module) -- including simple chat, streaming, pipelines, agents, RAG with vector memory, document loading, tool calling, and injecting the AI service into handlers or models."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# AI Integration (BoxLang AI / bx-ai)

## When to Use This Skill

Use this skill when adding AI features to a ColdBox/BoxLang application: chatbots, content generation, code assistance, semantic search (RAG), autonomous agents, or AI-enriched handlers and services.

> Full SDK docs: https://ai.ortusbooks.com/

## Setup

### Install the Module

```bash
box install bx-ai
```

### ModuleSettings (config/ColdBox.cfc)

```javascript
moduleSettings = {
    "bx-ai" : {
        // Default provider: openai, claude, gemini, ollama, etc.
        defaultProvider : "openai",
        providers : {
            openai : {
                apiKey : getSystemSetting( "OPENAI_API_KEY", "" ),
                model  : "gpt-4o"
            },
            claude : {
                apiKey : getSystemSetting( "ANTHROPIC_API_KEY", "" ),
                model  : "claude-opus-4-5"
            },
            ollama : {
                baseUrl : "http://localhost:11434",
                model   : "llama3"
            }
        }
    }
};
```

## Built-In Functions (BIFs) Reference

All BIFs are available globally in BoxLang after installing `bx-ai`:

| BIF | Purpose | Returns |
|-----|---------|---------|
| `aiChat( prompt, options )` | One-shot chat | String |
| `aiChatAsync( prompt, options )` | Non-blocking chat | Future |
| `aiChatRequest()` | Build structured request | AiChatRequest |
| `aiChatStream( prompt, callback )` | Real-time streaming | void |
| `aiService()` | Get AI service instance | Service |
| `aiAgent()` | Create autonomous agent | AiAgent |
| `aiMessage()` | Build message pipeline | AiMessage |
| `aiModel()` | Create model runnable | AiModel |
| `aiTransform()` | Create data transformer | Transformer |
| `aiTool()` | Define callable function | Tool |
| `aiMemory()` | Create conversation/vector memory | Memory |
| `aiDocuments()` | Load documents for RAG | Array/Loader |
| `aiChunk()` | Split text into chunks | Array |
| `aiEmbed()` | Generate vector embeddings | Array/Struct |
| `aiPopulate()` | Populate struct/class from AI JSON | Any |
| `aiTokens()` | Estimate token count | Numeric |

## Common Patterns

### Simple Chat

```boxlang
// Basic Q&A
var answer = aiChat( "What is ColdBox?" )

// With options
var answer = aiChat(
    "Write a product description for: #rc.productName#",
    {
        temperature : 0.7,
        model       : "gpt-4o",
        provider    : "openai"
    }
)

// Return structured JSON
var user = aiChat(
    "Create a user profile for Alice, age 30, developer",
    { returnFormat: "json" }
)
// user.name, user.age, user.email etc.
```

### Streaming Responses

```boxlang
// Stream to a closure (useful for server-sent events)
aiChatStream(
    "Tell me about BoxLang in detail",
    ( chunk ) => {
        var token = chunk.choices?.first()?.delta?.content ?: ""
        print( token )
    }
)
```

### Async Chat

```boxlang
// Non-blocking — returns a Future
var future = aiChatAsync( "Summarize this article: #rc.articleText#" )
// Do other work...
var summary = future.get( 30, "seconds" )
```

## Using AI in Handlers

```boxlang
// handlers/ContentHandler.bx
class ContentHandler extends coldbox.system.EventHandler {

    @inject("AIService@bx-ai")
    property name="aiService";

    function summarize( event, rc, prc ) {
        prc.summary = aiChat(
            "Summarize the following in 3 bullet points: #rc.content#",
            { temperature: 0.3 }
        )
        event.setView( "content/summary" )
    }

    // Streaming via SSE
    function streamSummary( event, rc, prc ) {
        event.renderData( type: "plain", data: "" )
        aiChatStream(
            "Summarize: #rc.content#",
            ( chunk ) => {
                var token = chunk.choices?.first()?.delta?.content ?: ""
                // write to output buffer
                writeOutput( token )
                flushOutput()
            }
        )
    }
}
```

## AI Pipelines

Pipelines chain message templates, models, and transformers for reusable, parameterized AI workflows:

```boxlang
// Build a reusable pipeline
var pipeline = aiMessage()
    .system( "You are a helpful ColdBox expert. Answer concisely." )
    .user( "Explain ${topic} with a short code example in BoxLang." )
    .toDefaultModel()
    .transform( ( result ) => result.content )

// Execute the pipeline with parameters
var answer = pipeline.run( { topic: "interceptors" } )

// Reuse with different params
var answer2 = pipeline.run( { topic: "scheduled tasks" } )
```

## Tool Calling (Function Calling)

Allow AI to call your application functions to get real-time data:

```boxlang
// Define a tool
var getProductTool = aiTool(
    name        : "get_product",
    description : "Get product information by SKU",
    parameters  : {
        sku : { type: "string", description: "Product SKU code" }
    },
    callback : ( args ) => {
        var product = productService.findBySku( args.sku );
        return {
            name        : product.getName(),
            price       : product.getPrice(),
            inStock     : product.isInStock()
        };
    }
)

// Use the tool in a chat request
var response = aiChat(
    "Is product SKU-1234 in stock and what is the price?",
    { tools: [ getProductTool ] }
)
```

## Memory & Conversation Context

```boxlang
// Windowed memory (last N messages) — in-memory
var memory = aiMemory( type: "windowed", size: 10 )

// Session memory — survives page refresh
var memory = aiMemory( type: "session" )

// Multi-tenant — use userId + conversationId for isolation
var memory = aiMemory(
    type           : "windowed",
    size           : 20,
    userId         : auth().getUser().getId(),
    conversationId : rc.conversationId
)

// Use memory in chat
var response = aiChat( rc.userMessage, { memory: memory } )

// Vector memory for semantic RAG
var vectorMemory = aiMemory( type: "boxvector" )  // in-memory vector store
// or: type: "postgres", type: "chroma", type: "pinecone", etc.
```

## RAG (Retrieval-Augmented Generation)

```boxlang
// Load documents
var docs = aiDocuments( source: expandPath( "/docs/manual.md" ) )

// Also supports PDFs, HTML, URLs, CSV, SQL, directories
var docs = aiDocuments( source: "https://docs.ortussolutions.com/coldbox/" )
var docs = aiDocuments( source: expandPath( "/docs/" ) )  // directory loader

// Store in vector memory
var vectorMemory = aiMemory( type: "boxvector" )
vectorMemory.addDocuments( docs )

// Query with context-aware chat
function askDocs( event, rc, prc ) {
    prc.answer = aiChat(
        rc.question,
        { memory: vectorMemory }
    )
    event.renderData( data: { answer: prc.answer } )
}
```

## AI Agents

Autonomous agents with memory, tools, and multi-turn conversation:

```boxlang
// Create an agent
var assistant = aiAgent()
    .name( "ColdBox Support Assistant" )
    .instructions( "You help developers build ColdBox applications. Use the provided tools to look up docs and examples." )
    .memory( aiMemory( type: "windowed", size: 20 ) )
    .tools( [ searchDocsTool, getExampleTool ] )
    .provider( "claude" )

// Multi-turn conversation
var response1 = assistant.chat( "How do I create an interceptor?" )
var response2 = assistant.chat( "Can you show me a security example?" )  // remembers context
```

## Document Processing (RAG Loaders)

| Loader | Source |
|--------|--------|
| Text / Markdown | `.txt`, `.md` files |
| HTML | `.html` files or URLs |
| PDF | `.pdf` files |
| CSV / JSON / XML | Structured data files |
| SQL | JDBC datasource + query |
| Directory | Scan folder recursively |
| Web Crawler | Follow links on a site |
| HTTP | Any URL with auth/headers |
| Feed | RSS/Atom feeds |

```boxlang
// Multi-source ingestion into one vector store
var memory = aiMemory( type: "boxvector" )
memory
    .addDocuments( aiDocuments( source: expandPath( "/docs/" ) ) )
    .addDocuments( aiDocuments( source: "https://docs.example.com" ) )
```

## Embeddings

```boxlang
// Generate embeddings for semantic similarity
var embeddings = aiEmbed([
    "ColdBox is an HMVC framework",
    "WireBox is a dependency injection framework",
    "TestBox is a testing framework"
])

// Single text
var embedding = aiEmbed( "How does WireBox injection work?" )
```

## Key Rules

- Install `bx-ai` via CommandBox: `box install bx-ai` — this is a BoxLang module, not a CFML module.
- All BIFs (`aiChat`, `aiAgent`, etc.) are available globally in BoxLang after installation.
- Use `aiChatAsync()` for background processing; never block the HTTP request with long AI calls.
- Use `aiMemory( type: "session" )` for per-user chat history tied to the HTTP session.
- Use `aiMemory( type: "windowed" )` with explicit `userId` + `conversationId` for multi-tenant isolation.
- For production RAG, prefer a persistent vector store (`postgres`, `pinecone`, `qdrant`) over `boxvector` (in-memory only).
- Configure providers and API keys via environment variables, not hardcoded values.
- See https://ai.ortusbooks.com/ for the full SDK reference including advanced agents, sub-agents, and MCP integration.