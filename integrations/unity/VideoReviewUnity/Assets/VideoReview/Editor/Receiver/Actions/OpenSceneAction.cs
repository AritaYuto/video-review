using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using VideoReview.Editor.Utility;

namespace VideoReview.Editor.Receiver.Actions
{
    public class OpenSceneAction : IActionHandler
    {
        public string Action => "open";

        public void Handle(string scenePath)
        {
             FocusWindow.Run();

            if (!scenePath.StartsWith("Assets/"))
            {
                Debug.LogWarning($"[VideoReview] invalid scene path: {scenePath}");
                return;
            }

            if (!System.IO.File.Exists(scenePath))
            {
                Debug.LogWarning($"[VideoReview] scene file not found: {scenePath}");
                return;
            }

            // Confirmation dialog for unsaved scenes
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
            {
                return;
            }

            EditorSceneManager.OpenScene(scenePath);
            Debug.Log($"[VideoReview] opened scene: {scenePath}");
        }
    }
}


