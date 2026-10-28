export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));

export const dateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const STATUS_LABEL = {
  pending: "Pending", confirmed: "Confirmed", packed: "Packed", shipped: "Shipped",
  delivered: "Delivered", cancelled: "Cancelled", in_progress: "In progress",
};

export const FREE_DELIVERY = 499;
export const DELIVERY_FEE = 40;
