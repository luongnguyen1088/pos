import { useState, useEffect, useCallback } from "react";
import { Upload, Trash2, Loader2, Image as ImageIcon, Search, Plus, Check, RefreshCw, Copy } from "lucide-react";
import { listProductImages, uploadProductImage, deleteProductImage } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MediaFile {
  name: string;
  url: string;
  created_at: string;
}

interface MediaLibraryProps {
  onSelect?: (url: string) => void;
  selectedUrl?: string;
}

export const MediaLibrary = ({ onSelect, selectedUrl }: MediaLibraryProps) => {
  const [images, setImages] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listProductImages();
      setImages(data as MediaFile[]);
    } catch (error) {
      console.error("Error loading images:", error);
      toast.error("Không thể tải thư viện ảnh");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        await uploadProductImage(file);
        return true;
      } catch (error) {
        console.error("Upload error:", error);
        return false;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      toast.success(`Đã tải lên ${successCount} ảnh`);
      loadImages();
    }
    if (successCount < files.length) {
      toast.error(`Lỗi khi tải lên ${files.length - successCount} ảnh`);
    }
    setIsUploading(false);
  };

  const handleDelete = async (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn xóa ảnh này?")) return;

    try {
      await deleteProductImage(fileName);
      setImages(images.filter((img) => img.name !== fileName));
      toast.success("Đã xóa ảnh");
    } catch (error) {
      toast.error("Lỗi khi xóa ảnh");
    }
  };

  const filteredImages = images.filter((img) =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyUrl = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success("Đã sao chép URL ảnh");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm ảnh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={loadImages} 
            disabled={isLoading}
            className="rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <Button disabled={isUploading} className="w-full rounded-xl shadow-lg shadow-primary/20">
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Tải ảnh lên
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filteredImages.length === 0 ? (
        <Card className="border-dashed py-12 text-center rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-muted p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Không tìm thấy ảnh phù hợp" : "Thư viện ảnh trống"}
            </p>
            {!searchQuery && (
              <p className="text-xs text-muted-foreground italic">Hãy tải ảnh lên để bắt đầu xây dựng thư viện của bạn.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredImages.map((img) => (
            <div
              key={img.name}
              onClick={() => onSelect?.(img.url)}
              className={cn(
                "group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border-2 transition-all hover:shadow-md",
                selectedUrl === img.url
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent bg-muted/30"
              )}
            >
              <img
                src={img.url}
                alt={img.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
              />
              
              {selectedUrl === img.url && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                  <div className="rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-black/60 p-2 text-white backdrop-blur-sm transition-transform group-hover:translate-y-0">
                <span className="truncate text-[10px] font-medium">{img.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => handleCopyUrl(e, img.url)}
                    className="rounded-lg p-1 hover:bg-white/20 transition-colors"
                    title="Sao chép URL"
                  >
                    <Copy className="h-3 w-3 text-blue-300" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, img.name)}
                    className="rounded-lg p-1 hover:bg-white/20 transition-colors"
                    title="Xóa ảnh"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
