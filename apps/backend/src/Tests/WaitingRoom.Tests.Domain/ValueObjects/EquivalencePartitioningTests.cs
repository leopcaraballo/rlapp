namespace WaitingRoom.Tests.Domain.ValueObjects;

using FluentAssertions;
using WaitingRoom.Domain.Exceptions;
using WaitingRoom.Domain.ValueObjects;
using Xunit;

/// <summary>
/// Pruebas de Particion de Equivalencia (EP) para los Value Objects del dominio.
///
/// Tecnica: Se divide el dominio de entrada en clases de equivalencia,
/// y se selecciona un representante de cada clase para verificar el comportamiento.
///
/// Clases documentadas:
///
/// C1. PatientId — Clases de equivalencia:
///   EP-P1: Valido alfanumerico puro (ej: "12345")
///   EP-P2: Valido con guiones (ej: "PAT-001")
///   EP-P3: Valido con puntos (ej: "PAT.001")
///   EP-P4: Invalido vacio/null
///   EP-P5: Invalido caracteres especiales (ej: "@#$")
///   EP-P6: Invalido excede longitud maxima
///   EP-P7: Valido con normalizacion case (ej: "pat-001" → "PAT-001")
///
/// C2. Priority — Clases de equivalencia:
///   EP-PR1: Valido Low
///   EP-PR2: Valido Medium
///   EP-PR3: Valido High
///   EP-PR4: Valido Urgent
///   EP-PR5: Invalido valor fuera de la enumeracion
///   EP-PR6: Invalido vacio/null
///   EP-PR7: Valido case-insensitive
///
/// C3. ConsultationType — Clases de equivalencia:
///   EP-CT1: Valido tipo predefinido (ej: "General")
///   EP-CT2: Valido tipo personalizado dentro de rango (ej: "Dermatology")
///   EP-CT3: Invalido vacio
///   EP-CT4: Invalido por debajo de longitud minima
///   EP-CT5: Invalido por encima de longitud maxima
///
/// C4. WaitingServiceId — Clases de equivalencia:
///   EP-QI1: Valido con formato tipico
///   EP-QI2: Invalido vacio/null
///   EP-QI3: Valido con whitespace (se triemea)
/// </summary>
public sealed class EquivalencePartitioningTests
{
    // ============================================================
    // EP — PatientId
    // ============================================================

    [Fact]
    public void EP_P1_PatientId_AlfanumericoPuro_EsValido()
    {
        // Clase EP-P1: Cadena alfanumerica sin separadores
        var result = PatientId.Create("12345678");
        result.Value.Should().Be("12345678");
    }

    [Fact]
    public void EP_P2_PatientId_ConGuiones_EsValido()
    {
        // Clase EP-P2: Cadena con guiones como separadores
        var result = PatientId.Create("PAT-001-A");
        result.Value.Should().Be("PAT-001-A");
    }

    [Fact]
    public void EP_P3_PatientId_ConPuntos_EsValido()
    {
        // Clase EP-P3: Cadena con puntos como separadores
        var result = PatientId.Create("PAT.001.B");
        result.Value.Should().Be("PAT.001.B");
    }

