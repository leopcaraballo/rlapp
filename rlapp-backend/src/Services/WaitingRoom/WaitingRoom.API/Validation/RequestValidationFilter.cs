namespace WaitingRoom.API.Validation;

using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

internal static class RequestValidationFilter
{
    public static EndpointFilterDelegate Factory(
        EndpointFilterFactoryContext context,
        EndpointFilterDelegate next)
    {
        var validatableArgumentIndexes = context.MethodInfo
            .GetParameters()
            .Select((parameter, index) => new { parameter, index })
            .Where(x => IsValidatableType(x.parameter.ParameterType))
            .Select(x => x.index)
            .ToArray();

        if (validatableArgumentIndexes.Length == 0)
            return next;

        return async invocationContext =>
        {
            foreach (var index in validatableArgumentIndexes)
            {
                var argument = invocationContext.Arguments[index];
                if (argument is null)
                    continue;

                var validationContext = new ValidationContext(argument);
                var validationResults = new List<ValidationResult>();

                var isValid = Validator.TryValidateObject(
                    argument,
                    validationContext,
                    validationResults,
                    validateAllProperties: true);

                if (isValid)
                    continue;

                var errors = validationResults
                    .Where(result => !string.IsNullOrWhiteSpace(result.ErrorMessage))
                    .SelectMany(result =>
                    {
                        var members = result.MemberNames.Any()
                            ? result.MemberNames
                            : [string.Empty];

                        return members.Select(member => new
                        {
                            Member = string.IsNullOrWhiteSpace(member) ? "request" : member,
                            Error = result.ErrorMessage!
                        });
                    })
                    .GroupBy(item => item.Member)
                    .ToDictionary(
                        group => group.Key,
                        group => group.Select(item => item.Error).Distinct().ToArray());

                return Results.ValidationProblem(errors);
            }

            return await next(invocationContext);
        };
    }

    private static bool IsValidatableType(Type type)
    {
        if (type == typeof(string) || type == typeof(CancellationToken) || type.IsPrimitive)
            return false;

        if (typeof(HttpContext).IsAssignableFrom(type))
            return false;

        if (type.Namespace?.StartsWith("Microsoft.AspNetCore", StringComparison.Ordinal) == true)
            return false;

        return type.IsClass;
    }
}
