import { AccessToken } from "livekit-server-sdk";
import { config } from "../config";

interface MintOptions {
  identity: string;
  roomName: string;
  metadata: string;
  ttlSeconds?: number;
}

// Mints a short-lived room-join token. The API secret is used here and never
// leaves the backend — callers only ever hand the resulting JWT to a client.
export async function mintRoomToken({
  identity,
  roomName,
  metadata,
  ttlSeconds = 60 * 60,
}: MintOptions): Promise<string> {
  const at = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, {
    identity,
    metadata,
    ttl: ttlSeconds,
  });
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
  return at.toJwt();
}
