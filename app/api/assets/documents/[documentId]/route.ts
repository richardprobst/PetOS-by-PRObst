import { getCurrentAuthUser } from '@/server/auth/session'
import { AppError } from '@/server/http/errors'
import { routeErrorResponse } from '@/server/http/responses'
import { getDocumentBinaryForActor } from '@/features/documents/services'

interface RouteContext {
  params: Promise<{
    documentId: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await getCurrentAuthUser()

    if (!actor) {
      throw new AppError('UNAUTHORIZED', 401, 'Authentication required.')
    }

    const { documentId } = await context.params
    const { content, document, fileName } = await getDocumentBinaryForActor(actor, documentId)

    return new Response(new Uint8Array(content), {
      headers: {
        'cache-control': 'no-store',
        'content-disposition': `attachment; filename="${fileName}"`,
        'content-length': String(content.length),
        'content-type': document.mimeType,
      },
      status: 200,
    })
  } catch (error) {
    return routeErrorResponse(error, { request })
  }
}
