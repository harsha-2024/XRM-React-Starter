
import express from 'express'
import { Queue } from 'bullmq'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'

const app = express()
const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/queues')

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const thumbs = new Queue('thumbs', { connection: REDIS_URL })

createBullBoard({ queues:[new BullMQAdapter(thumbs)], serverAdapter })

app.use('/queues', serverAdapter.getRouter())
app.listen(4500, ()=> console.log('Bull-board at http://localhost:4500/queues'))
