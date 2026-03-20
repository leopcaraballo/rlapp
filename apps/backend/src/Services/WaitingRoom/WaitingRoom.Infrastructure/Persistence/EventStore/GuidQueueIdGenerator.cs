namespace WaitingRoom.Infrastructure.Persistence.EventStore;

using WaitingRoom.Application.Ports;

public sealed class GuidServiceIdGenerator : IServiceIdGenerator
{
    public string Generate() => Guid.NewGuid().ToString("D");
}
