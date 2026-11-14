"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  Dialog as DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`dialog-content ${wide ? "dialog-wide" : ""}`}
        showCloseButton={false}
      >
        <div className="dialog-heading">
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="icon-button"
                aria-label="Close dialog"
              />
            }
          >
            <X size={19} />
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </DialogRoot>
  );
}
