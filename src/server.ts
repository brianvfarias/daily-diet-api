import Fastify from 'fastify'
import { app } from './app'

app.listen({ port: 3000 }, () => {
  console.log('SERVER ON!')
})

// app.get('/', async (req, res) => {
//   const diet = await db('dayli_diet').select('*')
//   res.send(diet)
// })

// app.post('/dbtest', async (req, res) => {
//   const createMealSchema = z.object({
//     meal_name: z.string(),
//     meal_desc: z.string(),
//     belongs_to_diet: z.boolean(),
//   })

//   const { meal_name, meal_desc, belongs_to_diet } = createMealSchema.parse(
//     req.body
//   )

//   const dbresponse = await db('dayli_diet').insert({
//     meal_name,
//     meal_desc,
//     date_and_time: db.fn.now(),
//     belongs_to_diet,
//   })
//   res.send({ message: 'New meal added!' })
// })
