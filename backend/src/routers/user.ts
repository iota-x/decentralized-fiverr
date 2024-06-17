import { Router } from "express";
import jwt from 'jsonwebtoken';
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { JWT_SECRET } from "..";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: "ap-south-1"
})

const router = Router();
const prismaClient = new PrismaClient();

router.get("/presignedUrl", authMiddleware, async (req, res) => {
    // @ts-ignore
    const userId = req.userId;

    const {url, fields } = await createPresignedPost(s3Client, {
        Bucket: "my-decentralized-fiverr",
        Key: `/fiverr/${userId}/${Math.random()}/image.jpg`,
        Conditions: [
            ['content-length-range', 0, 5 * 1024 * 1024] // 5mb max
        ], 
        Fields: {
            'Content-Type': 'image/png'
        },
        Expires: 3600
    })

    res.json({
        preSignedUrl: url,
        fields
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
