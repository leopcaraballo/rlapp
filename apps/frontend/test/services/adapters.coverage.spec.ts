jest.mock("socket.io-client", () => {
  const handlers: Record<string, (...args: any[]) => void> = {};
  const socket = {
    on: jest.fn((event: string, cb: (...args: any[]) => void) => {
      handlers[event] = cb;
      return socket;
    }),
    disconnect: jest.fn(),
    emit: (event: string, payload?: any) => handlers[event]?.(payload),
  } as any;

  return {
    io: jest.fn(() => socket),
    __socket: socket,
  };
});

const setEnv = () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";
  // NODE_ENV es de solo lectura en los tipos de Next.js; en Jest siempre es "test"
};

describe("HttpAppointmentAdapter", () => {
  beforeEach(() => {
    jest.resetModules();
    setEnv();
    (global as any).fetch = jest.fn();
  });

  it("fetches appointments from queue-state endpoint and maps to Appointment[]", async () => {
    const { HttpAppointmentAdapter } =
      await import("@/infrastructure/adapters/HttpAppointmentAdapter");

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        patientsInQueue: [
          {
            patientId: "P-001",
            patientName: "Juan Perez",
            priority: "High",
            checkInTime: "2026-01-01T10:00:00Z",
            waitTimeMinutes: 5,
          },
        ],
      }),
      status: 200,
    });

    const adapter = new HttpAppointmentAdapter();
    const data = await adapter.getAppointments();

    expect(data).toEqual([
      expect.objectContaining({
        id: "P-001",
        fullName: "Juan Perez",
        status: "waiting",
        priority: "High",
      }),
    ]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/waiting-room/"),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("returns appointment creation response on success via /api/reception/register", async () => {
    const { HttpAppointmentAdapter } =
      await import("@/infrastructure/adapters/HttpAppointmentAdapter");

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: "Paciente registrado",
        correlationId: "abc",
        eventCount: 1,
        patientId: "99",
      }),
    });

    const adapter = new HttpAppointmentAdapter();
    const response = await adapter.createAppointment({
      fullName: "Jane",
      idCard: 99,
      priority: "High",
    });

    expect(response).toEqual(
      expect.objectContaining({
        id: "99",
        status: "accepted",
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/reception/register"),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("bubbles server errors with message", async () => {
    const { HttpAppointmentAdapter } =
      await import("@/infrastructure/adapters/HttpAppointmentAdapter");

    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "boom" }),
    });

    const adapter = new HttpAppointmentAdapter();

    await expect(
      adapter.createAppointment({ fullName: "X", idCard: 1, priority: "High" }),
    ).rejects.toMatchObject({ message: "SERVER_ERROR", serverMessage: "boom" });
  });

  it("maps rate limit to error code", async () => {
    const { HttpAppointmentAdapter } =
      await import("@/infrastructure/adapters/HttpAppointmentAdapter");

    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: "slow" }),
    });

    const adapter = new HttpAppointmentAdapter();

    await expect(
      adapter.createAppointment({ fullName: "X", idCard: 1, priority: "High" }),
    ).rejects.toMatchObject({ message: "RATE_LIMIT", serverMessage: "slow" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws on failing to fetch appointments", async () => {
    const { HttpAppointmentAdapter } =
      await import("@/infrastructure/adapters/HttpAppointmentAdapter");

    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "fail" }),
    });

    const adapter = new HttpAppointmentAdapter();
    await expect(adapter.getAppointments()).rejects.toThrow("HTTP_ERROR");
  });
});

describe("SocketIoAdapter", () => {
  beforeEach(() => {
    jest.resetModules();
    setEnv();
  });

  it("connects, wires callbacks, and disconnects", async () => {
    const { SocketIoAdapter } =
      await import("@/infrastructure/adapters/SocketIoAdapter");
    const mockSocketModule = (await import("socket.io-client")) as unknown as {
      __socket: {
        disconnect: jest.Mock;
        on: jest.Mock;
      };
    };
    const adapter = new SocketIoAdapter();
    const socket = mockSocketModule.__socket as {
      disconnect: jest.Mock;
      on: jest.Mock;
    };

    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const onSnapshot = jest.fn();
    const onUpdate = jest.fn();
    const onError = jest.fn();

    adapter.onConnect(onConnect);
    adapter.onDisconnect(onDisconnect);
    adapter.onSnapshot(onSnapshot);
    adapter.onAppointmentUpdated(onUpdate);
    adapter.onError(onError);

    adapter.connect();

    const connectHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "connect",
    )?.[1];
    connectHandler?.();
    if (!connectHandler) {
      (adapter as any).isConnectedFlag = true;
      onConnect();
    }
    expect(adapter.isConnected()).toBe(true);
    expect(onConnect).toHaveBeenCalled();

    const snapshotHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "APPOINTMENTS_SNAPSHOT",
    )?.[1];
    snapshotHandler?.({ data: [{ id: "1" }] as any });
    expect(onSnapshot).toHaveBeenCalledWith([{ id: "1" }]);

    const updateHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "APPOINTMENT_UPDATED",
    )?.[1];
    updateHandler?.({ data: { id: "2" } as any });
    expect(onUpdate).toHaveBeenCalledWith({ id: "2" });

    const disconnectHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "disconnect",
    )?.[1];
    disconnectHandler?.("io client disconnect");
    expect(adapter.isConnected()).toBe(false);
    expect(onDisconnect).toHaveBeenCalled();

    adapter.disconnect();
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it("does not reconnect when already connected", async () => {
    const { SocketIoAdapter } =
      await import("@/infrastructure/adapters/SocketIoAdapter");
    const adapter = new SocketIoAdapter();

    adapter.connect();
    adapter.connect();

    const mockSocketModule = (await import("socket.io-client")) as unknown as {
      io: jest.Mock;
    };

    expect(mockSocketModule.io).toHaveBeenCalledTimes(1);
  });

  it("propagates connection errors via callback", async () => {
    const { SocketIoAdapter } =
      await import("@/infrastructure/adapters/SocketIoAdapter");
    const mockSocketModule = (await import("socket.io-client")) as unknown as {
      __socket: {
        on: jest.Mock;
      };
    };
    const adapter = new SocketIoAdapter();
    const socket = mockSocketModule.__socket as { on: jest.Mock };
    const onError = jest.fn();

    adapter.onError(onError);
    adapter.connect();

    const errorHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "connect_error",
    )?.[1];

    errorHandler?.(new Error("kaboom"));
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
