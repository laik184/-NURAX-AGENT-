import type { SupportedStateLibrary } from "../types.js";

const LIBRARY_IMPORTS: Readonly<Record<SupportedStateLibrary, string>> = Object.freeze({
  redux: "@reduxjs/toolkit",
  zustand: "zustand",
  context: "react",
});

const PROVIDER_IMPORTS: Readonly<Record<SupportedStateLibrary, string>> = Object.freeze({
  redux: "react-redux",
  zustand: "zustand",
  context: "react",
});

export function getLibraryImportPackage(library: SupportedStateLibrary): string {
  return LIBRARY_IMPORTS[library];
}

export function getProviderImportPackage(library: SupportedStateLibrary): string {
  return PROVIDER_IMPORTS[library];
}
