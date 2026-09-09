import { getServerSession } from 'next-auth';
import { authOptions } from '../auth';
import { database } from './database.cjs';
import { requestDatabase, createScopedDatabase, positiveInteger } from './scoped-database.cjs';
import { validateRequestValues, readJson } from './request-validation.cjs';
import { HttpError } from './errors.cjs';

export function withApiAuth(handler, { bodyObjects = [] } = {}) {
  return async (request, context) => {
    try {
      const session = await getServerSession(authOptions);
      const id = Number(session?.user?.id);
      if (!positiveInteger(id)) throw new HttpError(401, 'Sign in to continue');
      // Read current privileges, rather than trusting a week-old JWT claim.
      const user = await database.userProfile.findUnique({ where: { id }, select: { organizationId: true, active: true, administrator: true } });
      if (!user?.active || !user.organizationId) throw new HttpError(403, 'An active organization membership is required');
      const resolvedParams = await context?.params;
      if (resolvedParams) {
        validateRequestValues(resolvedParams);
        context = { ...context, params: resolvedParams };
      }
      const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
      if (mutation) {
        if (!user.administrator) throw new HttpError(403, 'Organization administrator access is required');
        const origin = request.headers.get('origin');
        const expected = new URL(process.env.NEXTAUTH_URL || request.url).origin;
        if (!origin || origin !== expected) throw new HttpError(403, 'Invalid request origin');
        if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON is required');
        const body = await readJson(request);
        validateRequestValues(body);
        for (const key of bodyObjects) {
          if (!body[key] || typeof body[key] !== "object" || Array.isArray(body[key])) throw new HttpError(400, `${key} must be an object`);
        }
        request = new Request(request.url, { method: request.method, headers: request.headers, body: JSON.stringify(body) });
      }
      const response = await database.$transaction(tx => requestDatabase.run(
        createScopedDatabase(tx, user.organizationId), () => handler(request, context),
      ), { isolationLevel: 'Serializable', timeout: 10000 });
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    } catch (error) {
      const status = error.status || ({ P2025: 404, P2002: 409, P2003: 409, P2034: 409 }[error.code]) || (error instanceof SyntaxError ? 400 : 500);
      const message = error instanceof HttpError ? error.message : ({ 400: 'Invalid request', 404: 'Record not found', 409: 'The record changed or is still in use. Refresh and retry.' }[status] || 'Unable to complete the request');
      if (status === 500) console.error('API request failed', { code: error.code, name: error.name });
      return Response.json({ message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
    }
  };
}
