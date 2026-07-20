import { PlusSquare } from 'lucide-react';

export default function AdjustStockModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  products,
  handleSubmit,
}) {
  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-border-subtle flex flex-col">
        <div className="px-6 py-4 border-b border-border-subtle bg-bg-main">
          <h3 className="text-base font-bold text-text-title tracking-wide flex items-center">
            <PlusSquare className="h-5 w-5 mr-2 text-brand-accent" />
            Adjust Inventory Stock
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label
              htmlFor="inventory-product-id"
              className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5"
            >
              Select Product *
            </label>
            <select
              id="inventory-product-id"
              required
              name="productId"
              value={formData.productId}
              onChange={handleChange}
              className="block w-full px-4 py-2.5 bg-bg-main border border-border-subtle rounded-md text-text-title focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all appearance-none cursor-pointer text-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: `right .5rem center`,
                backgroundRepeat: `no-repeat`,
                backgroundSize: `1.5em 1.5em`,
              }}
            >
              <option value="" disabled className="text-text-muted/60">
                -- Choose a product --
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.currentStock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="inventory-change-amount"
              className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5"
            >
              Quantity Change (+ or -) *
            </label>
            <input
              id="inventory-change-amount"
              required
              type="number"
              name="changeAmount"
              aria-label="Quantity Change"
              placeholder="e.g. 50 or -10"
              value={formData.changeAmount}
              onChange={handleChange}
              className="block w-full px-4 py-2.5 bg-bg-main border border-border-subtle rounded-md text-text-title placeholder-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all font-mono text-sm"
            />
            <p className="text-[11px] font-medium text-text-muted mt-1.5 uppercase tracking-wide">
              Use a negative number to remove stock.
            </p>
          </div>

          <div>
            <label
              htmlFor="inventory-reason"
              className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5"
            >
              Reason *
            </label>
            <select
              id="inventory-reason"
              required
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="block w-full px-4 py-2.5 bg-bg-main border border-border-subtle rounded-md text-text-title focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all appearance-none cursor-pointer text-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: `right .5rem center`,
                backgroundRepeat: `no-repeat`,
                backgroundSize: `1.5em 1.5em`,
              }}
            >
              <option value="MANUAL_ADJUSTMENT">Manual Adjustment (Adding/Removing Stock)</option>
              <option value="OCR_UPDATE">AI Khatta Update</option>
              <option value="REFUND">Customer Refund</option>
            </select>
          </div>

          <div className="pt-6 flex justify-end space-x-3 border-t border-border-subtle/50 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-border-subtle rounded-md text-sm font-medium text-text-body bg-bg-card hover:bg-bg-card-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 border border-transparent rounded-md text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors shadow-sm"
            >
              Save Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
