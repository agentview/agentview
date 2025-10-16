import { defineConfig } from "~";
import { z } from "zod";
import { Book, ExternalLink, Link, ThumbsDown, ThumbsUp } from "lucide-react";
import { AVInput, ToggleGroupControl, UserMessageInputComponent, SelectControl, OptionDisplay } from "~/components/form";
import { ItemAssistantMessageComponent, ItemUserMessageComponent } from "~/components/display";
import { ProductDisplay } from "./ProductDisplay";
import { ProductSelect } from "./ProductSelect";
import { ScoreBadge } from "./ScoreBadge";
import { CustomPage } from "./CustomPage";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, FormItem, FormLabel, FormMessage, Form } from "~/components/ui/form";
import { TagPill } from "~/components/TagPill";

export default defineConfig({
    apiBaseUrl: "http://localhost:8080",
    agents: [
        {
            name: "simple_chat",
            url: "http://127.0.0.1:8000/simple_chat",
            run: {
                input: {
                    type: "message",
                    role: "user",
                    content: z.string(),
                    displayComponent: ItemUserMessageComponent,
                    inputComponent: UserMessageInputComponent
                },
                output: {
                    type: "message",
                    role: "assistant",
                    content: z.string(),
                    displayComponent: ItemAssistantMessageComponent,
                    scores: [
                        {
                            name: "user_reaction",
                            title: "Can it go to client?",
                            schema: z.boolean(),
                            inputComponent: (props) => <ToggleGroupControl {...props} options={[{ value: true, icon: <ThumbsUp />, label: "Like" }, { value: false, icon: <ThumbsDown />, label: "Don't Like" }]} collapseOnSelect />,
                            displayComponent: (props) => <OptionDisplay {...props} options={[{ value: true, icon: <ThumbsUp />, label: "Like" }, { value: false, icon: <ThumbsDown />, label: "Don't Like" }]} />,
                            actionBarComponent: (props) => <div className="w-[100px] h-[28px] bg-red-950 text-white flex items-center justify-center">Test</div>
                        },
                        {
                            name: "user_reaction2",
                            title: "Test",
                            schema: z.string(),
                            inputComponent: (props) => <SelectControl {...props} options={[{ value: "one", label: "One" }, { value: "two", label: "Two" }, { value: "three", label: "Three" }, { value: "four", label: "Four" }, { value: "five", label: "Five" }]} />,
                            displayComponent: (props) => <OptionDisplay {...props} options={[{ value: "one", label: "One" }, { value: "two", label: "Two" }, { value: "three", label: "Three" }, { value: "four", label: "Four" }, { value: "five", label: "Five" }]} />,
                        }
                    ]
                },
                displayProperties: [
                    {
                        title: "Langfuse trace",
                        value: ({ run }) => {
                            if (!run.metadata?.trace_id) {
                                return <span className="text-muted-foreground">No trace</span>
                            }
                            return <Button asChild variant="outline" size="xs">
                                <a href={`https://cloud.langfuse.com/project/cmfmholwz00k1ad074onno73u/traces/${run.metadata.trace_id}`} target="_blank">
                                    Trace <ExternalLink className="size-4" />
                                </a>
                            </Button>
                        }
                    }
                ],
            }
        },
        {
            name: "pdp_chat",
            url: "http://127.0.0.1:8000/product_chat",
            context: z.object({
                product_id: z.string(),
                test: z.string().min(5, "Test must be at least 5 characters long")
            }),
            inputComponent: ({ schema, submit, isRunning }) => {
                const form = useForm({
                    resolver: zodResolver<any, any, any>(schema),
                })

                return <Form {...form}>
                    <form onSubmit={form.handleSubmit(submit)} className={"space-y-5"}>
                        <FormField
                            name={"product_id"}
                            render={({ field }) => <FormItem>
                                    <FormLabel>Product</FormLabel>
                                    <ProductSelect {...field} />
                                    <FormMessage />
                                </FormItem> 
                            }
                        />
                        <FormField
                            name={"test"}
                            // defaultValue={"Test"}
                            render={({ field }) => <FormItem>
                                <FormLabel>Test Field</FormLabel>
                                <AVInput {...field} placeholder="Enter your test" />
                                <FormMessage />
                            </FormItem>
                            }
                        />
                        <Button type="submit" disabled={isRunning}>Submit</Button>
                    </form>
                </Form>
            },
            // inputComponent: (props) => <AVForm {...props}>
            //     <AVFormField
            //         name="product_id"
            //         label="Product"
            //         control={ProductSelect}
            //     />

            //     <AVFormField
            //         name="test"
            //         label="Test"
            //         // disabled={true}
            //         defaultValue="dupa"
            //         control={(props) => <AVInput {...props} placeholder="Enter your test" />}
            //     />
            //     <Button type="submit" disabled={props.isRunning}>Submit</Button>
            // </AVForm>,


            displayProperties: [
                {
                    title: "Product",
                    value: ({ session }) => <ProductDisplay value={session.context?.product_id} />
                }
            ],

            runs: [
                {
                    title: "Message",
                    input: {
                        type: "message",
                        role: "user",
                        content: z.string(),
                        displayComponent: ItemUserMessageComponent,
                        inputComponent: UserMessageInputComponent
                    },
                    output: {
                        type: "message",
                        role: "assistant",
                        content: z.string(),
                        displayComponent: ItemAssistantMessageComponent
                    },
                },
                {
                    title: "Change page",
                    input: {
                        type: "change_page",
                        role: "user",
                        content: z.object({
                            product_id: z.string(),
                        }),
                        inputComponent: ({ submit, isRunning, schema }) => {
                            const [productId, setProductId] = useState<string | undefined>(undefined);
                            const [error, setError] = useState<string | undefined>(undefined);

                            return <form onSubmit={(e) => {
                                e.preventDefault();
                                if (!productId) {
                                    setError("Product ID is required");
                                    return;
                                }
                                submit({ product_id: productId });
                            }}
                                className="space-y-2"
                            >
                                <ProductSelect value={productId} onChange={(productId) => {
                                    setProductId(productId);
                                    setError(undefined);
                                }} />
                                {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
                                <Button type="submit">Submit</Button>
                            </form>
                        }
                    },
                    output: {
                        type: "message",
                        role: "assistant",
                        content: z.string(),
                        displayComponent: ItemAssistantMessageComponent,
                        // scores: [
                        //     {
                        //         name: "user_reaction",
                        //         title: "Reaction",
                        //         schema: z.boolean(),
                        //         inputComponent: ToggleBooleanInput,
                        //         displayComponent: DisplayBooleanComponent,
                        //         options: {
                        //             true: {
                        //                 icon: ThumbsUp,
                        //                 label: "Like"
                        //             },
                        //             false: {
                        //                 icon: ThumbsDown,
                        //                 label: "Don't like"
                        //             }
                        //         }
                        //     },
                        //     {
                        //         name: "recommended_score",
                        //         title: "Your score",
                        //         schema: z.string(),
                        //         inputComponent: SelectInput,
                        //         displayComponent: ({ value }) => <ScoreBadge score={value} />,
                        //         options: {
                        //             items: [
                        //                 { value: "best_fit", label: "Best Fit" },
                        //                 { value: "great_option", label: "Great Option" },
                        //                 { value: "optional", label: "Optional" },
                        //                 { value: "not_recommended", label: "Not Recommended" }
                        //             ]
                        //         }
                        //     }
                        // ]
                    }
                }
            ]
        }
    ],
    customRoutes: [
        {
            route: {
                path: "/custom",
                Component: CustomPage
            },
            scope: "loggedIn",
            title: <>
                <Book className="size-4" />
                <span>Custom</span>
            </>
        }
    ]
})