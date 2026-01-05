using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using UnityEditor;
using UnityEngine;
using System.Collections.Concurrent;

namespace VideoReview.Editor.Receiver
{
    public class TcpServer : IDisposable
    {
        private readonly int _port;
        private readonly MessageDispatcher _dispatcher;
        private TcpListener _listener;
        private Thread _thread;
        private bool _running;
        private readonly ConcurrentQueue<string> _queue = new();

        public TcpServer(int port, MessageDispatcher dispatcher)
        {
            _port = port;
            _dispatcher = dispatcher;
        }

        public void Start()
        {
            if (_running) return;

            _running = true;
            _listener = new TcpListener(IPAddress.Loopback, _port);
            _listener.Start();

            _thread = new Thread(ListenLoop)
            {
                IsBackground = true
            };
            _thread.Start();

            EditorApplication.update -= OnEditorUpdate;
            EditorApplication.update += OnEditorUpdate;

            Debug.Log($"[VideoReview] TCP server started on port {_port}");
        }

        void OnEditorUpdate()
        {
            while (_queue.TryDequeue(out var line))
            {
                _dispatcher.DispatchRaw(line);
            }
        }

        private void ListenLoop()
        {
            while (_running)
            {
                try
                {
                    using var client = _listener.AcceptTcpClient();
                    using var stream = client.GetStream();
                    using var reader = new StreamReader(stream, Encoding.UTF8);

                    var line = reader.ReadLine();
                    if (!string.IsNullOrEmpty(line))
                    {
                        _queue.Enqueue(line);
                    }
                }
                catch (Exception e)
                {
                    Debug.LogException(e);
                }
            }
        }

        public void Stop()
        {
            _running = false;
            _listener?.Stop();
            _thread = null;

            Debug.Log("[VideoReview] TCP server stopped");
        }

        public void Dispose()
        {
            Stop();
        }
    }
}
