import axios from 'axios'
import { Router } from 'express'
import { prisma } from '../db/prisma.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { name, rating, comment, email } = req.body

    if (!name || typeof rating === 'undefined' || !comment) {
      res
        .status(400)
        .json({ error: 'BAD_REQUEST', message: 'Name, rating, and comment are required.' })
      return
    }

    const ratingNum = Number(rating)
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res
        .status(400)
        .json({ error: 'BAD_REQUEST', message: 'Rating must be a number between 1 and 5.' })
      return
    }

    // 1. Store locally in database
    const review = await prisma.review.create({
      data: {
        name,
        rating: ratingNum,
        comment,
        email: email || null,
      },
    })

    // 2. Forward response to Google Form if configured
    const googleFormUrl = process.env.GOOGLE_FORM_URL
    if (googleFormUrl) {
      try {
        const entryName = process.env.GOOGLE_FORM_ENTRY_NAME || 'entry.1000001'
        const entryRating = process.env.GOOGLE_FORM_ENTRY_RATING || 'entry.1000002'
        const entryComment = process.env.GOOGLE_FORM_ENTRY_COMMENT || 'entry.1000003'
        const entryEmail = process.env.GOOGLE_FORM_ENTRY_EMAIL || 'entry.1000004'

        const params = new URLSearchParams()
        params.append(entryName, name)
        params.append(entryRating, ratingNum.toString())
        params.append(entryComment, comment)
        if (email) {
          params.append(entryEmail, email)
        }

        await axios.post(googleFormUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      } catch (err: any) {
        console.error('[Google Form Integration] Failed to forward review:', err.message)
      }
    }

    res.status(201).json(review)
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message })
  }
})

router.get('/', async (_req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json(reviews)
  } catch (error: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: error.message })
  }
})

export default router
