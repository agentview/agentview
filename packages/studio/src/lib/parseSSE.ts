
export async function* parseSSE(response: Response) {
    if (!response.body) throw new Error('No response body for SSE');
    if (!response.ok) throw new Error('Response not ok');
    
    const reader = response.body.getReader();
    let buffer = '';
    let done = false;
  
    // Helper to parse SSE events as an async generator
    async function* parseSSE(chunk: string) {
      const eventStrings = chunk.split("\n\n");
  
      for (const eventStr of eventStrings) {
        let eventType: string | undefined = undefined;
        let data : string = '';
  
        for (const line of eventStr.split('\n')) {
          // Skip SSE comments (lines starting with ':')
          if (line.startsWith(':')) {
            continue;
          }
          else if (line.startsWith('event:')) {
            eventType = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            data += line.replace('data:', '').trim();
          } else {
            console.warn('Unknown SSE line', line)
          }
        }
  
        if (eventType && data !== '') {
          yield { event: eventType, data: JSON.parse(data) };
          if (eventType === 'end') {
            done = true;
          }
        }
      }
    }
  
    while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += new TextDecoder().decode(value);
        let lastEventIdx = buffer.lastIndexOf('\n\n');
        if (lastEventIdx !== -1) {
            const eventsChunk = buffer.slice(0, lastEventIdx);
            for await (const event of parseSSE(eventsChunk)) {
            yield event;
            }
            buffer = buffer.slice(lastEventIdx + 2);
        }
    }
  }
