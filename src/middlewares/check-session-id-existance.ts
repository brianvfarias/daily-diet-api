import { FastifyReply, FastifyRequest } from 'fastify'

export async function checkIfSessionIDExists(
  req: FastifyRequest,
  res: FastifyReply //eslint-disable-line
) {
  const sessionID = req.cookies.sessionID

  if (!sessionID) {
    return res.status(401).send({
      error: 'Unathorized access. User not validated',
    })
  }
}
