import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';
import { workerMiddleware } from "../middleware";
import { WORKER_JWT_SECRET } from "../config";

const prismaClient = new PrismaClient();
const router = Router();

router.get("/nextTask", workerMiddleware, async (req, res) => {
    // @ts-ignore
    const userId = req.userId;

    const task = await prismaClient.task.findFirst({
        where: {
            done: false,
            submissions: {
                none: {
                    worker_id: userId,
                }
            }
        },
        select: {
            title: true,
            options: true
        }
    });
    if (!task) {
        res.status(411).json({
            message: "No tasks available"
        })
    } else {
        res.status(411).json({
            task
        })
    }
})

router.post("/signin", async (req, res) => {
    const hardcodedWalletAddress = "M5vrwrH8rv54Ryt3NqwSA4Fj16vmdKieiM2oYqgSgpa";

    const existingUser = await prismaClient.worker.findFirst({
        where: {
            address: hardcodedWalletAddress
        }
    })

    if (existingUser) {
        const token = jwt.sign({ 
            userId: existingUser.id
        }, WORKER_JWT_SECRET)

        res.json({
            token: token
        })
    } else {
        const user = await prismaClient.worker.create({
            data: {
                address: hardcodedWalletAddress,
                pending_amount: 0,
                locked_amount: 0
            }
        })
        const token = jwt.sign({ 
            userId: user.id
        }, WORKER_JWT_SECRET)
        res.json({
            token: token
            })
    }
});

export default router;

