export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));

export const dateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const dateShort = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export const STATUS_LABEL = {
  pending: "Pending", confirmed: "Confirmed", packed: "Packed", shipped: "Shipped",
  delivered: "Delivered", cancelled: "Cancelled", in_progress: "In progress",
};

export const FREE_DELIVERY = 499;
export const DELIVERY_FEE = 40;

/** Stable hue (0-359) from any string, used to colour category tiles and placeholders. */
export function hueOf(text = "") {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

const EMOJI_RULES = [
  [/banana/, "🍌"], [/apple/, "🍎"], [/mango/, "🥭"], [/grape/, "🍇"], [/watermelon/, "🍉"], [/orange/, "🍊"], [/lemon/, "🍋"],
  [/tomato/, "🍅"], [/onion/, "🧅"], [/potato/, "🥔"], [/spinach|palak|leaf|greens/, "🥬"], [/cauliflower|broccoli/, "🥦"],
  [/carrot/, "🥕"], [/chilli|chili/, "🌶️"], [/corn/, "🌽"], [/brinjal|eggplant/, "🍆"], [/garlic/, "🧄"], [/mushroom/, "🍄"],
  [/milk/, "🥛"], [/paneer|cheese/, "🧀"], [/curd|dahi|yogurt|yoghurt/, "🥣"], [/egg/, "🥚"], [/butter|ghee/, "🧈"],
  [/bread|bun|toast/, "🍞"], [/croissant/, "🥐"], [/cake|pastry/, "🍰"], [/biscuit|cookie/, "🍪"],
  [/rice|atta|wheat|flour/, "🌾"], [/dal|lentil|moong|toor|chana/, "🫘"], [/masala|powder|turmeric|cumin|jeera|spice/, "🧂"],
  [/chips|namkeen/, "🥔"], [/peanut|almond|cashew|nut/, "🥜"], [/tea/, "🍵"], [/coffee/, "☕"], [/juice/, "🧃"],
  [/fish|rohu|prawn/, "🐟"], [/chicken/, "🍗"], [/mutton|meat/, "🥩"], [/dish|soap|cleaner|detergent|wash/, "🧴"],
];

export function emojiFor(name = "", categoryName = "", fallback = "🛒") {
  const n = name.toLowerCase();
  for (const [re, e] of EMOJI_RULES) if (re.test(n)) return e;
  const c = categoryName.toLowerCase();
  if (c.includes("fruit")) return "🍎";
  if (c.includes("veg")) return "🥬";
  if (c.includes("dairy")) return "🥛";
  if (c.includes("bakery")) return "🍞";
  if (c.includes("meat") || c.includes("fish")) return "🐟";
  if (c.includes("spice")) return "🌶️";
  if (c.includes("beverage")) return "🧃";
  if (c.includes("snack")) return "🍪";
  if (c.includes("household")) return "🧴";
  return fallback;
}

/** Downscale a photo in the browser (max 900px, JPEG) so uploads stay small and fast. */
export async function shrinkImage(file, maxSide = 900, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality)
  );
}
