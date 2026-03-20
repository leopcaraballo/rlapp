namespace WaitingRoom.Tests.Domain.ValueObjects;

using FluentAssertions;
using WaitingRoom.Domain.Exceptions;
using WaitingRoom.Domain.ValueObjects;
using Xunit;

/// <summary>
/// Pruebas de Analisis de Valores Frontera (BVA) para los Value Objects del dominio.
///
/// Tecnica: Para cada frontera se prueban los valores:
/// - En el limite inferior (justo valido)
/// - En el limite superior (justo valido)
/// - Fuera del limite inferior (justo invalido)
/// - Fuera del limite superior (justo invalido)
///
/// Value Objects cubiertos:
/// - PatientId: longitud [1..20], caracteres [a-zA-Z0-9.-]
/// - ConsultationType: longitud [2..100]
/// - Priority: enumeracion exacta {Low, Medium, High, Urgent}
/// - WaitingServiceId: no vacio
/// </summary>
public sealed class BoundaryValueAnalysisTests
{
    // ============================================================
    // PatientId — Fronteras de longitud: [1..20]
    // ============================================================

    [Fact]
    public void PatientId_LongitudMinima1_EsValido()
    {
        // BVA: Limite inferior exacto — 1 caracter
        var result = PatientId.Create("A");
        result.Value.Should().Be("A");
    }

    [Fact]
    public void PatientId_LongitudMaxima20_EsValido()
    {
        // BVA: Limite superior exacto — 20 caracteres
        var input = new string('A', 20);
        var result = PatientId.Create(input);
        result.Value.Should().Be(input);
    }

    [Fact]
    public void PatientId_LongitudMaximaMenos1_EsValido()
    {
        // BVA: Limite superior - 1 — 19 caracteres
        var input = new string('B', 19);
        var result = PatientId.Create(input);
        result.Value.Should().Be(input);
    }

    [Fact]
    public void PatientId_LongitudSuperior21_LanzaExcepcion()
    {
        // BVA: Fuera del limite superior — 21 caracteres
        var input = new string('C', 21);
        var act = () => PatientId.Create(input);
        act.Should().Throw<DomainException>()
            .WithMessage("*maximum length*20*");
    }

