import NextAuth from 'next-auth'
import { getAuthOptions } from '@/server/auth/options'

const createHandler = () => NextAuth(getAuthOptions())

export async function GET(
  request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  return createHandler()(request, context)
}

export async function POST(
  request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  return createHandler()(request, context)
}
