import { createRouter } from "@/server/lib/openapi/router";
import { loginRouter } from "@/server/routes/auth/login";
import { verifyRouter } from "@/server/routes/auth/verify";

export const authRouter = createRouter()
    .route("/login", loginRouter)
    .route("/verify", verifyRouter);
