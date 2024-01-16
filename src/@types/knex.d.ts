// eslint-disable-next-line
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    diet: {
      id: string
      name: string
      data_and_time: Date
      belongs_to_diet: boolean
    }
  }
}
