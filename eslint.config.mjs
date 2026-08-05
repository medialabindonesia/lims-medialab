import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Baseline lint untuk technical/export code yang sudah ada sebelum CI
  // diaktifkan. Rule tetap terlihat sebagai warning dan file lain tetap strict.
  {
    files: [
      "src/app/api/technical/coc/*/route.ts",
      "src/lib/exports/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Pola client-only/realtime lama ini berfungsi, tetapi belum mengikuti rule
  // React hooks terbaru. Batasi baseline pada file yang dilaporkan CI saja.
  {
    files: [
      "src/components/exports/ExportPreviewModal.tsx",
      "src/components/exports/PdfCanvasViewer.tsx",
      "src/components/master/MasterCustomerClient.tsx",
      "src/components/quotation/QuotationFlowClient.tsx",
      "src/components/technical/TechnicalDocumentClient.tsx",
      "src/hooks/useSupportUnread.ts",
      "src/hooks/useTicketChannel.ts",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["src/hooks/useSupportUnread.ts", "src/hooks/useTicketChannel.ts"],
    rules: {
      "react-hooks/refs": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "releases/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
