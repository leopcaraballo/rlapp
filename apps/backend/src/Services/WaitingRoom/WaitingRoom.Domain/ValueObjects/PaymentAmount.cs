namespace WaitingRoom.Domain.ValueObjects;

using Exceptions;

/// <summary>
/// Value object for payment amounts (currency).
/// Ensures non-negative, valid amounts.
/// </summary>
public sealed record PaymentAmount
{
    public decimal Value { get; }

    public PaymentAmount(decimal value)
    {
        if (value <= 0)
            throw new DomainException("Payment amount must be greater than 0");

        if (value > 1_000_000)
            throw new DomainException("Payment amount cannot exceed 1,000,000");

        Value = value;
    }

    public override string ToString() => Value.ToString("C2");
}
