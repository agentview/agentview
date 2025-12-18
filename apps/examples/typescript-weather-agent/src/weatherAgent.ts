import { Agent, tool } from '@openai/agents';
import { z } from 'zod';

export const weatherAgent = (options?: { userLocation: string }) => new Agent({
  name: 'Weather Assistant',
  model: 'gpt-5-mini',
  modelSettings: {
    reasoning: { effort: 'medium', summary: 'auto' }
  },
  instructions: `You are a helpful general-purpose assistant. You have super skill of checking the weather for any location. The user is currently at location: ${options?.userLocation ?? "Unknown"}.`,
  tools: [
    tool({
      name: 'weather_tool',
      description: 'Get weather information for a location using wttr.in',
      parameters: z.object({
        location: z.string().describe('The city name to get weather for'),
      }),
      execute: async ({ location }) => {
        const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j2`);
        if (!response.ok) {
          return { error: 'Failed to fetch weather data' };
        }
        return await response.json();
      },
    })
  ],
});