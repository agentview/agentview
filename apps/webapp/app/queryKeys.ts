export const queryKeys = {
  session: ["session"] as const,
  organizations: ["organizations"] as const,
  organization: (id: string) => ["organization", id] as const,
  apiKeys: () => ["apiKeys"] as const,
  channels: (orgId: string) => ["channels", orgId] as const,
  environments: (orgId: string) => ["environments", orgId] as const,
};
