export function protectedResourceMetadata(issuer: string, resource: string) {
  return {
    resource,
    authorization_servers: [issuer],
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp']
  };
}
