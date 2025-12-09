import 'dotenv/config'
import { Agent, run } from '@openai/agents';
import { z } from 'zod';

// const agent = new Agent({
//   name: 'Storyteller',
//   model: 'gpt-5-nano',
//   modelSettings: {
//     reasoning: { effort: 'high'}
//   },
//   instructions:
//     'You are a storyteller. You will be given a topic and you will tell a story about it.',
// });

// const result = await run(agent, 'Tell me a story about a cat.');

const refundAgent = new Agent({
  name: 'Refund Agent',
  instructions:
    'You are a refund agent. You are responsible for refunding customers.',
  outputType: z.object({
    refundApproved: z.boolean(),
  }),
});

const orderAgent = new Agent({
  name: 'Order Agent',
  instructions:
    'You are an order agent. You are responsible for processing orders.',
  outputType: z.object({
    orderId: z.string(),
  }),
});

const triageAgent = Agent.create({
  name: 'Triage Agent',
  instructions:
    'You are a triage agent. You are responsible for triaging customer issues.',
  handoffs: [refundAgent, orderAgent],
});

const result = await run(triageAgent, 'I need to a refund for my order');

// const output = result.finalOutput;

// console.log(result.finalOutput);
console.log(result.history)
console.log('last content',  result.history[result.history.length - 1].content);