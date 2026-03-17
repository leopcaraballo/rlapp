using Microsoft.AspNetCore.SignalR;

namespace WaitingRoom.API.Hubs;

public sealed class WaitingRoomHub : Hub
{
    public async Task JoinQueue(string queueId)
    {
        if (string.IsNullOrWhiteSpace(queueId)) return;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"queue:{queueId}");
    }

    public async Task LeaveQueue(string queueId)
    {
        if (string.IsNullOrWhiteSpace(queueId)) return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"queue:{queueId}");
    }

    public override async Task OnConnectedAsync()
    {
        var queueId = Context.GetHttpContext()?.Request.Headers["X-Queue-Id"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(queueId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"queue:{queueId}");
        }
        await base.OnConnectedAsync();
    }
}
