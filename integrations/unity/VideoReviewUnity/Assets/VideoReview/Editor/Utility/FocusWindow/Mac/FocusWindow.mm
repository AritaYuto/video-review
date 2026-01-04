#import <AppKit/AppKit.h>

extern "C"
{
    void FocusUnityApp()
    {
        [[NSRunningApplication currentApplication]
            activateWithOptions:NSApplicationActivateIgnoringOtherApps];
    }
}
