"use client";

import { useRef, useEffect } from "react";

export type DeviceMeta = {
  started_at: string;
  device_type: "mobile" | "tablet" | "desktop";
  os: string;
  browser: string;
  language: string;
  timezone: string;
  screen_w: number;
  screen_h: number;
  connection_type?: string;
  referrer?: string;
};

function parseUA(ua: string): { os: string; browser: string } {
  const os =
    /android/i.test(ua) ? "Android" :
    /iphone/i.test(ua) ? "iOS" :
    /ipad/i.test(ua) ? "iPadOS" :
    /windows/i.test(ua) ? "Windows" :
    /mac os/i.test(ua) ? "macOS" :
    /linux/i.test(ua) ? "Linux" : "Otro";

  const browser =
    /edg\//i.test(ua) ? "Edge" :
    /opr\//i.test(ua) ? "Opera" :
    /chrome/i.test(ua) ? "Chrome" :
    /firefox/i.test(ua) ? "Firefox" :
    /safari/i.test(ua) ? "Safari" : "Otro";

  return { os, browser };
}

function deviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

export function useDeviceMeta() {
  const meta = useRef<DeviceMeta | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const { os, browser } = parseUA(ua);
    const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
    meta.current = {
      started_at: new Date().toISOString(),
      device_type: deviceType(),
      os,
      browser,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen_w: window.screen.width,
      screen_h: window.screen.height,
      connection_type: nav.connection?.effectiveType,
      referrer: document.referrer || undefined,
    };
  }, []);

  return meta;
}
