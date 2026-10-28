import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { inr } from "../utils";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }) {
  const { add, lines, setQty } = useCart();
  const toast = useToast();
  const inCart = lines.find((l) => l.id === product.id);

  const addToCart = () => {
    add(product, 1);
    toast(`${product.name} added to cart`);
  };

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
        <div className="pc-price">
          <strong>{inr(product.price)}</strong>
          {product.mrp && Number(product.mrp) > Number(product.price) && <s>{inr(product.mrp)}</s>}
        </div>
        {!product.in_stock ? (
          <button className="btn btn-disabled" disabled>Out of stock</button>
        ) : inCart ? (
          <div className="stepper" aria-label="Quantity">
            <button onClick={() => setQty(product.id, inCart.qty - 1)} aria-label="Decrease">−</button>
            <span>{inCart.qty}</span>
            <button onClick={() => setQty(product.id, inCart.qty + 1)} aria-label="Increase" disabled={inCart.qty >= product.stock}>+</button>
          </div>
        ) : (
          <button className="btn btn-outline" onClick={addToCart}>Add to cart</button>
        )}
      </div>
    </article>
  );
}
