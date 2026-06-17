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
