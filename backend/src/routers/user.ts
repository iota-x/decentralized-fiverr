import { Router } from "express";
import jwt from 'jsonwebtoken';
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { JWT_SECRET } from "..";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { createTaskInput } from "./types";

const DEFAULT_TITLE = "Select the most clickable thumbnail";

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: "ap-south-1"
})

const router = Router();
const prismaClient = new PrismaClient();

router.get("/task", authMiddleware, async (req, res) => {
    //@ts-ignore
    const taskId: string = req.query.taskId;
    //@ts-ignore
    const userId: string = req.userId;

    const taskDetails = await prismaClient.task.findFirst({
        where: {
            user_id: Number(userId),
            id: Number(taskId)
            },
            include: {
                options: true
            }
    })
    if (!taskDetails) {
        return res.status(411).json({ 
            msg: "You don't have access to this task"
        });
    }

    //make it faster
    const responses = await prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId)
        },
        include: {
            option: true
        }
    });

    const result: Record<string, {
        count: number;
        option: {
            imageUrl: string
        }
    }> = {};

    taskDetails.options.forEach(option => {
        result[option.id] = {
            count: 0,
            option: {
                imageUrl: option.image_url
            }
        }
    });

    responses.forEach(r => {
        result[r.option_id].count++;
    });

    res.json({
        result
    })
})

router.post("/task", authMiddleware, async (req, res) => {

    //@ts-ignore
    const userId = req.userId
    // validating the inputs from user (zod)
    const body = req.body;

    const parseData = createTaskInput.safeParse(body);

    if(!parseData.success) {
        return res.status(411).json({
            msg: "You've sent the wrong inputs"
        })
    }

    //parse the signature here to ensure the person has paid

    let response = await prismaClient.$transaction(async tx => {
        const response = await tx.task.create({
            data: {
                title: parseData.data.title ?? DEFAULT_TITLE,
                amount: "1",
                signature: parseData.data.signature,
                user_id: userId
            }
        });

        await tx.option.createMany({
            data: parseData.data.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        });
        return response;
    });

    res.json({
        id: response.id 
    })
})

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
