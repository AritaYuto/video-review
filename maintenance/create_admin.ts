import readline from "readline-sync";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = readline.question("Admin email: ");
const password = readline.question("Password: ", {hideEchoBack: true});
const hash = await bcrypt.hash(password, 10);

await prisma.identity.create({
    data: {
        provider: "password",
        providerUid: email,
        secretHash: hash,
        user: {
            connect: { email },
        },
    },
});
console.log("Admin account created.");