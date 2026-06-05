"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Filters from "@/components/catalog/Filters";
import ProductCard from "@/components/catalog/ProductCard";
import Pagination from "@/components/ui/Pagination";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { FilterIcon } from "@/components/icons/FilterIcon";
import { Productslcon } from "@/components/icons/Productslcon";

interface Category {
  id: number;
  name: string;
  icon_url: string | null;
  parent_category_id: number | null;
}

interface Product {
  id: string;
  title: string;
  price: number;
  main_image_url: string;
  master_id: string;
  master_name?: string;
  status?: string;
  created_at?: string;
  category?: string;
}

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "all",
    technique: searchParams.get("technique") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    search: searchParams.get("search") || "",
    sort: searchParams.get("sort") || "newest",
    page: parseInt(searchParams.get("page") || "1")
  });
  const [availableFilters, setAvailableFilters] = useState({
    techniques: [],
    priceRange: { min: 0, max: 10000 },
    sortOptions: []
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [filters]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    const categoryParam = searchParams.get("category")
    const techniqueParam = searchParams.get("technique")
    const minPriceParam = searchParams.get("minPrice")
    const maxPriceParam = searchParams.get("maxPrice")
    const searchParam = searchParams.get("search")
    const sortParam = searchParams.get("sort")
    const pageParam = searchParams.get("page")

    if (categoryParam || techniqueParam || minPriceParam || maxPriceParam || searchParam || sortParam) {
      setFilters({
        category: categoryParam || "all",
        technique: techniqueParam || "",
        minPrice: minPriceParam || "",
        maxPrice: maxPriceParam || "",
        search: searchParam || "",
        sort: sortParam || "newest",
        page: parseInt(pageParam || "1")
      })
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value))
      })

      const response = await fetch(`/api/catalog/products?${params}`)
      const data = await response.json()

      setProducts(data.products || [])
      setPagination(data.pagination)
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await fetch(`/api/catalog/filters`);
      const data = await response.json();

      if (data.success) {
        if (data.priceRange && data.priceRange.max > 50000) {
          data.priceRange.max = 50000
        }
        setAvailableFilters(data)
      }
    } catch (error) {
      console.error("Error fetching filters:", error)
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch("/api/catalog/categories");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleFilterChange = (newFilters: {
    category?: string;
    technique?: string;
    minPrice?: string | number;
    maxPrice?: string | number;
    search?: string;
    sort?: string;
    page?: number;
  }) => {
    const updated = {
      ...filters,
      ...newFilters,
      page: 1,
      minPrice: newFilters.minPrice !== undefined ? String(newFilters.minPrice) : filters.minPrice,
      maxPrice: newFilters.maxPrice !== undefined ? String(newFilters.maxPrice) : filters.maxPrice
    };
    setFilters(updated);

    const params = new URLSearchParams();
    Object.entries(updated).forEach(([key, value]) => {
      if (value && value !== "all") params.append(key, String(value))
    })
    router.push(`/catalog?${params}`);
    if (isMobile) setShowMobileFilters(false);
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
    const params = new URLSearchParams();
    Object.entries({ ...filters, page: newPage }).forEach(([key, value]) => {
      if (value && value !== "all") params.append(key, String(value))
    });
    router.push(`/catalog?${params}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilter = () => {
    setFilters({
      category: "all",
      technique: "",
      minPrice: "",
      maxPrice: "",
      search: "",
      sort: "newest",
      page: 1
    });
    router.push("/catalog");
    if (isMobile) setShowMobileFilters(false);
  };

  const handleSearch = (searchTerm: string) => {
    handleFilterChange({ search: searchTerm, page: 1 });
  };

  const getGridCols = () => {
    if (isMobile) return "grid-cols-2";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  };

  const handleIconError = (categoryName: string) => {
    setIconErrors((prev) => new Set(prev).add(categoryName));
  };

  const rootCategories = categories.filter((cat) => cat.parent_category_id === null);

  return (
    <div className="min-h-screen bg-main">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="inline-block font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl lg:text-4xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
            Каталог изделий
          </h1>
          <p className="text-firm-gray mt-2 text-sm">{pagination.total} уникальных изделий ручной работы</p>
        </div>

        {!loadingCategories && rootCategories.length > 0 && (
          <div className="overflow-x-auto pb-3 mb-6">
            <div className="flex gap-3 min-w-max">
              <button onClick={() => handleFilterChange({ category: "all" })} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${filters.category === "all" ? "bg-linear-to-r from-firm-orange/15 to-firm-pink/15"  : "hover:bg-gray-50"}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${filters.category === "all" ? "bg-linear-to-r from-firm-orange to-firm-pink" : "bg-gray-100"}`}>
                  <Productslcon className={`w-6 h-6 object-contain ${filters.category === "all" ? "brightness-0 invert" : "" }`} color={filters.category === "all" ? "#f9f9f9" : "#737682"} size={24} />
                </div>
                <span className={`text-xs font-medium ${filters.category === "all" ? "text-firm-orange" : "text-firm-gray"}`}>Все</span>
              </button>

              {rootCategories.map((cat) => {
                const hasError = iconErrors.has(cat.name);
                const isActive = filters.category === cat.name;

                return (
                  <button key={cat.id} onClick={() => handleFilterChange({ category: cat.name })} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${isActive ? "bg-linear-to-r from-firm-orange/15 to-firm-pink/15" : "hover:bg-gray-50" }`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive ? "bg-linear-to-r from-firm-orange to-firm-pink" : "bg-gray-100"}`}>
                      {cat.icon_url && !hasError ? (
                        <img src={cat.icon_url} alt={cat.name} className={`w-6 h-6 object-contain ${isActive ? "brightness-0 invert" : "" }`} onError={() => handleIconError(cat.name)} />
                      ) : (
                        <Productslcon className={`w-6 h-6 object-contain ${isActive ? "brightness-0 invert" : ""}`} color={isActive ? "#f9f9f9" : "#737682"} size={24} />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isActive ? "text-firm-orange" : "text-firm-gray"
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 items-center mb-6">
          <div className="relative flex-1 md:w-96 md:flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon color="#737682" size={16} />
            </div>
            <input type="text" placeholder="Поиск по названию..." value={filters.search} onChange={(e) => handleSearch(e.target.value)} className="w-full p-3 pl-10 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm placeholder:text-firm-gray" />
          </div>

          {isMobile && (<motion.button onClick={() => setShowMobileFilters(true)} className="px-4 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl flex items-center gap-2 text-sm font-medium whitespace-nowrap shadow-md" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}><FilterIcon className="w-4 h-4" color="#f9f9f9" size={16} />Фильтры</motion.button>)}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {!isMobile && (
            <div className="w-full md:w-80 lg:w-96 shrink-0">
              <Filters filters={filters} availableFilters={availableFilters} onFilterChange={handleFilterChange} onClearFilters={clearFilter} />
            </div>
          )}

          {/* Товары */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <p className="text-sm text-firm-gray">
                Показано {products.length} из {pagination.total}
              </p>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange({ sort: e.target.value })}
                className="p-2 rounded-xl bg-main border-2 border-gray-200 outline-firm-pink font-['Montserrat_Alternates'] text-sm w-full sm:w-auto focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all"
              >
                <option value="newest">Сначала новые</option>
                <option value="popular">Популярные</option>
                <option value="price_asc">Сначала дешевле</option>
                <option value="price_desc">Сначала дороже</option>
                <option value="rating">По рейтингу</option>
              </select>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12">
                  <LoadingSpinner />
                </motion.div>
              ) : products.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 bg-main rounded-2xl border-2 border-gray-100">
                  <div className="mb-4 flex justify-center">
                    <Productslcon color="#D4D4D4" size={80} />
                  </div>
                  <p className="text-firm-gray mb-4 font-['Montserrat_Alternates'] text-base">Товары не найдены</p>
                  <button  onClick={clearFilter} className="px-6 py-2.5 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all">Сбросить фильтры</button>
                </motion.div>
              ) : (
                <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`grid ${getGridCols()} gap-3 sm:gap-4`}>
                  {products.map((product: Product, index: number) => (
                    <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -5 }}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {pagination.totalPages > 1 && !loading && products.length > 0 && (
              <motion.div className="mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Pagination  currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobile && showMobileFilters && (
          <motion.div className="fixed inset-0 z-50 bg-main-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}  onClick={() => setShowMobileFilters(false)} >
            <motion.div className="fixed right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-xl overflow-y-auto" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }} onClick={(e) => e.stopPropagation()} >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text">Фильтры</h3>
                <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><CloseIcon className="w-4 h-4" color="#737682" size={16} /></button>
              </div>
              <div className="p-4">
                <Filters filters={filters} availableFilters={availableFilters} onFilterChange={handleFilterChange} onClearFilters={clearFilter} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}