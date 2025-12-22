import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/admin/user:
 *   post:
 *     summary: Create initial admin user
 *     description: >
 *       Create an admin user for initial setup.
 *       This endpoint is intended to be used only once.
 *       If an admin user already exists, the request will be rejected.
 *     parameters:
 *       - in: header
 *         name: x-maintenance-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Maintenance token required for admin provisioning
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - pass
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               pass:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Admin user successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: Forbidden (invalid maintenance token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       410:
 *         description: Admin already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Failed to create admin user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
export async function POST(req: Request) {
    if (req.headers.get("x-maintenance-token") !== process.env.ADMIN_MAINTENANCE_TOKEN) {
        return apiError("Forbidden", 403);
    }

    const { email, pass } = await req.json();
    if (!email || !pass) {
        return apiError("email and pass are required", 400);
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        return apiError("Admin already exists. Skip.", 410);
    }

    const hash = await bcrypt.hash(pass, 10);
    await prisma.user.create({
        data: {
            email,
            displayName: "admin",
            role: "admin",
            identities: {
                create: {
                    provider: "password",
                    providerUid: email,
                    secretHash: hash,
                },
            },
        },
    });
    return NextResponse.json({success: true}, { status: 200 });
}
