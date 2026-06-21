# BACKLOG-015: Monolithic Page UI Components (Decomposability)

## Issue Description

Pages (`Dashboard.jsx`, `BusinessAdvisor.jsx`, and `Orders.jsx`) were constructed as single monolithic files containing nested layouts, modal forms, inline tables, chart configurations, and complex helper styling logic. This violated separation of concerns, made component code difficult to read, and impeded reusability and unit testing.

---

## Resolution

We refactored the page structure by isolating visual segments and logic blocks into dedicated sub-components:

### 1. Dashboard Page Refactoring

Extracted layout visual items and charting blocks into `client/src/components/dashboard/`:

- **`StatCard.jsx`**: Displays high-level stats with standard Lucide icons and tone coloring.
- **`QuickStrip.jsx`**: Displays compact execution desk cards.
- **`InfoTile.jsx`**: Displays helper tiles for marketplace categorization and unsold items.
- **`MiniMetric.jsx`**: Tiny metric indicators inside recent orders cards.
- **`AlertRow.jsx`**: Actionable orange/violet/rose status alerts.
- **`WatchRow.jsx`**: Catalog alerts tracking low stock or dormant listings.
- **`StockPressureChart.jsx`**: Renders the Recharts bar chart segment.
  Refactored `client/src/pages/Dashboard.jsx` to import and utilize these components, reducing file complexity and styling code.

### 2. Business Advisor Page Refactoring

Extracted prompt selector sidebars and transcripts into `client/src/components/advisor/`:

- **`MetricCard.jsx`**: Displays specific sales/stock indicators in a grid.
- **`PromptSelector.jsx`**: Contains suggested click-to-input prompts.
- **`AdvisorTranscript.jsx`**: Encapsulates conversation memories, loading animations, markdown rendering highlights, and automatic scrolls.
  Refactored `client/src/pages/BusinessAdvisor.jsx` to clean up state refs and use these sub-components.

### 3. Orders Page Refactoring

Decomposed the 2125-line orders page into modular subcomponents inside `client/src/components/orders/`:

- **`OrderBadges.jsx`**: Reusable component helpers for return status, order status, payments, and refund exception badges.
- **`OrderItem.jsx`**: Renders order details and isolates item-specific mutations (cancel, return approvals, dispute creations) along with localized loading indicator states.
- **`IssueSubmitForm.jsx`**: Form for customers to submit refund requests, encapsulating state variables.
- **`DisputeCard.jsx`**: Renders details, timelines, notes, and actions for disputes.
- **`IssueCard.jsx`**: Renders return/refund issue requests and review forms for wholesalers.
- **`OrderCard.jsx`**: Parent component combining all sub-elements (header, footer, items list, and status updates).
  Refactored `client/src/pages/Orders.jsx` to use these subcomponents, shrinking the file to less than 190 lines of high-level page layouts and loaders.

---

## Files Created/Modified

### New Components

1. [StatCard.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/dashboard/StatCard.jsx)
2. [QuickStrip.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/dashboard/QuickStrip.jsx)
3. [InfoTile.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/dashboard/InfoTile.jsx)
4. [MiniMetric.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/dashboard/MiniMetric.jsx)
5. [AlertRow.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/dashboard/AlertRow.jsx)
6. [WatchRow.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/dashboard/WatchRow.jsx)
7. [StockPressureChart.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/dashboard/StockPressureChart.jsx)
8. [MetricCard.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/advisor/MetricCard.jsx)
9. [PromptSelector.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/advisor/PromptSelector.jsx)
10. [AdvisorTranscript.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/advisor/AdvisorTranscript.jsx)
11. [OrderBadges.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/orders/OrderBadges.jsx)
12. [OrderItem.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/orders/OrderItem.jsx)
13. [IssueSubmitForm.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/orders/IssueSubmitForm.jsx)
14. [DisputeCard.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/orders/DisputeCard.jsx)
15. [IssueCard.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/orders/IssueCard.jsx)
16. [OrderCard.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/components/orders/OrderCard.jsx)

### Pages Simplified

1. [Dashboard.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Dashboard.jsx)
2. [BusinessAdvisor.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/BusinessAdvisor.jsx)
3. [Orders.jsx](file:///c:/Users/smufa/Desktop/NexCart_updated/client/src/pages/Orders.jsx)

---

## Verification

- Verified compilation build succeeds with Vite bundling.
- Checked frontend linting rules and ran standard formatters.
