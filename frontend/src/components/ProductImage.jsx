import { useState } from "react";
import { emojiFor, hueOf } from "../utils";

/** Product photo when available, otherwise a soft coloured tile with a matching emoji. */
export default function ProductImage({ product, size = "md" }) {
  const [broken, setBroken] = useState(false);
  const src = product.image;
  if (src && !broken) {
    return <img className={`pimg ${size}`} src={src} alt={product.name} loading="lazy" onError={() => setBroken(true)} />;
  }
  const catName = product.category?.name || product.category_name || "";
  const emoji = product.emoji || emojiFor(product.name, catName, product.category?.emoji);
  const hue = hueOf(catName || product.name);
  return (
    <div className={`pimg placeholder ${size}`} role="img" aria-label={product.name}
      style={{ "--h": hue }}>
      <span>{emoji}</span>
    </div>
  );
}
