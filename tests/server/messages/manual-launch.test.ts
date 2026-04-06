import assert from 'node:assert/strict'
import test from 'node:test'
import { AppError } from '../../../server/http/errors'
import {
  buildManualMessageLaunchUrl,
  normalizeWhatsAppDestination,
  renderMessageTemplate,
  resolveMessageChannelDestination,
} from '../../../features/messages/manual-launch'

test('renderMessageTemplate interpolates MVP communication variables', () => {
  const rendered = renderMessageTemplate('Oi {{cliente_nome}}, {{pet_nome}} chega em {{horario}}.', {
    clientName: 'Maria',
    petName: 'Luna',
    appointmentStartAt: new Date('2026-04-01T15:00:00.000Z'),
  })

  assert.match(rendered, /Maria/)
  assert.match(rendered, /Luna/)
  assert.match(rendered, /\d{2}\/\d{2}\/\d{2}/)
})

test('renderMessageTemplate interpolates CRM variables used by Block 6', () => {
  const rendered = renderMessageTemplate(
    'Oferta {{oferta_nome}} para {{cliente_nome}} desde {{ultima_visita}} ({{dias_inativo}} dias).',
    {
      clientName: 'Maria',
      inactivityDays: 93,
      lastCompletedAt: new Date('2026-01-01T15:00:00.000Z'),
      offerName: 'Banho VIP',
    },
  )

  assert.match(rendered, /Banho VIP/)
  assert.match(rendered, /Maria/)
  assert.match(rendered, /93/)
})

test('normalizeWhatsAppDestination adds Brazil country code when needed', () => {
  assert.equal(normalizeWhatsAppDestination('(11) 99999-1234'), '5511999991234')
  assert.equal(normalizeWhatsAppDestination('+55 11 99999-1234'), '5511999991234')
})

test('normalizeWhatsAppDestination rejects invalid numbers', () => {
  assert.throws(
    () => normalizeWhatsAppDestination('1234'),
    (error) =>
      error instanceof AppError &&
      error.code === 'CONFLICT' &&
      error.status === 409 &&
      error.message === 'Client phone is invalid for WhatsApp Web launch.',
  )
})

test('resolveMessageChannelDestination validates the correct channel destination', () => {
  assert.equal(
    resolveMessageChannelDestination({
      channel: 'EMAIL',
      email: 'cliente@petos.test',
    }),
    'cliente@petos.test',
  )

  assert.equal(
    resolveMessageChannelDestination({
      channel: 'WHATSAPP',
      phone: '(11) 99999-1234',
    }),
    '(11) 99999-1234',
  )
})

test('buildManualMessageLaunchUrl creates channel-specific launch URLs', () => {
  const whatsappUrl = buildManualMessageLaunchUrl({
    channel: 'WHATSAPP',
    destination: '(11) 99999-1234',
    messageContent: 'Confirme seu horario.',
  })
  const emailUrl = buildManualMessageLaunchUrl({
    channel: 'EMAIL',
    destination: 'cliente@petos.test',
    messageContent: 'Seu atendimento foi confirmado.',
    subject: 'PetOS',
  })

  assert.match(whatsappUrl, /^https:\/\/wa\.me\/5511999991234\?text=/)
  assert.match(emailUrl, /^mailto:cliente@petos\.test\?/)
  assert.match(emailUrl, /subject=PetOS/)
})

test('buildManualMessageLaunchUrl uses the default email subject when missing', () => {
  const emailUrl = buildManualMessageLaunchUrl({
    channel: 'EMAIL',
    destination: 'cliente@petos.test',
    messageContent: 'Seu atendimento foi confirmado.',
  })

  assert.match(emailUrl, /subject=Atualizacao\+do\+atendimento\+PetOS/)
})
