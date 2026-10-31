import { Server, WebSocketTransport } from "colyseus";
import { ROOM_NAME, SERVER_PORT } from "@tidebound/shared";
import { IslandRoom } from "./rooms/IslandRoom.ts";

const server = new Server({ transport: new WebSocketTransport() });
server.define(ROOM_NAME, IslandRoom);
await server.listen(SERVER_PORT, "0.0.0.0");
console.log(`[tidebound] 서버 시작: ws://0.0.0.0:${SERVER_PORT}`);
