# Chapter 7: User Interface Design & User Flows

This chapter describes the visual and functional design of the interfaces implemented across NexCart's three main user personas: Customer storefront, Wholesaler dashboard, and Admin portal.

### 7.1 Storefront Interface Design (Customer View)

#### 7.1.1 Browse Panel & Dynamic Recommendation Carousels

- **Search and Filter Grid**: Renders a search bar at the top of the storefront dashboard. Customers can search for items by name or description. A category filter allows users to narrow down listings (e.g. Grocery, Electronics, Apparel).
- **Trending Carousels**: Displays popular items dynamically computed using exponential popularity decay.
- **Personalized Carousel**: Shows collaborative suggestions based on the user's historical purchases.
- **Similar Items Grid**: Displayed on product details pages to suggest related products based on shared metadata.

#### 7.1.2 Cart & Multi-Item Order Checkouts (COD and Razorpay)

- **Shopping Cart Page**: Displays sub-totals, items list, tax, and availability.
- **Online Prepaid Flow**: Customers can click "Pay Online", opening the Razorpay payment gateway widget. On successful authorization, the signature is verified, and the order is marked `PAID`.
- **Cash on Delivery (COD)**: Bypasses payment gateways and sets the order status to `PENDING` with COD method parameters.
- **Isolation Guards**: The system verifies cart ownership so customers can only access their own cart sessions.

#### 7.1.3 Claims/Returns Portal

- **Orders History Page**: Customers can view past orders, track delivery status, and click "Request Return" on delivered items. This opens a modal where they can specify return quantities and enter return reasons, setting the item state to `RETURN_REQUESTED`.

---

### 7.2 Business Dashboard Design (Wholesaler View)

#### 7.2.1 Sales, Profit, and Active Debt Dashboards

- **Analytical Cards**:
  - _Total Sales Revenue_: Displays the sum of completed checkouts, excluding refund costs.
  - _Net Profit Margin_: Displays calculated profits ($RetailPrice - CostPrice$).
  - _Outstanding Customer Debt_: Displays the total unpaid balance from extended credit lines.
  - _Low Stock Alerts_: Flags products with stock counts below 10 units.

#### 7.2.2 Inventory Management & Adjustments

- **Adjustments Panel**: Wholesalers can perform stock adjustments manually. Every stock change requires selecting a reason from a dropdown (e.g., `OCR_UPDATE`, `MANUAL_ADJUSTMENT`, `CANCELLATION`), which is saved to the database.

#### 7.2.3 AI Khatta Upload Page and Interactive OCR Panel

- **Receipt Ingestion Drag-Zone**: An interface where wholesalers drag receipt photos to upload.
- **OCR Correction Table**: Displays extracted receipt data (customer emails, transaction amounts, description notes). Wholesalers can edit values before writing them to the database.
- **jsPDF Exporter**: Generates a styled PDF report of the verified transaction entries.

#### 7.2.4 AI Advisor Terminal Interface

- **AI Strategies Console**: A chatbot interface where wholesalers can query business strategies. Responses include citation links to the source PDF pages used.

---

### 7.3 Super Admin Panel

- **Recommendation Metrics Panel**: Renders charts tracking CTR, conversion rates, and catalog coverage.
- **System Controls**: Includes options to clear log databases, reset analytics metrics, and rebuild similarity tables.

---

---

# Chapter 8: Testing, Evaluation, and Results

### 8.1 Quality Metrics and Mathematical Formulas

- **Precision@K**: Fraction of top-K recommendations containing the hidden purchase:
  $$\text{Precision@K} = \frac{\text{Relevant Recommendations} \cap \text{Top-K}}{K}$$
- **Recall@K**: Indicates whether the hidden purchase is retrieved in the top-K list:
  $$\text{Recall@K} = \frac{\text{Relevant Recommendations} \cap \text{Top-K}}{\text{Total Relevant Items}}$$
- **MAP@K (Mean Average Precision)**: Incorporates ranking order:
  $$\text{MAP@K} = \frac{1}{|U|} \sum_{u=1}^{|U|} \sum_{i=1}^{K} \text{Precision@i} \times \text{rel}(i)$$
- **NDCG@K (Normalized Discounted Cumulative Gain)**: Rank-sensitive cumulative relevance:
  $$\text{NDCG@K} = \frac{\text{DCG@K}}{\text{IDCG@K}}$$

---

### 8.2 Offline Recommendation Engine Benchmarking

An offline benchmark script `npm run recommendations:benchmark` was executed using a leave-one-out testing method.

#### Table 8.1: Recommendation Benchmarking Results

| Metric                 | Value @ K = 5 | Value @ K = 10 |
| :--------------------- | :------------ | :------------- |
| **Evaluated Users**    | 3             | 3              |
| **Precision@K**        | 0.0667        | 0.0333         |
| **Recall@K**           | 0.3333        | 0.3333         |
| **MAP@K**              | 0.1667        | 0.1667         |
| **NDCG@K**             | 0.2103        | 0.2103         |
| **HitRate@K**          | 0.3333        | 0.3333         |
| **Catalog Coverage**   | 24.0%         | 36.0%          |
| **Category Diversity** | 18.0%         | 27.0%          |

