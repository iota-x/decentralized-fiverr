import { Router } from "express";
import jwt from 'jsonwebtoken';
import { PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { JWT_SECRET } from "..";
import { authMiddleware } from "../middleware";

const s3Client = new S3Client()

const router = Router();
const prismaClient = new PrismaClient();

router.get("/presignedUrl", authMiddleware, (req, res) => {
    // @ts-ignore
    const userId = req.userId;

    const command = new PutObjectCommand({
        Bucket: "my-decentralized-fiverr",
        Key: `/fiverr/${}`
    })

    const preSignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600
    })

})

router.post("/signin", async (req, res) => {
    const hardcodedWalletAddress = "M5vrwrH8rv54Ryt3NqwSA4Fj16vmdKieiM2oYqgSgpu";

    const existingUser = await prismaClient.user.findFirst({
        where: {
            address: hardcodedWalletAddress
        }
    })

    if (existingUser) {
        const token = jwt.sign({ 
            userId: existingUser.id
        }, JWT_SECRET)

        res.json({
            token: token
        })
    } else {
        const user = await prismaClient.user.create({
            data: {
                address: hardcodedWalletAddress
            }
        })
        const token = jwt.sign({ 
            userId: user.id
        }, JWT_SECRET)
        res.json({
            token: token
            })
    }
});

export default router;
