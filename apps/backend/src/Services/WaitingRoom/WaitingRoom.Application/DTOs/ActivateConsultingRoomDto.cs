namespace WaitingRoom.Application.DTOs;

using System.ComponentModel.DataAnnotations;

public sealed record ActivateConsultingRoomDto
{
    [Required]
    [MinLength(1)]
    public required string ServiceId { get; init; }

    [Required]
    [MinLength(1)]
    public required string ConsultingRoomId { get; init; }

    [Required]
    [MinLength(1)]
    public required string Actor { get; init; }
}
