# NexCart Application Features Guide

This document describes the core feature sets, user roles, and advanced AI utilities integrated into the NexCart platform.

---

## 1. User Roles & Capabilities

The application supports three distinct user scopes, each mapped to different layout segments:

```txt
NexCart SPA Routing Flow:
├── Public View
│   └── Login & Register (Customer / Wholesaler toggle)
├── CUSTOMER Role
│   └── Storefront Layout (/store)
│       ├── Storefront Dashboard (Personalized recommendations)
│       ├── Product Details Page (Similar product suggestions)
│       ├── Cart & Order Checkout (Prepaid via Razorpay or Cash on Delivery)
│       └── Orders History Page (Order issue returns and refunds)
├── WHOLESALER Role
│   └── Wholesaler Dashboard Layout (/wholesaler)
│       ├── Wholesaler Analytics Dashboard (Fulfillment indices & product metrics)
│       ├── Product Management (Inventory listings, CRUD, cost metrics)
│       ├── Stock Adjustment Panel (Log change reasons manually)
│       ├── Ledger Management (Credits and debits per Customer account)
│       ├── AI Khatta Digitizer (Handwritten receipt scan & PDF report generator)
│       └── AI Business Advisor (FastAPI RAG documentation chat console)
└── SUPER_ADMIN Role
    └── Admin global Panel (/admin)
        └── System Metrics (CTR metrics, coverage percentages, offline evaluations)
```

---

## 2. Customer Storefront

- **Dynamic Recommendations Carousel**: Configured with three customized recommendation filters:
  1.  _Trending Listings_: Exponential time-decay popularity scoring showing trending items.
  2.  _Personalized Feed_: collaborative filtering showing items similar to previous user actions.
  3.  _Similar Products_: content-based TF-IDF suggestions on individual product detail cards.
- **Shopping Cart & Attributed Checkout**: Supports combining multiple products under a single checkout. Integrates:
  - **Prepaid Transactions**: Integrates Razorpay SDK allowing cards/UPI checkouts.
  - **Cash on Delivery (COD)**: Bypasses third-party gateways, writing order states directly as pending.
- **Order Issues (Claims Management)**: Enables customers to raise disputes, returns, or refunds for specific order line items. Wholesalers can review claims and refund amounts.

---

## 3. Wholesaler Dashboard

- **Analytics Panel**: Calculates key business metrics including Total Sales, Average Profit Margins, Active Debt Indexes (unpaid balances), and low-stock alerts.
- **Inventory Adjustments Logging**: Records all item count changes in `InventoryLog` with explicit explanations (e.g. `MANUAL_ADJUSTMENT`, `SALE`, `REFUND`) to ensure audit traceability.
- **Ledger Book**: Displays credit/debit transaction files for individual customer accounts.

---

## 4. AI Business Advisor (FastAPI RAG)

- **Semantic Knowledge Chatbot**: Resolves wholesaler queries on scaling inventory, marketing, and logistics.
- **RAG (Retrieval-Augmented Generation)**: Uses a LangChain pipeline to dynamically extract sections from indexed business PDF manuals (such as _Shopify 101 Guide_) and feed them as context to the Gemini LLM.
- **Confidence Threshold Filters**: Filters out low-confidence queries (cosine similarity score < 0.55) to prevent hallucinations, returning a standard fallback response.

---

## 5. AI Khatta Digitizer

- **Base64 Vision Scanner**: Allows wholesalers to take pictures of physical receipt books, convert them to base64, and send them to the Express backend.
- **Structured LLM Extraction**: The backend passes the image to `gemini-2.5-flash` with a strict prompt forcing it to return a JSON array mapping Name (guessed email), Amount (negative for debt), and Notes.
- **Prisma Database Transaction**: Automatically matches extracted customer emails with registered User profiles and creates `LedgerEntry` records in a safe database transaction.
- **PDF Accounting Exporter**: Integrates `jspdf` and `jspdf-autotable` to export the extracted transaction records as a styled PDF report.

---

## 6. Recommendation Analytics Dashboard

Monitors and displays the commercial impact of the recommendation engine:

- **Click-Through Rate (CTR)**: $\text{Clicks} / \text{Impressions}$
- **Cart Add Rate**: $\text{Cart Adds} / \text{Impressions}$
- **Purchase Conversion Rate**: $\text{Purchases} / \text{Impressions}$
- **Catalog Coverage**: Percentage of unique products recommended out of the total catalog.
- **Category Diversity**: Category spread among recommended products.
