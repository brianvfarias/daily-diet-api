import { FastifyInstance } from 'fastify';
import { db } from '../database';
import { z } from 'zod';
import crypto from 'node:crypto';
import { checkIfSessionIDExists } from '../middlewares/check-session-id-existance';

const table = 'meals';

interface BelongsToDiet {
  belongs_to_diet: boolean;
}

export async function mealRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [checkIfSessionIDExists],
    },
    async (req, res) => {
      const { sessionID } = req.cookies;
      const mealsList = await db(table)
        .select('*')
        .where('session_id', sessionID);
      res.send(mealsList);
    }
  );

  app.get(
    '/:meal_id',
    {
      preHandler: [checkIfSessionIDExists],
    },
    async (req, res) => {
      const { sessionID } = req.cookies;
      const getMealParams = z.object({
        meal_id: z.string(),
      });
      const { meal_id } = getMealParams.parse(req.params);
      const searchedMeal = await db
        .select()
        .from(table)
        .where({ meal_id })
        .andWhere('session_id', sessionID)
        .first();
      res.send(searchedMeal);
    }
  );

  app.post('/', async (req, res) => {
    const mealCreationSchema = z.object({
      meal_name: z.string(),
      meal_desc: z.string(),
      belongs_to_diet: z.boolean().default(true),
      meal_time: z.string().default(''),
    });
    const { meal_name, meal_desc, belongs_to_diet, meal_time } =
      mealCreationSchema.parse(req.body);

    let sessionID = req.cookies.sessionID;

    if (!sessionID) {
      sessionID = crypto.randomUUID();
      res.cookie('sessionID', sessionID, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });
    }

    await db(table).insert({
      meal_id: crypto.randomUUID(),
      meal_name,
      meal_desc,
      meal_time: meal_time
        ? db.raw(
            `TO_TIMESTAMP(?, 'DD/MM/YYYY, HH24:MI:SS')`,
            new Date(meal_time).toLocaleString('pt-BR')
          )
        : db.fn.now(0),
      belongs_to_diet,
      session_id: sessionID,
    });
    res.send('New meal added!');
  });

  app.put(
    '/:meal_id',
    {
      preHandler: [checkIfSessionIDExists],
    },
    async (req, res) => {
      const { sessionID } = req.cookies;
      const updateMealParams = z.object({
        meal_id: z.string(),
      });

      const { meal_id } = updateMealParams.parse(req.params);
      let record = await db
        .select()
        .from(table)
        .where({ meal_id })
        .andWhere('session_id', sessionID)
        .first();

      if (!record) return res.send('No record found!');

      const updateMealSchema = z.object({
        meal_name: z.string().default(''),
        meal_desc: z.string().default(''),
        belongs_to_diet: z.boolean().default(record.belongs_to_diet),
        meal_time: z.string().default(''),
      });

      const data = updateMealSchema.parse(req.body);
      console.log('data: ', data);
      for (let key in data) {
        console.log(
          key,
          'data[key]:' + data[key],
          'record[key]:' + record[key]
        );
        if (typeof data[key] === 'boolean' && data[key] != record[key]) {
          record[key] = data[key];
        } else if (data[key] && data[key] != record[key]) {
          record[key] = data[key];
        }
      }
      console.log(record);
      await db(table).where({ meal_id }).update(record);

      res.send('Meal updated!');
    }
  );

  app.delete(
    '/:meal_id',
    {
      preHandler: [checkIfSessionIDExists],
    },
    async (req, res) => {
      const { sessionID } = req.cookies;
      const deleteMealParams = z.object({
        meal_id: z.string(),
      });

      const { meal_id } = deleteMealParams.parse(req.params);

      await db
        .delete()
        .from(table)
        .where({ meal_id })
        .andWhere('session_id', sessionID);
      res.send('Meal deleted successfully!');
    }
  );

  app.get(
    '/analytics',
    {
      preHandler: [checkIfSessionIDExists],
    },
    async (req, res) => {
      const { sessionID } = req.cookies;
      if (sessionID) {
        const meals = await db
          .select('belongs_to_diet')
          .from('meals')
          .where('session_id', sessionID)
          .orderBy('meal_time');
        // let streak: BelongsToDiet[] = []
        let streaks = meals.reduce(
          (streaks, item) => {
            let index = streaks.length > 0 ? streaks.length - 1 : 0;
            if (item.belongs_to_diet) {
              streaks[index] = streaks[index] + 1;
            } else {
              streaks.push(0);
            }
            return streaks;
          },
          [0]
        );
        console.log(streaks);

        const { rows } = await db.raw(
          'SELECT session_id, belongs_to_diet, COUNT(meal_id) as total_meals FROM meals WHERE session_id = ? GROUP BY session_id, belongs_to_diet;',
          sessionID
        );
        const analytics = rows.reduce(
          (acc, row) => {
            acc.total_meals = Number(row.total_meals) + acc.total_meals;
            if (row.belongs_to_diet === true)
              acc.clean_meals = Number(row.total_meals);
            if (row.belongs_to_diet === false)
              acc.junk_meals = Number(row.total_meals);
            return acc;
          },
          {
            total_meals: 0,
            clean_meals: 0,
            junk_meals: 0,
          }
        );
        res.send({
          higgest_streak: Math.max(...streaks),
          analytics,
        });
      }
      res.send('No user found with this ID!');
    }
  );
}
