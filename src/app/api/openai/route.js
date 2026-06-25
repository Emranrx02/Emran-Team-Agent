export async function POST(request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: { message: 'OPENAI_API_KEY is not set on the server.' } },
      { status: 500 }
    )
  }

  const { system, messages } = await request.json()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    return Response.json(
      {
        error: {
          message: data?.error?.message || `OpenAI request failed (${res.status})`,
          type: data?.error?.type,
        },
      },
      { status: res.status }
    )
  }

  return Response.json({
    content: data.choices?.[0]?.message?.content || '(no response)',
  })
}
