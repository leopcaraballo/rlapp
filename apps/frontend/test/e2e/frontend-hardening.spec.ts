import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

type Role = "patient" | "reception" | "cashier" | "doctor" | "admin";

function buildSession(role: Role, expOffsetMinutes: number) {
  return {
    token: `e2e-${role}`,
    role,
    exp: Date.now() + expOffsetMinutes * 60_000,
  };
}

async function setSession(page: Page, role: Role, expOffsetMinutes = 120) {
  const session = buildSession(role, expOffsetMinutes);
  await page.addInitScript((value) => {
    window.localStorage.setItem("rlapp_auth", JSON.stringify(value));
  }, session);
}

async function mockWaitingRoomReads(page: Page, queueId = "QUEUE-01") {
  await page.route("**/api/v1/waiting-room/**/monitor", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        queueId,
        totalPatientsWaiting: 1,
        highPriorityCount: 0,
        normalPriorityCount: 1,
        lowPriorityCount: 0,
        averageWaitTimeMinutes: 3,
        utilizationPercentage: 10,
        lastPatientCheckedInAt: new Date().toISOString(),
        projectedAt: new Date().toISOString(),
      }),
    });
  });

  await page.route("**/api/v1/waiting-room/**/queue-state", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        queueId,
        currentCount: 1,
        maxCapacity: 50,
        isAtCapacity: false,
        availableSpots: 49,
        patientsInQueue: [
          {
            patientId: "p-1",
            patientName: "Paciente Uno",
            priority: "Medium",
            checkInTime: new Date(Date.now() - 60_000).toISOString(),
            waitTimeMinutes: 1,
          },
        ],
        projectedAt: new Date().toISOString(),
      }),
    });
  });

  await page.route("**/api/v1/waiting-room/**/next-turn", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "NotFound", message: "No active turn" }),
    });
  });

  await page.route(
    "**/api/v1/waiting-room/**/recent-history**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    },
  );
}

test.describe("Frontend hardening y alineacion backend", () => {
  test("Paciente autenticado solo visualiza pantalla de espera", async ({
    page,
  }) => {
    await mockWaitingRoomReads(page);
    await page.goto("/login");
    await page.selectOption("#role", "patient");
    await page.fill("#idCard", "12345678");
    await page.click('button:has-text("Ingresar")');

    await expect(page).toHaveURL(/\/display\/QUEUE-01$/);
    await expect(page.getByText("Sala de Espera")).toBeVisible();
    await expect(page.getByText("Recepción")).toHaveCount(0);
  });

  test("Paciente no puede acceder a rutas administrativas por URL", async ({
    page,
  }) => {
    await setSession(page, "patient");
    await mockWaitingRoomReads(page);

    await page.goto("/consulting-rooms");
    await expect(page).toHaveURL(/\/display\/QUEUE-01$/);
  });

  test("Recepcion registra paciente y usa queueId retornado por backend", async ({
    page,
  }) => {
    await setSession(page, "reception");
    await mockWaitingRoomReads(page, "QUEUE-BE-01");

    await page.route("**/api/reception/register", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "ok",
          correlationId: "corr-1",
          eventCount: 2,
          queueId: "QUEUE-BE-01",
        }),
      });
    });

    await page.goto("/reception");
    await page.fill("#patientId", "PAT-E2E-01");
    await page.fill("#patientName", "Paciente E2E");
    await page.click('button:has-text("Registrar check-in")');

    await expect(page).toHaveURL(/\/waiting-room\/QUEUE-BE-01$/);
  });

  test("Caja ejecuta llamada y UI se actualiza segun backend", async ({
    page,
  }) => {
    await setSession(page, "cashier");

    let queueReads = 0;

    await page.route("**/api/v1/waiting-room/**/monitor", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          queueId: "QUEUE-01",
          totalPatientsWaiting: queueReads === 0 ? 1 : 0,
          highPriorityCount: 0,
          normalPriorityCount: queueReads === 0 ? 1 : 0,
          lowPriorityCount: 0,
          averageWaitTimeMinutes: 3,
          utilizationPercentage: 10,
          lastPatientCheckedInAt: new Date().toISOString(),
          projectedAt: new Date().toISOString(),
        }),
      });
    });

    await page.route("**/api/v1/waiting-room/**/queue-state", async (route) => {
      queueReads += 1;
      const hasPatient = queueReads <= 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          queueId: "QUEUE-01",
          currentCount: hasPatient ? 1 : 0,
          maxCapacity: 50,
          isAtCapacity: false,
          availableSpots: hasPatient ? 49 : 50,
          patientsInQueue: hasPatient
            ? [
                {
                  patientId: "p-1",
                  patientName: "Paciente Uno",
                  priority: "Medium",
                  checkInTime: new Date(Date.now() - 60_000).toISOString(),
                  waitTimeMinutes: 1,
                },
              ]
            : [],
          projectedAt: new Date().toISOString(),
        }),
      });
    });

    await page.route("**/api/v1/waiting-room/**/next-turn", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "NotFound" }),
      });
    });

    await page.route(
      "**/api/v1/waiting-room/**/recent-history**",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      },
    );

    await page.route("**/api/cashier/call-next", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "ok",
          correlationId: "corr-2",
          eventCount: 1,
        }),
      });
    });

    await page.goto("/cashier");
    await page.click('button:has-text("Llamar siguiente")');
    await expect(page.getByText("No hay pacientes en la cola.")).toBeVisible();
  });

  test("Medico inicia consulta y envia comando al backend", async ({
    page,
  }) => {
    await setSession(page, "doctor");
    await mockWaitingRoomReads(page);

    await page.route("**/api/medical/start-consultation", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "ok",
          correlationId: "corr-3",
          eventCount: 1,
        }),
      });
    });

    await page.goto("/medical");
    await page.selectOption("#stationId", "CONS-01");
    await page.fill("#patientId", "p-123");

    const requestPromise = page.waitForRequest(
      "**/api/medical/start-consultation",
    );
    await page.click('button:has-text("Iniciar consulta")');
    const request = await requestPromise;

    expect(request.method()).toBe("POST");
    expect(request.postData() ?? "").toContain("p-123");
  });

  test("Transicion invalida muestra error controlado", async ({ page }) => {
    await setSession(page, "doctor");
    await mockWaitingRoomReads(page);

    await page.route("**/api/medical/finish-consultation", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "DomainViolation",
          message: "Invalid state transition for complete-attention",
        }),
      });
    });

    await page.goto("/medical");
    await page.selectOption("#stationId", "CONS-01");
    await page.fill("#patientId", "p-123");
    await page.click('button:has-text("Finalizar consulta")');

    await expect(
      page.getByText(
        "No fue posible completar la operacion por conflicto de estado. Actualice la vista e intente nuevamente.",
      ),
    ).toBeVisible();
  });

  test("Sesion expirada redirige a login", async ({ page }) => {
    await setSession(page, "cashier", -1);
    await page.goto("/cashier");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Error 500 del backend se muestra sin romper UI", async ({ page }) => {
    await setSession(page, "reception");
    await mockWaitingRoomReads(page);

    await page.route("**/api/reception/register", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "InternalServerError",
          message: "An unexpected error occurred",
        }),
      });
    });

    await page.goto("/reception");
    await page.fill("#patientId", "PAT-ERR-01");
    await page.fill("#patientName", "Paciente Error");
    await page.click('button:has-text("Registrar check-in")');

    await expect(
      page.getByText(
        "Se produjo un error interno del servidor. Intente nuevamente en unos minutos.",
      ),
    ).toBeVisible();
  });
});
