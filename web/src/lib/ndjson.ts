/**
 * Reads a newline-delimited JSON stream: one JSON value per line. A network chunk
 * can end mid-line, so text is buffered until a full line has arrived.
 */
export async function* readNdjson<T>(body: ReadableStream<Uint8Array>, parse: (value: unknown) => T): AsyncIterable<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) yield parse(JSON.parse(line));
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) yield parse(JSON.parse(buffer.trim()));
  } finally {
    reader.releaseLock();
  }
}
