namespace WaitingRoom.Tests.Integration.API;

using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using WaitingRoom.API.Middleware;
using WaitingRoom.Application.Exceptions;
using Xunit;

public class ExceptionHandlerMiddlewareTests
{
    [Fact]
    public async Task GivenPatientIdentityConflict_WhenMiddlewareHandlesException_ThenMapsToHttp409()
    {
        // Arrange
        RequestDelegate next = _ => throw new PatientIdentityConflictException("PAT-001", "Existing Name", "Incoming Name");
        var middleware = new ExceptionHandlerMiddleware(next, NullLogger<ExceptionHandlerMiddleware>.Instance);

        var httpContext = new DefaultHttpContext();
        httpContext.Items["CorrelationId"] = "corr-123";
        httpContext.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(httpContext);

        // Assert
        httpContext.Response.StatusCode.Should().Be(StatusCodes.Status409Conflict);

        httpContext.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(httpContext.Response.Body);
        var payload = await reader.ReadToEndAsync();

        var json = JsonDocument.Parse(payload);
        json.RootElement.GetProperty("error").GetString().Should().Be("PatientIdentityConflict");
        json.RootElement.GetProperty("correlationId").GetString().Should().Be("corr-123");
    }
}
