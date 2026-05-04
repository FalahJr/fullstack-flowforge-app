import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import {
  WorkflowEventsService,
  WorkflowEventPayload,
} from "../events/workflow-events.service";

@WebSocketGateway({
  namespace: "/ws",
  cors: {
    origin: "*",
  },
})
export class WorkflowGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly events: WorkflowEventsService) {}

  afterInit() {
    this.events.on("workflow.started", (payload) =>
      this.broadcast("workflow.started", payload),
    );
    this.events.on("workflow.completed", (payload) =>
      this.broadcast("workflow.completed", payload),
    );
    this.events.on("step.started", (payload) =>
      this.broadcast("step.started", payload),
    );
    this.events.on("step.success", (payload) =>
      this.broadcast("step.success", payload),
    );
    this.events.on("step.failed", (payload) =>
      this.broadcast("step.failed", payload),
    );
  }

  @SubscribeMessage("join")
  handleJoin(
    @MessageBody() payload: { tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (payload?.tenantId) {
      const room = this.roomName(payload.tenantId);
      client.join(room);
      return { success: true, room };
    }

    return { success: false, message: "tenantId diperlukan" };
  }

  private broadcast(event: string, payload: WorkflowEventPayload) {
    if (payload.tenantId) {
      this.server.to(this.roomName(payload.tenantId)).emit(event, payload);
    } else {
      this.server.emit(event, payload);
    }
  }

  private roomName(tenantId: string) {
    return `tenant:${tenantId}`;
  }
}
