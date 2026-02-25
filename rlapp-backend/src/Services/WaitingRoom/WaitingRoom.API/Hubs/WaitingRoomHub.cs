using Microsoft.AspNetCore.SignalR;

namespace WaitingRoom.API.Hubs;

public sealed class WaitingRoomHub : Hub
{
	// Clients should join a group for a specific queueId so we can
	// push projection updates only to connected consumers for that queue.
	public Task JoinQueueGroup(string queueId)
	{
		if (string.IsNullOrWhiteSpace(queueId))
			return Task.CompletedTask;

		return Groups.AddToGroupAsync(Context.ConnectionId, queueId);
	}

	public Task LeaveQueueGroup(string queueId)
	{
		if (string.IsNullOrWhiteSpace(queueId))
			return Task.CompletedTask;

		return Groups.RemoveFromGroupAsync(Context.ConnectionId, queueId);
	}

	public override async Task OnConnectedAsync()
	{
		// Optional: auto-join queue group if `queueId` provided in query string
		var httpContext = Context.GetHttpContext();
		if (httpContext != null && httpContext.Request.Query.TryGetValue("queueId", out var values))
		{
			var queueId = values.FirstOrDefault();
			if (!string.IsNullOrWhiteSpace(queueId))
				await Groups.AddToGroupAsync(Context.ConnectionId, queueId);
		}

		await base.OnConnectedAsync();
	}
}
