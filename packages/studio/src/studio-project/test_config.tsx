// @ts-nocheck

import { Value } from "@radix-ui/react-select"
import { Z } from "node_modules/react-router/dist/development/index-react-server-client-BeVfPpWg.mjs"
import path from "path"



// Approach with TOP-LEVEL stream events
const config = {
    agents: [
        {
            name: "test",
            url: "http://localhost:3000/test",
            run: {
                input: {
                    schema: z.looseObject({
                        type: z.literal("message"),
                        role: z.literal("user"),
                        content: z.string(),
                    }),
                    displayComponent: ({ value }) => <div>{value.type}</div>
                },
                steps: [
                    {
                        schema: {
                            type: "reasoning",
                            content: z.string(),
                        },
                        displayComponent: ({ value }) => <div>{value.type}</div>
                    }
                ],

                streamEvents: [
                    {
                        schema: z.object({
                            type: z.literal("response.output_item.added"),
                            output_index: z.number(),
                            item: z.any()
                        }),
                        operation: {
                            type: "create",
                            path: "root[{output_index}]",
                        },

                        // operation: { // non-index based
                        //     type: "add",
                        //     path: "root",
                        // }
                    },
                    {
                        schema: z.object({
                            type: z.literal("response.content_part.added"),
                            output_index: z.number(),
                            content_index: z.number(),
                            item_id: z.string(),
                            part: z.any()
                        }),
                        operation: {
                            type: "create",
                            path: "root[{output_index}].content[{content_index}]", // by indexes (indempotent)
                            path: "root[id='{item_id}'].content[{content_index}]", // by ids (not indempotent)
                            value: "part"
                        }
                    },
                    {
                        schema: z.object({
                            type: z.literal("response.output_text.delta"),
                            output_index: z.number(),
                            content_index: z.number(),
                            item_id: z.string(),
                            delta: z.string()
                        }),
                        operation: {
                            type: "add",
                            path: "root[{output_index}].content[{content_index}].text",
                            value: "{delta}"
                            // value: {
                            //     type: "aaa",
                            //     role: "bbb",
                            //     value: "{initialValue}"
                            // }
                        }
                    },
                    /**
                     * What about ephermal ids? Like in vercel ai sdk?
                     * - if they're not in "schema" they must be in "stream memory"
                     * - 
                     */
                    {
                        schema: z.object({
                            type: z.literal("text-start"),
                            id: z.string()
                        }),
                        operation: {
                            type: "add",
                            path: "root",
                            value: {
                                type: "text",
                                text: "",
                                state: "streaming"
                            }
                        }
                    },
                    {
                        schema: z.object({
                            type: z.literal("text-delta"),
                            id: z.string(),
                            delta: z.string()
                        }),
                        operation: {
                            type: "add",
                            path: "root[id='{id}'].text",
                            value: "{delta}"
                        }
                    }
                ],
                output: [
                    // complex case -> output is item with content array of items which might be streamed too
                    {
                        schema: z.object({
                            type: z.literal("message"),
                            role: z.literal("assistant"),
                            parts: [
                                {
                                    schema: z.object({
                                        type: z.literal("text"),
                                        text: z.string(),
                                        state: z.enum(["streaming", "done"]),
                                    }),
                                    // ...
                                }
                            ]
                        }),
                        // start: {
                        //     schema: z.object({
                        //         type: z.literal("item.created"),
                        //         id: z.string().meta({ id: true }),
                        //     }),
                        //     content: {
                        //         id: path("id"),
                        //         type: "message",
                        //         role: "assistant",
                        //         parts: []
                        //     },
                        // },
                        // end: {
                        //     schema: z.object({
                        //         type: z.literal("item.done"),
                        //         id: z.string().meta({ id: true }),
                        //     })
                        // },
                    },

                    // aisdk - simple case
                    {
                        schema: z.object({
                            type: z.literal("text"),
                            text: z.string(),
                            state: z.enum(["streaming", "done"]),
                        }),
                        stream: {
                            start: {
                                schema: z.object({
                                    type: z.literal("text-start"),
                                    initialText: z.string(),
                                    id: z.string().meta({ id: true }),
                                }),
                                content: {
                                    type: "text",
                                    text: path("initialText"),
                                    state: "streaming",
                                },
                            },
                            update: {
                                schema: z.object({
                                    type: z.literal("text-delta"),
                                    delta: z.string().meta({ appendTo: "text" }),
                                    id: z.string().meta({ id: true }),
                                })
                            },
                            end: {
                                schema: z.object({
                                    type: z.literal("text-end"),
                                    id: z.string().meta({ id: true }),
                                })
                            },
                        },
                        displayComponent: ({ value }) => <div>{value.type}</div>
                    }
                ],

            }
        }
    ]
}






