import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIgnoredAccountDescriptionIssue,
  isIgnorableAccountDescriptionError,
} from './demonstracoesUploadValidation.js'

test('permite ignorar somente descrição ausente para uma conta específica', () => {
  const message = 'Descrição não encontrada para a conta 40721.'

  assert.equal(isIgnorableAccountDescriptionError(message), true)
  assert.deepEqual(buildIgnoredAccountDescriptionIssue({ row: 7, code: '40721', message }), {
    row: 7,
    codigo: '40721',
    motivo: message,
  })
})

test('mantém os demais erros de validação como bloqueantes', () => {
  assert.equal(isIgnorableAccountDescriptionError('cd_conta_contabil é obrigatório.'), false)
  assert.equal(isIgnorableAccountDescriptionError('Descrição não encontrada para a conta 40721'), false)
  assert.equal(isIgnorableAccountDescriptionError('Descrição não encontrada para a conta 40721. Outro erro.'), false)
})
