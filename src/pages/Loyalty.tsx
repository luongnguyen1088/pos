import React, { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { 
  getCustomers, 
  getPointHistory, 
  adjustCustomerPointsManually, 
  upsertCustomer,
  type Customer, 
  type PointHistory 
} from "@/lib/orders";
import {
  Award,
  Plus,
  Search,
  History,
  UserPlus,
  Users,
  Coins,
  Settings2,
  Calendar,
  Phone,
  User,
  ArrowUpDown,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function Loyalty() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Selected customer for history or adjustment
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Form states
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newPoints, setNewPoints] = useState(0);

  const [adjustType, setAdjustType] = useState<"add" | "sub">("add");
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data
  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải danh sách khách hàng thành viên.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (c) =>
        c.phone.includes(query) ||
        (c.name && c.name.toLowerCase().includes(query))
    );
  }, [customers, searchQuery]);

  // Statistics
  const totalPoints = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.points, 0);
  }, [customers]);

  // Handle Add Customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = newPhone.trim();
    const name = newName.trim();

    if (!phone) {
      toast.error("Vui lòng nhập số điện thoại.");
      return;
    }

    setIsSubmitting(true);
    try {
      await upsertCustomer(phone, name || undefined, newPoints);
      if (newPoints > 0) {
        await adjustCustomerPointsManually(phone, 0, `Điểm khởi tạo thành viên`);
      }
      toast.success("Đã thêm khách hàng thành viên thành công!");
      setIsAddDialogOpen(false);
      setNewPhone("");
      setNewName("");
      setNewPoints(0);
      loadCustomers();
    } catch (err) {
      toast.error("Lỗi khi thêm khách hàng: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open adjustment dialog
  const openAdjustDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setAdjustType("add");
    setAdjustAmount(0);
    setAdjustReason("");
    setIsAdjustDialogOpen(true);
  };

  // Handle Adjustment
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (adjustAmount <= 0) {
      toast.error("Vui lòng nhập số điểm hợp lệ lớn hơn 0.");
      return;
    }
    if (!adjustReason.trim()) {
      toast.error("Vui lòng nhập lý do điều chỉnh.");
      return;
    }

    const change = adjustType === "add" ? adjustAmount : -adjustAmount;

    // Check if subtraction exceeds current balance
    if (adjustType === "sub" && selectedCustomer.points < adjustAmount) {
      toast.error(`Khách hàng chỉ có ${selectedCustomer.points.toLocaleString()} điểm. Không thể trừ ${adjustAmount.toLocaleString()} điểm.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustCustomerPointsManually(selectedCustomer.phone, change, adjustReason.trim());
      toast.success(`Đã điều chỉnh điểm cho khách hàng ${selectedCustomer.phone} thành công!`);
      setIsAdjustDialogOpen(false);
      loadCustomers();
    } catch (err) {
      toast.error("Lỗi khi điều chỉnh điểm: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open history dialog
  const openHistoryDialog = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsHistoryDialogOpen(true);
    setIsHistoryLoading(true);
    try {
      const data = await getPointHistory(customer.phone);
      setHistory(data);
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải lịch sử điểm.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Quản lý thành viên & Điểm</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý khách hàng thân thiết, xem lịch sử biến động và điều chỉnh điểm tích lũy.
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 self-start sm:self-auto">
            <UserPlus className="h-5 w-5" />
            Thêm thành viên
          </Button>
        </div>

        {/* Overview cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Tổng số thành viên</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : customers.length.toLocaleString()} khách</div>
              <p className="text-xs text-muted-foreground">Có phát sinh giao dịch tích điểm</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Tổng điểm lưu hành</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : totalPoints.toLocaleString()} điểm</div>
              <p className="text-xs text-muted-foreground">Giá trị quy đổi tương đương {totalPoints.toLocaleString()}đ</p>
            </CardContent>
          </Card>
        </div>

        {/* Table & search */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách khách hàng</CardTitle>
            <CardDescription>Tìm kiếm và quản lý điểm số của từng khách hàng.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo số điện thoại hoặc tên khách hàng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                Đang tải danh sách thành viên...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-1 text-muted-foreground">
                <p className="font-semibold">Không tìm thấy khách hàng nào</p>
                <p className="text-sm">Hãy thử thay đổi từ khóa tìm kiếm hoặc thêm thành viên mới.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead>Tên khách hàng</TableHead>
                      <TableHead className="text-right">Điểm hiện tại</TableHead>
                      <TableHead>Ngày tham gia</TableHead>
                      <TableHead>Cập nhật cuối</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.phone}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {customer.phone}
                          </div>
                        </TableCell>
                        <TableCell>{customer.name || <span className="text-muted-foreground italic">Chưa cập nhật</span>}</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {customer.points.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(customer.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(customer.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 gap-1"
                              onClick={() => openHistoryDialog(customer)}
                            >
                              <History className="h-3.5 w-3.5" />
                              Lịch sử
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => openAdjustDialog(customer)}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                              Sửa điểm
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG: Add member */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddCustomer}>
            <DialogHeader>
              <DialogTitle>Thêm thành viên mới</DialogTitle>
              <DialogDescription>
                Nhập số điện thoại và tên để tạo tài khoản tích điểm cho khách hàng mới.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Số điện thoại *</Label>
                <Input
                  id="phone"
                  required
                  placeholder="Ví dụ: 0987654321"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Tên khách hàng</Label>
                <Input
                  id="name"
                  placeholder="Tên khách hàng (không bắt buộc)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="initialPoints">Số điểm ban đầu</Label>
                <Input
                  id="initialPoints"
                  type="number"
                  min="0"
                  value={newPoints}
                  onChange={(e) => setNewPoints(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : "Xác nhận"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Adjust points */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedCustomer && (
            <form onSubmit={handleAdjustPoints}>
              <DialogHeader>
                <DialogTitle>Điều chỉnh điểm số</DialogTitle>
                <DialogDescription>
                  Điều chỉnh điểm số thủ công cho khách hàng <strong className="text-foreground">{selectedCustomer.name || selectedCustomer.phone}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="bg-muted flex justify-between rounded-lg p-3 text-sm">
                  <span>Số điểm hiện tại:</span>
                  <span className="font-bold text-primary">{selectedCustomer.points.toLocaleString()} điểm</span>
                </div>

                <div className="grid gap-2">
                  <Label>Loại điều chỉnh</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="adjustType" 
                        checked={adjustType === "add"}
                        onChange={() => setAdjustType("add")} 
                        className="text-primary focus:ring-primary"
                      />
                      <span>Cộng điểm (+)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="adjustType" 
                        checked={adjustType === "sub"}
                        onChange={() => setAdjustType("sub")}
                        className="text-primary focus:ring-primary"
                      />
                      <span>Trừ điểm (-)</span>
                    </label>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="adjustAmount">Số điểm thay đổi *</Label>
                  <Input
                    id="adjustAmount"
                    type="number"
                    min="1"
                    required
                    placeholder="Nhập số điểm cần thay đổi"
                    value={adjustAmount || ""}
                    onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="adjustReason">Lý do điều chỉnh *</Label>
                  <Input
                    id="adjustReason"
                    required
                    placeholder="Ví dụ: Tặng quà sinh nhật, Bù điểm sai đơn..."
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Xác nhận"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: View history */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lịch sử biến động điểm</DialogTitle>
            <DialogDescription>
              {selectedCustomer && (
                <>
                  Khách hàng: <strong>{selectedCustomer.name || "Khách ẩn danh"}</strong> ({selectedCustomer.phone})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {isHistoryLoading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              Đang tải lịch sử điểm...
            </div>
          ) : history.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground italic">
              Chưa có giao dịch biến động điểm nào.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Biến động</TableHead>
                    <TableHead>Lý do / Nội dung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell className={`font-bold ${item.pointsChange > 0 ? "text-success" : "text-destructive"}`}>
                        {item.pointsChange > 0 ? `+${item.pointsChange.toLocaleString()}` : item.pointsChange.toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm" title={item.reason}>
                        {item.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsHistoryDialogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
