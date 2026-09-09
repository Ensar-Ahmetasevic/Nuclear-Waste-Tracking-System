import { rateLimit } from '@/lib/server/rate-limit.cjs';
import { readJson } from '@/lib/server/request-validation.cjs';
import bcrypt from 'bcryptjs';
import { database } from '@/lib/server/database.cjs';
import { registrationData } from '@/lib/server/registration.cjs';
import { HttpError } from '@/lib/server/errors.cjs';
export async function POST(request) {
  try {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(process.env.NEXTAUTH_URL || request.url).origin) throw new HttpError(403, 'Invalid request origin');
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'JSON is required');
    await rateLimit('registration-global', 'all', 100, 60 * 60 * 1000);
    const data = registrationData(await readJson(request));
    await rateLimit('registration', data.email, 5);
    data.password = await bcrypt.hash(data.password, 12);
    await database.userProfile.create({ data, select: { id: true } });
    return Response.json({ message: 'Registration received. Your organization access must be activated before signing in.' }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return Response.json({ message: 'Registration received. Your organization access must be activated before signing in.' }, { status: 201 });
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    return Response.json({ message: error instanceof HttpError ? error.message : status === 400 ? 'Invalid request' : 'Unable to register account' }, { status });
  }
}
