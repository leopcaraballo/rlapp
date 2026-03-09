describe("AudioService", () => {
  class FakeAudio {
    src = "";
    volume = 1;
    preload = "";
    currentTime = 0;
    listeners: Record<string, () => void> = {};
    play = jest.fn().mockResolvedValue(undefined);
    pause = jest.fn();

    addEventListener(event: string, cb: () => void) {
      this.listeners[event] = cb;
    }

    trigger(event: string) {
      this.listeners[event]?.();
    }
  }

  let audioService: (typeof import("@/services/AudioService"))["audioService"];
  let instances: FakeAudio[];

  beforeEach(async () => {
    jest.resetModules();
    instances = [];
    (global as any).Audio = jest.fn((src?: string) => {
      const audio = new FakeAudio();
      audio.src = src ?? "";
      instances.push(audio);
      return audio;
    });
    ({ audioService } = await import("@/services/AudioService"));
  });

  it("initializes once and marks ready", () => {
    audioService.init("/sounds/test.mp3", 0.5);
    const instance = instances[0];

    instance.trigger("canplaythrough");

    expect(instance.src).toBe("/sounds/test.mp3");
    expect(instance.volume).toBe(0.5);
    audioService.init("/sounds/other.mp3", 1);
    expect((Audio as jest.Mock).mock.calls.length).toBe(1);
  });

  it("unlocks when play succeeds", async () => {
    audioService.init("/sounds/test.mp3");
    const instance = instances[0];
    instance.trigger("canplaythrough");

    await audioService.unlock();

    expect(instance.play).toHaveBeenCalled();
    expect(audioService.isEnabled()).toBe(true);
  });

  it("keeps disabled when unlock fails", async () => {
    audioService.init("/sounds/test.mp3");
    const instance = instances[0];
    instance.trigger("canplaythrough");
    instance.play.mockRejectedValueOnce(new Error("nope"));

    await audioService.unlock();

    expect(audioService.isEnabled()).toBe(false);
  });

  it("plays when enabled and ready", async () => {
    audioService.init("/sounds/test.mp3");
    const instance = instances[0];
    instance.trigger("canplaythrough");
    await audioService.unlock();

    audioService.play();

    expect(instance.play).toHaveBeenCalledTimes(2);
  });

  it("does nothing when not ready", () => {
    audioService.init("/sounds/test.mp3");
    const instance = instances[0];

    audioService.play();

    expect(instance.play).not.toHaveBeenCalled();
  });
});
