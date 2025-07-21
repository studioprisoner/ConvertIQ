import { NextRequest, NextResponse } from 'next/server';
import { checkFeatureAccess, getUserFeatureMap, FeatureKey } from '@/lib/feature-gate';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const featureKey = searchParams.get('feature') as FeatureKey;
    const getAllFeatures = searchParams.get('all') === 'true';

    if (getAllFeatures) {
      const featureMap = await getUserFeatureMap(session.user.id);
      return NextResponse.json({ featureMap });
    } else if (featureKey) {
      const result = await checkFeatureAccess(
        session.user.id, 
        featureKey,
        session.sessionId
      );
      return NextResponse.json({ feature: featureKey, result });
    } else {
      return NextResponse.json({ error: 'Missing feature parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in feature gate API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}