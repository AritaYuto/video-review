#if UNITY_EDITOR_WIN
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace VideoReview.Editor.Utility
{
    static class FocusWindow
    {
        [DllImport("user32.dll")]
        static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

        const  int SW_RESTORE = 9;

        public static void Run()
        {
            var proc = Process.GetCurrentProcess();
            var hwnd = proc.MainWindowHandle;
            if (hwnd == IntPtr.Zero)
                return;

            
            UnityEngine.Debug.Log("[VideoReview] FocusWindow");

            ShowWindowAsync(hwnd, SW_RESTORE);
            SetForegroundWindow(hwnd);
        }
    }
}
#endif
