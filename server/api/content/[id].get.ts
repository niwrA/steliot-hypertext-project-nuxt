import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content identifier' })
  }

  const file = resolve(process.cwd(), 'public', 'content', 'pages', `${id}.json`)
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
    if (code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: `Content record not found: ${id}` })
    }
    throw error
  }
})
