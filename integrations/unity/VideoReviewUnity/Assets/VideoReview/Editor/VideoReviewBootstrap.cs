using UnityEditor;
using VideoReview.Editor.Receiver;

namespace VideoReview.Editor
{
    [InitializeOnLoad]
    public static class VideoReviewBootstrap
    {
        private static TcpServer _server;

        static VideoReviewBootstrap()
        {
            EditorApplication.delayCall += Start;
        }

        private static void Start()
        {
            if (_server != null)
                return;

            var dispatcher = new MessageDispatcher();
            _server = new TcpServer(18766, dispatcher);
            _server.Start();
        }
    }
}