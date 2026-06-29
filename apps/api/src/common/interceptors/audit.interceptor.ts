import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditService } from "../../modules/audit/audit.service";
import type { AuditAction } from "@aqua/database";

// Map HTTP method → audit action (string literal — Prisma enum module-load bog'liqligisiz)
const METHOD_ACTION: Record<string, AuditAction | null> = {
  POST: "CREATE",
  PATCH: "UPDATE",
  PUT: "UPDATE",
  DELETE: "DELETE",
  GET: null, // don't log reads
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const action = METHOD_ACTION[req.method];

    // Only log mutating requests for authenticated users
    if (!action || !req.user) return next.handle();

    // Extract entity name from URL: /api/v1/customers/:id → "customers"
    const segments = (req.path || req.url).split("/").filter(Boolean);
    const apiIdx = segments.indexOf("v1");
    const entity = apiIdx >= 0 ? segments[apiIdx + 1] : segments[2] || "unknown";

    // Skip auth endpoints (sensitive)
    if (entity === "auth") return next.handle();

    return next.handle().pipe(
      tap((response) => {
        this.auditService.log({
          userId: req.user.sub,
          action,
          entity,
          entityId: response?.id || req.params?.id,
          newData: action !== "DELETE" ? this.sanitize(req.body) : undefined,
          ipAddress: req.ip || req.headers["x-forwarded-for"],
          userAgent: req.headers["user-agent"],
        });
      })
    );
  }

  private sanitize(body: any) {
    if (!body || typeof body !== "object") return body;
    const clone = { ...body };
    // Never store passwords
    delete clone.password;
    delete clone.passwordHash;
    return clone;
  }
}
