using Microsoft.AspNetCore.SignalR;
using WaitingRoom.API.Hubs;

namespace WaitingRoom.API.Services;

internal interface IWaitingRoomNotifier
{
    Task NotifyQueueUpdatedAsync(string queueId, CancellationToken cancellationToken = default);
}

internal sealed class WaitingRoomNotifier : IWaitingRoomNotifier
{
    private readonly IHubContext<WaitingRoomHub> _hubContext;
    private readonly ILogger<WaitingRoomNotifier> _logger;

    public WaitingRoomNotifier(
        IHubContext<WaitingRoomHub> hubContext,
        ILogger<WaitingRoomNotifier> logger)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task NotifyQueueUpdatedAsync(string queueId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(queueId)) return;

        var group = _hubContext.Clients.Group($"queue:{queueId}");
        var payload = new { queueId };

        await group.SendAsync("QueueStateUpdated", payload, cancellationToken);
        await group.SendAsync("MonitorUpdated", payload, cancellationToken);
        await group.SendAsync("NextTurn", payload, cancellationToken);
        await group.SendAsync("RecentHistoryUpdated", payload, cancellationToken);

        _logger.LogDebug("SignalR: notified group queue:{QueueId}", queueId);
    }
}
