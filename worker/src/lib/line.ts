export async function pushMessage(
  channelAccessToken: string,
  to: string,
  text: string
): Promise<void> {
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text }],
      }),
    })
    if (!res.ok) {
      console.error('LINE push failed:', res.status, await res.text())
    }
  } catch (err) {
    console.error('LINE push error:', err)
  }
}
