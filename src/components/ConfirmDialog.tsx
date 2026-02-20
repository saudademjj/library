"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "danger";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "确定",
  cancelText = "取消",
  onConfirm,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // 错误提示由调用方处理，避免重复日志污染控制台
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
        <div className={isDanger ? "confirm-dialog-shell confirm-dialog-shell-danger" : "confirm-dialog-shell"}>
          <div className="pt-8 pb-2 flex justify-center">
            <div
              className={`
                confirm-dialog-icon
                h-16 w-16 rounded-full flex items-center justify-center
                ${isDanger ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"}
              `}
            >
              {isDanger ? (
                <AlertTriangle className="h-8 w-8" strokeWidth={1.5} />
              ) : (
                <HelpCircle className="h-8 w-8" strokeWidth={1.5} />
              )}
            </div>
          </div>

          <DialogHeader className="px-6 pb-2 text-center">
            <DialogTitle className="text-xl font-semibold text-gray-900">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-gray-500 mt-2 text-sm leading-relaxed">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogFooter className="px-6 pb-6 pt-4 flex-col-reverse sm:flex-row gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto h-11 rounded-xl border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              {cancelText}
            </Button>

            <Button
              variant={isDanger ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={loading}
              className={`
                w-full sm:w-auto h-11 rounded-xl transition-all
                ${isDanger
                  ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25"
                  : "bg-gray-900 hover:bg-gray-800 shadow-lg shadow-gray-900/25"}
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
