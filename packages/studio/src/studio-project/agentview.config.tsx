import { useState } from "react";
import { z } from "zod";
import { Book, ExternalLink, Link, ThumbsDown, ThumbsUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { defineConfig } from "~";
import { FormField, FormItem, FormLabel, FormMessage, Form, FormControl } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { UserMessage, AssistantMessage, StepItem, UserMessageInput, BaseItem } from "~/components/session-item";
import { PillSelect } from "~/components/PillSelect";
import { ToggleGroupControl } from "~/components/ToggleGroup";
import { OptionDisplay } from "~/components/OptionDisplay";
import { Colors } from "~/lib/shared/colors";

import { ProductDisplay } from "./ProductDisplay";
import { ProductSelect } from "./ProductSelect";
import { CustomPage } from "./CustomPage";



export default defineConfig({
  apiBaseUrl: "http://localhost:8080",
  agents: [
    {
      name: "simple_chat",
      url: "http://127.0.0.1:3000/agentview/simple_chat/run",
      run: {
        input: {
          schema: z.looseObject({
            type: z.literal("message"),
            role: z.literal("user"),
            content: z.string(),
          }),
          displayComponent: ({ value }) => <UserMessage value={value.content} />,
          inputComponent: (props) => <UserMessageInput {...props} submit={(val) => props.submit({ content: val, type: "message", role: "user" })} />
        },
        output: {
          schema: z.looseObject({
            role: z.literal("assistant"),
            type: z.literal("message"),
            content: z.any(),
          }),
          displayComponent: ({ value }) => <AssistantMessage value={value.content[0]?.text} />
        }
      }
    },
    {
      name: "weather_chat",
      url: "http://127.0.0.1:3000/agentview/weather_chat/run",
      run: {
        input: {
          schema: z.looseObject({
            type: z.literal("message"),
            role: z.literal("user"),
            content: z.string(),
          }),
          displayComponent: ({ value }) => <UserMessage value={value.content} />,
          inputComponent: (props) => <UserMessageInput {...props} submit={(val) => props.submit({ content: val, type: "message", role: "user" })} />
        },
        steps: [
          {
            schema: z.looseObject({
              type: z.literal("reasoning"),
            }),
            displayComponent: ({ value }) => <BaseItem title="Thinking" value={value.content[0]?.text} variant="muted" />,
          },
          {
            schema: z.looseObject({
              type: z.literal("function_call"),
              name: z.literal("weather_tool"),
              callId: z.string().meta({ callId: true })
            }),
            displayComponent: ({ value }) => <BaseItem title="Weather Tool" value={"Checking weather in: " + JSON.parse(value.arguments).location + "..."} variant="muted" />,
            callResult: {
              schema: z.looseObject({
                type: "function_call_result",
                callId: z.string().meta({ callId: true })
              }),
              displayComponent: ({ value }) => <WeatherComponent value={value} />
            }
          },
        ],
        output: {
          schema: z.looseObject({
            role: z.literal("assistant"),
            type: z.literal("message"),
            content: z.any(),
          }),
          displayComponent: ({ value }) => <AssistantMessage value={value.content[0]?.text} />,
          scores: [
            {
              name: "user_reaction",
              title: "Can it go to client?",
              schema: z.boolean(),
              inputComponent: (props) => <ToggleGroupControl {...props} options={likeOptions} hideOptionsOnSelect showLabels="on-select" />,
              displayComponent: (props) => <OptionDisplay {...props} options={likeOptions} />,
              actionBarComponent: (props) => <ToggleGroupControl {...props} options={likeOptions} hideOptionsOnSelect showLabels="on-select" />
            },
            {
              name: "user_reaction2",
              title: "Test",
              schema: z.string(),
              inputComponent: (props) => <PillSelect {...props} options={selectOptions} />,
              displayComponent: (props) => <OptionDisplay {...props} options={selectOptions} />,
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
    // {
    //     name: "pdp_chat",
    //     url: "http://127.0.0.1:8000/product_chat",
    //     context: z.object({
    //         product_id: z.string(),
    //         test: z.string().min(5, "Test must be at least 5 characters long")
    //     }),
    //     inputComponent: ({ schema, submit, isRunning }) => {
    //         const form = useForm({
    //             resolver: zodResolver<any, any, any>(schema),
    //         })

    //         return <Form {...form}>
    //             <form onSubmit={form.handleSubmit(submit)} className={"space-y-5"}>
    //                 <FormField
    //                     name={"product_id"}
    //                     render={({ field }) => <FormItem>
    //                         <FormLabel>Product</FormLabel>
    //                         <ProductSelect {...field} />
    //                         <FormMessage />
    //                     </FormItem>
    //                     }
    //                 />
    //                 <FormField
    //                     name={"test"}
    //                     // defaultValue={"Test"}
    //                     render={({ field }) => <FormItem>
    //                         <FormLabel>Test Field</FormLabel>
    //                         <FormControl>
    //                             <Input {...field} placeholder="Enter your test" />
    //                         </FormControl>
    //                         <FormMessage />
    //                     </FormItem>
    //                     }
    //                 />
    //                 <Button type="submit" disabled={isRunning}>Submit</Button>
    //             </form>
    //         </Form>
    //     },
    //     displayProperties: [
    //         {
    //             title: "Product",
    //             value: ({ session }) => <ProductDisplay value={session.context?.product_id} />
    //         }
    //     ],

    //     runs: [
    //         {
    //             title: "Message",
    //             input: {
    //                 type: "message",
    //                 role: "user",
    //                 content: z.string(),
    //                 displayComponent: UserMessage,
    //                 inputComponent: UserMessageInput
    //             },
    //             output: {
    //                 type: "message",
    //                 role: "assistant",
    //                 content: z.string(),
    //                 displayComponent: AssistantMessage,
    //             },
    //         },
    //         {
    //             title: "Change page",
    //             input: {
    //                 type: "change_page",
    //                 role: "user",
    //                 content: z.object({
    //                     product_id: z.string(),
    //                 }),
    //                 inputComponent: ({ submit, isRunning, schema }) => {
    //                     const [productId, setProductId] = useState<string | undefined>(undefined);
    //                     const [error, setError] = useState<string | undefined>(undefined);

    //                     return <form onSubmit={(e) => {
    //                         e.preventDefault();
    //                         if (!productId) {
    //                             setError("Product ID is required");
    //                             return;
    //                         }
    //                         submit({ product_id: productId });
    //                     }}
    //                         className="space-y-2"
    //                     >
    //                         <ProductSelect value={productId} onChange={(productId: any) => {
    //                             setProductId(productId);
    //                             setError(undefined);
    //                         }} />
    //                         {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
    //                         <Button type="submit">Submit</Button>
    //                     </form>
    //                 }
    //             },
    //             output: {
    //                 type: "change_page_result",
    //                 role: "assistant",
    //                 content: z.string(),
    //                 // displayComponent: ({ value }) => <AssistantMessage value={value} />,
    //                 // scores: [
    //                 //     {
    //                 //         name: "user_reaction",
    //                 //         title: "Reaction",
    //                 //         schema: z.boolean(),
    //                 //         inputComponent: ToggleBooleanInput,
    //                 //         displayComponent: DisplayBooleanComponent,
    //                 //         options: {
    //                 //             true: {
    //                 //                 icon: ThumbsUp,
    //                 //                 label: "Like"
    //                 //             },
    //                 //             false: {
    //                 //                 icon: ThumbsDown,
    //                 //                 label: "Don't like"
    //                 //             }
    //                 //         }
    //                 //     },
    //                 //     {
    //                 //         name: "recommended_score",
    //                 //         title: "Your score",
    //                 //         schema: z.string(),
    //                 //         inputComponent: SelectInput,
    //                 //         displayComponent: ({ value }) => <ScoreBadge score={value} />,
    //                 //         options: {
    //                 //             items: [
    //                 //                 { value: "best_fit", label: "Best Fit" },
    //                 //                 { value: "great_option", label: "Great Option" },
    //                 //                 { value: "optional", label: "Optional" },
    //                 //                 { value: "not_recommended", label: "Not Recommended" }
    //                 //             ]
    //                 //         }
    //                 //     }
    //                 // ]
    //             }
    //         }
    //     ]
    // }
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

function WeatherComponent({ value }: { value: any }) {

  let current;
  try {
    current = JSON.parse(value.output.text).current_condition[0];
  } catch (e) {
    return <BaseItem title="Weather Tool Result" value="Weather data unavailable" variant="muted" />;
  }
  if (!current) {
    return <BaseItem title="Weather Tool Result" value="Weather data unavailable" variant="muted" />;
  }

  // Render as a single, friendly line with emojis
  const tempC = current.temp_C;
  const desc = current.weatherDesc?.[0]?.value;
  const feels = current.FeelsLikeC;
  const humidity = current.humidity;
  const wind = current.windspeedKmph;
  const weatherIcons: Record<string, string> = {
    "Partly cloudy": "⛅️",
    "Cloudy": "☁️",
    "Sunny": "☀️",
    "Clear": "🌙",
    "Rain": "🌧️",
    "Mist": "🌫️",
    "Snow": "❄️",
    "Thunder": "⛈️"
  };
  // Default to description or emoji cloud if none
  const emoji = weatherIcons[desc] || "🌡️";
  const summary = `${emoji} ${desc}, ${tempC}°C, feels like ${feels}°C, 💧${humidity}%, 💨${wind}km/h`;

  return <BaseItem title="Weather Tool Result" value={summary} variant="muted" />
}

const likeOptions = [{ value: true, icon: <ThumbsUp />, label: "Like" }, { value: false, icon: <ThumbsDown />, label: "Don't Like" }]
const selectOptions = [
  { value: "one", label: "Five", icon: <ThumbsDown />, color: Colors.red },
  { value: "two", label: "Two", icon: <Book />, color: Colors.blue },
  { value: "three", label: "Four", icon: <ThumbsUp />, color: Colors.green },
  { value: "four", label: "One", icon: <Link />, color: Colors.purple },
  { value: "five", label: "Three", icon: <ExternalLink />, color: Colors.yellow },
]

