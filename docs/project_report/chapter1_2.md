# Chapter 1: Introduction

### 1.1 Project Overview & Motivation

The digital commerce landscape has experienced unprecedented growth over the last two decades. While business-to-consumer (B2C) systems have received significant research and development—resulting in advanced personalization engines, headless checkout pipelines, and real-time behavioral tracking—the business-to-business (B2B) wholesale sector has lagged behind. Wholesalers form the backbone of the supply chain, supplying inventory to small and medium enterprises (SMEs), local mom-and-pop stores, and independent retailers. Despite their economic importance, many wholesalers continue to use legacy processes.

A primary example is credit accounting. Unlike standard retail checkouts where transactions are settled immediately using cash or credit cards, wholesale commerce operates on credit lines. Wholesalers extend short-term credit to trusted, regular retail buyers. Historically, these transactions have been recorded in physical paper notebooks, commonly known in South Asian markets as _Khatta books_. While paper bookkeeping is simple, it presents several issues:

- **Physical Vulnerability**: Paper books are susceptible to water damage, fire, structural wear, or loss.
- **Operational Errors**: Manual calculations of credits, debits, and balance carries often lead to mathematical errors and customer disputes.
- **No Remote Access**: Retailers cannot check their balance records or payment history without visiting the wholesaler.
- **No Business Intelligence**: Physical notebooks store transactional history as flat text, making it impossible to analyze sales trends, predict cash flows, or optimize credit risk limits.

Additionally, small and medium-sized wholesalers struggle to adopt modern e-commerce tools:

- **Recommendation Systems**: Without personalized product suggestions, wholesalers cannot easily cross-sell inventory, leaving low-demand products sitting in warehouses.
- **Operational Scaling**: Wholesalers lack data-driven consulting resources to advise them on marketing, logistics, and pricing strategies.

The **NexCart** platform was developed to solve these issues. NexCart is an AI-powered B2B and B2C e-commerce platform that combines storefront personalization with bookkeeping and business intelligence tools for wholesalers. NexCart introduces three major features:

1.  **A Hybrid Recommendation Engine**: Integrates TF-IDF content similarity, item-based collaborative filtering, and time-decay popularity rankings to provide personalized storefront suggestions.
2.  **An AI Khatta Digitizer**: Uses multimodal Vision LLMs (Google Gemini) to parse photos of handwritten billing books, extract structured JSON data, and write transaction records directly to a database inside secure Prisma transactions.
3.  **An AI Business Advisor**: A FastAPI RAG agent that retrieves relevant passages from indexed business playbooks (such as logistics manuals or marketing guides) to answer wholesaler strategy queries using Gemini, using a cosine similarity safety threshold to prevent hallucinations.

---

### 1.2 Problem Statement

#### 1.2.1 Friction in Wholesaler-Customer Credit Accounting (Ledger Bookkeeping)

Traditional B2B credit bookkeeping relies on manual entry into paper notebooks. This approach has several issues:

- **High Bookkeeping Overhead**: Wholesalers spend hours at the end of each day manually calculating totals and outstanding balances for dozens of accounts.
- **Lack of Audit Traceability**: When stock is adjusted or cash payments are made, physical ledgers lack audit trails tracking why changes occurred, leading to accountability issues.
- **Lack of Customer Self-Service**: Customers have no way to verify their ledger balances or check invoice details remotely, leading to administrative overhead from balance inquiries.

#### 1.2.2 Cold-Start and Relevance Issues in Product Recommendation Systems

Recommender systems are critical for driving sales conversions. However, standard models have significant limitations:

- **Collaborative Filtering Cold-Start**: Collaborative filtering models require user interaction logs to function. New products or users with no history receive no recommendations, leading to a cold-start issue.
- **Content-Based Overspecialization**: Content filtering recommends items matching existing user tastes, but fails to show popular trending products or introduce new categories.
- **Query Performance Overhead**: Calculating item similarity matrices on-the-fly during page loads can lock database records and slow storefront performance.

#### 1.2.3 Operational Scaling Hurdles for Wholesalers

Wholesalers face challenges when trying to grow their operations:

- **High Consulting Costs**: Small business owners cannot afford professional strategy consultants to help plan inventory levels, design marketing campaigns, or optimize logistics.
- **Hallucination in General AI Models**: Public LLMs often provide generic or incorrect advice on logistics and market regulation because they are not grounded in verified commerce documentation.
- **Information Ingestion Barriers**: Wholesalers lack the time to read long PDF business manuals and extract actionable insights.

---

### 1.3 Project Goals & Objectives

The primary goal of NexCart is to create a secure, scalable, and AI-enabled B2B & B2C e-commerce platform. The specific objectives include:

1.  **Build a Decoupled Multi-Tier Platform**: Connect a React 19 frontend SPA, an Express.js API gateway, a Prisma ORM/PostgreSQL database, and a FastAPI RAG service.
2.  **Deploy a Latency-Safe Recommender**: Pre-compute hybrid recommendations combining TF-IDF content similarity, collaborative user behaviors, and exponential popularity decay to keep storefront response times under 100ms.
3.  **Build a Vision-Based Ledger Scanner**: Develop a multimodal parser that processes receipt images, extracts JSON structured transaction lines, and updates ledgers inside secure transactions.
4.  **Create a Verified RAG Chatbot**: Build a Retrieval-Augmented Generation agent with a 0.55 cosine similarity confidence threshold to filter out irrelevant or hallucinatory advice.
5.  **Ensure Transactional Integrity**: Build backend checks to guarantee atomic inventory checkouts, payment verification idempotency, and automated ledger settlements.

