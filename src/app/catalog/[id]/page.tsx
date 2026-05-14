"use client";

import React, { useState, useEffect, JSX, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import EditProductModal from "@/components/modals/EditProductModal";

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  author_name: string;
  author_avatar: string;
  author_id?: string;
  images?: string[];
}

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
  reviews: Review[];
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

type CategoryItem = {
  id: number;
  name: string;
  subcategories?: CategoryItem[];
};

interface EditingReview {
  id: string;
  rating: number;
  comment: string;
  images: string[];
}

interface RawCategory {
  id: number;
  name: string;
  subcategories?: RawCategory[];
}

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
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояния для редактирования отзыва
  const [editingReview, setEditingReview] = useState<EditingReview | null>(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewComment, setEditReviewComment] = useState("");
  const [editReviewImages, setEditReviewImages] = useState<File[]>([]);
  const [editReviewImagePreviews, setEditReviewImagePreviews] = useState<string[]>([]);
  const [existingReviewImages, setExistingReviewImages] = useState<string[]>([]);
  const [editReviewLoading, setEditReviewLoading] = useState(false);
  const editReviewFileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние для модального окна подтверждения удаления
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

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
      // Преобразуем в формат CategoryItem
      const transformedCategories: CategoryItem[] = categoriesData.map((cat: RawCategory) => ({
        id: cat.id,
        name: cat.name,
        subcategories: cat.subcategories
      }));
      setCategories(transformedCategories);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
    }
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
        toast.success("Товар добавлен в корзину");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Ошибка при добавлении в корзину");
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
        toast.success("Товар удален из корзины");
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("Ошибка при удалении из корзины");
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, quantity: newQuantity }),
      });

      if (!response.ok) {
        console.error("Failed to update quantity");
        toast.error("Ошибка при обновлении количества");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Ошибка при обновлении количества");
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
        toast.success(isFavorite ? "Удалено из избранного" : "Добавлено в избранное");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Ошибка при изменении избранного");
    }
  };

  const handleReviewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (reviewImages.length + files.length > 5) {
      toast.error("Можно загрузить не более 5 изображений");
      return;
    }
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает 5MB`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`Файл ${file.name} не является изображением`);
        return false;
      }
      return true;
    });
    setReviewImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReviewImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
    setReviewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (!session) return;

    if (!reviewComment.trim()) {
      toast.error("Введите текст отзыва");
      return;
    }

    setSubmittingReview(true);
    try {
      const formData = new FormData();
      formData.append("rating", reviewRating.toString());
      formData.append("comment", reviewComment);
      reviewImages.forEach(image => formData.append("images", image));

      const response = await fetch(`/api/catalog/products/${id}/review`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await fetchProduct();
        setShowReviewModal(false);
        setReviewRating(5);
        setReviewComment("");
        setReviewImages([]);
        setReviewImagePreviews([]);
        setActiveTab("reviews");
        toast.success("Отзыв успешно добавлен");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка при добавлении отзыва");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Ошибка при добавлении отзыва");
    } finally {
      setSubmittingReview(false);
    }
  };

  const startEditingReview = (review: Review) => {
    setEditingReview({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      images: review.images || []
    });
    setEditReviewRating(review.rating);
    setEditReviewComment(review.comment);
    setExistingReviewImages(review.images || []);
    setEditReviewImages([]);
    setEditReviewImagePreviews([]);
  };

  const cancelEditingReview = () => {
    setEditingReview(null);
    setEditReviewRating(5);
    setEditReviewComment("");
    setEditReviewImages([]);
    setEditReviewImagePreviews([]);
    setExistingReviewImages([]);
  };

  const handleEditReviewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (editReviewImages.length + files.length > 5) {
      toast.error("Можно загрузить не более 5 изображений");
      return;
    }
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает 5MB`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`Файл ${file.name} не является изображением`);
        return false;
      }
      return true;
    });
    setEditReviewImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditReviewImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingReviewImage = (index: number) => {
    setExistingReviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeEditReviewImage = (index: number) => {
    setEditReviewImages(prev => prev.filter((_, i) => i !== index));
    setEditReviewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;
    
    setEditReviewLoading(true);
    try {
      const formData = new FormData();
      formData.append("rating", editReviewRating.toString());
      formData.append("comment", editReviewComment);
      existingReviewImages.forEach(img => formData.append("imagesToKeep", img));
      editReviewImages.forEach(img => formData.append("newImages", img));

      const response = await fetch(`/api/reviews/${editingReview.id}`, {
        method: "PUT",
        body: formData
      });

      if (response.ok) {
        toast.success("Отзыв обновлен");
        await fetchProduct();
        cancelEditingReview();
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка при обновлении");
      }
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error("Ошибка при обновлении");
    } finally {
      setEditReviewLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление отзыва',
      message: 'Вы уверены, что хотите удалить этот отзыв? Это действие нельзя отменить.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/reviews/${reviewId}`, {
            method: "DELETE"
          });

          if (response.ok) {
            toast.success("Отзыв удален");
            await fetchProduct();
          } else {
            const error = await response.json();
            toast.error(error.error || "Ошибка при удалении");
          }
        } catch (error) {
          console.error("Error deleting review:", error);
          toast.error("Ошибка при удалении");
        }
      }
    });
  };

  const handleDeleteProduct = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление товара',
      message: 'Вы уверены, что хотите удалить этот товар? Это действие нельзя отменить.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/master/products/${id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            toast.success("Товар удален");
            router.push("/master/dashboard");
          } else {
            const error = await response.json();
            toast.error(error.error || "Ошибка при удалении");
          }
        } catch (error) {
          console.error("Error deleting product:", error);
          toast.error("Ошибка при удалении товара");
        }
      }
    });
  };

  const handleProductUpdated = () => {
    fetchProduct();
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
        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
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
                    {/* ... содержимое specs ... */}
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
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
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
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-sm">
                                      {review.author_name}
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <span
                                          key={i}
                                          className={i < review.rating ? "text-yellow-400 text-xs" : "text-gray-300 text-xs"}
                                        >
                                          ★
                                        </span>
                                      ))}
                                      <span className="text-xs text-gray-400 ml-2">
                                        {new Date(review.created_at).toLocaleDateString("ru-RU")}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Кнопки редактирования/удаления для автора */}
                                  {session?.user?.id === review.author_id && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => startEditingReview(review)}
                                        className="text-xs text-blue-500 hover:text-blue-700"
                                      >
                                        ✏️ Редактировать
                                      </button>
                                      <button
                                        onClick={() => handleDeleteReview(review.id)}
                                        className="text-xs text-red-500 hover:text-red-700"
                                      >
                                        🗑️ Удалить
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-gray-600 text-sm mt-2">{review.comment}</p>
                                
                                {/* Изображения в отзыве */}
                                {review.images && review.images.length > 0 && (
                                  <div className="flex gap-2 mt-3">
                                    {review.images.map((img, idx) => (
                                      <img
                                        key={idx}
                                        src={img}
                                        alt={`Фото к отзыву ${idx + 1}`}
                                        className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80"
                                        onClick={() => window.open(img, '_blank')}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
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

              {/* Изображения для отзыва */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm">
                  Фотографии (до 5 шт.)
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-firm-orange transition cursor-pointer"
                  onClick={() => reviewFileInputRef.current?.click()}
                >
                  <input
                    ref={reviewFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReviewImageSelect}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-500 text-sm">Добавить фото</span>
                    <span className="text-xs text-gray-400">JPG, PNG, WEBP до 5MB</span>
                  </div>
                </div>
                {reviewImagePreviews.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {reviewImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative w-16 h-16">
                        <img src={preview} alt="preview" className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeReviewImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  disabled={submittingReview}
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

      {/* Модальное окно редактирования отзыва */}
      <AnimatePresence>
        {editingReview && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={cancelEditingReview}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-4">
                Редактировать отзыв
              </h3>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm">
                  Оценка
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setEditReviewRating(star)}
                      className="text-2xl focus:outline-none"
                    >
                      <span
                        className={
                          star <= editReviewRating
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

              {/* Существующие изображения */}
              {existingReviewImages.length > 0 && (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 text-sm">
                    Текущие фотографии
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {existingReviewImages.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16">
                        <img src={img} alt="review" className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeExistingReviewImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Новые изображения */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 text-sm">
                  Добавить новые фотографии
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-firm-orange transition cursor-pointer"
                  onClick={() => editReviewFileInputRef.current?.click()}
                >
                  <input
                    ref={editReviewFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEditReviewImageSelect}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-500 text-sm">Добавить фото</span>
                  </div>
                </div>
                {editReviewImagePreviews.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {editReviewImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative w-16 h-16">
                        <img src={preview} alt="preview" className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeEditReviewImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 mb-2 text-sm">
                  Комментарий
                </label>
                <textarea
                  value={editReviewComment}
                  onChange={(e) => setEditReviewComment(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdateReview}
                  disabled={editReviewLoading}
                  className="flex-1 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium"
                >
                  {editReviewLoading ? "Сохранение..." : "Сохранить изменения"}
                </button>
                <button
                  onClick={cancelEditingReview}
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
      {product && (
        <EditProductModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleProductUpdated}
          product={{
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            technique: product.technique,
            size: product.size,
            care_instructions: product.care_instructions,
            color: product.color,
          }}
          categories={categories}
        />
      )}

      {/* Кастомное модальное окно подтверждения удаления */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}