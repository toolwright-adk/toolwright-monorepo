import { describe, it, expect } from "vitest";
import { Writable } from "node:stream";
import { createLogger } from "../logger.js";

function createCapture() {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      const str = chunk.toString().trim();
      if (str) lines.push(JSON.parse(str));
      callback();
    },
  });
  return { lines, destination };
}

describe("logger", () => {
  it("returns a logger with standard methods", () => {
    const logger = createLogger("test");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.child).toBe("function");
  });

  it("defaults to info level", () => {
    const logger = createLogger("test");
    expect(logger.level).toBe("info");
  });

  it("respects custom level", () => {
    const logger = createLogger("test", { level: "debug" });
    expect(logger.level).toBe("debug");
  });

  it("outputs JSON with server and msg fields", () => {
    const { lines, destination } = createCapture();
    const logger = createLogger("my-server", { destination });
    logger.info("hello");

    expect(lines.length).toBe(1);
    expect(lines[0]).toHaveProperty("server", "my-server");
    expect(lines[0]).toHaveProperty("msg", "hello");
  });

  it("includes ISO timestamp", () => {
    const { lines, destination } = createCapture();
    const logger = createLogger("ts-test", { destination });
    logger.info("stamp");

    expect(lines[0]).toHaveProperty("time");
    expect(typeof lines[0].time).toBe("string");
    expect((lines[0].time as string).includes("T")).toBe(true);
  });

  it("child() adds bound fields", () => {
    const { lines, destination } = createCapture();
    const logger = createLogger("parent", { destination });
    const child = logger.child({ tool: "search", requestId: "req-1" });
    child.info("child log");

    expect(lines[0]).toHaveProperty("server", "parent");
    expect(lines[0]).toHaveProperty("tool", "search");
    expect(lines[0]).toHaveProperty("requestId", "req-1");
    expect(lines[0]).toHaveProperty("msg", "child log");
  });
});
