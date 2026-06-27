"use client";

import type { ReactNode } from "react";

export type ToastDetail = {
  id: string;
  title: string;
  body?: string;
  icon?: ReactNode;
  href?: string;
  duration?: number;
};

export const TOAST_EVENT = "our-little-cloud:toast";

// Shared key for the sessionStorage watermark that suppresses the
// "your partner left you a message" toast on every page refresh. Read by
// `MessageNotifListener` and cleared by `SignOutButton` so a sign-out +
// sign-in cycle re-arms the mount-time notification.
export const UNREAD_TOAST_WATERMARK_KEY = "our-little-cloud:unread-toast-watermark";

/**
 * Fire a toast. The `<ToastContainer />` mounted in the root layout listens
 * for these events and renders the corresponding floating card. Safe to call
 * from any client component.
 */
export function pushToast(detail: Omit<ToastDetail, "id"> & { id?: string }): void {
  if (typeof window === "undefined") return;
  const id = detail.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const payload: ToastDetail = {
    id,
    title: detail.title,
    body: detail.body,
    icon: detail.icon,
    href: detail.href,
    duration: detail.duration
  };
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: payload }));
}