#### 8.2.1 Metric Interpretation

The recall of `0.3333` indicates that in 33.3% of tests, the hidden purchase appeared in the recommended lists. The catalog coverage increases to 36% at K=10, showing that the hybrid recommender avoids recommending only a narrow set of popular products.

---

### 8.3 Concurrency & Integration Verification

#### 8.3.1 Atomic Inventory Reservation Audits

We simulated high checkout traffic to test database concurrency. Under a load of 10 concurrent requests for a product with 1 unit in stock, the system completed 1 transaction successfully while rolling back the remaining 9, preventing overselling.

#### 8.3.2 Double-Spending/Overselling Counter-measures

Integration checks confirmed that sending multiple payment verifications for a single Razorpay session returns the existing database order instead of creating duplicates.

#### 8.3.3 Payment Idempotency and Return Workflow Reversal Integration

Tests verified that when a wholesaler approves a returned item:

1.  The item's stock count is incremented in the database.
2.  A refund is processed via the payment gateway (for online orders) or a debit adjustment is created in the ledger (for COD orders).
3.  The return status is updated to prevent duplicate stock updates.

---

---

# Chapter 9: Conclusion & Future Scope

### 9.1 Summary of Project Contributions

NexCart provides a robust, decoupled, and AI-enabled B2B & B2C e-commerce platform. The project demonstrates:

- An Express and Python backend architecture that separates transactions from heavy AI tasks.
- A hybrid recommendation engine that balances content features, collaborative behaviors, and popularity decay.
- An AI Khatta tool that digitizes handwritten invoices into relational database logs.
- A RAG-enabled chatbot that assists wholesalers with validated business manuals.
- An integrated return and refund workflow that adjusts stock levels and ledger balances.

### 9.2 Project Limitations

- **Cold Start Limitations**: Although content similarity helps with new products, new users with no history rely primarily on popularity rankings until click data is logged.
- **Scale Limits for Similarity Matching**: Calculating content similarity values runs as an offline job. In extremely large systems, this must transition to a real-time vector search index.

### 9.3 Future Recommendations & Enhancements

- **Real-time Collaborative Filtering**: Transition from offline job calculations to streaming correlation adjustments using tools like Apache Kafka or Redis.
- **Fine-tuned Vision Processing**: Fine-tuning vision-language models on local handwritten styles to improve extraction accuracy for messy receipts.
- **Multi-tenant Wholesaler Environments**: Scaling the platform to allow independent wholesalers to manage separate, custom customer groups.

---

---

## References

1.  Aggarwal, C. C. (2016). _Recommender Systems: The Textbook_. Springer.
2.  Bari, A., Chaouchi, M., & Jung, T. (2016). _Predictive Analytics For Dummies_. John Wiley & Sons.
3.  Lewis, P., et al. (2020). _Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks_. Advances in Neural Information Processing Systems, 33.
4.  Prisma Documentation (2026). _Database Transactions and Concurrency Control_. [https://www.prisma.io/docs/](https://www.prisma.io/docs/)
5.  Google Gemini API Documentation (2026). _Multimodal Extraction and Vision Prompting Guides_. [https://ai.google.dev/](https://ai.google.dev/)

---

---

## Appendix: Viva Voce Preparation Q&A

**Q1: Why did you choose a hybrid recommendation system?**
_Answer_: Individual models have specific drawbacks. Collaborative filtering suffers from cold-start problems, content-based models can lack diversity, and popularity models lack personalization. Synthesizing these scores into a single weighted list ensures that the system provides relevant recommendations under varying levels of user data.

**Q2: How does your system ensure inventory values remain correct under high concurrency?**
_Answer_: NexCart uses Prisma's transaction API (`prisma.$transaction`) to perform atomic database operations. During checkout, stock levels are checked and updated in a single transaction block. If an item runs out of stock mid-checkout, the entire transaction is rolled back to prevent overselling.

**Q3: What is the purpose of the 0.55 confidence threshold in your RAG agent?**
_Answer_: RAG chatbots are susceptible to hallucinations when user queries are irrelevant to the indexed documents. The cosine similarity threshold checks how closely a query matches the retrieved text chunks in ChromaDB. If the match score is below 0.55, the chatbot outputs a standard fallback message instead of generating a hallucinated response.

**Q4: How does the AI Khatta tool prevent creating duplicate ledger entries if the user uploads the same receipt twice?**
_Answer_: The system generates a unique idempotency key based on the transaction details (e.g., date, amount, and customer email). A database unique constraint on the `idempotencyKey` field in the `LedgerEntry` table blocks duplicate entries, skipping creation if the key already exists.
