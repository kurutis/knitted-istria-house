"use client";

import React, { useState, useEffect, JSX, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import EditProductModal from "@/components/modals/EditProductModal";

// Импорт иконок из библиотеки
import { CartIcon } from "@/components/icons/CartIcon";
import { LikeIcon } from "@/components/icons/LikeIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { MinusIcon } from "@/components/icons/MinusIcon";
import { CameraIcon } from "@/components/icons/CameraIcon";

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

// Компонент звездного рейтинга
const StarRating = ({ rating, onRatingChange, size = "md" }: { rating: number; onRatingChange?: (rating: number) => void; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" };
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRatingChange?.(star)}
          className={`focus:outline-none transition-transform hover:scale-110 ${!onRatingChange ? "cursor-default" : ""}`}
        >
          <span className={star <= rating ? "text-yellow-400" : "text-gray-300"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
};

// Компонент миниатюры изображения
const ImageThumbnail = ({ src, alt, isActive, onClick }: { src: string; alt: string; isActive: boolean; onClick: () => void }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 transition-all ${
      isActive ? "border-firm-orange shadow-md" : "border-transparent hover:border-gray-300"
    }`}
  >
    <img src={src} alt={alt} className="w-full h-full object-cover" />
  </motion.button>
);

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
  const [activeTab, setActiveTab] = useState<"specs" | "description" | "care" | "reviews">("specs");
  const [updatingCart, setUpdatingCart] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isMobile, setIsMobile] = useState(false);
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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
        (item: { product_id: string; quantity: number }) => item.product_id === id
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
      const isFav = favoritesList.some((item: { id: string }) => item.id === id);
      setIsFavorite(isFav);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  const handleAddToCart = async () => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/catalog/${id}`);
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
      const response = await fetch(`/api/cart?productId=${id}`, { method: "DELETE" });
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
      router.push(`/auth/signin?callbackUrl=/catalog/${id}`);
      return;
    }

    try {
      const method = isFavorite ? "DELETE" : "POST";
      const url = isFavorite ? `/api/user/favorites?productId=${id}` : "/api/user/favorites";

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
          const response = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });

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
          const response = await fetch(`/api/master/products/${id}`, { method: "DELETE" });

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

  const isAuthor = session?.user?.id === product?.master_id && session?.user?.role === "master";

  // Анимации
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
          />
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-500">Загрузка товара...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <p className="text-firm-red mb-4">{error || "Товар не найден"}</p>
          <Link href="/catalog" className="inline-block px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300">
            Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  const displayImages = product.images?.length > 0
    ? product.images
    : product.main_image_url
      ? [{ id: "placeholder", image_url: product.main_image_url, sort_order: 0 }]
      : [];

  // Кнопки для мастера
  const MasterActions = () => (
    <div className="flex gap-3">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowEditModal(true)}
        className="flex-1 px-4 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
      >
        <EditIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#FFFFFF" />
        <span>Редактировать</span>
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleDeleteProduct}
        className="flex-1 px-4 py-3 bg-firm-red text-white rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
      >
        <DeleteIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#FFFFFF" />
        <span>Удалить</span>
      </motion.button>
    </div>
  );

  // Кнопки для покупателя
  const BuyerActions = () => (
    <div className="flex gap-3">
      <div className="flex-1">
        {isInCart ? (
          <div className="flex items-center justify-between bg-gray-100 rounded-xl p-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleUpdateQuantity(quantity - 1)}
              disabled={quantity <= 1 || updatingCart}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-firm-orange text-white flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50"
            >
              <MinusIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#FFFFFF" />
            </motion.button>
            <span className="w-10 text-center font-medium text-sm sm:text-base">{quantity}</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleUpdateQuantity(quantity + 1)}
              disabled={updatingCart}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-firm-orange text-white flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50"
            >
              <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#FFFFFF" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRemoveFromCart}
              className="ml-2 px-2 sm:px-3 py-1.5 sm:py-2 text-firm-red hover:bg-red-50 rounded-lg transition text-xs sm:text-sm"
            >
              Удалить
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddToCart}
            disabled={updatingCart}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 text-sm sm:text-base"
          >
            <CartIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#FFFFFF" size={20} />
            <span>В корзину</span>
          </motion.button>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggleFavorite}
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 transition-all flex items-center justify-center flex-shrink-0 ${
          isFavorite
            ? "border-firm-pink bg-firm-pink text-white shadow-md"
            : "border-gray-300 hover:border-firm-pink hover:bg-firm-pink/10"
        }`}
      >
        <LikeIcon isActive={isFavorite} className="w-4 h-4 sm:w-5 sm:h-5" />
      </motion.button>
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Хлебные крошки */}
        <div className="text-xs sm:text-sm text-firm-gray mb-6">
          <Link href="/" className="hover:text-firm-orange transition-colors">Главная</Link>
          <span className="mx-2">/</span>
          <Link href="/catalog" className="hover:text-firm-orange transition-colors">Каталог</Link>
          <span className="mx-2">/</span>
          <span className="text-text truncate">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Левая колонка - галерея */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
              {displayImages[selectedImage]?.image_url ? (
                <img
                  src={displayImages[selectedImage].image_url}
                  alt={product.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
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
                  <ImageThumbnail
                    key={img.id}
                    src={img.image_url}
                    alt={`${product.title} - фото ${index + 1}`}
                    isActive={selectedImage === index}
                    onClick={() => setSelectedImage(index)}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Правая колонка - информация */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-4"
          >
            <motion.h1 variants={fadeInUp} className="font-['Montserrat_Alternates'] font-bold text-2xl sm:text-3xl md:text-4xl text-text">
              {product.title}
            </motion.h1>

            <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3">
              <Link
                href={`/masters/${product.master_id}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                  {product.master_avatar ? (
                    <img src={product.master_avatar} alt={product.master_name} className="w-full h-full object-cover" />
                  ) : (
                    product.master_name?.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-sm text-gray-600 group-hover:text-firm-orange transition">
                  {product.master_name}
                </span>
              </Link>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-2">
                <StarRating rating={Math.floor(product.rating || 0)} />
                <span className="font-semibold text-sm text-text">
                  {product.rating?.toFixed(1) || "Нет оценок"}
                </span>
                <span className="text-firm-gray text-sm">
                  ({product.reviews_count || 0} отзывов)
                </span>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-2xl sm:text-3xl font-bold text-firm-orange">
              {product.price.toLocaleString()} ₽
            </motion.div>

            {/* Действия */}
            <motion.div variants={fadeInUp}>
              {isAuthor ? <MasterActions /> : <BuyerActions />}
            </motion.div>

            {/* Характеристики */}
            <motion.div variants={fadeInUp} className="space-y-2">
              {product.category && (
                <div className="bg-gray-50 rounded-xl p-3 transition-all hover:shadow-md">
                  <p className="text-firm-gray text-xs mb-1">Категория</p>
                  <p className="font-medium text-sm text-text">{product.category}</p>
                </div>
              )}
              {product.technique && (
                <div className="bg-gray-50 rounded-xl p-3 transition-all hover:shadow-md">
                  <p className="text-firm-gray text-xs mb-1">Техника вязания</p>
                  <p className="font-medium text-sm text-text">{product.technique}</p>
                </div>
              )}
              {product.size && product.size !== "Не применимо" && (
                <div className="bg-gray-50 rounded-xl p-3 transition-all hover:shadow-md">
                  <p className="text-firm-gray text-xs mb-1">Размер</p>
                  <p className="font-medium text-sm text-text">{product.size}</p>
                </div>
              )}
              {product.color && (
                <div className="bg-gray-50 rounded-xl p-3 transition-all hover:shadow-md">
                  <p className="text-firm-gray text-xs mb-1">Цвет</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                      style={{ backgroundColor: product.color.toLowerCase() }}
                    />
                    <p className="font-medium text-sm text-text">{product.color}</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Табы */}
            <motion.div variants={fadeInUp} className="border-t border-gray-200 pt-4">
              <div className="flex flex-wrap gap-4 mb-4">
                {[
                  { id: "specs", label: "Характеристики", color: "firm-orange" },
                  { id: "description", label: "Описание", color: "firm-pink" },
                  ...(product.care_instructions ? [{ id: "care", label: "Уход", color: "firm-orange" }] : []),
                  { id: "reviews", label: `Отзывы (${product.reviews_count || 0})`, color: "firm-pink" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`pb-2 font-['Montserrat_Alternates'] text-sm transition-all duration-300 ${
                      activeTab === tab.id
                        ? `border-b-2 border-${tab.color} text-${tab.color}`
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="py-2"
                >
                  {activeTab === "description" && (
                    <p className="text-text whitespace-pre-line text-sm leading-relaxed">
                      {product.description}
                    </p>
                  )}

                  {activeTab === "care" && product.care_instructions && (
                    <p className="text-text text-sm leading-relaxed">
                      {product.care_instructions}
                    </p>
                  )}

                  {activeTab === "reviews" && (
                    <div>
                      {session && session.user?.role !== "master" && !isAuthor && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowReviewModal(true)}
                          className="mb-4 px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl text-sm hover:shadow-lg transition-all duration-300"
                        >
                          Написать отзыв
                        </motion.button>
                      )}

                      {product.reviews && product.reviews.length > 0 ? (
                        <div className="space-y-4">
                          {product.reviews.map((review, idx) => (
                            <motion.div
                              key={review.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="border-b border-gray-100 pb-4 last:border-0"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                                  {review.author_avatar ? (
                                    <img src={review.author_avatar} alt={review.author_name} className="w-full h-full object-cover" />
                                  ) : (
                                    review.author_name?.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap justify-between items-start gap-2">
                                    <div>
                                      <p className="font-semibold text-sm text-text">{review.author_name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <StarRating rating={review.rating} size="sm" />
                                        <span className="text-xs text-firm-gray">
                                          {new Date(review.created_at).toLocaleDateString("ru-RU")}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {session?.user?.id === review.author_id && (
                                      <div className="flex gap-2">
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => startEditingReview(review)}
                                          className="text-firm-orange hover:text-firm-pink transition text-xs sm:text-sm flex items-center gap-1"
                                        >
                                          <EditIcon className="w-3.5 h-3.5" color="#F4A67F" />
                                          <span className="hidden sm:inline">Редактировать</span>
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => handleDeleteReview(review.id)}
                                          className="text-firm-red hover:text-red-700 transition text-xs sm:text-sm flex items-center gap-1"
                                        >
                                          <DeleteIcon className="w-3.5 h-3.5" color="#D77C7C" />
                                          <span className="hidden sm:inline">Удалить</span>
                                        </motion.button>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-text text-sm mt-2 leading-relaxed">{review.comment}</p>
                                  
                                  {review.images && review.images.length > 0 && (
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                      {review.images.map((img, imgIdx) => (
                                        <motion.img
                                          key={imgIdx}
                                          whileHover={{ scale: 1.05 }}
                                          src={img}
                                          alt={`Фото к отзыву ${imgIdx + 1}`}
                                          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                                          onClick={() => window.open(img, '_blank')}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                          <p className="text-firm-gray text-sm">Пока нет отзывов</p>
                          {session && session.user?.role !== "master" && !isAuthor && (
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
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Модальное окно добавления отзыва */}
      <AnimatePresence>
        {showReviewModal && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text">Написать отзыв</h3>
                <button onClick={() => setShowReviewModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                  <CloseIcon className="w-5 h-5" color="#737682" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates']">Оценка</label>
                <StarRating rating={reviewRating} onRatingChange={setReviewRating} size="lg" />
              </div>

              <div className="mb-4">
                <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates']">Фотографии (до 5 шт.)</label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-firm-orange transition cursor-pointer"
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
                  <CameraIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <span className="text-gray-500 text-sm">Добавить фото</span>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP до 5MB</p>
                </div>
                {reviewImagePreviews.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {reviewImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative w-14 h-14">
                        <img src={preview} alt="preview" className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeReviewImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-firm-red text-white rounded-full text-xs flex items-center justify-center hover:scale-110 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates']">Комментарий</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-forms outline-none focus:ring-2 focus:ring-firm-orange text-sm resize-none"
                  placeholder="Поделитесь впечатлениями о товаре..."
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="flex-1 py-2.5 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium text-sm"
                >
                  {submittingReview ? "Отправка..." : "Отправить"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm"
                >
                  Отмена
                </motion.button>
              </div>
            </motion.div>
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text">Редактировать отзыв</h3>
                <button onClick={cancelEditingReview} className="p-1 hover:bg-gray-100 rounded-lg transition">
                  <CloseIcon className="w-5 h-5" color="#737682" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates']">Оценка</label>
                <StarRating rating={editReviewRating} onRatingChange={setEditReviewRating} size="lg" />
              </div>

              {existingReviewImages.length > 0 && (
                <div className="mb-4">
                  <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates']">Текущие фотографии</label>
                  <div className="flex gap-2 flex-wrap">
                    {existingReviewImages.map((img, idx) => (
                      <div key={idx} className="relative w-14 h-14">
                        <img src={img} alt="review" className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeExistingReviewImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-firm-red text-white rounded-full text-xs flex items-center justify-center hover:scale-110 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates']">Добавить новые фотографии</label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-firm-orange transition cursor-pointer"
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
                  <CameraIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <span className="text-gray-500 text-sm">Добавить фото</span>
                </div>
                {editReviewImagePreviews.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {editReviewImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative w-14 h-14">
                        <img src={preview} alt="preview" className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeEditReviewImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-firm-red text-white rounded-full text-xs flex items-center justify-center hover:scale-110 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates']">Комментарий</label>
                <textarea
                  value={editReviewComment}
                  onChange={(e) => setEditReviewComment(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-forms outline-none focus:ring-2 focus:ring-firm-orange text-sm resize-none"
                />
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpdateReview}
                  disabled={editReviewLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium text-sm"
                >
                  {editReviewLoading ? "Сохранение..." : "Сохранить изменения"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={cancelEditingReview}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm"
                >
                  Отмена
                </motion.button>
              </div>
            </motion.div>
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

      {/* ConfirmModal */}
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