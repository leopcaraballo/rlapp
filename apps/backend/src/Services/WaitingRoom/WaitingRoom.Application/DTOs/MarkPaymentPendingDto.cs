namespace WaitingRoom.Application.DTOs;

using System.ComponentModel.DataAnnotations;

public sealed record MarkPaymentPendingDto
{
    [Required]
    [MinLength(1)]
    public required string ServiceId { get; init; }

    [Required]
    [MinLength(1)]
    public required string PatientId { get; init; }

    [Required]
    [MinLength(1)]
    public required string Actor { get; init; }

    [Required]
    [MinLength(1)]
    public required string Reason { get; init; }
}
