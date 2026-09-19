import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { shadcn },
        // Every rule starts as a warning: the codebase has ~1,000 findings that are being
        // worked off directory by directory. A rule moves to "error" once it reports nothing.
        rules: {
            "shadcn/no-restyle": ["warn", { allow: ["layout"] }],
            "shadcn/no-raw-colors": "warn",
            "shadcn/no-arbitrary-values": "warn",
            "shadcn/no-inline-styles": "warn",
            "shadcn/no-unknown-classes": "warn",
            "shadcn/require-static-classes": "warn",
        },
    },
]);
