namespace WaitingRoom.API.Endpoints;

using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using WaitingRoom.API.Validation;
using WaitingRoom.Application.Commands;
using WaitingRoom.Application.Queries;

public static class PatientEndpoints
{
    public static void MapPatientEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/patients")
            .WithTags("Patients")
            .WithOpenApi();

        // COMMANDS
        
        group.MapPost("/register", async (RegisterPatientCommand command, IMediator mediator) =>
        {
            var response = await mediator.Send(command);
            return Results.Ok(response);
        })
        .WithName("RegisterPatient")
        .WithSummary("Registrar un nuevo paciente")
        .AddEndpointFilter<ReceptionistOnlyFilter>()
        .AddEndpointFilterFactory(RequestValidationFilter.Factory);

        group.MapPost("/{patientId}/mark-waiting", async (string patientId, MarkPatientAsWaitingCommand command, IMediator mediator) =>
        {
            if (patientId != command.PatientId) return Results.BadRequest("ID mismatch");
            var response = await mediator.Send(command);
            return response.Success ? Results.Ok(response) : Results.NotFound();
        })
        .WithName("MarkAsWaiting")
        .AddEndpointFilter<ReceptionistOnlyFilter>()
        .AddEndpointFilterFactory(RequestValidationFilter.Factory);

        group.MapPost("/{patientId}/assign-room", async (string patientId, AssignConsultingRoomCommand command, IMediator mediator) =>
        {
            if (patientId != command.PatientId) return Results.BadRequest("ID mismatch");
            var response = await mediator.Send(command);
            return response.Success ? Results.Ok(response) : Results.BadRequest();
        })
        .WithName("AssignRoom")
        .AddEndpointFilter<ReceptionistOnlyFilter>()
        .AddEndpointFilterFactory(RequestValidationFilter.Factory);

        group.MapPost("/{patientId}/start-consultation", async (string patientId, StartConsultationCommand command, IMediator mediator) =>
        {
            if (patientId != command.PatientId) return Results.BadRequest("ID mismatch");
            var response = await mediator.Send(command);
            return response.Success ? Results.Ok(response) : Results.BadRequest();
        })
        .WithName("StartConsultation")
        .AddEndpointFilter<DoctorOnlyFilter>()
        .AddEndpointFilterFactory(RequestValidationFilter.Factory);

        group.MapPost("/{patientId}/finish-consultation", async (string patientId, FinishConsultationCommand command, IMediator mediator) =>
        {
            if (patientId != command.PatientId) return Results.BadRequest("ID mismatch");
            var response = await mediator.Send(command);
            return response.Success ? Results.Ok(response) : Results.BadRequest();
        })
        .WithName("FinishConsultation")
        .AddEndpointFilter<DoctorOnlyFilter>()
        .AddEndpointFilterFactory(RequestValidationFilter.Factory);

        group.MapPost("/{patientId}/arrive-cashier", async (string patientId, ArriveCashierCommand command, IMediator mediator) =>
        {
            if (patientId != command.PatientId) return Results.BadRequest("ID mismatch");
            var response = await mediator.Send(command);
            return response.Success ? Results.Ok(response) : Results.BadRequest();
        })
        .WithName("ArriveCashier")
        .AddEndpointFilter<CashierOnlyFilter>()
        .AddEndpointFilterFactory(RequestValidationFilter.Factory);

        group.MapPost("/{patientId}/validate-payment", async (string patientId, ValidatePaymentCommand command, IMediator mediator) =>
        {
            if (patientId != command.PatientId) return Results.BadRequest("ID mismatch");
            var response = await mediator.Send(command);
            return response.Success ? Results.Ok(response) : Results.BadRequest();
        })
        .WithName("ValidatePayment")
        .AddEndpointFilter<CashierOnlyFilter>()
        .AddEndpointFilterFactory(RequestValidationFilter.Factory);

        group.MapPost("/{patientId}/complete", async (string patientId, CompletePatientCommand command, IMediator mediator) =>
        {
            if (patientId != command.PatientId) return Results.BadRequest("ID mismatch");
            var response = await mediator.Send(command);
            return response.Success ? Results.Ok(response) : Results.BadRequest();
        })
        .WithName("CompletePatient")
        .AddEndpointFilter<CashierOnlyFilter>()
        .AddEndpointFilterFactory(RequestValidationFilter.Factory);

        // QUERIES

        group.MapGet("/{patientId}/state", async (string patientId, IMediator mediator) =>
        {
            var response = await mediator.Send(new GetPatientStateQuery(patientId));
            return response != null ? Results.Ok(response) : Results.NotFound();
        })
        .WithName("GetPatientState");

        group.MapGet("/waiting", async (IMediator mediator) =>
        {
            var response = await mediator.Send(new GetWaitingPatientsQuery());
            return Results.Ok(response);
        })
        .WithName("GetWaitingPatients");

        group.MapGet("/cashier-queue", async (IMediator mediator) =>
        {
            var response = await mediator.Send(new GetCashierQueueQuery());
            return Results.Ok(response);
        })
        .WithName("GetCashierQueue");
    }
}
