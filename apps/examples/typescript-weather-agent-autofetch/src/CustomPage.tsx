import { Header, HeaderTitle } from "@agentview/studio"

export function CustomPage() {
  return <div className="flex-1">
    <Header>
      <HeaderTitle title={`Custom Page`} />
    </Header>
    <div className="p-6">
        <p>This is a custom page.</p>
    </div>
  </div>
}