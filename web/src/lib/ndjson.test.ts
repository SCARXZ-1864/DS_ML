import { describe, expect, it } from "vitest";
import { readNdjson } from "./ndjson";

function streamOf(...parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      parts.forEach((p) => controller.enqueue(encoder.encode(p)));
      controller.close();
    },
  });
}

async function collect<T>(it: AsyncIterable<T>) {
  const out: T[] = [];
  for await (const v of it) out.push(v);
  return out;
}

describe("readNdjson", () => {
  it("reassembles lines split across network chunks", async () => {
    expect(await collect(readNdjson(streamOf('{"a":', "1}\n", '{"a":2}\n'), (v) => v))).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("reads a final line without a trailing newline and skips blank lines", async () => {
    expect(await collect(readNdjson(streamOf('{"a":1}\n\n{"a":2}'), (v) => v))).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("throws on a line that isn't JSON", async () => {
    await expect(collect(readNdjson(streamOf("oops\n"), (v) => v))).rejects.toThrow();
  });
});
