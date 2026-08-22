/**
 * Dev utility: delete all active LiveKit rooms.
 *
 * Why this exists: LiveKit dispatches an agent when a room is CREATED, and a
 * room lingers for a few minutes after everyone leaves. Re-opening the same
 * interview link inside that window rejoins the already-served room, so no
 * agent joins. Clearing rooms makes every interview token immediately reusable.
 *
 * Testing only — real candidates each have a unique token, so this never occurs
 * in the actual flow.
 */
import { RoomServiceClient } from "livekit-server-sdk";
import { config } from "../src/config";

const client = new RoomServiceClient(
  config.LIVEKIT_URL.replace(/^wss:/, "https:"),
  config.LIVEKIT_API_KEY,
  config.LIVEKIT_API_SECRET,
);

async function main() {
  const rooms = await client.listRooms();
  if (rooms.length === 0) {
    console.log("No active rooms — every interview token is already reusable.");
    return;
  }
  for (const room of rooms) {
    const participants = await client.listParticipants(room.name);
    const who = participants.map((p) => p.identity).join(", ") || "none";
    console.log(`deleting ${room.name} (participants: ${who})`);
    await client.deleteRoom(room.name);
  }
  console.log(`Cleared ${rooms.length} room(s).`);
}

main().catch((err) => {
  console.error("Failed to clear rooms:", err.message);
  process.exit(1);
});
