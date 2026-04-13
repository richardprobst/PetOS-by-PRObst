import { requireAuthenticatedApiUser } from '@/server/authorization/api-access'
import { routeErrorResponse } from '@/server/http/responses'
import { getMediaBinaryForActor } from '@/features/documents/services'

interface RouteContext {
  params: Promise<{
    mediaAssetId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireAuthenticatedApiUser()

    const { mediaAssetId } = await context.params
    const { content, fileName, mediaAsset } = await getMediaBinaryForActor(actor, mediaAssetId)
    const disposition = new URL(request.url).searchParams.get('download') === '1' ? 'attachment' : 'inline'

    return new Response(new Uint8Array(content), {
      headers: {
        'cache-control': 'no-store',
        'content-disposition': `${disposition}; filename="${fileName}"`,
        'content-length': String(content.length),
        'content-type': mediaAsset.mimeType,
      },
      status: 200,
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
