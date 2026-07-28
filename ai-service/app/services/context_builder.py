def build_context_paragraph(ctx: dict) -> str:
    if not ctx:
        return "No business metrics available for this session."

    lines = []

    sales = ctx.get("monthlySales", 0)
    lines.append(
        f"This month the seller has generated {sales:,} in total sales revenue."
    )

    low_stock = ctx.get("lowStockProducts", 0)
    if low_stock > 0:
        lines.append(f"{low_stock} product(s) are critically low on stock.")

    unsold = ctx.get("unsoldInventory", 0)
    if unsold > 0:
        lines.append(f"{unsold} product(s) have had zero sales and are dead inventory.")

    category = ctx.get("topSellingCategory", "N/A")
    if category != "N/A":
        lines.append(f"The top-performing category is '{category}'.")

    repeat_rate = ctx.get("repeatCustomerRate", 0)
    if isinstance(repeat_rate, str):
        rate_label = repeat_rate
        rate_value = float(repeat_rate.strip("%") or 0)
    else:
        rate_value = float(repeat_rate or 0)
        rate_label = f"{rate_value:.2f}%"
    lines.append(
        f"Repeat customer rate is {rate_label}. "
        + ("This is healthy." if rate_value >= 30 else "Retention needs improvement.")
    )

    total = ctx.get("totalProducts", 0)
    if total:
        lines.append(f"The seller has {total} products listed.")

    return " ".join(lines)
