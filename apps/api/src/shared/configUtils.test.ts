import { describe, it, expect } from 'vitest'
import { z } from 'zod';
import { type BaseAgentConfig, type BaseRunConfig, type BaseSessionItemConfig } from './configTypes';
import { findItemAndRunConfig, findItemConfig } from './configUtils';
import type { Session } from './apiTypes';

// those types here add $id on the session item config level, also tests whether our functions properly infers types :) 
type SessionItemConfig = BaseSessionItemConfig & {
    $id: string;
}
type RunConfig = BaseRunConfig<SessionItemConfig, SessionItemConfig>
type AgentConfig = BaseAgentConfig<RunConfig>


let sessionItemIdCounter = 1;

function createSessionItem(content: any) {
    return {
        id: `${sessionItemIdCounter++}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content,
        runId: "default_run_id",
        sessionId: "default_session_id",
    }
}

function replace$Id(schema: any, value: any) {
    const result = {...schema}
    for (const key in result) {
        if (result[key] == "$id") {
            result[key] = value
        }
    }
    return result;
}

// we added special '$id' property for the sake of assertions
function functionCall($id: string, fields1: any = {}, fields2: any = {}) {

    return {
        definition: {
            $id: `${$id}_call`,
            schema: replace$Id({
                type: "function_call",
                ...fields1,
            }, z.string().meta({ callId: true })),
            callResult: {
                $id: `${$id}_result`,
                schema: replace$Id({
                    type: "function_call_result",
                    ...fields2
                }, z.string().meta({ callId: true }))
            }
        },
        generate: () => {
            const randomId = 'call_' + Math.random().toString(36).substring(2, 7);

            const call = replace$Id({
                type: "function_call",
                arguments: { a: 1, b: 2 },
                ...fields1,
            }, randomId)

            const result = replace$Id({
                type: "function_call_result",
                output: { c: 3 },
                ...fields2,
            }, randomId)

            return {
                call: createSessionItem(call),
                result: createSessionItem(result),
            }
        }
    }
}

function createAgent(steps: any[]): AgentConfig {
    return {
        name: 'test',
        url: 'http://test.com',
        runs: [
            {
                input: {
                    $id: "input",
                    schema: {
                        type: "message",
                        role: "user",
                        content: z.string(),
                    }
                },
                output: {
                    $id: "output",
                    schema: {
                        type: "message",
                        role: "user",
                        content: z.string(),
                    }
                },
                steps: [
                    {
                        schema: {
                            type: "reasoning",
                        }
                    },
                    ...steps
                ]
            }
        ]
    }
}

function createSession(items: any[]): Session {
    return {
        id: '1',
        handle: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
        agent: 'test',
        endUser: {
            id: '1',
            externalId: 'xxx',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            simulatedBy: null,
            isShared: false,
        },
        endUserId: 'xxx',
        runs: [
            {
                id: "run1",
                createdAt: new Date().toISOString(),
                finishedAt: null,
                status: "completed",
                failReason: null,
                version: null,
                metadata: null,
                items,
                sessionId: "1",
                versionId: null,
            }
        ],
    }
}

const reasoning = () => {
    return createSessionItem({
        type: "reasoning",
        content: "thinking..."
    })
}

describe('agent with 2 function calls / call ids not set up', () => {
    const functionCall1 = functionCall("function1", { name: "function1" }, { });
    const functionCall2 = functionCall("function2", { name: "function2" }, { });

    const agent = createAgent([
        functionCall1.definition,
        functionCall2.definition,
    ])

    describe('session with 2 consecutive synchronous function calls', () => {
        const call1 = functionCall1.generate();
        const call2 = functionCall2.generate();

        const session: Session = createSession([
            reasoning(),
            call1.call,
            call1.result,
            reasoning(),
            call2.call,
            call2.result,
            reasoning()
        ])

        it('finds call items', () => {
            expect(findItemConfig(agent, session, call1.call.id)?.$id).toBe(`function1_call`);
            expect(findItemConfig(agent, session, call2.call.id)?.$id).toBe(`function2_call`);
        })

        it('can\'t find call results', () => {
            expect(findItemConfig(agent, session, "xxx")).toBeUndefined();
            expect(findItemConfig(agent, session, call1.result.id)).toBeUndefined();
            expect(findItemConfig(agent, session, call2.result.id)).toBeUndefined();
        });
    })

    describe('a lot of paralell calls', () => {
        const fun1_call1 = functionCall1.generate();
        const fun1_call2 = functionCall1.generate();
        const fun1_call3 = functionCall1.generate();
        const fun1_call4 = functionCall1.generate();

        const fun2_call1 = functionCall2.generate();
        const fun2_call2 = functionCall2.generate();
        const fun2_call3 = functionCall2.generate();
        const fun2_call4 = functionCall2.generate();

        const session: Session = createSession([

            reasoning(),

            fun1_call1.call,
            fun1_call2.call,
            fun2_call2.call,
            fun2_call1.call,
            
            fun2_call2.result,
            // fun1_call1.result,
            fun1_call2.result,
            fun2_call1.result,

            reasoning(),

            fun1_call3.call,
            fun2_call4.call,
            fun2_call3.call,
            fun1_call4.call,

            fun1_call3.result,
            fun1_call4.result,
            fun2_call3.result,
            // fun2_call4.result,

            reasoning(),
        ])

        it("properly finds calls", () => {
            expect(findItemConfig(agent, session, fun1_call1.call.id)?.$id).toBe('function1_call');
            expect(findItemConfig(agent, session, fun1_call2.call.id)?.$id).toBe('function1_call');
            expect(findItemConfig(agent, session, fun1_call3.call.id)?.$id).toBe('function1_call');
            expect(findItemConfig(agent, session, fun1_call4.call.id)?.$id).toBe('function1_call');
            expect(findItemConfig(agent, session, fun2_call1.call.id)?.$id).toBe('function2_call');
            expect(findItemConfig(agent, session, fun2_call2.call.id)?.$id).toBe('function2_call');
            expect(findItemConfig(agent, session, fun2_call3.call.id)?.$id).toBe('function2_call');
            expect(findItemConfig(agent, session, fun2_call4.call.id)?.$id).toBe('function2_call');
        })

        it("can't find results", () => {
            expect(findItemConfig(agent, session, fun1_call1.result.id)?.$id).toBeUndefined();
            expect(findItemConfig(agent, session, fun1_call2.result.id)?.$id).toBeUndefined();
            expect(findItemConfig(agent, session, fun1_call3.result.id)?.$id).toBeUndefined();
            expect(findItemConfig(agent, session, fun1_call4.result.id)?.$id).toBeUndefined();
            expect(findItemConfig(agent, session, fun2_call1.result.id)?.$id).toBeUndefined();
            expect(findItemConfig(agent, session, fun2_call2.result.id)?.$id).toBeUndefined();
            expect(findItemConfig(agent, session, fun2_call3.result.id)?.$id).toBeUndefined();
            expect(findItemConfig(agent, session, fun2_call4.result.id)?.$id).toBeUndefined();
        })
    })
})


describe('agent with 2 function calls, with ids', () => {
    const functionCall1 = functionCall("function1", { name: "function1", callId: "$id" }, { callId: "$id" });
    const functionCall2 = functionCall("function2", { name: "function2", callId: "$id" }, { callId: "$id" });

    const agent = createAgent([
        functionCall1.definition,
        functionCall2.definition,
    ])

    describe('session with 2 consecutive synchronous function calls', () => {
        const call1 = functionCall1.generate();
        const call2 = functionCall2.generate();

        const session: Session = createSession([
            reasoning(),
            call1.call,
            call1.result,
            reasoning(),
            call2.call,
            call2.result,
            reasoning()
        ])

        it ('can find calls', () => {
            expect(findItemConfig(agent, session, call1.call.id)?.$id).toBe('function1_call');
            expect(findItemConfig(agent, session, call2.call.id)?.$id).toBe('function2_call');
        });

        it ('can find results', () => {
            expect(findItemConfig(agent, session, call1.result.id)?.$id).toBe('function1_result');
            expect(findItemConfig(agent, session, call2.result.id)?.$id).toBe('function2_result');
        });

        it ('properly finds tool content for results', () => {
            expect(findItemAndRunConfig(agent, session, call1.result.id)?.toolCallContent).toBe(call1.call.content);
            expect(findItemAndRunConfig(agent, session, call2.result.id)?.toolCallContent).toBe(call2.call.content);
        })
    })

    describe('a lot of paralell calls', () => {
        const fun1_call1 = functionCall1.generate();
        const fun1_call2 = functionCall1.generate();
        const fun1_call3 = functionCall1.generate();
        const fun1_call4 = functionCall1.generate();

        const fun2_call1 = functionCall2.generate();
        const fun2_call2 = functionCall2.generate();
        const fun2_call3 = functionCall2.generate();
        const fun2_call4 = functionCall2.generate();

        const session: Session = createSession([

            reasoning(),

            fun1_call1.call,
            fun1_call2.call,
            fun2_call2.call,
            fun2_call1.call,
            
            fun2_call2.result,
            // fun1_call1.result,
            fun1_call2.result,
            fun2_call1.result,

            reasoning(),

            fun1_call3.call,
            fun2_call4.call,
            fun2_call3.call,
            fun1_call4.call,

            fun1_call3.result,
            fun1_call4.result,
            fun2_call3.result,
            // fun2_call4.result,

            reasoning(),
        ])

        it("finds calls", () => {
            expect(findItemConfig(agent, session, fun1_call1.call.id)?.$id).toBe('function1_call');
            expect(findItemConfig(agent, session, fun1_call2.call.id)?.$id).toBe('function1_call');
            expect(findItemConfig(agent, session, fun1_call3.call.id)?.$id).toBe('function1_call');
            expect(findItemConfig(agent, session, fun1_call4.call.id)?.$id).toBe('function1_call');
            expect(findItemConfig(agent, session, fun2_call1.call.id)?.$id).toBe('function2_call');
            expect(findItemConfig(agent, session, fun2_call2.call.id)?.$id).toBe('function2_call');
            expect(findItemConfig(agent, session, fun2_call3.call.id)?.$id).toBe('function2_call');
            expect(findItemConfig(agent, session, fun2_call4.call.id)?.$id).toBe('function2_call');
        })

        it("finds results", () => {
            expect(findItemConfig(agent, session, fun1_call1.result.id)?.$id).toBeUndefined();
            expect(findItemConfig(agent, session, fun1_call2.result.id)?.$id).toBe('function1_result');
            expect(findItemConfig(agent, session, fun1_call3.result.id)?.$id).toBe('function1_result');
            expect(findItemConfig(agent, session, fun1_call4.result.id)?.$id).toBe('function1_result');
            expect(findItemConfig(agent, session, fun2_call1.result.id)?.$id).toBe('function2_result');
            expect(findItemConfig(agent, session, fun2_call2.result.id)?.$id).toBe('function2_result');
            expect(findItemConfig(agent, session, fun2_call3.result.id)?.$id).toBe('function2_result');
            expect(findItemConfig(agent, session, fun2_call4.result.id)?.$id).toBeUndefined();
        })

        it ('properly finds tool content for results', () => {
            expect(findItemAndRunConfig(agent, session, fun1_call1.result.id)?.toolCallContent).toBeUndefined();
            expect(findItemAndRunConfig(agent, session, fun1_call2.result.id)?.toolCallContent).toBe(fun1_call2.call.content);
            expect(findItemAndRunConfig(agent, session, fun1_call3.result.id)?.toolCallContent).toBe(fun1_call3.call.content);
            expect(findItemAndRunConfig(agent, session, fun1_call4.result.id)?.toolCallContent).toBe(fun1_call4.call.content);
            expect(findItemAndRunConfig(agent, session, fun2_call1.result.id)?.toolCallContent).toBe(fun2_call1.call.content);
            expect(findItemAndRunConfig(agent, session, fun2_call2.result.id)?.toolCallContent).toBe(fun2_call2.call.content);
            expect(findItemAndRunConfig(agent, session, fun2_call3.result.id)?.toolCallContent).toBe(fun2_call3.call.content);
            expect(findItemAndRunConfig(agent, session, fun2_call4.result.id)?.toolCallContent).toBeUndefined();
        })
    })
})