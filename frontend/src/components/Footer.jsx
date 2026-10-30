import { Link } from "react-router-dom";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p className="muted">Fresh groceries from local farms and trusted sellers, delivered to your doorstep.</p>
          <div className="trust"><span>🔒 Secure accounts</span><span>💵 Pay on delivery</span></div>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/shop">All products</Link>
          <Link to="/shop?deals=1">Today's deals</Link>
          <Link to="/shop?category=fruits">Fruits</Link>
          <Link to="/shop?category=vegetables">Vegetables</Link>
          <Link to="/shop?category=dairy-eggs">Dairy & eggs</Link>
        </div>
        <div>
          <h4>My account</h4>
          <Link to="/orders">Track my order</Link>
          <Link to="/account">Profile & password</Link>
          <Link to="/cart">My cart</Link>
        </div>
        <div>
          <h4>Good to know</h4>
          <span>Delivery: free above ₹499, else ₹40</span>
          <span>Payment: cash on delivery</span>
          <span>Cancel anytime before packing</span>
        </div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} MandiFresh. All rights reserved.</div>
    </footer>
  );
}
