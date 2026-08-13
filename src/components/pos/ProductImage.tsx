import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  image: string;
  name: string;
  className?: string;
  fallbackClassName?: string;
}

// Convert Supabase storage public object URLs to the image transformation render path
const getOptimizedImageUrl = (url: string): string => {
  if (url && url.includes(".supabase.co/storage/v1/object/public/")) {
    return url
      .replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")
      + "?width=150&height=150&resize=contain";
  }
  return url;
};

export const ProductImage = ({ image, name, className, fallbackClassName }: ProductImageProps) => {
  const isImagePath = image && image.length > 4 && (image.includes("/") || image.includes(".") || image.startsWith("http"));

  const [currentSrc, setCurrentSrc] = useState(() => isImagePath ? getOptimizedImageUrl(image) : "");
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Keep track of image prop changes to reset internal states
  const [prevImage, setPrevImage] = useState(image);
  if (image !== prevImage) {
    setPrevImage(image);
    setCurrentSrc(isImagePath ? getOptimizedImageUrl(image) : "");
    setFallbackAttempted(false);
    setHasError(false);
  }

  const handleError = () => {
    if (!fallbackAttempted && currentSrc !== image) {
      // Fallback to original image URL if Supabase Image Transformation is not supported (e.g. Free Tier)
      setCurrentSrc(image);
      setFallbackAttempted(true);
    } else {
      // Show default placeholder emoji if both fail
      setHasError(true);
    }
  };

  if (isImagePath && !hasError && currentSrc) {
    return (
      <img
        src={currentSrc}
        alt={name}
        className={cn("h-full w-full object-cover", className)}
        onError={handleError}
        loading="lazy"
      />
    );
  }

  return (
    <span 
      className={cn("text-4xl sm:text-5xl truncate max-w-full inline-block", fallbackClassName)}
      title={name}
    >
      {isImagePath ? "🍽️" : (image || "🍽️")}
    </span>
  );
};
