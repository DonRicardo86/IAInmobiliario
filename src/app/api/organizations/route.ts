import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDataService } from '@/core/database/supabase-adapter';
import { DEFAULT_ORGANIZATION } from '@/core/types/organization';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug') || searchParams.get('org') || undefined;
    const id = searchParams.get('id') || undefined;

    const identifier = slug || id || DEFAULT_ORGANIZATION.slug;
    const organization = await UnifiedDataService.getPublicOrganizationBySlugOrId(identifier);

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        phone: organization.phone,
        email: organization.email,
        city: organization.city,
        currency: organization.currency,
        aiAssistantName: organization.aiAssistantName,
        aiAssistantWelcomeMessage: organization.aiAssistantWelcomeMessage,
      },
    });
  } catch (error: any) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
