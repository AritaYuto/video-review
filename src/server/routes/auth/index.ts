import { createRouter } from "@/server/lib/openapi/router";
import { loginRouter } from "@/server/routes/auth/login";
import { verifyRouter } from "@/server/routes/auth/verify";
import { logoutRouter } from "@/server/routes/auth/logout";

export const authRouter = createRouter()
    .route("/login", loginRouter)
    .route("/verify", verifyRouter)
    .route("/logout", logoutRouter);
