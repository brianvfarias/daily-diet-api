import {
  afterAll,
  beforeAll,
  it,
  describe,
  expect,
  beforeEach,
  expectTypeOf,
} from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app';
import { db } from '../src/database';
import { execSync } from 'child_process';

const client = supertest(app.server);
let cookies = '';
// const table = 'meals_test';

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
      console.log(cookies);
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
    it.todo('should update the created meal', async () => {
      const creationResponse = await client.post('/meal').send({
        meal_name: 'Test 1',
        meal_desc: 'Meal description for this test',
        meal_time: '23 Jan 2023 12:55',
        belongs_to_diet: true,
      });

      if (creationResponse.statusCode === 200) {
        const rowCreate = db.select('*').from('meals').first();
      }
    });
  });
});