---

### 1.4 Report Organization

This document describes the design, implementation, and testing of NexCart:

- **Chapter 2 (Literature Review & Technology Stack)** reviews the theoretical background of modern architectures, recommender algorithms, RAG, OCR/Vision systems, and justifies the chosen tech stack.
- **Chapter 3 (System Requirements)** defines functional and non-functional requirements.
- **Chapter 4 (System Architecture & Design)** details system layers, data flows, and REST endpoints.
- **Chapter 5 (Relational Database Schema & ER Design)** displays the database model structure, Prisma schemas, and entity relationships.
- **Chapter 6 (Core AI Engines & Lifecycles)** provides the math formulas, coding logic, and flows for the recommender, RAG agent, and vision parser.
- **Chapter 7 (User Interface Design & User Flows)** outlines storefront, wholesaler, and admin user screens.
- **Chapter 8 (Testing, Evaluation, and Results)** contains the empirical measurements, benchmark logs, and concurrency test results.
- **Chapter 9 (Conclusion & Future Scope)** summarizes the project contributions, system limits, and future research work.

---

---

# Chapter 2: Literature Review & Technology Stack

### 2.1 E-Commerce Architectures and Patterns

Historically, e-commerce applications were built as monoliths, where client layouts, business rules, and database queries lived in a single server process. While easy to build initially, monoliths suffer from serious scalability issues. A spike in client views can degrade database queries, and a failure in one component can crash the entire system.

Modern software patterns separate concerns by using decoupled, multi-tier architectures. By separating client interfaces (React SPA) from API gateways (Express API) and data-intensive AI processes (FastAPI Python), systems run in isolated processes that scale independently. Communication occurs over lightweight HTTP REST and JWT protocols.

---

### 2.2 Theoretical Foundations of Recommendation Systems

#### 2.2.1 Content-Based Filtering (TF-IDF and Cosine Similarity)

Content-based recommenders recommend items similar to those a user previously bought or viewed. This requires converting item text metadata into numerical vectors.

- **Term Frequency-Inverse Document Frequency (TF-IDF)**: Computes word weights by measuring term frequencies within an item description against the term's overall frequency across the entire product catalog.
- **Cosine Similarity**: Measures the angle between these high-dimensional document vectors. A similarity value of 1.0 indicates perfect text alignment, while 0.0 indicates no word overlap.

#### 2.2.2 Collaborative Filtering (User-Based vs. Item-Based)

Collaborative filtering uses collective user history. Item-based collaborative systems compute similarity matrices between _items_ rather than users. By analyzing which products are frequently purchased together, the system can recommend related items based on shared user interaction vectors. This is highly scalable because the product catalog changes much less frequently than the active customer base.

#### 2.2.3 Popularity-Based Systems and Decay Heuristics

Popularity systems aggregate views, cart additions, and purchases. However, simple counts cause a few high-traffic items to dominate recommended lists indefinitely, creating static storefront feeds. Popularity decay algorithms use exponential decay:
$$\text{Score} = \text{InitialScore} \times e^{-\lambda t}$$
This ensures that recent trending items rise to the top while older popular items decay over time.

---

### 2.3 Semantic Retrieval and Retrieval-Augmented Generation (RAG)

Large Language Models (LLMs) have broad knowledge bases but lack access to domain-specific documentation (such as a wholesaler's internal playbooks). Simply fine-tuning models on manuals is computationally expensive and hard to update.

Retrieval-Augmented Generation (RAG) splits documents into small text chunks, generates vector embeddings for each chunk, and indexes them in a vector database (e.g., ChromaDB). At runtime, user queries are matched against ChromaDB using cosine similarity to extract the most relevant passages. These passages are prepended to the prompt sent to the LLM. This grounds the model's output in the provided document context, preventing hallucinations.

---

### 2.4 Optical Character Recognition (OCR) and LLM-Based Vision Parsing

Traditional OCR models extract raw text lines but lose their visual context and grid layout. In physical ledger books, records are structured as tables with columns for names, amounts, and notes.

Multimodal Vision LLMs (e.g., Gemini Vision) combine deep convolutional visual processing with text comprehension. Instead of just reading words, they understand column alignments and grid layouts, allowing them to parse handwritten tables directly into structured data tables (like JSON arrays).

---

### 2.5 Technology Stack Selection & Justification

- **Frontend**: React (v19) and Zustand (v5) form the core frontend layer. React 19 provides fast DOM updates, while Zustand offers lightweight state management without Redux's complex boilerplate. Tailwind CSS (v4) is used for component layout styling.
- **Core Backend**: Node.js and Express.js (v5) form a non-blocking web server. Prisma ORM (v6) provides database mappings, type safety, and query optimization for PostgreSQL.
- **AI Service Layer**: Python (v3.10) and FastAPI provide a high-performance web framework. LangChain manages the RAG pipeline, sentence-transformers handle embeddings generation, and ChromaDB acts as the local vector store.
- **Generative AI Models**: The Google Gemini API (`gemini-2.5-flash`) handles multimodal image parsing (AI Khatta) and text generation (AI Business Advisor).
