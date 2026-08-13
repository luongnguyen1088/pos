import { useSyncExternalStore } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const CASH_ENTRY_TABLE = "anvat_cash_entries";
const STORAGE_KEY = "speedy-order-system:cashbook";
const EVENT_NAME = "speedy-order-system:cashbook-updated";

export type CashEntryType = "income" | "expense";
export type CashEntryChannel = "cash" | "bank" | "other";

export type CashEntry = {
  id: string;
  title: string;
  amount: number;
  entryType: CashEntryType;
  category: string;
  note: string;
  channel: CashEntryChannel;
  occurredAt: string;
  createdAt?: string;
  updatedAt?: string;
};

type CashEntryRow = {
  id: string;
  title: string;
  amount: number;
  entry_type: CashEntryType;
  category: string;
  note: string;
  channel: CashEntryChannel;
  occurred_at: string;
  created_at?: string;
  updated_at?: string;
};

type CashbookSnapshot = {
  entries: CashEntry[];
  isLoading: boolean;
  error: string | null;
};

type CreateCashEntryInput = Omit<CashEntry, "id" | "createdAt" | "updatedAt">;

const defaultEntries: CashEntry[] = [
  {
    id: "cash-expense-rent",
    title: "Tiền thuê mặt bằng",
    amount: 4500000,
    entryType: "expense",
    category: "Mặt bằng",
    note: "Thanh toán đầu tháng",
    channel: "bank",
    occurredAt: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
  },
  {
    id: "cash-expense-supplier",
    title: "Nhập thêm nguyên liệu",
    amount: 1850000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Đơn nhập trà sữa và topping",
    channel: "cash",
    occurredAt: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
  },
  {
    id: "cash-income-other",
    title: "Thu khác trong ngày",
    amount: 320000,
    entryType: "income",
    category: "Khác",
    note: "Bán thêm voucher",
    channel: "bank",
    occurredAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
  },
  {
    id: "cash-expense-sot-my-cay",
    title: "Nhập sốt mỳ cay",
    amount: 1320000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập nguyên liệu mỳ cay",
    channel: "cash",
    occurredAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "cash-expense-xuc-xich",
    title: "Nhập xúc xích",
    amount: 1515000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập nguyên liệu mỳ cay",
    channel: "cash",
    occurredAt: "2026-06-01T08:05:00.000Z",
  },
  {
    id: "cash-expense-ctt-3q",
    title: "Nhập trân châu 3Q",
    amount: 245000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập nguyên liệu đồ pha nước",
    channel: "cash",
    occurredAt: "2026-06-01T08:10:00.000Z",
  },
  {
    id: "cash-expense-sua-ngoi-sao",
    title: "Nhập sữa đặc Ngôi sao",
    amount: 130000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập 2 hộp sữa Ngôi sao PN Xanh Lá 1.284kg (Tiệm Nhà Trang, Phiếu SON182772) - Ghi nợ",
    channel: "other",
    occurredAt: "2026-06-02T15:54:08.000Z",
  },
  {
    id: "cash-expense-tien-nuoc",
    title: "Trả tiền nước",
    amount: 199000,
    entryType: "expense",
    category: "Điện nước",
    note: "Thanh toán tiền nước sinh hoạt cửa hàng",
    channel: "cash",
    occurredAt: "2026-06-03T10:00:00.000Z",
  },
  {
    id: "cash-expense-bim-bim",
    title: "Nhập bim bim",
    amount: 1776000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Đơn nhập bim bim ăn vặt",
    channel: "cash",
    occurredAt: "2026-06-04T09:00:00.000Z",
  },
  {
    id: "cash-expense-tui-bong",
    title: "Nhập túi bóng",
    amount: 1500000,
    entryType: "expense",
    category: "Bao bì",
    note: "Nhập túi bóng đựng ly cốc mang đi",
    channel: "cash",
    occurredAt: "2026-06-04T09:30:00.000Z",
  },
  {
    id: "cash-expense-my-cay-bo",
    title: "Nhập mỳ cay bò",
    amount: 1410000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập 2 thùng mỳ cay bò (200 gói)",
    channel: "cash",
    occurredAt: "2026-06-05T14:00:00.000Z",
  },
  {
    id: "cash-expense-bot-matcha",
    title: "Nhập bột matcha",
    amount: 380000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập 500g bột matcha pha chế",
    channel: "cash",
    occurredAt: "2026-06-05T14:15:00.000Z",
  },
  {
    id: "cash-expense-phu-tung-cua",
    title: "Mua phụ tùng làm cửa",
    amount: 1585000,
    entryType: "expense",
    category: "Sửa chữa",
    note: "Mua phụ kiện, phụ tùng làm cửa",
    channel: "cash",
    occurredAt: "2026-06-07T10:00:00.000Z",
  },
  {
    id: "cash-expense-cong-tho",
    title: "Công thợ sửa cửa",
    amount: 1200000,
    entryType: "expense",
    category: "Sửa chữa",
    note: "Thanh toán tiền công thợ làm cửa",
    channel: "cash",
    occurredAt: "2026-06-07T17:00:00.000Z",
  },
  {
    id: "cash-expense-vun-oreo-siro",
    title: "Nhập vụn Oreo & siro socola",
    amount: 479000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập 5 gói vụn Oreo 400g, 1 can Siro Socola Golden Farm 2L (Tiệm Nhà Trang, Phiếu SON184045) - Ghi nợ",
    channel: "other",
    occurredAt: "2026-06-08T14:46:05.000Z",
  },
  {
    id: "cash-expense-chan-ga",
    title: "Nhập chân gà",
    amount: 680000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập nguyên liệu chân gà rút xương / làm ăn vặt",
    channel: "cash",
    occurredAt: "2026-05-10T10:00:00.000Z",
  },
  {
    id: "cash-expense-sua-may-da",
    title: "Sửa máy làm đá",
    amount: 400000,
    entryType: "expense",
    category: "Sửa chữa",
    note: "Tiền sửa máy làm đá cửa hàng",
    channel: "cash",
    occurredAt: "2026-05-10T14:00:00.000Z",
  },
  {
    id: "cash-expense-nhap-muc",
    title: "Nhập mực",
    amount: 220000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập 1kg mực làm topping mỳ cay / ăn vặt",
    channel: "cash",
    occurredAt: "2026-06-13T09:00:00.000Z",
  },
  {
    id: "cash-expense-tien-mang",
    title: "Tiền mạng Internet",
    amount: 180000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Thanh toán tiền mạng Internet cửa hàng (1 tháng)",
    channel: "cash",
    occurredAt: "2026-06-13T10:00:00.000Z",
  },
  {
    id: "cash-expense-bot-tra-sua",
    title: "Nhập bột trà sữa",
    amount: 2130000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập bao 25kg bột trà sữa pha chế",
    channel: "cash",
    occurredAt: "2026-06-13T11:00:00.000Z",
  },
  {
    id: "cash-expense-huong-duong",
    title: "Nhập hướng dương",
    amount: 1350000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập 1 bao hạt hướng dương",
    channel: "cash",
    occurredAt: "2026-06-13T11:30:00.000Z",
  },
  {
    id: "cash-expense-nguyen-lieu-mc",
    title: "Nhập nguyên liệu mỳ cay",
    amount: 1806000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập nguyên liệu mỳ cay",
    channel: "cash",
    occurredAt: "2026-06-14T10:00:00.000Z",
  },
  {
    id: "cash-expense-nap-vom-giay-nen",
    title: "Nhập nắp vòm & giấy nến",
    amount: 194000,
    entryType: "expense",
    category: "Bao bì",
    note: "Nhập 10 dây nắp vòm 90, 2 tệp giấy nến tròn 12cm (Tiệm Nhà Trang, Phiếu SON185292)",
    channel: "cash",
    occurredAt: "2026-06-14T11:27:28.000Z",
  },
  {
    id: "cash-expense-tom",
    title: "Nhập tôm",
    amount: 600000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập tôm làm topping mỳ cay",
    channel: "cash",
    occurredAt: "2026-06-18T09:00:00.000Z",
  },
  {
    id: "cash-expense-muc-18",
    title: "Nhập mực",
    amount: 250000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập mực làm topping mỳ cay",
    channel: "cash",
    occurredAt: "2026-06-18T09:10:00.000Z",
  },
  {
    id: "cash-expense-tc-cl",
    title: "Nhập trân châu & chanh leo",
    amount: 605000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập trân châu và syrup chanh leo",
    channel: "cash",
    occurredAt: "2026-06-18T09:20:00.000Z",
  },
  {
    id: "cash-expense-bb-18",
    title: "Nhập bim bim",
    amount: 632000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập thêm bim bim ăn vặt",
    channel: "cash",
    occurredAt: "2026-06-18T09:30:00.000Z",
  },
  {
    id: "cash-expense-cai-thao",
    title: "Mua cải thảo & nấm",
    amount: 100000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Mua rau cải thảo và nấm ăn kèm mỳ cay",
    channel: "cash",
    occurredAt: "2026-06-18T09:40:00.000Z",
  },
  {
    id: "cash-expense-bb-19",
    title: "Nhập bim bim",
    amount: 1152000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập bim bim ăn vặt số lượng lớn",
    channel: "cash",
    occurredAt: "2026-06-19T10:00:00.000Z",
  },
  {
    id: "cash-expense-mc-20",
    title: "Nhập mỳ cay",
    amount: 1400000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập thêm thùng mỳ cay",
    channel: "cash",
    occurredAt: "2026-06-20T10:00:00.000Z",
  },
  {
    id: "cash-expense-quat-nuoc",
    title: "Mua quạt hơi nước",
    amount: 1400000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Mua quạt hơi nước làm mát cửa hàng",
    channel: "cash",
    occurredAt: "2026-06-20T11:00:00.000Z",
  },
  {
    id: "cash-expense-bot-ts-24",
    title: "Nhập bột trà sữa",
    amount: 2130000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập bao 25kg bột trà sữa",
    channel: "cash",
    occurredAt: "2026-06-24T10:00:00.000Z",
  },
  {
    id: "cash-expense-siro-cl-24",
    title: "Nhập siro chanh leo",
    amount: 270000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập 2 hộp siro chanh leo pha chế",
    channel: "cash",
    occurredAt: "2026-06-24T10:15:00.000Z",
  },
  {
    id: "cash-expense-gas-24",
    title: "Thay bình gas",
    amount: 360000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Thay bình gas đun nấu bếp",
    channel: "cash",
    occurredAt: "2026-06-24T15:00:00.000Z",
  },
  {
    id: "cash-expense-kem-25",
    title: "Nhập kem nguyên liệu",
    amount: 3461000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập kem phục vụ kinh doanh",
    channel: "cash",
    occurredAt: "2026-06-25T10:00:00.000Z",
  },
  {
    id: "cash-expense-topping-25",
    title: "Nhập xúc xích, mực xoắn, chả viên",
    amount: 1410000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập topping mỳ cay (xúc xích, mực xoắn, chả viên)",
    channel: "cash",
    occurredAt: "2026-06-25T10:30:00.000Z",
  },
  {
    id: "cash-expense-phần-mềm-26",
    title: "Mua phần mềm quản lý",
    amount: 3000000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Mua phần mềm vận hành cửa hàng",
    channel: "bank",
    occurredAt: "2026-06-26T10:00:00.000Z",
  },
  {
    id: "cash-expense-coc-420-26",
    title: "Nhập cốc nhựa 420ml",
    amount: 650000,
    entryType: "expense",
    category: "Bao bì",
    note: "Nhập cốc nhựa size 420ml đựng đồ uống",
    channel: "cash",
    occurredAt: "2026-06-26T11:00:00.000Z",
  },
  {
    id: "cash-expense-lương-nv-28",
    title: "Chi mua nguyên liệu",
    amount: 25100000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Thanh toán mua nguyên liệu cho cửa hàng",
    channel: "bank",
    occurredAt: "2026-06-28T09:00:00.000Z",
  },
  {
    id: "cash-expense-xang-28",
    title: "Chi tiền đổ xăng",
    amount: 500000,
    entryType: "expense",
    category: "Vận chuyển",
    note: "Chi phí đổ xăng xe vận chuyển hàng hóa",
    channel: "cash",
    occurredAt: "2026-06-28T14:00:00.000Z",
  },
  {
    id: "cash-expense-dua-giay-28",
    title: "Nhập đũa giấy",
    amount: 217000,
    entryType: "expense",
    category: "Bao bì",
    note: "Nhập đũa giấy dùng một lần",
    channel: "cash",
    occurredAt: "2026-06-28T15:00:00.000Z",
  },
  {
    id: "cash-expense-setup-hy",
    title: "Nhập nguyên liệu ở HY",
    amount: 70500000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Mua nguyên liệu ở Hưng Yên",
    channel: "bank",
    occurredAt: "2026-04-19T09:00:00.000Z",
  },
  {
    id: "cash-expense-setup-kem-mc",
    title: "Nhập kem matcha, ốc quế, trân châu",
    amount: 4525000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập kem matcha vỏ lót ốc quế, trân châu (gồm 150k cước xe)",
    channel: "cash",
    occurredAt: "2026-04-21T10:00:00.000Z",
  },
  {
    id: "cash-expense-setup-fina",
    title: "Nhập bột trà sữa fina & mứt",
    amount: 2490000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập bột trà sữa fina, mứt",
    channel: "cash",
    occurredAt: "2026-04-23T09:00:00.000Z",
  },
  {
    id: "cash-expense-setup-ly-coc",
    title: "Nhập cốc, màng dập, ống hút",
    amount: 7520000,
    entryType: "expense",
    category: "Bao bì",
    note: "Nhập cốc, màng dập, ống hút đóng gói",
    channel: "cash",
    occurredAt: "2026-04-23T09:30:00.000Z",
  },
  {
    id: "cash-expense-setup-huong-duong",
    title: "Nhập hướng dương & túi bóng rác",
    amount: 400000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập hướng dương và túi bóng rác",
    channel: "cash",
    occurredAt: "2026-04-23T10:00:00.000Z",
  },
  {
    id: "cash-expense-setup-duong-qua",
    title: "Nhập đường quả (5 thùng)",
    amount: 4450000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Nhập đường quả (890k/1 thùng)",
    channel: "cash",
    occurredAt: "2026-04-23T10:30:00.000Z",
  },
  {
    id: "cash-expense-setup-quan-cu-remaining",
    title: "Nguyên liệu quán cũ mang sang",
    amount: 7170000,
    entryType: "expense",
    category: "Nguyên liệu",
    note: "Gồm đường đen (1.17M), pudding (2.175M), bột kem (1.3M), trân châu trắng (230k), ốc quế (490k), trân châu đen (450k), mứt xoài (365k), đào vàng (350k), dâu tây (170k), chanh vàng (470k)",
    channel: "other",
    occurredAt: "2026-04-23T12:00:00.000Z",
  },
  {
    id: "cash-expense-setup-wifi-cam",
    title: "Lắp mạng & lắp camera",
    amount: 2000000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Chi phí lắp mạng và lắp camera cửa hàng",
    channel: "cash",
    occurredAt: "2026-04-10T09:00:00.000Z",
  },
  {
    id: "cash-expense-setup-go-ep",
    title: "Mua gỗ ép sửa quán",
    amount: 4900000,
    entryType: "expense",
    category: "Sửa chữa",
    note: "Mua gỗ ép sửa sang quán",
    channel: "cash",
    occurredAt: "2026-04-11T10:00:00.000Z",
  },
  {
    id: "cash-expense-setup-dieu-hoa",
    title: "Lắp điều hòa",
    amount: 3000000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Lắp máy điều hòa nhiệt độ",
    channel: "cash",
    occurredAt: "2026-04-12T11:00:00.000Z",
  },
  {
    id: "cash-expense-setup-cua-kinh",
    title: "Lắp cửa kính thủy lực",
    amount: 28800000,
    entryType: "expense",
    category: "Sửa chữa",
    note: "Lắp hệ thống cửa kính thủy lực ra vào",
    channel: "bank",
    occurredAt: "2026-04-14T10:00:00.000Z",
  },
  {
    id: "cash-expense-setup-sat-vat-lieu",
    title: "Trả tiền sắt & vật liệu",
    amount: 7140000,
    entryType: "expense",
    category: "Sửa chữa",
    note: "Thanh toán mua sắt và vật liệu xây dựng sửa quán",
    channel: "cash",
    occurredAt: "2026-04-15T09:00:00.000Z",
  },
  {
    id: "cash-expense-setup-quat-tran",
    title: "Mua quạt trần và hộp số (6 bộ)",
    amount: 3000000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Mua 6 cái quạt trần (2.1M) và 6 cái hộp số (900k)",
    channel: "cash",
    occurredAt: "2026-04-15T14:00:00.000Z",
  },
  {
    id: "cash-expense-setup-loc-nuoc-bom",
    title: "Mua hệ thống lọc nước & bơm tăng áp",
    amount: 3200000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Hệ thống lọc nước (1.7M) và bơm tăng áp (1.5M)",
    channel: "cash",
    occurredAt: "2026-04-15T15:00:00.000Z",
  },
  {
    id: "cash-expense-setup-than-tai",
    title: "Mua bàn thờ thần tài trọn bộ",
    amount: 3100000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Mua bàn thờ thần tài trọn bộ trang trí quán",
    channel: "cash",
    occurredAt: "2026-04-19T10:00:00.000Z",
  },
  {
    id: "cash-expense-setup-led-menu",
    title: "Bảng đèn led & Làm menu",
    amount: 2000000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Làm bảng đèn led quảng cáo và làm menu quán",
    channel: "cash",
    occurredAt: "2026-04-19T11:00:00.000Z",
  },
  {
    id: "cash-expense-setup-ban-ghe",
    title: "Bàn ghế nhựa & chổi lau nhà",
    amount: 1700000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Mua bàn ghế nhựa phục vụ khách và chổi lau nhà",
    channel: "cash",
    occurredAt: "2026-04-20T10:00:00.000Z",
  },
  {
    id: "cash-expense-setup-may-duong",
    title: "Mua máy định lượng đường",
    amount: 1000000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Mua máy định lượng đường pha chế",
    channel: "cash",
    occurredAt: "2026-04-20T11:00:00.000Z",
  },
  {
    id: "cash-expense-setup-cay-canh",
    title: "Mua cây cảnh (11 cây)",
    amount: 8100000,
    entryType: "expense",
    category: "Máy móc thiết bị",
    note: "Mua 11 cây cảnh trang trí không gian quán",
    channel: "cash",
    occurredAt: "2026-04-22T10:00:00.000Z",
  },
  {
    id: "cash-expense-setup-bien-hieu",
    title: "Làm biển hiệu & decal trang trí",
    amount: 12260000,
    entryType: "expense",
    category: "Sửa chữa",
    note: "Chi phí làm biển hiệu (11.76M) và mua decal dán cửa trang trí (500k)",
    channel: "bank",
    occurredAt: "2026-04-23T14:00:00.000Z",
  },
  {
    id: "cash-expense-setup-dien-nuoc-vat-lieu",
    title: "Mua vật liệu điện nước",
    amount: 5300000,
    entryType: "expense",
    category: "Sửa chữa",
    note: "Mua vật liệu thi công hệ thống điện nước",
    channel: "cash",
    occurredAt: "2026-04-24T09:00:00.000Z",
  },
  {
    id: "cash-expense-setup-sua-tran-mai",
    title: "Công thợ & vật liệu sửa trần, sửa mái",
    amount: 6400000,
    entryType: "expense",
    category: "Sửa chữa",
    note: "Mua thạch cao, V nhôm sửa trần (1M) và tiền công thợ hàn sửa mái 9 buổi (5.4M)",
    channel: "cash",
    occurredAt: "2026-04-24T15:00:00.000Z",
  },
];

