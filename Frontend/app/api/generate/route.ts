export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const backendBaseUrl = process.env.BACKEND_URL || "http://127.0.0.1:5001"

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${backendBaseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const text = await upstream.text()

    // Pass through upstream response (JSON or otherwise)
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend unavailable"
    return Response.json(
      {
        error: "Failed to reach backend",
        message,
        hint: "Start the Flask server (Backend/app.py) on port 5001.",
      },
      { status: 502 },
    )
  }
}
