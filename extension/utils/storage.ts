import { storage } from "wxt/utils/storage";

export const companionUrl = storage.defineItem<string>("local:companionUrl", {
  fallback: "http://127.0.0.1:51205",
});

export const modifierKey = storage.defineItem<"meta" | "alt" | "ctrl">(
  "local:modifierKey",
  { fallback: "meta" },
);
