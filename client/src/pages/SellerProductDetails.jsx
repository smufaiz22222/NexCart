import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeIndianRupee,
  Boxes,
  Pencil,
  Save,
  Tag,
  TriangleAlert,
  X,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/axios';
import { ProductForm } from '../components/ProductForm';
import { toast } from 'sonner';

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function SellerProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchProduct = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/products/${id}`);
      setProduct(response.data);
      setError('');
    } catch (fetchError) {
      setError(fetchError.response?.data?.error || 'Failed to load product details.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const stockStatus = useMemo(() => {
    if (!product)
      return { label: 'Unknown', className: 'bg-zinc-800/60 text-zinc-300 border-zinc-700' };
    if (product.currentStock === 0)
      return { label: 'Out of Stock', className: 'bg-red-500/10 text-red-300 border-red-500/20' };
    if (product.currentStock <= (product.minStock || 10))
      return {
        label: 'Low Stock',
        className: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      };
    return {
      label: 'Healthy Stock',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    };
  }, [product]);

  const margin = Number(product?.price || 0) - Number(product?.costPrice || 0);

  const handleUpdateProduct = async (values) => {
    try {
      const response = await apiClient.put(`/products/${id}`, {
        ...values,
        price: parseFloat(values.price),
        currentStock: parseInt(values.currentStock || 0, 10),
        minStock: parseInt(values.minStock || 10, 10),
      });
      setProduct(response.data.product);
      setIsModalOpen(false);
      toast.success('Product updated successfully!');
      setError('');
    } catch (saveError) {
      toast.error(saveError.response?.data?.error || 'Failed to save product changes.');
    }
  };

  const handleUpdateTiers = async (newTiers) => {
    try {
      const response = await apiClient.post(`/b2b/products/${id}/tiers`, { tiers: newTiers });
      setProduct((prev) => ({
        ...prev,
        priceTiers: response.data.tiers,
      }));
      toast.success('Volume price tiers updated successfully!');
    } catch (saveError) {
      toast.error(saveError.response?.data?.error || 'Failed to save price tiers.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-amber-400">
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Link
          to="/wholesaler/products"
          className="inline-flex items-center text-sm font-semibold text-amber-400 hover:text-amber-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error || 'Product not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/wholesaler/products"
            className="inline-flex items-center text-sm font-semibold text-amber-400 hover:text-amber-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{product.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            {product.description || 'No description available for this product yet.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-zinc-950 transition hover:bg-amber-300"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit Product
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-zinc-800 bg-[#141414] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="rounded-[24px] border border-zinc-800 bg-[#f5f5f0] p-4">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center text-sm font-bold uppercase tracking-[0.3em] text-zinc-500">
                  No Image
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] ${stockStatus.className}`}
                >
                  <Boxes className="mr-2 h-4 w-4" />
                  {stockStatus.label}
                </span>
                <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                  <Tag className="mr-2 h-4 w-4 text-amber-400" />
                  {product.category || 'General'}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailCard label="Selling Price" value={formatCurrency(product.price)} />
                <DetailCard label="Cost Price" value={formatCurrency(product.costPrice)} />
                <DetailCard label="SKU" value={product.sku || 'Not set'} mono />
                <DetailCard label="Current Stock" value={`${product.currentStock}`} />
                <DetailCard label="Min Stock Alert" value={`${product.minStock || 10}`} />
                <DetailCard
                  label="Last Updated"
                  value={new Date(product.updatedAt).toLocaleString()}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <SummaryPanel
            icon={BadgeIndianRupee}
            title="Margin View"
            value={formatCurrency(margin)}
            description={
              margin >= 0
                ? 'Current gross margin per unit before expenses.'
                : 'Cost price is higher than selling price.'
            }
          />
          <SummaryPanel
            icon={Boxes}
            title="Inventory Health"
            value={`${product.currentStock} units`}
            description={
              product.currentStock === 0
                ? 'This item is currently unavailable and needs replenishment.'
                : product.currentStock <= (product.minStock || 10)
                  ? 'This item is near the alert threshold and should be watched closely.'
                  : 'This item has enough stock for normal selling activity.'
            }
          />
          <div className="rounded-[28px] border border-zinc-800 bg-[#141414] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
            <div className="flex items-start">
              <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-300" />
              <div className="ml-3">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
                  Product Identity
                </p>
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                  <p>
                    <span className="text-zinc-500">Category:</span> {product.category || 'General'}
                  </p>
                  <p>
                    <span className="text-zinc-500">SKU:</span> {product.sku || 'Not set'}
                  </p>
                  <p>
                    <span className="text-zinc-500">Created:</span>{' '}
                    {new Date(product.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8">
        <VolumeTiersSection product={product} onUpdateTiers={handleUpdateTiers} />
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-zinc-800 bg-[#161616] shadow-2xl flex flex-col">
            <div className="border-b border-zinc-800 bg-[#0a0a0a] px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold tracking-wide text-white">Edit Product</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 custom-scrollbar">
              <ProductForm
                initialData={product}
                onSubmit={handleUpdateProduct}
                onCancel={() => setIsModalOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VolumeTiersSection({ product, onUpdateTiers }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTiers, setEditedTiers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    const current = (product.priceTiers || []).map(t => ({
      minQuantity: t.minQuantity,
      unitPrice: t.unitPrice
    }));
    setEditedTiers(current.length > 0 ? current : [{ minQuantity: '', unitPrice: '' }]);
    setIsEditing(true);
  };

  const handleAddRow = () => {
    setEditedTiers([...editedTiers, { minQuantity: '', unitPrice: '' }]);
  };

  const handleRemoveRow = (index) => {
    setEditedTiers(editedTiers.filter((_, i) => i !== index));
  };

  const handleChangeRow = (index, field, value) => {
    const updated = [...editedTiers];
    updated[index][field] = value;
    setEditedTiers(updated);
  };

  const handleSave = async () => {
    const validTiers = [];
    const minQs = new Set();

    for (let i = 0; i < editedTiers.length; i++) {
      const { minQuantity, unitPrice } = editedTiers[i];
      if (minQuantity === '' || unitPrice === '') {
        toast.error('All tier fields must be filled.');
        return;
      }

      const q = parseInt(minQuantity, 10);
      const p = parseFloat(unitPrice);

      if (isNaN(q) || q <= 1) {
        toast.error('Minimum quantity must be greater than 1.');
        return;
      }

      if (isNaN(p) || p <= 0) {
        toast.error('Unit price must be a valid positive number.');
        return;
      }

      if (p >= product.price) {
        toast.error(`Unit price (₹${p}) must be lower than the base price (₹${product.price}).`);
        return;
      }

      if (minQs.has(q)) {
        toast.error(`Duplicate minimum quantity: ${q}. Each tier must have a unique minimum quantity.`);
        return;
      }

      minQs.add(q);
      validTiers.push({ minQuantity: q, unitPrice: p });
    }

    validTiers.sort((a, b) => a.minQuantity - b.minQuantity);

    setIsSaving(true);
    try {
      await onUpdateTiers(validTiers);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-zinc-800 bg-[#141414] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-bold tracking-wide text-white">Wholesale Volume Pricing Tiers</h2>
          <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">
            Configure tiered pricing options for B2B bulk purchases
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            Manage Tiers
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <div>Min. Quantity *</div>
            <div>Unit Price (₹) *</div>
            <div className="w-10"></div>
          </div>

          <div className="space-y-3">
            {editedTiers.map((tier, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="number"
                  value={tier.minQuantity}
                  onChange={(e) => handleChangeRow(index, 'minQuantity', e.target.value)}
                  placeholder="e.g. 10"
                  min="2"
                  step="1"
                  className="w-full rounded-xl border border-zinc-700 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700 focus:border-amber-400/50"
                />
                <input
                  type="number"
                  value={tier.unitPrice}
                  onChange={(e) => handleChangeRow(index, 'unitPrice', e.target.value)}
                  placeholder="e.g. 180.00"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-xl border border-zinc-700 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-zinc-700 focus:border-amber-400/50"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRow(index)}
                  className="rounded-xl bg-red-500/10 p-3 text-red-400 hover:bg-red-500/20 transition-all"
                  title="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800/50">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-850 hover:text-white"
            >
              <Plus className="h-4 w-4 text-amber-400" />
              Add Row
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-950 transition hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Tiers
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {(!product.priceTiers || product.priceTiers.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 p-8 text-center flex flex-col items-center justify-center">
              <p className="text-sm text-zinc-400 max-w-md">
                No volume discount tiers set up yet. Incentivize wholesale buyers to place bulk orders by offering discounts for higher quantities.
              </p>
              <button
                type="button"
                onClick={startEditing}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-950 transition hover:bg-amber-300 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Configure Volume Pricing
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {product.priceTiers.map((tier, idx) => {
                const savings = product.price > 0 ? Math.round(((product.price - tier.unitPrice) / product.price) * 100) : 0;
                return (
                  <div key={tier.id || idx} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-5 flex flex-col justify-between hover:border-zinc-700 transition duration-300">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center rounded-full bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          {tier.minQuantity}+ units
                        </span>
                        {savings > 0 && (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                            {savings}% Off
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-2xl font-black text-white tracking-tight">
                        ₹{tier.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wide">
                        Unit price
                      </p>
                    </div>
                    {savings > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-800/50 text-xs text-zinc-400">
                        Saves <span className="font-semibold text-emerald-400">₹{(product.price - tier.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> per unit
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailCard({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">{label}</p>
      <p
        className={`mt-3 text-sm font-semibold text-white ${mono ? 'break-all font-mono text-xs' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryPanel({ icon, title, value, description }) {
  const Icon = icon;
  return (
    <div className="rounded-[28px] border border-zinc-800 bg-[#141414] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">{title}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
