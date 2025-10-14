import { Header, HeaderTitle } from "~/components/header"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Control } from "react-hook-form"
import { z } from "zod"

import { Button } from "~/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import React from "react"

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.email()
})

function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (<div>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          name="username"
          render={({ field }) => {
            console.log(field)
            return <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          }}
        />
        <FormField
          name="email"
          render={({ field }) => {
            console.log(field)
            return <FormItem>
              <FormLabel>Email</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verified email to display" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="m@example.com">m@example.com</SelectItem>
                  <SelectItem value="m@google.com">m@google.com</SelectItem>
                  <SelectItem value="m@support.com">m@support.com</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                You can manage email addresses in your blablabla.
              </FormDescription>
              <FormMessage />
            </FormItem>
          }}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>

      

  </div>)
}


/* ABSTRACTIONS */

// type MyFormFieldProps = {
//   control: any,
//   name: string,
//   render: any,
//   label: string,
//   description: string
// }

// function MyFormField(props: MyFormFieldProps) {
//   const { control, name, render, label, description } = props;

//   return <FormField
//   control={control}
//   name={name}
//   render={({ field }) => {  

//     const inputProps = {
//       ...field,

//     }


//     return <FormItem>
//       <FormLabel>{label}</FormLabel>
//       <FormControl>
//           <Input placeholder="shadcn" {...field} />
//       </FormControl>
//       <FormDescription>
//         This is your public display name.
//       </FormDescription>
//       <FormMessage />
//     </FormItem>
//   }}
// />
// }


/**
 * 
 * <FormField
 *  name="username"
 *  label="Username"
 *  description="This is your public display name."
 *  render={({ value, onChange, name, id, aria-describedby, aria-invalid }) => {  
 *    return <FormItem>
 *      <FormLabel>Username</FormLabel>
 *      <FormControl>
 *        <Input placeholder="shadcn" {...field} />
 *      </FormControl>
 *    </FormItem>
 *  }}
/>


 * 
 */



// function ProfileForm2() {
//   const form = useForm<z.infer<typeof formSchema>>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       username: "",
//     },
//   })

//   function onSubmit(values: z.infer<typeof formSchema>) {
//     console.log(values)
//   }

//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
//         <FormField
//           control={form.control}
//           name="username"
//           render={({ field }) => {  
//             console.log(field)
//             return <FormItem>
//               <FormLabel>Username</FormLabel>
//               <FormControl>
//                   <Input placeholder="shadcn" {...field} />
//               </FormControl>
//               <FormDescription>
//                 This is your public display name.
//               </FormDescription>
//               <FormMessage />
//             </FormItem>
//           }}
//         />
//         <FormField
//           control={form.control}
//           name="email"
//           render={({ field }) => {  
//             console.log(field)
//             return <FormItem>
//             <FormLabel>Email</FormLabel>
//             <Select onValueChange={field.onChange} defaultValue={field.value}>
//               <FormControl>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select a verified email to display" />
//                 </SelectTrigger>
//               </FormControl>
//               <SelectContent>
//                 <SelectItem value="m@example.com">m@example.com</SelectItem>
//                 <SelectItem value="m@google.com">m@google.com</SelectItem>
//                 <SelectItem value="m@support.com">m@support.com</SelectItem>
//               </SelectContent>
//             </Select>
//             <FormDescription>
//               You can manage email addresses in your blablabla.
//             </FormDescription>
//             <FormMessage />
//           </FormItem>
//           }}
//         />

//         <Button type="submit">Submit</Button>
//       </form>
//     </Form>
//   )
// }


// type SuperFormProps = {
//   schema: z.ZodSchema,
//   value: any
//   onChange: (value: any) => void,
//   children: React.ReactNode,
// }

// const SuperFormContext = React.createContext<{
//   schema: z.ZodSchema,
//   form: any
// }>({
//   schema: z.object({}),
//   form: null
// })

// function SuperForm(props: SuperFormProps) {
//   const { schema, value, onChange } = props;

//   const form = useForm({
//     resolver: zodResolver(schema),
//   })

//   function onSubmit(values: z.infer<typeof schema>) {
//     onChange(values)
//   }

//   return <SuperFormContext.Provider value={{ schema, form }}>
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
//         {props.children}
//       </form>
//     </Form>
//   </SuperFormContext.Provider>
// }

type SuperFormFieldProps = {
  name: string,
  label?: string,
  description?: string,
  control: React.ReactElement,
}

