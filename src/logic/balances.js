// Logique pure — aucune dépendance externe

const ME = '__ME__'

/**
 * Calcule les soldes dettes/créances par entité.
 * Modèle par paires : pair["creditorId|debtorId"] = montant net dû.
 * @param {Array} operations
 * @param {Array} entities
 * @returns {{ [entityId]: { iOwe: number, theyOwe: number } }}
 */
export function computeBalances(operations, entities) {
  const pair = {}

  function addDebt(creditorId, debtorId, amount) {
    if (!creditorId || !debtorId || amount <= 0) return
    const k = creditorId + '|' + debtorId
    pair[k] = (pair[k] || 0) + amount
  }

  function subDebt(creditorId, debtorId, amount) {
    const k = creditorId + '|' + debtorId
    if (pair[k] !== undefined) pair[k] = Math.max(0, pair[k] - amount)
  }

  function subAllWhere(debtorId, amount) {
    let rem = amount
    Object.keys(pair).forEach(k => {
      if (rem <= 0.001) return
      const [, deb] = k.split('|')
      if (deb === debtorId) { const r = Math.min(rem, pair[k]); pair[k] -= r; rem -= r }
    })
  }

  operations.forEach(({ type, amount, from_id, to_id }) => {
    const fromId = from_id
    const toId   = to_id
    switch (type) {
      case 'self_borrow':
        addDebt(fromId, toId === ME ? '__self__' : toId, amount)
        break
      case 'lend':
        if (fromId === ME) {
          addDebt('__lender__', toId, amount)
        } else {
          addDebt(fromId, toId, amount)
        }
        break
      case 'borrow':
        addDebt(fromId, '__self__', amount)
        if (toId !== ME) addDebt(fromId, toId, amount)
        break
      case 'transfer':
        addDebt(fromId, toId, amount)
        break
      case 'repay_out':
        if (fromId === ME) {
          subDebt(toId, '__self__', amount)
        } else if (pair[toId + '|' + fromId] !== undefined) {
          subDebt(toId, fromId, amount)
        } else {
          let rem = amount
          Object.keys(pair).forEach(k => {
            if (rem <= 0.001) return
            const [cred, deb] = k.split('|')
            if (cred === toId && deb === fromId) { const r = Math.min(rem, pair[k]); pair[k] -= r; rem -= r }
          })
        }
        break
      case 'repay_in':
        if (toId === ME || toId === undefined) {
          subAllWhere(fromId, amount)
        } else if (pair[toId + '|' + fromId] !== undefined) {
          subDebt(toId, fromId, amount)
        } else {
          subAllWhere(fromId, amount)
        }
        break
      case 'income_received':
        break
      case 'adjust':
        addDebt('__adj__', toId, amount)
        break
    }
  })

  const b = {}
  entities.forEach(e => { b[e.id] = { theyOwe: 0, iOwe: 0 } })

  Object.entries(pair).forEach(([k, amount]) => {
    if (amount < 0.001) return
    const [cred, deb] = k.split('|')
    if (b[cred]) b[cred].theyOwe += amount
    if (b[deb])  b[deb].iOwe     += amount
  })

  return b
}

/**
 * Calcule le solde net d'une entité.
 * soldeNet = soldeRéel (si défini) + créances - dettes
 */
export function netBalance(entity, bal) {
  const b = bal[entity.id] || { iOwe: 0, theyOwe: 0 }
  if (entity.real_balance !== null && entity.real_balance !== undefined) {
    return entity.real_balance + b.theyOwe - b.iOwe
  }
  return b.theyOwe - b.iOwe
}
