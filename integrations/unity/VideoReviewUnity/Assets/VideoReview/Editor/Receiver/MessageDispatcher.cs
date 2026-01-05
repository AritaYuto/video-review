using UnityEngine;
using System;
using VideoReview.Editor.Receiver.Actions;
using System.Collections.Generic;

namespace VideoReview.Editor.Receiver
{
    [SerializableAttribute]
    public class Message
    {
        public string action;
        public string scene;
    }

    public class MessageDispatcher
    {
        private List<IActionHandler> _handlers = new List<IActionHandler>()
        {
            new OpenSceneAction()
        };

        public void DispatchRaw(string rawJson)
        {
            Debug.LogWarning(rawJson);

            Message msg;
            try
            {
                msg = JsonUtility.FromJson<Message>(rawJson);
            }
            catch
            {
                Debug.LogWarning("[VideoReview] invalid json");
                return;
            }

            Dispatch(msg);
        }

        public void Dispatch(Message msg)
        {
            if (msg == null || string.IsNullOrEmpty(msg.action) || string.IsNullOrEmpty(msg.scene))
            {
                return;
            }

            foreach (var handler in _handlers)
            {
                if (handler.Action == msg.action)
                {
                    handler.Handle(msg.scene);
                    return;
                }
            }
        }
    }
}