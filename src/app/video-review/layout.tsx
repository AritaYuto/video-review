import "@/styles/globals.css";
import "@xyflow/react/dist/style.css";
import { LocaleProvider } from "../locale-provider";

export default function VideoReviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <LocaleProvider>
            {children}
        </LocaleProvider>
    );
}
