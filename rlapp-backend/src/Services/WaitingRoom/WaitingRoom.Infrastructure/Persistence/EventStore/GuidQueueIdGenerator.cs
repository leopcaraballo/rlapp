namespace WaitingRoom.Infrastructure.Persistence.EventStore;

using WaitingRoom.Application.Ports;

public sealed class GuidQueueIdGenerator : IQueueIdGenerator
{
    public string Generate() => Guid.NewGuid().ToString("D");
}
