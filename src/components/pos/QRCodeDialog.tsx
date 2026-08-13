import { QRCodeSVG } from "qrcode.react";
import { Download, Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { brand } from "@/lib/brand";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
}

export function QRCodeDialog({ open, onOpenChange, url }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const orderUrl = url || `${window.location.origin}/dat-hang`;

  const handleCopy = () => {
    navigator.clipboard.writeText(orderUrl);
    setCopied(true);
    toast.success("Đã sao chép liên kết đặt hàng");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById("order-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      ctx?.drawImage(img, 0, 0, 1000, 1000);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-Dat-Hang-${brand.name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("Đã tải xuống mã QR");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-black">Mã QR Đặt Món</DialogTitle>
          <DialogDescription className="text-center">
            Khách hàng quét mã này để truy cập ngay thực đơn và đặt món tại quầy.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-6 py-6">
          <div className="relative rounded-3xl bg-white p-6 shadow-[0_20px_50px_-12px_rgba(31,122,71,0.15)] ring-1 ring-border/50">
            <QRCodeSVG
              id="order-qr-code"
              value={orderUrl}
              size={200}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: "/pwa-192x192.png",
                x: undefined,
                y: undefined,
                height: 48,
                width: 48,
                excavate: true,
              }}
            />
          </div>

          <div className="w-full space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/50 p-2 pl-4">
              <span className="flex-1 truncate text-xs text-muted-foreground">{orderUrl}</span>
              <button 
                className="flex h-8 w-8 items-center justify-center rounded-xl p-0 hover:bg-muted" 
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                className="flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium hover:bg-muted" 
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Tải ảnh PNG
              </button>
              <button 
                className="flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90" 
                onClick={handleCopy}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Chia sẻ link
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
