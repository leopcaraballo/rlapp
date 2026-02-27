import "@testing-library/jest-dom";
import "cross-fetch/polyfill";
import { TextDecoder, TextEncoder } from "util";
import { ReadableStream, TransformStream, WritableStream } from "stream/web";
import { EventEmitter } from "events";

if (!globalThis.TextEncoder) {
	(globalThis as typeof globalThis & { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
}

if (!globalThis.TextDecoder) {
	(globalThis as typeof globalThis & { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;
}

if (!globalThis.TransformStream) {
	(globalThis as typeof globalThis & { TransformStream: typeof TransformStream }).TransformStream = TransformStream;
}

if (!globalThis.WritableStream) {
	(globalThis as typeof globalThis & { WritableStream: typeof WritableStream }).WritableStream = WritableStream;
}

if (!globalThis.ReadableStream) {
	(globalThis as typeof globalThis & { ReadableStream: typeof ReadableStream }).ReadableStream = ReadableStream;
}

if (!globalThis.BroadcastChannel) {
	const channelBus = new Map<string, EventEmitter>();

	class NodeBroadcastChannel {
		name: string;
		private emitter: EventEmitter;

		constructor(name: string) {
			this.name = name;
			const existing = channelBus.get(name);
			if (existing) {
				this.emitter = existing;
			} else {
				this.emitter = new EventEmitter();
				channelBus.set(name, this.emitter);
			}
		}

		postMessage(message: unknown) {
			this.emitter.emit("message", { data: message });
		}

		addEventListener(event: "message", listener: (event: { data: unknown }) => void) {
			this.emitter.addListener(event, listener);
		}

		removeEventListener(event: "message", listener: (event: { data: unknown }) => void) {
			this.emitter.removeListener(event, listener);
		}

		close() {
			this.emitter.removeAllListeners();
		}
	}

	(globalThis as typeof globalThis & { BroadcastChannel: typeof NodeBroadcastChannel }).BroadcastChannel = NodeBroadcastChannel;
}

const { server }: { server: import("msw/node").SetupServerApi } = require("@test/mocks/server");

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
