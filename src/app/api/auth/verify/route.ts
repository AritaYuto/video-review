import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { apiError } from "@/lib/api-response";
import { JwtError, verifyToken } from "@/lib/jwt";

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify JWT token
 *     description: Verifies a JWT token and returns decoded payload if valid.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 decoded:
 *                   type: object
 *       400:
 *         description: Missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to verify token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function POST(req: Request) {
    try {
        const { token } = await req.json();

        if (!token) {
            return apiError("missing token", 400);
        }

        try {
            const decoded = verifyToken(token);
            return NextResponse.json(
                { valid: true, decoded },
                { status: 200 }
            );
        } catch (e) {
            if (e instanceof JwtError) {
                return apiError(e.message, e.status);
            } else {
                return apiError("invalid token", 401);
            }
        }
    } catch {
        return apiError("failed to verify token", 500);
    }
}
