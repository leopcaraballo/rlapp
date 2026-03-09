namespace WaitingRoom.Application.DTOs;

using System.ComponentModel.DataAnnotations;

public sealed record DeactivateConsultingRoomDto
{
    [Required]
    [MinLength(1)]
    public required string QueueId { get; init; }

    [Required]
    [MinLength(1)]
    public required string ConsultingRoomId { get; init; }

    [Required]
    [MinLength(1)]
    public required string Actor { get; init; }
}
