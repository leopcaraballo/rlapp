using Microsoft.AspNetCore.SignalR;

namespace WaitingRoom.API.Hubs;

public sealed class WaitingRoomHub : Hub
{
    public async Task JoinQueue(string serviceId)
    {
        if (string.IsNullOrWhiteSpace(serviceId)) return;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"queue:{serviceId}");
    }

    public async Task LeaveQueue(string serviceId)
    {
        if (string.IsNullOrWhiteSpace(serviceId)) return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"queue:{serviceId}");
    }

    public override async Task OnConnectedAsync()
    {
        // Accept both the current patient-centric header (X-Atencion-Id) and the
        // legacy header (X-Queue-Id) so old and new clients both join their group.
        var headers = Context.GetHttpContext()?.Request.Headers;
        var serviceId = headers?["X-Atencion-Id"].FirstOrDefault()
                     ?? headers?["X-Queue-Id"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(serviceId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"queue:{serviceId}");
        }
        await base.OnConnectedAsync();
    }
}
