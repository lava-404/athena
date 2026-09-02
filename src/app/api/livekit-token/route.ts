import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

// Not called by the current MVP UI — the vertical slice ships with local
// video only, so nothing here is exercised yet. Wired up and left in place
// so multi-participant rooms are a config change away, not a rebuild:
// once LIVEKIT_API_KEY/SECRET/URL are set and the room page requests a
// token from this route on join, swap the local <video> tile for a
// LiveKit Room/RoomAudioRenderer/participant tiles.
export async function POST(req: NextRequest) {
  const { roomId, identity } = await req.json();

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LiveKit is not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET." },
      { status: 501 }
    );
  }

  if (!roomId || !identity) {
    return NextResponse.json({ error: "roomId and identity are required" }, { status: 400 });
  }

  const token = new AccessToken(apiKey, apiSecret, { identity });
  token.addGrant({ room: roomId, roomJoin: true, canPublish: true, canSubscribe: true });

  return NextResponse.json({ token: await token.toJwt() });
}
