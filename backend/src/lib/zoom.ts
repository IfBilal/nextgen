let _tokenCache: { token: string; expiresAt: number } | null = null

async function getZoomAccessToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) return _tokenCache.token
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )
  const data = await res.json() as { access_token?: string; expires_in?: number; error?: string; reason?: string }
  if (!data.access_token) {
    console.error('[zoom] Token fetch failed:', JSON.stringify(data))
    throw new Error(`Zoom token error: ${data.error ?? data.reason ?? 'unknown'}`)
  }
  _tokenCache = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000 }
  return _tokenCache.token
}

export async function getZoomStartUrl(meetingId: string): Promise<string> {
  if (!process.env.ZOOM_ACCOUNT_ID || !process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    return `https://zoom.us/s/${meetingId}`
  }
  const token = await getZoomAccessToken()
  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as { start_url?: string; code?: number; message?: string }
  if (!data.start_url) {
    console.error('[zoom] get meeting failed:', JSON.stringify(data))
    throw new Error(`Zoom get meeting failed: ${data.message ?? data.code ?? 'unknown'}`)
  }
  return data.start_url
}

export async function createZoomMeeting(
  topic: string,
  scheduledAt: string,
  durationMinutes: number,
  alternativeHostEmail?: string
): Promise<{ meetingId: string; joinUrl: string; startUrl: string }> {
  // Use placeholder when credentials are not configured
  if (!process.env.ZOOM_ACCOUNT_ID || !process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    const id = String(Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000)
    return { meetingId: id, joinUrl: `https://zoom.us/j/${id}`, startUrl: `https://zoom.us/s/${id}` }
  }

  const token = await getZoomAccessToken()
  const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: scheduledAt,
      duration: durationMinutes,
      settings: {
        join_before_host: false,
        waiting_room: true,
        mute_upon_entry: true,
        auto_recording: 'cloud',
        ...(alternativeHostEmail ? { alternative_hosts: alternativeHostEmail } : {}),
      },
    }),
  })
  const meeting = await res.json() as { id?: number; join_url?: string; start_url?: string; code?: number; message?: string }
  if (!meeting.id || !meeting.join_url || !meeting.start_url) {
    console.error('[zoom] createMeeting failed:', JSON.stringify(meeting))
    throw new Error(`Zoom meeting creation failed: ${meeting.message ?? meeting.code ?? 'unknown error'}`)
  }
  return {
    meetingId: String(meeting.id),
    joinUrl:   meeting.join_url,
    startUrl:  meeting.start_url,
  }
}
