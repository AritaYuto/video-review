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
            "shadcn/no-restyle": ["warn", {
                allow: ["layout", "typography"],
                // A popover that wraps a Command list has no padding of its own.
                contracts: [
                    { pattern: "^PopoverContent$", allow: ["layout", "p-0"] },
                    // An icon overlaid inside the field needs room on the left.
                    { pattern: "^(Input|SidebarInput)$", allow: ["layout", "pl-8"] },
                    // The hover card must not exceed the viewport; the utility is declared in globals.css.
                    { pattern: "^HoverCardContent$", allow: ["layout", "max-w-screen-gutter"] },
                    // The side panel's tab list sits flush against its content.
                    { pattern: "^Tabs$", allow: ["layout", "gap-0"] },
                ],
            }],
            "shadcn/no-raw-colors": "warn",
            "shadcn/no-arbitrary-values": "warn",
            "shadcn/no-inline-styles": "warn",
            "shadcn/no-unknown-classes": "warn",
            "shadcn/require-static-classes": "warn",
        },
    },
    {
        // The wrappers are the one place that may restyle primitives, and the stock shadcn
        // classes use arbitrary values (ring-[3px], p-[3px]) that the theme has no token for.
        files: ["src/components/ui/**/*.tsx"],
        rules: {
            "shadcn/no-restyle": "off",
            "shadcn/no-arbitrary-values": "off",
            "shadcn/require-static-classes": "off",
        },
    },
]);
