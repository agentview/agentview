import 'dotenv/config'
import { tool, Agent, run } from '@openai/agents';
import { z } from 'zod';



const agent = new Agent({
    name: 'Weather Assistant',
    model: 'gpt-5-mini',
    modelSettings: {
      reasoning: { effort: 'medium' }
    },
    instructions: 'You are a helpful general-purposeassistant. You have super skill of checking the weather for any location.',
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

const result = await run(agent, 'What is the weather in Tokyo?');

console.log(result.output)
console.log(result.finalOutput);