export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type ProductVariant = {
  id: string;
  name: string;
  priceAdd: number;
};

export type ProductOption = {
  id: string;
  name: string;
  type: "single" | "multi";
  choices: { id: string; name: string; priceAdd: number }[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  image: string;
  variants?: ProductVariant[];
  options?: ProductOption[];
  isOnsite?: boolean;
  badge?: "best" | "new" | null;
};

export type CartItem = {
  id: string;
  product: Product;
  variant?: ProductVariant;
  selectedOptions: { optionId: string; choiceId: string; name: string; priceAdd: number }[];
  note: string;
  quantity: number;
  totalPrice: number;
};

export type OrderType = "dine-in" | "takeaway" | "delivery";

export const categories: Category[] = [
  { id: "kem", name: "Kem", icon: "🍦" },
  { id: "tra-hoa-qua", name: "Trà hoa quả", icon: "🍋" },
  { id: "tra-sua", name: "Trà sữa", icon: "🧋" },
  { id: "cafe", name: "Cafe", icon: "☕" },
  { id: "my-cay", name: "Mỳ cay", icon: "🍜" },
  { id: "an-vat", name: "Ăn vặt", icon: "🍿" },
];

export const products: Product[] = [
  // KEM
  { id: "k1", name: "Kem ốc quế vani", price: 10000, categoryId: "kem", image: "/images/products/vanilla_ice_cream.png" },
  { id: "k2", name: "Kem ốc quế Matcha", price: 10000, categoryId: "kem", image: "/images/products/matcha_ice_cream.png" },
  { id: "k3", name: "Super Sundae trân châu đường đen", price: 25000, categoryId: "kem", image: "/images/products/brown_sugar_sundae.png", badge: "best" },
  { id: "k4", name: "Super Sundae kiwi lô hội", price: 25000, categoryId: "kem", image: "/images/products/mango_sundae.png" },
  { id: "k5", name: "Super Sundae xoài", price: 25000, categoryId: "kem", image: "/images/products/mango_sundae.png" },
  { id: "k6", name: "Super Sundae dâu tây", price: 25000, categoryId: "kem", image: "/images/products/strawberry_sundae.png" },
  { id: "k7", name: "Super Sundae đào vàng", price: 25000, categoryId: "kem", image: "/images/products/peach_tea.png" },
  { id: "k8", name: "Super Sundae đào hồng", price: 25000, categoryId: "kem", image: "/images/products/peach_tea.png" },
  { id: "k9", name: "Super Sundae O-Coco", price: 25000, categoryId: "kem", image: "/images/products/vanilla_ice_cream.png" },
  { id: "k10", name: "Super Sundae việt quất", price: 25000, categoryId: "kem", image: "/images/products/strawberry_sundae.png" },
  { id: "k11", name: "Super Sundae Socola", price: 25000, categoryId: "kem", image: "/images/products/brown_sugar_sundae.png" },
  { id: "k12", name: "Super Sundae Matcha O-Coco", price: 25000, categoryId: "kem", image: "/images/products/matcha_ice_cream.png" },

  // TRÀ HOA QUẢ
  { id: "ft1", name: "Nước chanh tươi", price: 15000, categoryId: "tra-hoa-qua", image: "/images/products/peach_tea.png" },
  { id: "ft2", name: "Trà đào dâu tây", price: 22000, categoryId: "tra-hoa-qua", image: "/images/products/peach_tea.png" },
  { id: "ft3", name: "Trà xoài chanh leo", price: 22000, categoryId: "tra-hoa-qua", image: "/images/products/mango_passion_fruit_tea.png", badge: "best" },
  { id: "ft4", name: "Trà chanh leo", price: 22000, categoryId: "tra-hoa-qua", image: "/images/products/mango_passion_fruit_tea.png" },
  { id: "ft5", name: "Trà đào (L)", price: 22000, categoryId: "tra-hoa-qua", image: "/images/products/peach_tea.png" },
  { id: "ft6", name: "Trà xanh hoa đào", price: 22000, categoryId: "tra-hoa-qua", image: "/images/products/matcha_latte.png" },
  { id: "ft7", name: "Dương chi cam lộ", price: 28000, categoryId: "tra-hoa-qua", image: "/images/products/mango_passion_fruit_tea.png", badge: "new" },
  { id: "ft8", name: "Trà xanh chanh", price: 15000, categoryId: "tra-hoa-qua", image: "/images/products/matcha_latte.png" },
  { id: "ft9", name: "Hồng trà chanh", price: 15000, categoryId: "tra-hoa-qua", image: "/images/products/pearl_milk_tea.png" },
  { id: "ft10", name: "Trà chanh lô hội", price: 17000, categoryId: "tra-hoa-qua", image: "/images/products/peach_tea.png" },
  { id: "ft11", name: "Trà xanh kiwi", price: 22000, categoryId: "tra-hoa-qua", image: "/images/products/matcha_latte.png" },
  { id: "ft12", name: "Trà chanh dâu tây", price: 25000, categoryId: "tra-hoa-qua", image: "/images/products/peach_tea.png" },

  // TRÀ SỮA
  { id: "mt1", name: "Trà sữa trân châu đường đen (M)", price: 25000, categoryId: "tra-sua", image: "/images/products/brown_sugar_milk_tea.png", badge: "best" },
  { id: "mt2", name: "Trà sữa Caramel (M)", price: 25000, categoryId: "tra-sua", image: "/images/products/brown_sugar_milk_tea.png" },
  { id: "mt3", name: "Trà sữa trân châu (M)", price: 25000, categoryId: "tra-sua", image: "/images/products/pearl_milk_tea.png" },
  { id: "mt4", name: "Trà sữa Bá vương (L)", price: 30000, categoryId: "tra-sua", image: "/images/products/pearl_milk_tea.png", badge: "new" },
  { id: "mt5", name: "Trà sữa 2J (M)", price: 25000, categoryId: "tra-sua", image: "/images/products/pearl_milk_tea.png" },
  { id: "mt6", name: "Trà sữa O-Coco (M)", price: 28000, categoryId: "tra-sua", image: "/images/products/pearl_milk_tea.png" },
  { id: "mt7", name: "Trà sữa thạch dừa (M)", price: 25000, categoryId: "tra-sua", image: "/images/products/pearl_milk_tea.png" },
  { id: "mt8", name: "Trà sữa thạch đường đen (M)", price: 25000, categoryId: "tra-sua", image: "/images/products/brown_sugar_milk_tea.png" },
  { id: "mt9", name: "Sữa tươi trân châu đường đen (M)", price: 25000, categoryId: "tra-sua", image: "/images/products/brown_sugar_milk_tea.png" },
  { id: "mt10", name: "Sữa thạch kiwi (M)", price: 22000, categoryId: "tra-sua", image: "/images/products/pearl_milk_tea.png" },
  { id: "mt11", name: "Sữa thạch dâu tây (M)", price: 22000, categoryId: "tra-sua", image: "/images/products/pearl_milk_tea.png" },
  { id: "mt12", name: "Latte Matcha (M)", price: 25000, categoryId: "tra-sua", image: "/images/products/matcha_latte.png" },
  { id: "mt13", name: "Latte khoai môn (M)", price: 25000, categoryId: "tra-sua", image: "/images/products/pearl_milk_tea.png" },
  { id: "mt14", name: "Sữa thạch dưa lưới (M)", price: 22000, categoryId: "tra-sua", image: "/images/products/pearl_milk_tea.png" },

  // CAFE
  { id: "cf1", name: "Cafe Latte đường đen (M)", price: 25000, categoryId: "cafe", image: "/images/products/brown_sugar_milk_tea.png", badge: "best" },
  { id: "cf2", name: "Cafe Mocha (M)", price: 25000, categoryId: "cafe", image: "/images/products/pearl_milk_tea.png" },
  { id: "cf3", name: "Cafe Latte (M)", price: 22000, categoryId: "cafe", image: "/images/products/pearl_milk_tea.png" },
  { id: "cf4", name: "Cafe Latte kem tươi (M)", price: 25000, categoryId: "cafe", image: "/images/products/vanilla_ice_cream.png" },
  { id: "cf5", name: "Cafe Mocha kem tươi (M)", price: 25000, categoryId: "cafe", image: "/images/products/vanilla_ice_cream.png" },
  { id: "cf6", name: "Cafe Latte Caramel kem tươi (M)", price: 25000, categoryId: "cafe", image: "/images/products/vanilla_ice_cream.png" },
  { id: "cf7", name: "Hồng trà Latte (M)", price: 25000, categoryId: "cafe", image: "/images/products/pearl_milk_tea.png" },

  // MỲ CAY
  { id: "n1", name: "Mỳ cay xúc xích", price: 30000, categoryId: "my-cay", image: "/images/products/spicy_seafood_noodles.png" },
  { id: "n2", name: "Mỳ cay bò", price: 45000, categoryId: "my-cay", image: "/images/products/spicy_seafood_noodles.png" },
  { id: "n3", name: "Mỳ cay hải sản", price: 45000, categoryId: "my-cay", image: "/images/products/spicy_seafood_noodles.png" },
  { id: "n4", name: "Mỳ cay thập cẩm", price: 50000, categoryId: "my-cay", image: "/images/products/spicy_seafood_noodles.png" },
  { id: "n5", name: "Xúc xích thêm", price: 10000, categoryId: "my-cay", image: "/images/products/fried_sour_meat.png" },
  { id: "n6", name: "Lạp xưởng thêm", price: 14000, categoryId: "my-cay", image: "/images/products/fried_sour_meat.png" },
  { id: "n7", name: "Nem chua rán", price: 30000, categoryId: "my-cay", image: "/images/products/fried_sour_meat.png" },

  // BỔ SUNG TRÀ SỮA
  { id: "mt15", name: "Sữa thạch dâu tây", price: 25000, categoryId: "tra-sua", image: "🍓" },

  // BỔ SUNG TRÀ HOA QUẢ
  { id: "ft13", name: "Trà việt quất", price: 22000, categoryId: "tra-hoa-qua", image: "🫐" },
  { id: "ft14", name: "Trà cam vàng", price: 25000, categoryId: "tra-hoa-qua", image: "🍊" },
  { id: "ft15", name: "Liên minh cam xoài", price: 25000, categoryId: "tra-hoa-qua", image: "🥭" },
  { id: "ft16", name: "Trà cam dâu tây", price: 25000, categoryId: "tra-hoa-qua", image: "🍊" },

  // ĂN VẶT MỚI
  { id: "av1", name: "Chân gà", price: 10000, categoryId: "an-vat", image: "🍗" },
  { id: "av2", name: "Hướng dương", price: 10000, categoryId: "an-vat", image: "🌻" },
  { id: "av3", name: "Bỏng ngô", price: 20000, categoryId: "an-vat", image: "🍿" },
  { id: "av4", name: "Bim bim", price: 10000, categoryId: "an-vat", image: "🍟" },
  { id: "av5", name: "Bim bim ống", price: 30000, categoryId: "an-vat", image: "🥨" },
  { id: "av6", name: "Xúc xích", price: 10000, categoryId: "an-vat", image: "🌭" },
  { id: "av7", name: "Men nướng bà tuyết", price: 3000, categoryId: "an-vat", image: "🫓" },

  // BỔ SUNG KEM
  { id: "k13", name: "Kem 1", price: 6000, categoryId: "kem", image: "🍦" },
  { id: "k14", name: "Kem 2", price: 8000, categoryId: "kem", image: "🍦" },
  { id: "k15", name: "Kem 3", price: 11000, categoryId: "kem", image: "🍦" },
  { id: "k16", name: "Kem 4", price: 13000, categoryId: "kem", image: "🍦" },
  { id: "k17", name: "Kem 5", price: 21000, categoryId: "kem", image: "🍦" },
  { id: "k18", name: "Kem 6", price: 26000, categoryId: "kem", image: "🍦" },
];