    [Fact]
    public void EP_P4_PatientId_Nulo_LanzaExcepcion()
    {
        // Clase EP-P4: Entrada nula
        var act = () => PatientId.Create(null!);
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void EP_P4_PatientId_Vacio_LanzaExcepcion()
    {
        // Clase EP-P4: Entrada vacia
        var act = () => PatientId.Create("");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void EP_P5_PatientId_CaracteresEspeciales_LanzaExcepcion()
    {
        // Clase EP-P5: Caracteres fuera del conjunto permitido
        var act = () => PatientId.Create("PAT@001#$");
        act.Should().Throw<DomainException>()
            .WithMessage("*invalid characters*");
    }

    [Fact]
    public void EP_P6_PatientId_ExcedeLongitud_LanzaExcepcion()
    {
        // Clase EP-P6: Longitud mayor a MaxLength(20)
        var tooLong = new string('A', 25);
        var act = () => PatientId.Create(tooLong);
        act.Should().Throw<DomainException>()
            .WithMessage("*maximum length*20*");
    }

    [Fact]
    public void EP_P7_PatientId_NormalizacionCase_ConvierteMayusculas()
    {
        // Clase EP-P7: Entrada minusculas se normaliza a UPPERCASE
        var result = PatientId.Create("pat-abc");
        result.Value.Should().Be("PAT-ABC");
    }

    [Fact]
    public void EP_P7_PatientId_NormalizacionWhitespace_Trimea()
    {
        // Clase EP-P7 variante: Whitespace se elimina
        var result = PatientId.Create("  PAT-001  ");
        result.Value.Should().Be("PAT-001");
    }

    // ============================================================
    // EP — Priority
    // ============================================================

    [Fact]
    public void EP_PR1_Priority_Low_EsValido()
    {
        // Clase EP-PR1: Valor Low representante de prioridad baja
        var result = Priority.Create("Low");
        result.Value.Should().Be("Low");
        result.Level.Should().Be(1);
    }

    [Fact]
    public void EP_PR2_Priority_Medium_EsValido()
    {
        // Clase EP-PR2: Valor Medium representante de prioridad media
        var result = Priority.Create("Medium");
        result.Value.Should().Be("Medium");
        result.Level.Should().Be(2);
    }

    [Fact]
    public void EP_PR3_Priority_High_EsValido()
    {
        // Clase EP-PR3: Valor High representante de prioridad alta
        var result = Priority.Create("High");
        result.Value.Should().Be("High");
        result.Level.Should().Be(3);
    }

    [Fact]
    public void EP_PR4_Priority_Urgent_EsValido()
    {
        // Clase EP-PR4: Valor Urgent representante de maxima prioridad
        var result = Priority.Create("Urgent");
        result.Value.Should().Be("Urgent");
        result.Level.Should().Be(4);
    }

    [Fact]
    public void EP_PR5_Priority_ValorInexistente_LanzaExcepcion()
    {
        // Clase EP-PR5: Valor no perteneciente a la enumeracion valida
        var act = () => Priority.Create("VeryHigh");
        act.Should().Throw<DomainException>()
            .WithMessage("*Invalid priority*");
    }

    [Theory]
    [InlineData("Normal")]
    [InlineData("Emergency")]
    [InlineData("Critical")]
    [InlineData("1")]
    [InlineData("none")]
    public void EP_PR5_Priority_MultiplesValoresInvalidos_LanzaExcepcion(
        string invalidPriority)
    {
        // Clase EP-PR5: Diversos representantes fuera de la enumeracion
        var act = () => Priority.Create(invalidPriority);
        act.Should().Throw<DomainException>()
            .WithMessage("*Invalid priority*");
    }

    [Fact]
    public void EP_PR6_Priority_Vacio_LanzaExcepcion()
    {
        // Clase EP-PR6: Cadena vacia
        var act = () => Priority.Create("");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void EP_PR6_Priority_SoloWhitespace_LanzaExcepcion()
    {
        // Clase EP-PR6: Solo espacios en blanco
        var act = () => Priority.Create("   ");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Theory]
    [InlineData("low", "Low")]
    [InlineData("MEDIUM", "Medium")]
    [InlineData("hIgH", "High")]
    [InlineData("urgent", "Urgent")]
    public void EP_PR7_Priority_CaseInsensitive_NormalizaCorrectamente(
        string input, string expected)
    {
        // Clase EP-PR7: Diversos formatos de case producen el canónico
        var result = Priority.Create(input);
        result.Value.Should().Be(expected);
    }

    // ============================================================
    // EP — ConsultationType
    // ============================================================

    [Theory]
    [InlineData("General")]
    [InlineData("Cardiology")]
    [InlineData("Oncology")]
    [InlineData("Pediatrics")]
    [InlineData("Surgery")]
    public void EP_CT1_ConsultationType_TiposPredefinidos_SonValidos(string type)
    {
        // Clase EP-CT1: Tipos de consulta predefinidos del dominio
        var result = ConsultationType.Create(type);
        result.Value.Should().Be(type);
    }

    [Theory]
    [InlineData("Dermatology")]
    [InlineData("Neurology")]
    [InlineData("Traumatology")]
    [InlineData("Ophthalmology")]
    public void EP_CT2_ConsultationType_TiposPersonalizados_SonValidos(string type)
    {
        // Clase EP-CT2: Tipos de consulta personalizados dentro del rango de longitud
        var result = ConsultationType.Create(type);
        result.Value.Should().Be(type);
    }

    [Fact]
    public void EP_CT3_ConsultationType_Vacio_LanzaExcepcion()
    {
        // Clase EP-CT3: Cadena vacia
        var act = () => ConsultationType.Create("");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void EP_CT4_ConsultationType_UnCaracter_LanzaExcepcion()
    {
        // Clase EP-CT4: Por debajo de la longitud minima (2)
        var act = () => ConsultationType.Create("X");
        act.Should().Throw<DomainException>()
            .WithMessage("*between 2 and 100*");
    }

    [Fact]
    public void EP_CT5_ConsultationType_ExcedeLongitud_LanzaExcepcion()
    {
        // Clase EP-CT5: Por encima de la longitud maxima (100)
        var input = new string('A', 150);
        var act = () => ConsultationType.Create(input);
        act.Should().Throw<DomainException>()
            .WithMessage("*between 2 and 100*");
    }

    // ============================================================
    // EP — WaitingServiceId
    // ============================================================

    [Fact]
    public void EP_QI1_WaitingServiceId_FormatoTipico_EsValido()
    {
        // Clase EP-QI1: Formato UUID o identificador tipico
        var result = WaitingServiceId.Create("QUEUE-MAIN-001");
        result.Value.Should().Be("QUEUE-MAIN-001");
    }

    [Fact]
    public void EP_QI2_WaitingServiceId_Vacio_LanzaExcepcion()
    {
        // Clase EP-QI2: Cadena vacia
        var act = () => WaitingServiceId.Create("");
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void EP_QI2_WaitingServiceId_Nulo_LanzaExcepcion()
    {
        // Clase EP-QI2: Valor nulo
        var act = () => WaitingServiceId.Create(null!);
        act.Should().Throw<DomainException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void EP_QI3_WaitingServiceId_ConWhitespace_Trimea()
    {
        // Clase EP-QI3: Whitespace se elimina, valor interno es valido
        var result = WaitingServiceId.Create("  QUEUE-001  ");
        result.Value.Should().Be("QUEUE-001");
    }
}
