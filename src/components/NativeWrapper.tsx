"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard } from "@capacitor/keyboard";

export const NativeWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const initNative = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Sync theme
          const theme = document.documentElement.getAttribute("data-theme");
          await StatusBar.setStyle({
            style: theme === "dark" ? Style.Dark : Style.Light,
          });

          // Background color
          await StatusBar.setBackgroundColor({
            color: theme === "dark" ? "#0f0f1a" : "#f5f7fa",
          });

          // Keyboard resize
          if (Capacitor.getPlatform() === 'ios') {
            await Keyboard.setScroll({ isDisabled: false });
          }
        } catch (e) {
          console.warn("Capacitor plugins not available", e);
        }
      }
    };

    initNative();
  }, []);

  return <>{children}</>;
};
