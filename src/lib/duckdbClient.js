import { AsyncDuckDB, ConsoleLogger, selectBundle } from '@duckdb/duckdb-wasm'
import duckdbMvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import duckdbMvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdbEhWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import duckdbEhWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'

let duckDbPromise
let connectionPromise

async function createDuckDB() {
  const bundles = {
    mvp: {
      mainModule: duckdbMvpWasm,
      mainWorker: duckdbMvpWorker,
    },
    eh: {
      mainModule: duckdbEhWasm,
      mainWorker: duckdbEhWorker,
    },
  }

  const selectedBundle = await selectBundle(bundles)
  const logger = new ConsoleLogger()
  const worker = selectedBundle.mainWorker ? new Worker(selectedBundle.mainWorker) : null
  const db = new AsyncDuckDB(logger, worker)
  await db.instantiate(selectedBundle.mainModule, selectedBundle.pthreadWorker)
  await db.open({
    allow_unsigned_extensions: true,
  })
  return db
}

export async function getDuckDB() {
  if (!duckDbPromise) {
    duckDbPromise = createDuckDB()
  }
  return duckDbPromise
}

export async function getConnection() {
  if (!connectionPromise) {
    const db = await getDuckDB()
    connectionPromise = db.connect()
  }
  return connectionPromise
}

export async function resetDatabase() {
  const db = await getDuckDB()
  await db.dropFiles()
  if (connectionPromise) {
    const conn = await connectionPromise
    await conn.close()
    connectionPromise = null
  }
  duckDbPromise = null
}
