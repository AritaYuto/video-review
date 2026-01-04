#if UNITY_EDITOR_OSX
using System.Runtime.InteropServices;

namespace VideoReview.Editor.Utility
{
    static class FocusWindow
    {
        [DllImport("__Internal")]
        private static extern void FocusUnityApp();

        public static void Run()
        {
            FocusUnityApp();
        }
    }
}
#endif