let cashbookSnapshot: CashbookSnapshot = {
  entries: defaultEntries,
  isLoading: isSupabaseConfigured,
  error: null,
};

let loadPromise: Promise<void> | null = null;
let cashbookChannelInitialized = false;
const listeners = new Set<() => void>();

const canUseDOM = () => typeof window !== "undefined";

const sortEntries = (entries: CashEntry[]) =>
  [...entries].sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );

const notifyListeners = () => {
  for (const listener of listeners) {
    listener();
  }
};

const normalizeCashEntry = (entry: CashEntry): CashEntry => ({
  ...entry,
  amount: Number(entry.amount),
  category: entry.category || "Khác",
  note: entry.note || "",
  channel: entry.channel || "cash",
});

const normalizeCashEntryRow = (row: CashEntryRow): CashEntry => ({
  id: row.id,
  title: row.title,
  amount: Number(row.amount),
  entryType: row.entry_type,
  category: row.category,
  note: row.note || "",
  channel: row.channel || "cash",
  occurredAt: row.occurred_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toCashEntryRow = (entry: CashEntry): CashEntryRow => ({
  id: entry.id,
  title: entry.title,
  amount: entry.amount,
  entry_type: entry.entryType,
  category: entry.category,
  note: entry.note,
  channel: entry.channel,
  occurred_at: entry.occurredAt,
});

const readLocalEntries = () => {
  if (!canUseDOM()) {
    return defaultEntries;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultEntries;
    }

    const parsed = JSON.parse(raw) as CashEntry[];
    if (Array.isArray(parsed)) {
      // Tự động gộp các defaultEntries mới nếu chưa có trong localStorage theo ID
      let modified = false;
      const merged = [...parsed];
      for (const def of defaultEntries) {
        if (!merged.some((item) => item.id === def.id)) {
          merged.push(def);
          modified = true;
        }
      }
      if (modified) {
        const sorted = sortEntries(merged);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
        return sorted.map((entry) => normalizeCashEntry(entry));
      }
      return sortEntries(parsed.map((entry) => normalizeCashEntry(entry)));
    }
    return defaultEntries;
  } catch {
    return defaultEntries;
  }
};

const writeLocalEntries = (entries: CashEntry[]) => {
  if (!canUseDOM()) {
    return;
  }

  const nextEntries = sortEntries(entries);
  cashbookSnapshot = {
    ...cashbookSnapshot,
    entries: nextEntries,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
  notifyListeners();
};

const seedCashbookDefaults = async () => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from(CASH_ENTRY_TABLE)
    .upsert(defaultEntries.map(toCashEntryRow), { onConflict: "id" });

  if (error) {
    throw error;
  }
};

const fetchCashEntries = async () => {
  if (!supabase) {
    return readLocalEntries();
  }

  const { data, error } = await supabase
    .from(CASH_ENTRY_TABLE)
    .select("*")
    .order("occurred_at", { ascending: false });

  if (error) {
    throw error;
  }

  /* 
  if ((data?.length ?? 0) === 0) {
    await seedCashbookDefaults();
    return fetchCashEntries();
  }
  */

  return (data ?? []).map((row) => normalizeCashEntryRow(row as CashEntryRow));
};

const initializeCashbookRealtime = () => {
  if (!supabase || cashbookChannelInitialized) {
    return;
  }

  cashbookChannelInitialized = true;

  supabase
    .channel("cashbook-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: CASH_ENTRY_TABLE },
      () => {
        void loadCashEntries({ force: true, silent: true });
      },
    )
    .subscribe();
};

const loadCashEntries = async (options?: { force?: boolean; silent?: boolean }) => {
  if (loadPromise && !options?.force) {
    return loadPromise;
  }

  loadPromise = (async () => {
    if (!options?.silent) {
      cashbookSnapshot = {
        ...cashbookSnapshot,
        isLoading: true,
        error: null,
      };
      notifyListeners();
    }

    try {
      const entries = await fetchCashEntries();
      cashbookSnapshot = {
        entries: sortEntries(entries),
        isLoading: false,
        error: null,
      };
      notifyListeners();
      initializeCashbookRealtime();
    } catch (error) {
      cashbookSnapshot = {
        entries: readLocalEntries(),
        isLoading: false,
        error: error instanceof Error ? error.message : "Không thể tải thu chi.",
      };
      notifyListeners();
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
};

const ensureCashEntriesLoaded = () => {
  void loadCashEntries();
};

export const formatCashEntryPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}đ`;

export const getCashEntryTypeMeta = (entryType: CashEntryType) =>
  entryType === "income"
    ? {
        label: "Thu",
        className: "bg-success/10 text-success border-success/20",
      }
    : {
        label: "Chi",
        className: "bg-destructive/10 text-destructive border-destructive/20",
      };

export const listCashEntries = () => cashbookSnapshot.entries;

export const createCashEntry = async (input: CreateCashEntryInput) => {
  const entry: CashEntry = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    amount: Math.max(0, Math.round(input.amount)),
    entryType: input.entryType,
    category: input.category.trim() || "Khác",
    note: input.note.trim(),
    channel: input.channel,
    occurredAt: input.occurredAt,
  };

  if (!supabase) {
    writeLocalEntries([entry, ...cashbookSnapshot.entries]);
    return entry;
  }

  const { data, error } = await supabase
    .from(CASH_ENTRY_TABLE)
    .insert(toCashEntryRow(entry))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const savedEntry = normalizeCashEntryRow(data as CashEntryRow);
  cashbookSnapshot = {
    ...cashbookSnapshot,
    entries: sortEntries([
      savedEntry,
      ...cashbookSnapshot.entries.filter((item) => item.id !== savedEntry.id),
    ]),
  };
  notifyListeners();
  return savedEntry;
};

export const updateCashEntry = async (entryId: string, input: CreateCashEntryInput) => {
  const currentEntry = cashbookSnapshot.entries.find((entry) => entry.id === entryId);

  if (!currentEntry) {
    throw new Error("Không tìm thấy bút toán cần sửa.");
  }

  const nextEntry: CashEntry = {
    ...currentEntry,
    title: input.title.trim(),
    amount: Math.max(0, Math.round(input.amount)),
    entryType: input.entryType,
    category: input.category.trim() || "Khác",
    note: input.note.trim(),
    channel: input.channel,
    occurredAt: input.occurredAt,
    updatedAt: new Date().toISOString(),
  };

  if (!supabase) {
    writeLocalEntries(
      cashbookSnapshot.entries.map((entry) => (entry.id === entryId ? nextEntry : entry)),
    );
    return nextEntry;
  }

  const { data, error } = await supabase
    .from(CASH_ENTRY_TABLE)
    .update({
      title: nextEntry.title,
      amount: nextEntry.amount,
      entry_type: nextEntry.entryType,
      category: nextEntry.category,
      note: nextEntry.note,
      channel: nextEntry.channel,
      occurred_at: nextEntry.occurredAt,
    })
    .eq("id", entryId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const savedEntry = normalizeCashEntryRow(data as CashEntryRow);
  cashbookSnapshot = {
    ...cashbookSnapshot,
    entries: sortEntries(
      cashbookSnapshot.entries.map((entry) => (entry.id === entryId ? savedEntry : entry)),
    ),
  };
  notifyListeners();
  return savedEntry;
};

export const deleteCashEntry = async (entryId: string) => {
  if (!supabase) {
    writeLocalEntries(cashbookSnapshot.entries.filter((entry) => entry.id !== entryId));
    return;
  }

  const { error } = await supabase.from(CASH_ENTRY_TABLE).delete().eq("id", entryId);
  if (error) {
    throw error;
  }

  cashbookSnapshot = {
    ...cashbookSnapshot,
    entries: cashbookSnapshot.entries.filter((entry) => entry.id !== entryId),
  };
  notifyListeners();
};

export const subscribeCashEntries = (listener: () => void) => {
  listeners.add(listener);

  if (canUseDOM()) {
    ensureCashEntriesLoaded();

    const handleLocalChange = () => {
      if (!supabase) {
        cashbookSnapshot = {
          ...cashbookSnapshot,
          entries: readLocalEntries(),
        };
        notifyListeners();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        handleLocalChange();
      }
    };

    window.addEventListener(EVENT_NAME, handleLocalChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener(EVENT_NAME, handleLocalChange);
      window.removeEventListener("storage", handleStorage);
    };
  }

  return () => {
    listeners.delete(listener);
  };
};

export const useCashEntries = () =>
  useSyncExternalStore(subscribeCashEntries, listCashEntries, () => cashbookSnapshot.entries);
