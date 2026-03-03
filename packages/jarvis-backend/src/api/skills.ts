// Story 4.2: Skill Auto-Discovery API Endpoints
import { FastifyInstance } from 'fastify'
import { SkillManager } from '../skills/skillManager'
import { SkillRegistry } from '../skills/skillRegistry'

const skillManager = new SkillManager()
const skillRegistry = new SkillRegistry()

export async function registerSkillRoutes(fastify: FastifyInstance) {
  // POST /api/skills/discover - Discover new skills from execution patterns
  fastify.post('/api/skills/discover', async (request, reply) => {
    try {
      const body = request.body as any
      const squad = body.squad || 'default'
      const executions = body.executions || []

      const result = await skillManager.discoverSkills(executions, squad)
      reply.send({
        status: 'success',
        data: {
          patternsDetected: result.patternsDetected,
          skillsExtracted: result.skillsExtracted,
          registered: result.registered,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to discover skills' })
    }
  })

  // GET /api/skills - Get all discovered skills
  fastify.get('/api/skills', async (_request, reply) => {
    try {
      const skills = skillRegistry.getAllSkills()
      reply.send({
        status: 'success',
        data: {
          total: skills.length,
          skills,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get skills' })
    }
  })

  // GET /api/skills/:id - Get specific skill by ID
  fastify.get('/api/skills/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const skill = skillRegistry.getSkill(id)

      if (!skill) {
        return reply.code(404).send({ status: 'error', message: 'Skill not found' })
      }

      reply.send({
        status: 'success',
        data: skill,
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get skill' })
    }
  })

  // POST /api/skills/:id/deprecate - Deprecate a skill
  fastify.post('/api/skills/:id/deprecate', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as any
      const replacementSkillId = body.replacementSkillId

      const success = skillRegistry.deprecateSkill(id, replacementSkillId)

      if (!success) {
        return reply.code(404).send({ status: 'error', message: 'Skill not found for deprecation' })
      }

      reply.send({
        status: 'success',
        message: `Skill ${id} deprecated successfully`,
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to deprecate skill' })
    }
  })

  // GET /api/skills/stats - Get skill registry statistics
  fastify.get('/api/skills/stats', async (_request, reply) => {
    try {
      const stats = skillRegistry.getStats()
      reply.send({
        status: 'success',
        data: stats,
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get skill stats' })
    }
  })

  // POST /api/skills/register - Manually register a skill
  fastify.post('/api/skills/register', async (request, reply) => {
    try {
      const body = request.body as any
      const squads = body.squads || ['default']

      const entry = skillRegistry.registerSkill(body, squads)

      reply.send({
        status: 'success',
        data: entry,
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to register skill' })
    }
  })

  // GET /api/skills/squad/:squad - Get skills for specific squad
  fastify.get('/api/skills/squad/:squad', async (request, reply) => {
    try {
      const { squad } = request.params as { squad: string }
      const skills = skillRegistry.getSkillsBySquad(squad)

      reply.send({
        status: 'success',
        data: {
          squad,
          total: skills.length,
          skills,
        },
      })
    } catch (error) {
      reply.code(500).send({ status: 'error', message: 'Failed to get squad skills' })
    }
  })
}

export { skillManager, skillRegistry }