function SuperFormField(props: SuperFormFieldProps) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  const id = formItemId;
  const ariaDescribedby = !error
    ? `${formDescriptionId}`
    : `${formDescriptionId} ${formMessageId}`;
  const ariaInvalid = !!error;

  return <FormField
    name={props.name}
    render={({ field }) => {

      const renderProps = {
        ...field,
        controlProps: {
          id,
          "aria-describedby": ariaDescribedby,
          "aria-invalid": ariaInvalid
        }
      }

      return <FormItem>
        <FormLabel>{props.label}</FormLabel>
        {React.cloneElement(props.control, renderProps)}
        {props.description && <FormDescription>
          {props.description}
        </FormDescription>}
        <FormMessage />
      </FormItem>
    }}
  />
}




type SuperFormProps = {
  schema: z.ZodSchema,
  defaultValues: any,
  onSubmit: (value: any) => void,
  children: React.ReactNode,
  errors?: any
}

function SuperForm(props: SuperFormProps) {
  const form = useForm({
    resolver: zodResolver(props.schema),
    defaultValues: props.defaultValues,
  })

  return <Form {...form}>
    <form onSubmit={form.handleSubmit(props.onSubmit)} className="space-y-8">
      {props.children}
    </form>
  </Form>
}




// function ProfileForm2() {
//   const form = useForm<z.infer<typeof formSchema>>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       username: "",
//     },
//   })

//   function onSubmit(values: z.infer<typeof formSchema>) {
//     console.log(values)
//   }

//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

//         <SuperFormField 
//           name="username" 
//           label="Username" 
//           description="This is your public display name." 
//           control={
//             <Input placeholder="shadcn" />
//           }
//         />

//         {/* <FormField
//           name="username"
//           render={({ field }) => {
//             console.log(field)
//             return <FormItem>
//               <FormLabel>Username</FormLabel>
//               <FormControl>
//                 <Input placeholder="shadcn" {...field} />
//               </FormControl>
//               <FormDescription>
//                 This is your public display name.
//               </FormDescription>
//               <FormMessage />
//             </FormItem>
//           }}
//         /> */}

//         <FormField
//           name="email"
//           render={({ field }) => {
//             console.log(field)
//             return <FormItem>
//               <FormLabel>Email</FormLabel>
//               <Select onValueChange={field.onChange} defaultValue={field.value}>
//                 <FormControl>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select a verified email to display" />
//                   </SelectTrigger>
//                 </FormControl>
//                 <SelectContent>
//                   <SelectItem value="m@example.com">m@example.com</SelectItem>
//                   <SelectItem value="m@google.com">m@google.com</SelectItem>
//                   <SelectItem value="m@support.com">m@support.com</SelectItem>
//                 </SelectContent>
//               </Select>
//               <FormDescription>
//                 You can manage email addresses in your blablabla.
//               </FormDescription>
//               <FormMessage />
//             </FormItem>
//           }}
//         />

//         <Button type="submit">Submit</Button>
//       </form>
//     </Form>
//   )
// }

function ProfileForm2() {
  return (
    <SuperForm schema={formSchema} defaultValues={{}} onSubmit={(value) => { console.log('submit!', value) }}>

      <SuperFormField
        name="username"
        label="Username"
        description="This is your public display name."
        control={
          <Input placeholder="shadcn" />
        }
      />

      {/* <FormField
          name="username"
          render={({ field }) => {
            console.log(field)
            return <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          }}
        /> */}

      <FormField
        name="email"
        render={({ field }) => {
          console.log(field)
          return <FormItem>
            <FormLabel>Email</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a verified email to display" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="m@example.com">m@example.com</SelectItem>
                <SelectItem value="m@google.com">m@google.com</SelectItem>
                <SelectItem value="m@support.com">m@support.com</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              You can manage email addresses in your blablabla.
            </FormDescription>
            <FormMessage />
          </FormItem>
        }}
      />

      <Button type="submit">Submit</Button>
    </SuperForm>
  )
}

import { AVFormField, AVInput } from "~/components/form"


type RootFormProps = {
  schema: z.ZodSchema,
  errors?: any
  onSubmit: (value: any) => void,
}

function RootForm({ schema, errors, onSubmit }: RootFormProps) {
  const form = useForm({
    resolver: zodResolver(schema),
    // defaultValues: props.defaultValues,
  });

  return <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <AVFormField 
        name="username"
        label="Username"
        description="This is your public display name."
        control={(props) => <AVInput {...props} placeholder="Dupa" />}
      />
      <Button type="submit">Submit</Button>
    </form>
  </Form>
}


const testSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  // email: z.email()
})



