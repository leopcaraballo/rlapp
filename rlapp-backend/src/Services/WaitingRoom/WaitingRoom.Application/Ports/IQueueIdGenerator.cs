namespace WaitingRoom.Application.Ports;

/// <summary>
/// Generates queue identifiers for check-in assignments.
/// Backend is the single source of truth for queue id generation.
/// </summary>
public interface IQueueIdGenerator
{
    string Generate();
}
