def generate_rule_insights(business_context: dict) -> list[str]:
    ctx = business_context or {}
    insights: list[str] = []

    low_stock_products = int(ctx.get("lowStockProducts", 0) or 0)
    repeat_customer_rate = float(ctx.get("repeatCustomerRate", 0) or 0)
    unsold_inventory = int(ctx.get("unsoldInventory", 0) or 0)
    monthly_sales = float(ctx.get("monthlySales", 0) or 0)

    if low_stock_products > 20:
        insights.append("High stock-out risk detected.")
    if repeat_customer_rate < 15:
        insights.append("Customer retention is below recommended levels.")
    if unsold_inventory > 50:
        insights.append("Large amount of unsold inventory detected.")
    if monthly_sales == 0:
        insights.append("No sales recorded this month.")

    if not insights:
        insights.append(
            "No critical business alerts detected from the current metrics."
        )

    return insights
