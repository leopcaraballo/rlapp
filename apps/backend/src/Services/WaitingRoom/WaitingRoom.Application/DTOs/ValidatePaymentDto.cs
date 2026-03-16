namespace WaitingRoom.Application.DTOs;

using System.ComponentModel.DataAnnotations;

public sealed record ValidatePaymentDto
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

    [Required]
    [MinLength(1)]
    public required string PaymentReference { get; init; }
}
