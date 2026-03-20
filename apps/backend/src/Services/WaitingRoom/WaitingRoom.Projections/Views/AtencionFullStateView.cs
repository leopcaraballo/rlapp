namespace WaitingRoom.Projections.Views;

using System.Collections.Generic;

public sealed record AtencionFullStateView
{
    public required string ServiceId { get; init; }
    public required IReadOnlyList<PatientInQueueDto> Waiting { get; init; }
    public required IReadOnlyList<NextTurnView> InConsultation { get; init; }
    public required IReadOnlyList<NextTurnView> WaitingPayment { get; init; }
    public required DateTimeOffset ProjectedAt { get; init; }
}
