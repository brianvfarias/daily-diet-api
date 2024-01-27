import { afterAll, beforeAll, it, describe, expect, beforeEach } from 'vitest';
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
      cookies = creationResponse.headers['set-cookie'];
      expect(creationResponse.headers['set-cookie']).toSatisfy(properSessionID);
    });

    it(`Should create meals that don't have "belongs_to_diet"`, async () => {
      const creationResponse = await supertest(app.server)
        .post('/meal')
        .set('Cookie', [...cookies])
        .send({
          meal_name: 'Test 1',
          meal_desc: 'Meal description for this test',
          // meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        })
        .expect(200);
    });

    it('Should create a new meal when all fields are passed', async () => {
      const creationResponse = await supertest(app.server)
        .post('/meal')
        .set('Cookie', [...cookies])
        .send({
          meal_name: 'Test 1',
          meal_desc: 'Meal description for this test',
          meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        })
        .expect(200)
        .expect('New meal added!');
    });
  });

  // describe('PUT /meal', () => {
  //   it('should not update if there is no session_id', async () => {
  //     const updateclient;
  //   });
  // });
});
