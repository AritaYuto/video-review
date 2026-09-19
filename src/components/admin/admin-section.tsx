import type { ReactNode } from "react";

export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-base font-medium">{title}</h3>
            {children}
        </div>
    );
}
