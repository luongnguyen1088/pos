import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

export function PWAUpdater() {
  const { updateServiceWorker } = useRegisterSW({
    onOfflineReady() {
      toast.success("Hệ thống POS đã sẵn sàng làm việc offline!", {
        description: "Bạn có thể tiếp tục bán hàng ngay cả khi mất kết nối mạng. Dữ liệu sẽ tự động đồng bộ khi có mạng trở lại.",
        duration: 8000,
      });
    },
    onNeedUpdate() {
      toast("Đã có bản cập nhật mới!", {
        description: "Vui lòng làm mới ứng dụng để sử dụng các tính năng và cải tiến mới nhất.",
        action: {
          label: "Cập nhật ngay",
          onClick: () => updateServiceWorker(true),
        },
        duration: Infinity,
      });
    },
    onRegistered(r) {
      console.log("SW Registered: ", r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  return null;
}
