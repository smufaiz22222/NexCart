import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeIndianRupee, Boxes, Pencil, Save, Tag, TriangleAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/axios';

const buildFormData = (product) => ({
  name: product?.name || '',
  description: product?.description || '',
  category: product?.category || '',
  price: product?.price ?? '',
  costPrice: product?.costPrice ?? '',
  sku: product?.sku || '',
  imageUrl: product?.imageUrl || '',
  currentStock: product?.currentStock ?? 0,
  minStock: product?.minStock ?? 10,
});

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function SellerProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [formData, setFormData] = useState(buildFormData(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProduct = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/products/${id}`);
      setProduct(response.data);
      setFormData(buildFormData(response.data));
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

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      const response = await apiClient.put(`/products/${id}`, {
        ...formData,
        price: parseFloat(formData.price),
        costPrice: parseFloat(formData.costPrice || 0),
        currentStock: parseInt(formData.currentStock || 0, 10),
        minStock: parseInt(formData.minStock || 10, 10),
      });
      setProduct(response.data.product);
      setFormData(buildFormData(response.data.product));
      setIsModalOpen(false);
      setError('');
    } catch (saveError) {
      setError(saveError.response?.data?.error || 'Failed to save product changes.');
    } finally {
      setIsSaving(false);
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-zinc-800 bg-[#161616] shadow-2xl">
            <div className="border-b border-zinc-800 bg-[#0a0a0a] px-6 py-4">
              <h2 className="text-lg font-bold tracking-wide text-white">Edit Product</h2>
            </div>

            <form onSubmit={handleSave} className="max-h-[calc(90vh-88px)] overflow-y-auto p-6">
              <div className="grid gap-5">
                <FormField label="Product Name *">
                  <input
                    required
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="Description">
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className={`${inputClassName} resize-none`}
                  />
                </FormField>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Category">
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={inputClassName}
                    />
                  </FormField>
                  <FormField label="SKU *">
                    <input
                      required
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      className={`${inputClassName} font-mono`}
                    />
                  </FormField>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Selling Price (₹) *">
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      className={inputClassName}
                    />
                  </FormField>
                  <FormField label="Cost Price (₹)">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="costPrice"
                      value={formData.costPrice}
                      onChange={handleChange}
                      className={inputClassName}
                    />
                  </FormField>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Current Stock">
                    <input
                      type="number"
                      min="0"
                      name="currentStock"
                      value={formData.currentStock}
                      onChange={handleChange}
                      className={inputClassName}
                    />
                  </FormField>
                  <FormField label="Minimum Stock Alert">
                    <input
                      type="number"
                      min="0"
                      name="minStock"
                      value={formData.minStock}
                      onChange={handleChange}
                      className={inputClassName}
                    />
                  </FormField>
                </div>

                <FormField label="Image URL">
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </FormField>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(buildFormData(product));
                    setIsModalOpen(false);
                  }}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
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

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.24em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  'block w-full rounded-xl border border-zinc-700 bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-amber-400/50 focus:outline-none';
