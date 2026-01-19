"use client"

import Bootstrap from "@/components/bootstrap";
import { SettingPopover } from "@/components/setting";

export default function BootstrapPage() {

    return (
        <div className="flex h-screen">
            <Bootstrap />
            <SettingPopover />
        </div>
    );
}
