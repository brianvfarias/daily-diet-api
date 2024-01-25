import { afterAll, beforeAll, it, describe, expect } from 'vitest'
import supertest from 'supertest'
import { app } from '../src/app'

describe('Meal routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Should validate required fields before creation', () => {
    it(`Should not create meals that don't have "meal_name"`, async () => {
      const creationResponse = await supertest(app.server)
        .post('/meal')
        .send({
          meal_desc: 'Meal description for this test',
          meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        })
        .expect(500)
    })

    it(`Should create meals that don't have "meal_time"`, async () => {
      const creationResponse = await supertest(app.server)
        .post('/meal')
        .send({
          meal_name: 'Test 1',
          meal_desc: 'Meal description for this test',
          // meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        })
        .expect(200)
    })

    it(`Should create meals that don't have "belongs_to_diet"`, async () => {
      const creationResponse = await supertest(app.server)
        .post('/meal')
        .send({
          meal_name: 'Test 1',
          meal_desc: 'Meal description for this test',
          // meal_time: '23 Jan 2023 12:55',
          belongs_to_diet: true,
        })
        .expect(200)
    })

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
        .expect('New meal added!')
    })
  })
})
