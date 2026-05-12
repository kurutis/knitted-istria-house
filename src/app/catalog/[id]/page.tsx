"use client";

import React, { useState, useEffect, JSX } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  technique: string;
  size: string;
  care_instructions: string;
  color: string;
  main_image_url: string;
  images: Array<{ id: string; image_url: string; sort_order: number }>;
  master_id: string;
  master_name: string;
  master_avatar: string;
  master_city: string;
  rating: number;
  reviews_count: number;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    author_name: string;
    author_avatar: string;
  }>;
  yarns: Array<{
    id: string;
    name: string;
    article: string;
    brand: string;
    color: string;
    composition: string;
  }>;
  views: number;
  created_at: string;
  status: string;
}

type Category = {
  id: string;
  name: string;
  subcategories?: Category[];
};

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isInCart, setIsInCart] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "specs" | "description" | "care" | "reviews"
  >("specs");
  const [updatingCart, setUpdatingCart] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    technique: "",
    size: "",
    color: "",
    care_instructions: "",
  });
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (id) {
      fetchProduct();
      if (session) {
        checkCartStatus();
        checkFavoriteStatus();
      }
    }
  }, [id, session]);

  useEffect(() => {
    if (showEditModal) {
      loadCategories();
    }
  }, [showEditModal]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/catalog/products/${id}`);
      if (!response.ok) throw new Error("Товар не найден");
      const data = await response.json();
      setProduct(data);
      setEditForm({
        title: data.title,
        description: data.description || "",
        price: data.price.toString(),
        category: data.category || "",
        technique: data.technique || "",
        size: data.size || "",
        color: data.color || "",
        care_instructions: data.care_instructions || "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/catalog/categories");
      const data = await response.json();
      const categoriesData = data.categories || [];
      setCategories(categoriesData as Category[]);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
    }
  };

  const renderCategoryOptions = (categories: Category[], level = 0) => {
    const options: JSX.Element[] = [];
    categories.forEach((cat) => {
      const prefix = "—".repeat(level);
      options.push(
        <option key={cat.id} value={cat.name}>
          {prefix} {cat.name}
        </option>,
      );
      if (cat.subcategories && cat.subcategories.length > 0) {
        options.push(...renderCategoryOptions(cat.subcategories, level + 1));
      }
    });
    return options;
  };

  const checkCartStatus = async () => {
    try {
      const response = await fetch("/api/cart");
      const data = await response.json();
      const cartItem = data.items?.find(
        (item: { product_id: string; quantity: number }) =>
          item.product_id === id,
      );
      if (cartItem) {
        setIsInCart(true);
        setQuantity(cartItem.quantity);
      }
    } catch (error) {
      console.error("Error checking cart status:", error);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch("/api/user/favorites");
      const data = await response.json();
      // API возвращает { success, favorites, ... }
      const favoritesList = data.favorites || (Array.isArray(data) ? data : []);
      const isFav = favoritesList.some(
        (item: { id: string }) => item.id === id,
      );
      setIsFavorite(isFav);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  const handleAddToCart = async () => {
    if (!session) {
      window.location.href = `/auth/signin?callbackUrl=/catalog/${id}`;
      return;
    }

    setUpdatingCart(true);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, quantity }),
      });
      if (response.ok) {
        setIsInCart(true);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setUpdatingCart(false);
    }
  };

  const handleRemoveFromCart = async () => {
    setUpdatingCart(true);
    try {
      const response = await fetch(`/api/cart?productId=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsInCart(false);
        setQuantity(1);
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
    } finally {
      setUpdatingCart(false);
    }
  };

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) return;

    setQuantity(newQuantity);
    setUpdatingCart(true);
    try {
      const response = await fetch("/api/cart", {
        // ← ИСПРАВЛЕНО
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, quantity: newQuantity }),
      });

      if (!response.ok) {
        console.error("Failed to update quantity");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    } finally {
      setUpdatingCart(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!session) {
      window.location.href = `/auth/signin?callbackUrl=/catalog/${id}`;
      return;
    }

    try {
      const method = isFavorite ? "DELETE" : "POST";
      const url = isFavorite
        ? `/api/user/favorites?productId=${id}`
        : "/api/user/favorites";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: isFavorite ? undefined : JSON.stringify({ productId: id }),
      });

      if (response.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (!session) return;

    setSubmittingReview(true);
    try {
      const response = await fetch(`/api/catalog/products/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });

      if (response.ok) {
        await fetchProduct();
        setShowReviewModal(false);
        setReviewRating(5);
        setReviewComment("");
        setActiveTab("reviews");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditing(true);

    try {
      const response = await fetch(`/api/master/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          price: parseFloat(editForm.price),
          category: editForm.category,
          technique: editForm.technique,
          size: editForm.size,
          color: editForm.color,
          care_instructions: editForm.care_instructions,
        }),
      });

      if (response.ok) {
        await fetchProduct();
        setShowEditModal(false);
        alert("Товар успешно обновлен");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка при обновлении");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Ошибка при обновлении товара");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteProduct = async () => {
    setEditing(true);
    try {
      const response = await fetch(`/api/master/products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/master/dashboard");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка при удалении");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Ошибка при удалении товара");
    } finally {
      setEditing(false);
    }
  };

  const isAuthor =
    session?.user?.id === product?.master_id &&
    session?.user?.role === "master";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
            Загрузка...
          </p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Товар не найден"}</p>
          <Link
            href="/catalog"
            className="px-6 py-3 bg-firm-orange text-white rounded-lg inline-block"
          >
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  const displayImages =
    product.images?.length > 0
      ? product.images
      : product.main_image_url
        ? [
            {
              id: "placeholder",
              image_url: product.main_image_url,
              sort_order: 0,
            },
          ]
        : [];

  // Кнопки для мастера (вместо корзины и избранного)
  const MasterActions = () => (
    <div className="flex gap-3">
      <button
        onClick={() => setShowEditModal(true)}
        className="flex-1 px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300"
      >
        ✏️ Редактировать
      </button>
      <button
        onClick={handleDeleteProduct}
        disabled={editing}
        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
      >
        🗑️ Удалить
      </button>
    </div>
  );

  // Кнопки для покупателя (корзина + избранное)
  const BuyerActions = () => (
    <div className="flex gap-3">
      <div className="flex-1">
        {isInCart ? (
          <div className="flex items-center justify-between bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => handleUpdateQuantity(quantity - 1)}
              disabled={quantity <= 1 || updatingCart}
              className="w-10 h-10 rounded-lg bg-firm-orange text-white flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50"
            >
              -
            </button>
            <span className="w-12 text-center font-medium">{quantity}</span>
            <button
              onClick={() => handleUpdateQuantity(quantity + 1)}
              disabled={updatingCart}
              className="w-10 h-10 rounded-lg bg-firm-orange text-white flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50"
            >
              +
            </button>
            <button
              onClick={handleRemoveFromCart}
              className="ml-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              Удалить
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={updatingCart}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-firm-orange text-white rounded-xl hover:bg-opacity-90 transition disabled:opacity-50"
          >
            <svg
              width="24"
              height="20"
              viewBox="0 0 46 38"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.06369 17.3916C1.9852 17.0783 1.97917 16.7512 2.04607 16.4351C2.11296 16.1191 2.25101 15.8225 2.44973 15.5679C2.64845 15.3132 2.90261 15.1072 3.19289 14.9656C3.48317 14.8239 3.80193 14.7502 4.12494 14.7502H41.1849C41.5077 14.7503 41.8262 14.8239 42.1163 14.9655C42.4064 15.1071 42.6604 15.3128 42.8591 15.5672C43.0578 15.8216 43.1959 16.1179 43.263 16.4337C43.3301 16.7494 43.3243 17.0763 43.2462 17.3895L39.3978 32.7808C39.168 33.7003 38.6374 34.5165 37.8905 35.0998C37.1435 35.6832 36.223 36.0001 35.2753 36.0002H10.0346C9.08684 36.0001 8.16635 35.6832 7.4194 35.0998C6.67244 34.5165 6.14189 33.7003 5.91207 32.7808L2.06369 17.3916Z"
                stroke="white"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M16.2798 23.2502V27.5002M29.0298 23.2502V27.5002M9.90479 14.7502L18.4048 2.00021M35.4048 14.7502L26.9048 2.00021"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span>В корзину</span>
          </button>
        )}
      </div>

      <button
        onClick={handleToggleFavorite}
        className={`w-12 h-12 rounded-xl border-2 transition-all flex items-center justify-center flex-shrink-0 ${
          isFavorite
            ? "border-firm-pink bg-firm-pink text-white"
            : "border-gray-300 hover:border-firm-pink hover:bg-firm-pink hover:text-white"
        }`}
      >
        <svg
          className="w-5 h-5"
          fill={isFavorite ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Хлебные крошки */}
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-firm-orange">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <Link href="/catalog" className="hover:text-firm-orange">
            Каталог
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Левая колонка - галерея */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
              {displayImages[selectedImage]?.image_url ? (
                <img
                  src={displayImages[selectedImage].image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Нет фото
                </div>
              )}
            </div>
            {displayImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-4">
                {displayImages.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? "border-firm-orange"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={`${product.title} - фото ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Правая колонка - информация */}
          <div>
            <h1 className="font-['Montserrat_Alternates'] font-bold text-2xl md:text-3xl mb-2">
              {product.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Link
                href={`/masters/${product.master_id}`}
                className="flex items-center gap-2 hover:opacity-80 group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                  {product.master_avatar ? (
                    <img
                      src={product.master_avatar}
                      alt={product.master_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    product.master_name?.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-sm text-gray-600 group-hover:text-firm-orange transition">
                  {product.master_name}
                </span>
              </Link>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className="font-semibold text-sm">
                  {product.rating || "Нет оценок"}
                </span>
                <span className="text-gray-400 text-sm">
                  ({product.reviews_count || 0} отзывов)
                </span>
              </div>
            </div>

            <div className="text-3xl font-bold text-firm-orange mb-6">
              {product.price.toLocaleString()} ₽
            </div>

            {/* Действия: для мастера - редактирование/удаление, для покупателя - корзина/избранное */}
            {isAuthor ? <MasterActions /> : <BuyerActions />}

            {/* Характеристики */}
            <div className="my-6">
              {product.category && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">Категория</p>
                  <p className="font-medium text-sm">{product.category}</p>
                </div>
              )}
              {product.technique && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">Техника вязания</p>
                  <p className="font-medium text-sm">{product.technique}</p>
                </div>
              )}
              {product.size && product.size !== "Не применимо" && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">Размер</p>
                  <p className="font-medium text-sm">{product.size}</p>
                </div>
              )}
              {product.color && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">Цвет</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: product.color.toLowerCase() }}
                    />
                    <p className="font-medium text-sm">{product.color}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Описание / Уход / Отзывы */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setActiveTab("specs")}
                  className={`pb-2 font-['Montserrat_Alternates'] text-sm transition-colors ${
                    activeTab === "specs"
                      ? "border-b-2 border-firm-orange text-firm-orange"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Характеристики
                </button>
                <button
                  onClick={() => setActiveTab("description")}
                  className={`pb-2 font-['Montserrat_Alternates'] text-sm transition-colors ${
                    activeTab === "description"
                      ? "border-b-2 border-firm-pink text-firm-pink"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Описание
                </button>
                {product.care_instructions && (
                  <button
                    onClick={() => setActiveTab("care")}
                    className={`pb-2 font-['Montserrat_Alternates'] text-sm transition-colors ${
                      activeTab === "care"
                        ? "border-b-2 border-firm-orange text-firm-orange"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Уход
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`pb-2 font-['Montserrat_Alternates'] text-sm transition-colors ${
                    activeTab === "reviews"
                      ? "border-b-2 border-firm-pink text-firm-pink"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Отзывы ({product.reviews_count || 0})
                </button>
              </div>

              <div className="py-2">
                {activeTab === "specs" && (
                  <div className="space-y-3 w-full">
                    {product.category && (
                      <div className="flex py-1 justify-between items-start">
                        <span className="text-gray-500 text-sm w-2/5 md:w-1/3">
                          Категория:
                        </span>
                        <span className="font-medium text-sm text-right w-3/5 md:w-2/3">
                          {product.category}
                        </span>
                      </div>
                    )}
                    {product.technique && (
                      <div className="flex py-1 justify-between items-start">
                        <span className="text-gray-500 text-sm w-2/5 md:w-1/3">
                          Техника вязания:
                        </span>
                        <span className="font-medium text-sm text-right w-3/5 md:w-2/3">
                          {product.technique}
                        </span>
                      </div>
                    )}
                    {product.size && product.size !== "Не применимо" && (
                      <div className="flex py-1 justify-between items-start">
                        <span className="text-gray-500 text-sm w-2/5 md:w-1/3">
                          Размер:
                        </span>
                        <span className="font-medium text-sm text-right w-3/5 md:w-2/3">
                          {product.size}
                        </span>
                      </div>
                    )}
                    {product.color && (
                      <div className="flex py-1 justify-between items-start">
                        <span className="text-gray-500 text-sm w-2/5 md:w-1/3">
                          Цвет:
                        </span>
                        <div className="font-medium text-sm text-right w-3/5 md:w-2/3 flex justify-end items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: product.color.toLowerCase(),
                            }}
                          />
                          <span>{product.color}</span>
                        </div>
                      </div>
                    )}
                    {product.yarns && product.yarns.length > 0 && (
                      <div className="flex py-1 justify-between items-start">
                        <span className="text-gray-500 text-sm w-2/5 md:w-1/3">
                          Пряжа:
                        </span>
                        <span className="font-medium text-sm text-right w-3/5 md:w-2/3">
                          {product.yarns
                            .map((y: { name: string }) => y.name)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    <div className="flex py-1 justify-between items-start">
                      <span className="text-gray-500 text-sm w-2/5 md:w-1/3">
                        Просмотры:
                      </span>
                      <span className="font-medium text-sm text-right w-3/5 md:w-2/3">
                        {product.views}
                      </span>
                    </div>
                    <div className="flex py-1 justify-between items-start">
                      <span className="text-gray-500 text-sm w-2/5 md:w-1/3">
                        Добавлен:
                      </span>
                      <span className="font-medium text-sm text-right w-3/5 md:w-2/3">
                        {new Date(product.created_at).toLocaleDateString(
                          "ru-RU",
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === "description" && (
                  <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">
                    {product.description}
                  </p>
                )}

                {activeTab === "care" && product.care_instructions && (
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {product.care_instructions}
                  </p>
                )}

                {activeTab === "reviews" && (
                  <div>
                    {session &&
                      session.user?.role !== "master" &&
                      !isAuthor && (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="mb-4 px-4 py-2 bg-firm-orange text-white rounded-lg text-sm hover:bg-opacity-90 transition"
                        >
                          Написать отзыв
                        </button>
                      )}

                    {product.reviews && product.reviews.length > 0 ? (
                      <div className="space-y-4">
                        {product.reviews.map((review) => (
                          <div
                            key={review.id}
                            className="border-b border-gray-100 pb-4"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                                {review.author_avatar ? (
                                  <img
                                    src={review.author_avatar}
                                    alt={review.author_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  review.author_name?.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  {review.author_name}
                                </p>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <span
                                      key={i}
                                      className={
                                        i < review.rating
                                          ? "text-yellow-400 text-xs"
                                          : "text-gray-300 text-xs"
                                      }
                                    >
                                      ★
                                    </span>
                                  ))}
                                  <span className="text-xs text-gray-400 ml-2">
                                    {new Date(
                                      review.created_at,
                                    ).toLocaleDateString("ru-RU")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm">
                              {review.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 text-sm">
                          Пока нет отзывов
                        </p>
                        {session &&
                          session.user?.role !== "master" &&
                          !isAuthor && (
                            <button
                              onClick={() => setShowReviewModal(true)}
                              className="mt-2 text-firm-orange hover:underline text-sm"
                            >
                              Будьте первым
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно добавления отзыва */}
      <AnimatePresence>
        {showReviewModal && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-4">
                Написать отзыв
              </h3>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm">
                  Оценка
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-2xl focus:outline-none"
                    >
                      <span
                        className={
                          star <= reviewRating
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 mb-2 text-sm">
                  Комментарий
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange text-sm"
                  placeholder="Поделитесь впечатлениями о товаре..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewComment.trim()}
                  className="flex-1 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium"
                >
                  {submittingReview ? "Отправка..." : "Отправить"}
                </button>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Модальное окно редактирования товара */}
      <AnimatePresence>
        {showEditModal && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                  Редактирование товара
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateProduct} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    required
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">
                    Категория *
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    required
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                  >
                    <option value="">Выберите категорию</option>
                    {renderCategoryOptions(categories)}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">
                    Цена *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      required
                      min="0"
                      step="100"
                      className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      ₽
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm font-medium">
                      Техника вязки
                    </label>
                    <input
                      type="text"
                      value={editForm.technique}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          technique: e.target.value,
                        }))
                      }
                      className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm font-medium">
                      Размер
                    </label>
                    <input
                      type="text"
                      value={editForm.size}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          size: e.target.value,
                        }))
                      }
                      className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">
                    Цвет
                  </label>
                  <input
                    type="text"
                    value={editForm.color}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">
                    Уход
                  </label>
                  <input
                    type="text"
                    value={editForm.care_instructions}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        care_instructions: e.target.value,
                      }))
                    }
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">
                    Описание
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={5}
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={editing}
                    className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium"
                  >
                    {editing ? "Сохранение..." : "Сохранить"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
