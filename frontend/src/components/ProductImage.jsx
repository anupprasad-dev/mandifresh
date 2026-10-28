import { useState } from "react";

/** Shows the product photo when available, otherwise a friendly emoji tile. */
export default function ProductImage({ product, size = "md" }) {
  const [broken, setBroken] = useState(false);
  const url = product.image_url;
  if (url && !broken) {
    return <img className={`pimg ${size}`} src={url} alt={product.name} loading="lazy" onError={() => setBroken(true)} />;
  }
  return (
    <div className={`pimg placeholder ${size}`} aria-label={product.name} role="img">
      <span>{product.category?.emoji || product.emoji || "🛒"}</span>
    </div>
  );
}
