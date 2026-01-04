using  System.Collections.Generic;

namespace VideoReview.Editor.Receiver.Actions
{
    public interface IActionHandler
    {
        string Action  { get; }

        void Handle(string scenePath);
    }
}
