namespace WaitingRoom.Application.DTOs;

using System.ComponentModel.DataAnnotations;

public sealed record MarkPaymentPendingDto
{
    [Required]
    [MinLength(1)]
    public required string QueueId { get; init; }

    [Required]
    [MinLength(1)]
    public required string PatientId { get; init; }

    [Required]
    [MinLength(1)]
    public required string Actor { get; init; }
    public string? Reason { get; init; }
}
