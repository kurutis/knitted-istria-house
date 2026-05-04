"use client";

import { useState, useEffect } from "react";
import ProductCard from "./ProductCard";

interface SimilarProductsProps {
  category: string;
  currentId: string;
}

export default function SimilarProducts({
  category,
  currentId,
}: SimilarProductsProps) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (category) {
      fetchSimilarProducts();
    }
  }, [category, currentId]);

  const fetchSimilarProducts = async () => {
    try {
      const response = await fetch(
        `/api/catalog/products?category=${category}&limit=4&exclude=${currentId}`,
      );
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching similar products:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">
          Похожие товары
        </h2>
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square bg-[#EAEAEA] animate-pulse rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">
        Похожие товары
      </h2>
      <div className="grid grid-cols-4 gap-6">
        {products.map(
          (product: {
            id: string;
            title: string;
            price: number;
            main_image_url: string | null;
            master_name?: string;
          }) => (
            <ProductCard key={product.id} product={product} />
          ),
        )}
      </div>
    </div>
  );
}
