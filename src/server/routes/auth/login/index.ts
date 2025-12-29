import { Hono } from "hono";
import { loginAsAdmin } from "@/routes/auth/login/admin";
import { loginAsGuest } from "@/routes/auth/login/guest";
import { loginWithJira } from "@/routes/integrations/jira/auth";

export const loginRouter = new Hono();

loginRouter.post("/admin",  loginAsAdmin);
loginRouter.post("/guest",  loginAsGuest);
loginRouter.post("/jira",   loginWithJira);