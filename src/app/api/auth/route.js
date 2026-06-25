export async function GET(request) {
  const password = process.env.APP_PASSWORD

  if (!password) {
    return Response.json({ unlocked: true })
  }

  const cookie = request.headers.get('cookie') || ''
  const unlocked = cookie.split(';').some(part => part.trim() === 'af_lock=1')

  return Response.json({ unlocked })
}

export async function POST(request) {
  const password = process.env.APP_PASSWORD

  if (!password) {
    return Response.json({ unlocked: true })
  }

  const body = await request.json()
  if ((body?.password || '').trim() !== password) {
    return Response.json(
      { error: { message: 'Incorrect password.' } },
      { status: 401 }
    )
  }

  return Response.json(
    { unlocked: true },
    {
      headers: {
        'Set-Cookie': 'af_lock=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800',
      },
    }
  )
}
