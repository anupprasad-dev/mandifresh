import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { inr } from "../utils";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }) {
  const { add, lines, setQty } = useCart();
  const toast = useToast();
  const inCart = lines.find((l) => l.id === product.id);

  return (
    <article className="card product-card">
      <Link to={`/product/${product.slug}`} className="pc-media" aria-label={product.name}>
        {product.discount_percent > 0 && <span className="badge-off">{product.discount_percent}% OFF</span>}
        <ProductImage product={product} />
      </Link>
      <div className="pc-body">
        <span className="pc-cat">{product.category?.name}</span>
        <Link to={`/product/${product.slug}`} className="pc-name">{product.name}</Link>
        <span className="pc-unit">{product.unit}</span>
        <div className="pc-foot">
          <div className="pc-price">
            <strong>{inr(product.price)}</strong>
            {product.mrp && Number(product.mrp) > Number(product.price) && <s>{inr(product.mrp)}</s>}
          </div>
          {!product.in_stock ? (
            <span className="oos">Out of stock</span>
          ) : inCart ? (
            <div className="stepper sm" aria-label="Quantity">
              <button onClick={() => setQty(product.id, inCart.qty - 1)} aria-label="Decrease">−</button>
              <span>{inCart.qty}</span>
              <button onClick={() => setQty(product.id, inCart.qty + 1)} aria-label="Increase" disabled={inCart.qty >= product.stock}>+</button>
            </div>
          ) : (
            <button className="add-btn" onClick={() => { add(product, 1); toast(`${product.name} added to cart`); }} aria-label={`Add ${product.name} to cart`}>
              Add <span>+</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
