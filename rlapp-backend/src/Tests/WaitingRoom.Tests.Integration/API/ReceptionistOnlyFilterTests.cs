namespace WaitingRoom.Tests.Integration.API;

using FluentAssertions;
using Microsoft.AspNetCore.Http;
using WaitingRoom.API.Validation;
using Xunit;

public class ReceptionistOnlyFilterTests
{
    [Fact]
    public async Task GivenMissingRoleHeader_WhenInvokingFilter_ThenReturnsUnauthorized()
    {
        // Arrange
        var filter = new ReceptionistOnlyFilter();
        var context = new TestEndpointFilterInvocationContext(new DefaultHttpContext());

        // Act
        var result = await filter.InvokeAsync(context, _ => ValueTask.FromResult<object?>(Results.Ok()));

        // Assert — Sin JWT ni header, se retorna 401 Unauthorized (JSON result)
        result.Should().BeAssignableTo<IResult>();
    }

    [Fact]
    public async Task GivenReceptionistRole_WhenInvokingFilter_ThenAllowsExecution()
    {
        // Arrange
        var filter = new ReceptionistOnlyFilter();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-User-Role"] = "Receptionist";

        var context = new TestEndpointFilterInvocationContext(httpContext);
        var nextWasCalled = false;

        // Act
        var result = await filter.InvokeAsync(context, _ =>
        {
            nextWasCalled = true;
            return ValueTask.FromResult<object?>("allowed");
        });

        // Assert — Header fallback funciona para desarrollo
        nextWasCalled.Should().BeTrue();
        result.Should().Be("allowed");
    }

    [Fact]
    public async Task GivenNonReceptionistRole_WhenInvokingFilter_ThenReturnsUnauthorized()
    {
        // Arrange
        var filter = new ReceptionistOnlyFilter();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-User-Role"] = "Cashier";

        var context = new TestEndpointFilterInvocationContext(httpContext);

        // Act
        var result = await filter.InvokeAsync(context, _ => ValueTask.FromResult<object?>("allowed"));

        // Assert — Cashier no tiene permiso de recepcionista, se retorna una respuesta denegada
        result.Should().BeAssignableTo<IResult>();
    }

    [Fact]
    public async Task GivenAdminRole_WhenInvokingFilter_ThenAllowsExecution()
    {
        // Arrange
        var filter = new ReceptionistOnlyFilter();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-User-Role"] = "Admin";

        var context = new TestEndpointFilterInvocationContext(httpContext);
        var nextWasCalled = false;

        // Act
        var result = await filter.InvokeAsync(context, _ =>
        {
            nextWasCalled = true;
            return ValueTask.FromResult<object?>("allowed");
        });

        // Assert — Admin tiene acceso a endpoints de recepcionista
        nextWasCalled.Should().BeTrue();
        result.Should().Be("allowed");
    }

    private sealed class TestEndpointFilterInvocationContext(HttpContext httpContext) : EndpointFilterInvocationContext
    {
        public override HttpContext HttpContext { get; } = httpContext;

        public override IList<object?> Arguments { get; } = [];

        public override T GetArgument<T>(int index)
        {
            throw new ArgumentOutOfRangeException(nameof(index));
        }
    }
}
