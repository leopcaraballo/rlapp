namespace WaitingRoom.API.Endpoints;

using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using WaitingRoom.Application.Queries;

public static class ConsultingRoomEndpoints
{
    public static void MapConsultingRoomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/consulting-rooms")
            .WithTags("ConsultingRooms")
            .WithOpenApi();

        group.MapGet("/occupancy", async (IMediator mediator) =>
        {
            var response = await mediator.Send(new GetConsultingRoomOccupancyQuery());
            return Results.Ok(response);
        })
        .WithName("GetConsultingRoomOccupancy")
        .WithSummary("Obtener ocupacion de consultorios");
    }
}