    [Fact]
    public void PatientId_CadenaVacia_LanzaExcepcion()
    {
        // BVA: Fuera del limite inferior — 0 caracteres (vacio)
        var act = () => PatientId.Create("");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void PatientId_SoloEspacios_LanzaExcepcion()
    {
        // BVA: Variante — solo whitespace equivale a vacio
        var act = () => PatientId.Create("   ");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void PatientId_Nulo_LanzaExcepcion()
    {
        // BVA: Fuera del limite inferior — null
        var act = () => PatientId.Create(null!);
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    // ============================================================
    // PatientId — Fronteras de caracteres validos
    // ============================================================

    [Theory]
    [InlineData("A")]          // Letra sola
    [InlineData("1")]          // Digito solo
    [InlineData("A-B")]        // Guion medio
    [InlineData("A.B")]        // Punto
    [InlineData("ABC-123.X")]  // Combinacion completa
    public void PatientId_CaracteresPermitidos_EsValido(string input)
    {
        // BVA: En el limite — todos los caracteres del conjunto permitido
        var result = PatientId.Create(input);
        result.Value.Should().Be(input.Trim().ToUpperInvariant());
    }

    [Theory]
    [InlineData("A@B")]   // Arroba
    [InlineData("A B")]   // Espacio interno
    [InlineData("A#B")]   // Hash
    [InlineData("A/B")]   // Barra
    [InlineData("A\\B")]  // Barra invertida
    [InlineData("A!B")]   // Exclamacion
    public void PatientId_CaracteresNoPermitidos_LanzaExcepcion(string input)
    {
        // BVA: Fuera del limite — caracteres fuera del patrón [a-zA-Z0-9.-]
        var act = () => PatientId.Create(input);
        act.Should().Throw<DomainException>()
            .WithMessage("*invalid characters*");
    }

    // ============================================================
    // ConsultationType — Fronteras de longitud: [2..100]
    // ============================================================

    [Fact]
    public void ConsultationType_LongitudMinima2_EsValido()
    {
        // BVA: Limite inferior exacto — 2 caracteres
        var result = ConsultationType.Create("AB");
        result.Value.Should().Be("AB");
    }

    [Fact]
    public void ConsultationType_LongitudMinimaMenos1_LanzaExcepcion()
    {
        // BVA: Fuera del limite inferior — 1 caracter
        var act = () => ConsultationType.Create("A");
        act.Should().Throw<DomainException>()
            .WithMessage("*between 2 and 100*");
    }

    [Fact]
    public void ConsultationType_LongitudMaxima100_EsValido()
    {
        // BVA: Limite superior exacto — 100 caracteres
        var input = new string('X', 100);
        var result = ConsultationType.Create(input);
        result.Value.Should().Be(input);
    }

    [Fact]
    public void ConsultationType_LongitudSuperior101_LanzaExcepcion()
    {
        // BVA: Fuera del limite superior — 101 caracteres
        var input = new string('Y', 101);
        var act = () => ConsultationType.Create(input);
        act.Should().Throw<DomainException>()
            .WithMessage("*between 2 and 100*");
    }

    [Fact]
    public void ConsultationType_Vacio_LanzaExcepcion()
    {
        // BVA: Fuera del limite inferior — vacio
        var act = () => ConsultationType.Create("");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void ConsultationType_LongitudMaximaMenos1_EsValido()
    {
        // BVA: Limite superior - 1 — 99 caracteres
        var input = new string('Z', 99);
        var result = ConsultationType.Create(input);
        result.Value.Should().Be(input);
    }

    // ============================================================
    // Priority — Fronteras (enumeración cerrada)
    // ============================================================

    [Theory]
    [InlineData("Low", "Low")]
    [InlineData("Medium", "Medium")]
    [InlineData("High", "High")]
    [InlineData("Urgent", "Urgent")]
    public void Priority_ValoresExactosValidos_RetornaCanonizado(
        string input, string expected)
    {
        // BVA: En el limite — cada valor valido exacto de la enumeracion
        var result = Priority.Create(input);
        result.Value.Should().Be(expected);
    }

    [Theory]
    [InlineData("low", "Low")]
    [InlineData("HIGH", "High")]
    [InlineData("uRgEnT", "Urgent")]
    [InlineData("  Medium  ", "Medium")]
    public void Priority_NormalizacionCaseInsensitive_RetornaCanonizado(
        string input, string expected)
    {
        // BVA: En el limite — variantes de case y whitespace
        var result = Priority.Create(input);
        result.Value.Should().Be(expected);
    }

    [Fact]
    public void Priority_Vacio_LanzaExcepcion()
    {
        // BVA: Fuera del limite — cadena vacia
        var act = () => Priority.Create("");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void Priority_ValorInexistente_LanzaExcepcion()
    {
        // BVA: Fuera del limite — valor no pertenece a la enumeracion
        var act = () => Priority.Create("Critical");
        act.Should().Throw<DomainException>()
            .WithMessage("*Invalid priority*");
    }

    // ============================================================
    // Priority — Niveles numericos (fronteras de comparación)
    // ============================================================

    [Fact]
    public void Priority_NivelMinimo_LowEs1()
    {
        // BVA: Limite inferior del nivel numerico
        Priority.Create("Low").Level.Should().Be(1);
    }

    [Fact]
    public void Priority_NivelMaximo_UrgentEs4()
    {
        // BVA: Limite superior del nivel numerico
        Priority.Create("Urgent").Level.Should().Be(4);
    }

    [Fact]
    public void Priority_OrdenDeNiveles_EsCorrectoAscendente()
    {
        // BVA: Verificar que los niveles mantienen orden estricto
        var low = Priority.Create("Low").Level;
        var medium = Priority.Create("Medium").Level;
        var high = Priority.Create("High").Level;
        var urgent = Priority.Create("Urgent").Level;

        low.Should().BeLessThan(medium);
        medium.Should().BeLessThan(high);
        high.Should().BeLessThan(urgent);
    }

    // ============================================================
    // WaitingServiceId — Fronteras
    // ============================================================

    [Fact]
    public void WaitingServiceId_Valido_RetornaValor()
    {
        // BVA: Limite inferior — 1 caracter
        var result = WaitingServiceId.Create("Q");
        result.Value.Should().Be("Q");
    }

    [Fact]
    public void WaitingServiceId_Vacio_LanzaExcepcion()
    {
        // BVA: Fuera del limite — vacio
        var act = () => WaitingServiceId.Create("");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void WaitingServiceId_Nulo_LanzaExcepcion()
    {
        // BVA: Fuera del limite — null
        var act = () => WaitingServiceId.Create(null!);
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void WaitingServiceId_ConEspacios_TrimeaCorrectamente()
    {
        // BVA: En el limite — whitespace que trim produce un valor valido
        var result = WaitingServiceId.Create("  QUEUE-001  ");
        result.Value.Should().Be("QUEUE-001");
    }
}
