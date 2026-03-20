using Microsoft.AspNetCore.SignalR;
using WaitingRoom.API.Hubs;

namespace WaitingRoom.API.Services;

internal interface IWaitingRoomNotifier
{
    Task NotifyQueueUpdatedAsync(string serviceId, CancellationToken cancellationToken = default);
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

    public async Task NotifyQueueUpdatedAsync(string serviceId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(serviceId)) return;

        var group = _hubContext.Clients.Group($"queue:{serviceId}");
        var payload = new { serviceId };

        // Patient-centric name used by the current frontend (atencionSignalR.ts).
        await group.SendAsync("AtencionStateUpdated", payload, cancellationToken);
        // Legacy name kept for backward compatibility with any existing consumers.
        await group.SendAsync("QueueStateUpdated", payload, cancellationToken);
        await group.SendAsync("MonitorUpdated", payload, cancellationToken);
        await group.SendAsync("NextTurn", payload, cancellationToken);
        await group.SendAsync("RecentHistoryUpdated", payload, cancellationToken);

        _logger.LogDebug("SignalR: notified group queue:{ServiceId}", serviceId);
    }
}