const config = {
    agents: [
        {
            name: "test",
            url: "http://localhost:3000/test",
            run: {
                input: {
                    schema: z.looseObject({
                        type: z.literal("message"),
                        role: z.literal("user"),
                        content: z.string(),
                    }),
                    displayComponent: ({ value }) => <div>{value.type}</div>
                },
                steps: [
                    {
                        schema: {
                            type: "reasoning",
                            content: z.string(),
                        },
                        displayComponent: ({ value }) => <div>{value.type}</div>
                    }
                ],
                output: [
                    // complex case -> output is item with content array of items which might be streamed too
                    {
                        schema: z.object({
                            type: z.literal("message"),
                            role: z.literal("assistant"),
                            parts: [
                                {
                                    schema: z.object({
                                        type: z.literal("text"),
                                        text: z.string(),
                                        state: z.enum(["streaming", "done"]),
                                    }),
                                    stream: {
                                        start: {
                                            schema: z.object({
                                                type: z.literal("text-start"),
                                                initialText: z.string(),
                                                id: z.string().meta({ id: true }),
                                            }),
                                            content: {
                                                type: "text",
                                                text: path("initialText"),
                                                state: "streaming",
                                            },
                                        },
                                        update: {
                                            schema: z.object({
                                                type: z.literal("text-delta"),
                                                delta: z.string().meta({ appendTo: "text" }),
                                                id: z.string().meta({ id: true }),
                                            })
                                        },
                                        end: {
                                            schema: z.object({
                                                type: z.literal("text-end"),
                                                id: z.string().meta({ id: true }),
                                            })
                                        },
                                    },
                                    displayComponent: ({ value }) => <div>{value.type}</div>
                                }
                            ]
                        }),
                        start: {
                            schema: z.object({
                                type: z.literal("item.created"),
                                id: z.string().meta({ id: true }),
                            }),
                            content: {
                                id: path("id"),
                                type: "message",
                                role: "assistant",
                                parts: []
                            },
                        },
                        end: {
                            schema: z.object({
                                type: z.literal("item.done"),
                                id: z.string().meta({ id: true }),
                            })
                        },
                    },

                    // aisdk - simple case
                    {
                        schema: z.object({
                            type: z.literal("text"),
                            text: z.string(),
                            state: z.enum(["streaming", "done"]),
                        }),
                        stream: {
                            start: {
                                schema: z.object({
                                    type: z.literal("text-start"),
                                    initialText: z.string(),
                                    id: z.string().meta({ id: true }),
                                }),
                                content: {
                                    type: "text",
                                    text: path("initialText"),
                                    state: "streaming",
                                },
                            },
                            update: {
                                schema: z.object({
                                    type: z.literal("text-delta"),
                                    delta: z.string().meta({ appendTo: "text" }),
                                    id: z.string().meta({ id: true }),
                                })
                            },
                            end: {
                                schema: z.object({
                                    type: z.literal("text-end"),
                                    id: z.string().meta({ id: true }),
                                })
                            },
                        },
                        displayComponent: ({ value }) => <div>{value.type}</div>
                    }
                ]
            }
        }
    ]
}



const config = {
    agents: [
        {
            name: "test",
            url: "http://localhost:3000/test",
            run: {
                input: {
                    schema: z.looseObject({
                        type: z.literal("message"),
                        role: z.literal("user"),
                        content: z.string(),
                    }),
                    displayComponent: ({ value }) => <div>{value.type}</div>
                },
                output: [
                    {
                        type: "wrapper",
                        schema: z.looseObject({
                            type: z.literal("shitty_wrapper"),
                            parts: av.z.items([
                                {
                                    schema: {
                                        type: "message",
                                        role: z.literal("assistant"),
                                        content: z.string(),
                                    },
                                    displayComponent: ({ value }) => <div>{value.type}</div>
                                },
                                {
                                    schema: {
                                        type: "reasoning",
                                        content: z.string(),
                                    },
                                    displayComponent: ({ value }) => <div>{value.type}</div>
                                }
                            ])
                        }),
                    }
                ]
            }
        }
    ]
}




const config = {
    agents: [
        {
            name: "test",
            url: "http://localhost:3000/test",
            run: {
                input: z.looseObject({
                    type: z.literal("message"),
                }).meta({
                    displayComponent: ({ value }) => <div>{value.type}</div>
                }),
                output: [
                    z.looseObject({
                        type: z.literal("message"),
                        role: z.literal("assistant"),
                    }).meta({
                        displayComponent: ({ value }) => <div>{value.type}</div>
                    }),
                    tool({
                        call: z.looseObject({
                            type: z.literal("tool_call"),
                            name: z.literal("test"),
                            callId: z.string().meta({ callId: true }),
                        }).meta({
                            displayComponent: ({ value }) => <div>{value.type}</div>
                        }),
                        result: z.looseObject({
                            type: z.literal("tool_call_result"),
                            callId: z.string().meta({ callId: true }),
                        }).meta({
                            displayComponent: ({ value }) => <div>{value.type}</div>
                        }),
                    }),
                    z.looseObject({
                        type: z.literal("message"),
                    }).meta({

                    }),
                ]
            }
        }
    ]
}



