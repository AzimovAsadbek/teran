/** Liveness probe for containers and load balancers: the storefront server is up and serving. */
export function GET(): Response {
  return Response.json({ status: 'ok' });
}
