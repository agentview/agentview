import { defineConfig } from "~";
import { z } from "zod";
import { Book, ThumbsDown, ThumbsUp } from "lucide-react";
import { AVForm, AVFormError, AVFormField, AVFormSubmitButton, AVInput, AVTextarea, SelectInput, singleFieldForm, ToggleBooleanInput, UserMessageInputComponent } from "~/components/form";
import { ItemAssistantMessageComponent, ItemUserMessageComponent, DisplayBooleanComponent } from "~/components/display";
import { marked } from "marked";
import { ProductDisplay } from "./ProductDisplay";
import { ProductSelect } from "./ProductSelect";
import { ScoreBadge } from "./ScoreBadge";
import { CustomPage } from "./CustomPage";
import { ProductChatInputForm } from "./ProductChatSessionForm";
import { Button } from "~/components/ui/button";
import { useState } from "react";

export default defineConfig({
    apiBaseUrl: "http://localhost:8080",
    agents: [
        {
            name: "simple_chat",
            url: "http://127.0.0.1:8000/simple_chat",
            runs: [
                {
                    input: {
                        type: "message",
                        role: "user",
                        content: z.string(),
                        displayComponent: ItemUserMessageComponent,
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
                                inputComponent: ToggleBooleanInput,
                                displayComponent: DisplayBooleanComponent,
                                options: {
                                    true: {
                                        icon: ThumbsUp,
                                        label: "Yes"
                                    },
                                    false: {
                                        icon: ThumbsDown,
                                        label: "No"
                                    }
                                }
                            }
                        ]
                    },
                    inputComponent: UserMessageInputComponent
                    // inputComponent: singleFieldForm({
                    //     defaultValue: "",
                    //     control: (props) => <AVTextarea {...props} placeholder="Enter your message" />
                    // })
                }
            ]
        },
        {
            name: "pdp_chat",
            url: "http://127.0.0.1:8000/product_chat",
            context: z.object({
                product_id: z.string(),
                test: z.string().min(5, "Test must be at least 5 characters long")
            }),
            inputComponent: (props) => <AVForm {...props}>
                <AVFormField
                    name="product_id"
                    label="Product"
                    control={ProductSelect}
                />
                <AVFormField
                    name="test"
                    label="Test"
                    // disabled={true}
                    defaultValue="dupa"
                    control={(props) => <AVInput {...props} placeholder="Enter your test" />}
                />
                <AVFormSubmitButton />
            </AVForm>,

            displayedProperties: [
                {
                    title: "Product",
                    value: ({ session }) => <ProductDisplay value={session.context.product_id} /> // TODO: Bad abstraction...? Shouldn't it be (session) => ... ?
                }
            ],
            runs: [
                {
                    title: "Message",
                    input: {
                        type: "message",
                        role: "user",
                        content: z.string(),
                        displayComponent: ItemUserMessageComponent
                    },
                    output: {
                        type: "message",
                        role: "assistant",
                        content: z.string(),
                        displayComponent: ItemAssistantMessageComponent
                    },
                    inputComponent: UserMessageInputComponent
                },
                {
                    title: "Change page",
                    input: {
                        type: "change_page",
                        role: "user",
                        content: z.object({
                            product_id: z.string(),
                        }),
                    },
                    output: {
                        type: "message",
                        role: "assistant",
                        content: z.string(),
                        displayComponent: ItemAssistantMessageComponent,
                        scores: [
                            {
                                name: "user_reaction",
                                title: "Reaction",
                                schema: z.boolean(),
                                inputComponent: ToggleBooleanInput,
                                displayComponent: DisplayBooleanComponent,
                                options: {
                                    true: {
                                        icon: ThumbsUp,
                                        label: "Like"
                                    },
                                    false: {
                                        icon: ThumbsDown,
                                        label: "Don't like"
                                    }
                                }
                            },
                            {
                                name: "recommended_score",
                                title: "Your score",
                                schema: z.string(),
                                inputComponent: SelectInput,
                                displayComponent: ({ value }) => <ScoreBadge score={value} />,
                                options: {
                                    items: [
                                        { value: "best_fit", label: "Best Fit" },
                                        { value: "great_option", label: "Great Option" },
                                        { value: "optional", label: "Optional" },
                                        { value: "not_recommended", label: "Not Recommended" }
                                    ]
                                }
                            }
                        ]
                    },
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
                            {error && <div className="text-red-500 mt-2">{error}</div>}
                            <Button type="submit">Submit</Button>
                        </form>
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