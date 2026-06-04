'use client';

import { useState } from "react";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const StarRating = ({ rating, size = "md", interactive = false, onRatingChange }: StarRatingProps) => {
  const sizeClasses = { sm: "text-xs", md: "text-sm", lg: "text-2xl" };
  const [hoverRating, setHoverRating] = useState(0);
  
  const displayRating = interactive ? (hoverRating || rating) : rating;
  
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (<button key={i} type="button" onClick={() => interactive && onRatingChange && onRatingChange(i + 1)} onMouseEnter={() => interactive && setHoverRating(i + 1)} onMouseLeave={() => interactive && setHoverRating(0)} className={interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"} disabled={!interactive}><span className={`${i < displayRating ? "text-yellow-400" : "text-gray-300"} ${sizeClasses[size]}`}>★</span></button>))}
      {!interactive && <span className={`ml-1 font-semibold ${sizeClasses[size]} text-text`}>{rating.toFixed(1)}</span>}
    </div>
  );
};