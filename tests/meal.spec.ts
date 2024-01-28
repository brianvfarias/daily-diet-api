import { afterAll, beforeAll, it, describe, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app';
import { db } from '../src/database';
import { execSync } from 'child_process';

const client = supertest(app.server);
describe('Meal routes', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all');
    execSync('npm run knex migrate:latest');
  });

  describe('POST /meal Should validate required fields before creation', () => {
    function properSessionID(cookies: Array<string>) {
      return cookies?.some(
        (cookie) => cookie.includes('sessionID=') && cookie.length > 25
      );
    }
    it(`Should not create meals that don't have "meal_name"`, async () => {
      const creationResponse = await client
        .post('/meal')
        .send({
          meal_desc: 'Meal description for this test',
          meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        })
        .expect(500);
    });

    it(`Should create meals that don't have "meal_time"`, async () => {
      const creationResponse = await supertest(app.server).post('/meal').send({
        meal_name: 'Test 1',
        meal_desc: 'Meal description for this test',
        // meal_time: '23 Jan 2023 12:55',
        belongs_to_diet: true,
      });

      expect(creationResponse.statusCode).toEqual(200);
      expect(creationResponse.headers['set-cookie']).toSatisfy(properSessionID);
      const selectCount = await db.select().count('*').from('meals').first();
      expect(selectCount?.count).toEqual('1');

      const createdRow = await db
        .select('meal_name', 'meal_desc', 'belongs_to_diet')
        .from('meals');
      expect(createdRow).toEqual([
        expect.objectContaining({
          meal_name: 'Test 1',
          meal_desc: 'Meal description for this test',
          belongs_to_diet: true,
        }),
      ]);
    });

    it(`Should create meals that don't have "belongs_to_diet"`, async () => {
      const creationResponse = await supertest(app.server)
        .post('/meal')
        .send({
          meal_name: 'Test 1',
          meal_desc: 'Meal description for this test',
          meal_time: '23 Jan 2023 12:55',
          // belongs_to_diet: true,
        })
        .expect(200);
      expect(creationResponse.headers['set-cookie']).toSatisfy(properSessionID);
      const selectCount = await db.select().count('*').from('meals').first();
      expect(selectCount?.count).toEqual('1');

      const createdRow = await db
        .select('meal_name', 'meal_desc', 'belongs_to_diet', 'meal_time')
        .from('meals');
      const rawTime = await db.raw(
        `SELECT TO_TIMESTAMP(?, 'DD/MM/YYYY, HH24:MI:SS')`,
        new Date('23 Jan 2023 12:55').toLocaleString('pt-BR')
      );
      const expectedTime = rawTime.rows[0].to_timestamp;
      expect(createdRow).toEqual([
        expect.objectContaining({
          meal_name: 'Test 1',
          meal_desc: 'Meal description for this test',
          meal_time: expectedTime,
          belongs_to_diet: true,
        }),
      ]);
    });

    it('Should create a new meal when all fields are passed', async () => {
      const creationResponse = await supertest(app.server)
        .post('/meal')
        .send({
          meal_name: 'Test 1',
          meal_desc: 'Meal description for this test',
          meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        })
        .expect(200)
        .expect('New meal added!');

      expect(creationResponse.headers['set-cookie']).toSatisfy(properSessionID);
      const selectCount = await db.select().count('*').from('meals').first();
      expect(selectCount?.count).toEqual('1');

      const createdRow = await db
        .select('meal_name', 'meal_desc', 'belongs_to_diet', 'meal_time')
        .from('meals');

      const rawTime = await db.raw(
        `SELECT TO_TIMESTAMP(?, 'DD/MM/YYYY, HH24:MI:SS')`,
        new Date('23 Jan 2023 12:55').toLocaleString('pt-BR')
      );
      const expectedTime = rawTime?.rows[0].to_timestamp;
      expect(createdRow).toEqual([
        expect.objectContaining({
          meal_name: 'Test 1',
          meal_desc: 'Meal description for this test',
          meal_time: expectedTime,
          belongs_to_diet: true,
        }),
      ]);
    });
  });

  describe('PUT /meal', () => {
    it('should update meals with the info passed in the PUT body', async () => {
      const creationResponse = await client.post('/meal').send({
        meal_name: 'Test 1',
        meal_desc: 'Meal description for this test',
        meal_time: '23 Jan 2023 12:55',
        belongs_to_diet: true,
      });
      let rowCreate;

      if (creationResponse.statusCode === 200) {
        rowCreate = await db.select('*').from('meals').first();
        console.log(rowCreate);
      }
      const cookies = creationResponse.headers['set-cookie'];

      const updateResponse = await client
        .put(`/meal/${rowCreate?.meal_id}`)
        .set('Cookie', cookies)
        .send({
          meal_name: 'Meal Name Update',
          meal_desc: 'Meal description update',
          // meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        })
        .expect(200)
        .expect('Meal updated!');

      const updateRow = await db
        .select()
        .from('meals')
        .where('meal_id', rowCreate?.meal_id);

      expect(updateRow).toEqual([
        expect.objectContaining({
          meal_id: rowCreate.meal_id,
          meal_name: 'Meal Name Update',
          meal_desc: 'Meal description update',
          // meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        }),
      ]);
    });

    it('should not update the meal record if user is not validate by session_id', async () => {
      const creationResponse = await client.post('/meal').send({
        meal_name: 'Test 1',
        meal_desc: 'Meal description for this test',
        meal_time: '23 Jan 2023 12:55',
        belongs_to_diet: true,
      });
      let rowCreate;

      if (creationResponse.statusCode === 200) {
        rowCreate = await db.select('*').from('meals').first();
        console.log(rowCreate);
      }
      const cookies = creationResponse.headers['set-cookie'];

      const updateResponse = await client
        .put(`/meal/${rowCreate?.meal_id}`)
        .send({
          meal_name: 'Meal Name Update',
          meal_desc: 'Meal description update',
          // meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        })
        .expect(401);

      const updateRow = await db
        .select()
        .from('meals')
        .where('meal_id', rowCreate?.meal_id);

      expect(updateRow.length).toEqual(1);
      expect(updateRow[0]).toEqual(rowCreate);
    });
  });

  describe('GET /meal', () => {
    it('should bring every meal created', async () => {
      const creationResponse = await client.post('/meal').send({
        meal_name: 'Test 1',
        meal_desc: 'Meal description for test 1',
        meal_time: '23 Jan 2023 12:55',
        belongs_to_diet: true,
      });

      const cookies = creationResponse.headers['set-cookie'];

      await client.post('/meal').set('Cookie', cookies).send({
        meal_name: 'Test 2',
        meal_desc: 'Meal description for test 2',
        meal_time: '26 Jan 2023 12:55',
        belongs_to_diet: false,
      });

      await client.post('/meal').set('Cookie', cookies).send({
        meal_name: 'Test 3',
        meal_desc: 'Meal description for test 3',
        meal_time: '28 Jan 2023 12:55',
        belongs_to_diet: true,
      });

      const getMealsResponse = await client
        .get('/meal')
        .set('Cookie', cookies)
        .expect(200);
      const responseBody = JSON.parse(getMealsResponse.text);
      expect(responseBody.length).toEqual(3);
    });

    it('should not bring meals if user is not validated by session_id', async () => {
      const creationResponse = await client.post('/meal').send({
        meal_name: 'Test 1',
        meal_desc: 'Meal description for this test',
        meal_time: '23 Jan 2023 12:55',
        belongs_to_diet: true,
      });

      const cookies = creationResponse.headers['set-cookie'];

      const getMealResponse = await client.get(`/meal`).expect(401).expect({
        error: 'Unathorized access. User not validated',
      });
    });

    it('should bring only the meal with the meal_id passed', async () => {
      const creationResponse = await client.post('/meal').send({
        meal_name: 'Test 1',
        meal_desc: 'Meal description for this test',
        meal_time: '23 Jan 2023 12:55',
        belongs_to_diet: true,
      });
      let rowCreated;
      if (creationResponse.statusCode === 200) {
        rowCreated = await db.select().from('meals').first();
      }

      const cookies = creationResponse.headers['set-cookie'];

      const getMealResponse = await client
        .get(`/meal/${rowCreated?.meal_id}`)
        .set('Cookie', cookies)
        .expect(200);

      let responseBody = JSON.parse(getMealResponse.text);
      responseBody.meal_time = new Date(responseBody.meal_time);
      expect(responseBody).toEqual(rowCreated);
    });

    it('should not bring the meal with the meal_id passed if user is not validated by sesssion_id', async () => {
      const creationResponse = await client.post('/meal').send({
        meal_name: 'Test 1',
        meal_desc: 'Meal description for this test',
        meal_time: '23 Jan 2023 12:55',
        belongs_to_diet: true,
      });
      let rowCreated;
      if (creationResponse.statusCode === 200) {
        rowCreated = await db.select().from('meals').first();
      }

      const cookies = creationResponse.headers['set-cookie'];

      const getMealResponse = await client
        .get(`/meal/${rowCreated?.meal_id}`)
        .expect(401)
        .expect({
          error: 'Unathorized access. User not validated',
        });

      // let responseBody = JSON.parse(getMealResponse.text);
      // console.log(responseBody);
      // expect(responseBody).toBeFalsy();
    });
  });
});