export function CustomPage() {
  return <div className="flex-1">
    <Header>
      <HeaderTitle title={`Custom Page`} />
    </Header>
    <div className="p-6">

      <div className="pt-10 prose">
        <h1>Header 1</h1>
        <p>This is a sample paragraph to test basic text styling. The <strong>prose</strong> class applies nice default styles to all HTML elements inside. <em>Emphasized text</em> and <b>bold text</b> should render distinctly.</p>
        <p>This is a sample paragraph to test basic text styling. The <strong>prose</strong> class applies nice default styles to all HTML elements inside. <em>Emphasized text</em> and <b>bold text</b> should render distinctly.</p>
        <p>This is a sample paragraph to test basic text styling. The <strong>prose</strong> class applies nice default styles to all HTML elements inside. <em>Emphasized text</em> and <b>bold text</b> should render distinctly.</p>

        <h2>Header 2</h2>
        <p>This is another paragraph demonstrating <a href="#">link styling</a> and how links with <u>underline</u> look.</p>
        
        <h3>Header 3</h3>
        <blockquote>
          This is a blockquote. Blockquotes are often used to cite someone else's words.
        </blockquote>

        <p>
          Here is an inline code example: <code>const foo = 'bar';</code>
        </p>

        <h4>Header 4</h4>
        <pre>
{`function helloWorld() {
  console.log("Hello, World!");
}
`}
        </pre>

        <h5>Header 5</h5>
        <p>Unordered list example:</p>
        <ul>
          <li>First bullet item</li>
          <li>Second bullet item with <b>bold</b> text</li>
          <li>
            Nested list:
            <ul>
              <li>Sub-item 1</li>
              <li>Sub-item 2</li>
            </ul>
          </li>
        </ul>

        <h6>Header 6</h6>
        <p>Ordered list example:</p>
        <ol>
          <li>First item</li>
          <li>Second item
            <ol>
              <li>Nested first</li>
              <li>Nested second</li>
            </ol>
          </li>
          <li>Third item</li>
        </ol>

        <p>Definition List:</p>
        <dl>
          <dt>Term 1</dt>
          <dd>This is the definition for term 1.</dd>
          <dt>Term 2</dt>
          <dd>This is the definition for term 2.</dd>
        </dl>

        <p>Table Example:</p>
        <table>
          <thead>
            <tr>
              <th>Header A</th>
              <th>Header B</th>
              <th>Header C</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Row 1A</td>
              <td>Row 1B</td>
              <td>Row 1C</td>
            </tr>
            <tr>
              <td>Row 2A</td>
              <td>Row 2B</td>
              <td>Row 2C</td>
            </tr>
          </tbody>
        </table>

        <hr />

        <h2>Forms and Inputs</h2>
        <form>
          <div>
            <label htmlFor="fname">First name:</label>
            <input id="fname" name="fname" type="text" placeholder="John" />
          </div>
          <div>
            <label htmlFor="lname">Last name:</label>
            <input id="lname" name="lname" type="text" placeholder="Doe" />
          </div>
          <div>
            <label>
              <input type="checkbox" /> Check me
            </label>
          </div>
          <div>
            <label>
              <input type="radio" name="group1" /> Option 1
            </label>
            <label>
              <input type="radio" name="group1" /> Option 2
            </label>
          </div>
          <button type="submit">Submit</button>
        </form>

        <h2>Images</h2>
        <p>
          Here is an image:
        </p>
        <img
          src="https://placekitten.com/200/100"
          alt="A cute kitten"
          style={{ maxWidth: "100%", borderRadius: "8px" }}
        />

        <h2>Other Elements</h2>
        <details>
          <summary>Expandable Section</summary>
          <p>This content is hidden until the section is expanded.</p>
        </details>

        <p>
          <mark>Highlighted text using &lt;mark&gt; tag.</mark>
        </p>

        <p>
          <del>This line is deleted (strikethrough).</del>
        </p>

        <p>
          Small text example: <small>This text is small.</small>
        </p>

        <p>
          <sup>Superscript</sup> and <sub>Subscript</sub> text styles.
        </p>

        <h2>Horizontal Rule</h2>
        <hr />

        <h2>To-Do List Example</h2>
        <ul className="list-none pl-0">
          <li>
            <input type="checkbox" checked readOnly /> Completed task
          </li>
          <li>
            <input type="checkbox" readOnly /> Ongoing task
          </li>
        </ul>
      </div>

      {/* <RootForm schema={testSchema} onSubmit={(value) => { console.log('!!!', value) }} /> */}

      {/* <ProfileForm2 />
      <hr className="my-12" /> */}

      {/* <SuperForm schema={formSchema} value={{}} onChange={(value) => { console.log(value)}}>
        <SuperFormField name="username" label="Username" control={
          <Input placeholder="shadcn" />
        } />
      </SuperForm> */}
    </div>
  </div>
}

