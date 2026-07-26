import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { errorHandler } from '@middleware/errorHandler'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 5000

// global middleware
app.use(helmet())
app.use(cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true  // required for cookies
}))
app.use(express.json())
app.use(cookieParser())

// health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
    console.log(`Duka server running on port ${PORT}`)
})

export default app