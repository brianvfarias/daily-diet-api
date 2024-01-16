import { FastifyInstance } from 'fastify'
import { db } from '../database'
import { z } from 'zod'

const table = 'daily_diet'

export async function mealRoutes(app: FastifyInstance) {
  app.get('/', async (req, res) => {
    const mealsList = await db(table).select('*')
    res.send(mealsList)
  })

  app.post('/', async (req, res) => {
    const mealCreationSchema = z.object({
      meal_name: z.string(),
      meal_desc: z.string(),
      belongs_to_diet: z.boolean().default(true),
      date_and_time: z.string().default(''),
    })
    const { meal_name, meal_desc, belongs_to_diet, date_and_time } =
      mealCreationSchema.parse(req.body)
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
    })

    res.send('New meal added!')
  })

  app.put('/:meal_id', async (req, res) => {
    const updateMealParams = z.object({
      meal_id: z.coerce.number(),
    })

    const { meal_id } = updateMealParams.parse(req.params)
    let record = await db.select().from(table).where({ meal_id }).first()

    const updateMealSchema = z.object({
      meal_name: z.string().default(''),
      meal_desc: z.string().default(''),
      belongs_to_diet: z.boolean().default(record.belongs_to_diet),
      date_and_time: z.string().default(''),
    })

    const data = updateMealSchema.parse(req.body)

    for (let key in data) {
      if (typeof data[key] === 'boolean' && data[key] != record[key]) {
        record[key] = data[key]
      } else if (data[key] && data[key] != record[key]) {
        record[key] = data[key]
      }
    }
    await db(table).where({ meal_id }).update(record)

    res.send('Meal updated!')
  })
}
