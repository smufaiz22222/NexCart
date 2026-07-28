import {
  Smartphone,
  Shirt,
  Home,
  Sparkles,
  Dumbbell,
  BookOpen,
  Baby,
  ShoppingBasket,
  Car,
  PawPrint,
  Briefcase,
  Store,
  ChevronRight,
} from 'lucide-react';
import categoryData from '../../data/categoryData';

const iconMap = {
  Smartphone,
  Shirt,
  Home,
  Sparkles,
  Dumbbell,
  BookOpen,
  Baby,
  ShoppingBasket,
  Car,
  PawPrint,
  Briefcase,
};

export default function CategorySelector({
  selectedCategory,
  handleCategoryClick,
  activeCategoryData,
  selectedSubcategory,
  handleSubcategoryClick,
  clearFilters,
}) {
  return (
    <section id="categories-section" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight">Shop by Category</h2>
        <button
          type="button"
          onClick={clearFilters}
          className="text-sm font-semibold text-[#4f46e5] transition hover:underline"
        >
          View All
        </button>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
        {categoryData.map((category) => {
          const Icon = iconMap[category.icon] || Store;
          const isActive = selectedCategory === category.name;
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => handleCategoryClick(category.name)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
                isActive
                  ? 'border-[#4f46e5] bg-[#eef2ff] shadow-md'
                  : 'border-[#e2e8f0] bg-white hover:border-[#4f46e5]/40 hover:shadow-sm'
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isActive ? 'bg-[#4f46e5] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={`text-center text-xs font-bold leading-tight ${
                  isActive ? 'text-[#4f46e5]' : 'text-[#475569]'
                }`}
              >
                {category.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Subcategories for selected category */}
      {activeCategoryData && (
        <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-[#1e293b]">{activeCategoryData.name}</h3>
            <ChevronRight className="h-3.5 w-3.5 text-[#94a3b8]" />
            <span className="text-xs text-[#94a3b8]">Subcategories</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeCategoryData.subcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => handleSubcategoryClick(sub)}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  selectedSubcategory === sub
                    ? 'bg-[#4f46e5] text-white'
                    : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#4f46e5] hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
