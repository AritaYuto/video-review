import { Hono } from "hono";
import { loginRouter } from "./login";
import { verifyRouter } from "./verify";

export const authRouter = new Hono();

authRouter.route("/login", loginRouter);
authRouter.route("/verify", verifyRouter);