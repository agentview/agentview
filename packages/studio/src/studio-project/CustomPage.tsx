import { Header, HeaderTitle } from "~/components/header"
import { MarkdownSample } from "./MarkdownSample"
import { z } from "zod"

export function CustomPage() {

  type Test = {
    type: string,
    role?: string,
    name?: string,
    [key: string]: undefined | string | z.ZodTypeAny,
  }

  return <div className="flex-1">
    <Header>
      <HeaderTitle title={`Custom Page`} />
    </Header>
    <div className="p-6">
      

      <div className="pt-10 prose">
        <MarkdownSample />
      </div>
    </div>
  </div>
}

