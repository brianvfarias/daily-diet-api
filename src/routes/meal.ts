import { FastifyInstance } from 'fastify'
import { db } from '../database'
import { z } from 'zod'
import crypto from 'node:crypto'
import { checkIfSessionIDExists } from '../middlewares/check-session-id-existance'

const table = 'daily_diet'

export async function mealRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [checkIfSessionIDExists],
    },
    async (req, res) => {
      const { sessionID } = req.cookies
      const mealsList = await db(table)
        .select('*')
        .where('session_id', sessionID)
      res.send(mealsList)
    }
  )

  app.get(
    '/:meal_id',
    {
      preHandler: [checkIfSessionIDExists],
    },
    async (req, res) => {
      const { sessionID } = req.cookies
      const getMealParams = z.object({
        meal_id: z.coerce.number(),
      })
      const { meal_id } = getMealParams.parse(req.params)
      const searchedMeal = await db
        .select()
        .from(table)
        .where({ meal_id })
        .andWhere('session_id', sessionID)
        .first()
      res.send(searchedMeal)
    }
  )

  app.post('/', async (req, res) => {
    const mealCreationSchema = z.object({
      meal_name: z.string(),
      meal_desc: z.string(),
      belongs_to_diet: z.boolean().default(true),
      date_and_time: z.string().default(''),
    })
    const { meal_name, meal_desc, belongs_to_diet, date_and_time } =
      mealCreationSchema.parse(req.body)

    let sessionID = req.cookies.sessionID

    if (!sessionID) {
      sessionID = crypto.randomUUID()
      res.cookie('sessionID', sessionID, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      })
    }

    await db(table).insert({
      meal_name,
      meal_desc,
      date_and_time: date_and_time
        ? db.raw(
            `TO_TIMESTAMP(?, 'DD/MM/YYYY, HH24:MI:SS')`,
            new Date(date_and_time).toLocaleString('pt-BR')
          )
        : db.fn.now(0),
      belongs_to_diet,
      session_id: sessionID,
    })

    res.send('New meal added!')
  })

  app.put(
    '/:meal_id',
    {
      preHandler: [checkIfSessionIDExists],
    },
    async (req, res) => {
      const { sessionID } = req.cookies
      const updateMealParams = z.object({
        meal_id: z.coerce.number(),
      })

      const { meal_id } = updateMealParams.parse(req.params)
      let record = await db
        .select()
        .from(table)
        .where({ meal_id })
        .andWhere('session_id', sessionID)
        .first()

      const updateMealSchema = z.object({
        meal_name: z.string().default(''),
        meal_desc: z.string().default(''),
        belongs_to_diet: z.boolean().default(record.belongs_to_diet),
        date_and_time: z.string().default(''),
      })

      const data = updateMealSchema.parse(req.body)
      console.log('data: ', data)
      for (let key in data) {
        console.log(key, 'data[key]:' + data[key], 'record[key]:' + record[key])
        if (typeof data[key] === 'boolean' && data[key] != record[key]) {
          record[key] = data[key]
        } else if (data[key] && data[key] != record[key]) {
          record[key] = data[key]
        }
      }
      console.log(record)
      await db(table).where({ meal_id }).update(record)

      res.send('Meal updated!')
    }
  )

  app.delete(
    '/:meal_id',
    {
      preHandler: [checkIfSessionIDExists],
    },
    async (req, res) => {
      const { sessionID } = req.cookies
      const deleteMealParams = z.object({
        meal_id: z.coerce.number(),
      })

      const { meal_id } = deleteMealParams.parse(req.params)

      await db
        .delete()
        .from(table)
        .where({ meal_id })
        .andWhere('session_id', sessionID)
      res.send('Meal deleted successfully!')
    }
  )
}
