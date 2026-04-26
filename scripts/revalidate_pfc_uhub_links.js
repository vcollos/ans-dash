import admin from 'firebase-admin'
import { isInactiveUhubPerson, APPROVAL_STATUS } from '../server/uhubOnboarding.js'

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT
const FIREBASE_SERVICE_ACCOUNT_PATH = String(process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '').trim()
const UHUB_API_BASE_URL = String(process.env.UHUB_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
const UHUB_API_TOKEN = String(process.env.UHUB_API_TOKEN ?? '').trim()
const PFC_ONBOARDING_COLLECTION = process.env.PFC_ONBOARDING_COLLECTION ?? 'pfc_users_uhub_link'
const LIMIT = Number(process.env.PFC_REVALIDATE_LIMIT ?? 500)

async function initFirebase() {
  const options = {}
  if (FIREBASE_PROJECT_ID) options.projectId = FIREBASE_PROJECT_ID
  if (FIREBASE_SERVICE_ACCOUNT_PATH) {
    const fs = await import('fs')
    const raw = fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
    options.credential = admin.credential.cert(JSON.parse(raw))
  }
  if (!admin.apps.length) admin.initializeApp(options)
}

async function uhubPessoaByKey(id) {
  const response = await fetch(`${UHUB_API_BASE_URL}/api/external/catalogo/pessoas/by-key`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UHUB_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`UHub HTTP ${response.status}`)
  return response.json()
}

async function main() {
  if (!UHUB_API_BASE_URL || !UHUB_API_TOKEN) {
    throw new Error('Configure UHUB_API_BASE_URL e UHUB_API_TOKEN.')
  }
  await initFirebase()
  const db = admin.firestore()
  const snapshot = await db
    .collection(PFC_ONBOARDING_COLLECTION)
    .where('uhub_pessoa_id', '!=', null)
    .limit(LIMIT)
    .get()

  let ok = 0
  let review = 0
  for (const doc of snapshot.docs) {
    const data = doc.data()
    const person = await uhubPessoaByKey(data.uhub_pessoa_id).catch(() => null)
    if (person && !isInactiveUhubPerson(person)) {
      await doc.ref.set({ uhub_revalidado_em: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
      ok += 1
      continue
    }
    await doc.ref.set(
      {
        status_aprovacao: APPROVAL_STATUS.PENDING_REVIEW,
        approval_reason: 'uhub_revalidacao_falhou',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    review += 1
  }
  console.log(JSON.stringify({ checked: snapshot.size, ok, pending_review: review }))
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

