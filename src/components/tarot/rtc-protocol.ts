export type RoomRole = "guest" | "operator";
export type SignalKind =
  "guest-request" | "guest-accepted" | "offer" | "answer" | "participant-left";
export interface RoomSignal {
  id: number;
  room: string;
  from: string;
  to: string;
  kind: SignalKind;
  payload: { name?: string; description?: RTCSessionDescriptionInit };
}
export interface RoomParticipant {
  id: string;
  name: string;
  stream: MediaStream | null;
  state: RTCPeerConnectionState;
}
