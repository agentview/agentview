import { Header, HeaderTitle } from "~/components/header"
import { MarkdownSample } from "./MarkdownSample"


export function CustomPage() {
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

