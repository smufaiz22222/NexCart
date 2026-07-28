import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import categoryData from '../../data/categoryData';

export default function CategoryMegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const handleMouseEnter = () => {
    setIsOpen(true);
    if (!activeCategory && categoryData.length > 0) {
      setActiveCategory(categoryData[0]);
    }
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  const handleCategoryHover = (category) => {
    setActiveCategory(category);
  };

  const handleNavigate = (categoryName, subcategory) => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams);
    if (subcategory) {
      params.set('category', categoryName);
      params.set('subcategory', subcategory);
    } else {
      params.set('category', categoryName);
    }
    navigate(`/store?${params.toString()}`);
  };

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="flex items-center gap-1 transition hover:text-[#4f46e5]"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Categories
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full pt-2 z-50">
          <div className="flex rounded-xl border border-[#e2e8f0] bg-white shadow-[0_20px_60px_rgba(30,27,75,0.1)] overflow-hidden min-w-[600px]">
            {/* Left: Category list */}
            <div className="w-56 border-r border-[#e2e8f0] bg-[#f8fafc] py-2">
              {categoryData.map((category) => (
                <button
                  type="button"
                  key={category.slug}
                  onMouseEnter={() => handleCategoryHover(category)}
                  onClick={() => handleNavigate(category.name)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                    activeCategory?.slug === category.slug
                      ? 'bg-white font-bold text-[#4f46e5]'
                      : 'text-[#64748b] hover:bg-white hover:text-[#1e293b]'
                  }`}
                >
                  <span>{category.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#94a3b8]" />
                </button>
              ))}
            </div>

            {/* Right: Subcategories */}
            <div className="flex-1 p-5">
              {activeCategory ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4f46e5]">
                    {activeCategory.name}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
                    {activeCategory.subcategories.map((sub) => (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => handleNavigate(activeCategory.name, sub)}
                        className="rounded px-2 py-1.5 text-left text-sm text-[#64748b] transition hover:bg-[#eef2ff] hover:text-[#4f46e5]"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#94a3b8]">
                  Hover on a category to see subcategories
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
