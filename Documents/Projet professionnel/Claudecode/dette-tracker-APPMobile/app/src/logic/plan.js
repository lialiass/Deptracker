// Logique pure — plan de remboursement et simulation

/**
 * Construit les étapes du plan de remboursement à partir des opérations.
 * @param {Array} operations
 * @param {Array} entities
 * @param {{ [id]: { iOwe, theyOwe } }} bal résultat de computeBalances
 * @returns {Array} steps triés par priorité
 */
export function buildPlan(operations, entities, bal) {
  const pairDebt = {}
  const ME = '__ME__'

  function addDebt(creditorId, debtorId, amount) {
    if (!creditorId || !debtorId || creditorId === debtorId) return
    if (debtorId === ME || creditorId === ME) return
    const key = creditorId + '|' + debtorId
    pairDebt[key] = (pairDebt[key] || 0) + amount
  }
  function subDebt(creditorId, debtorId, amount) {
    if (!creditorId || !debtorId || creditorId === debtorId) return
    if (debtorId === ME || creditorId === ME) return
    const key = creditorId + '|' + debtorId
    pairDebt[key] = Math.max(0, (pairDebt[key] || 0) - amount)
  }

  operations.forEach(({ type, amount, from_id, to_id }) => {
    const fromId = from_id
    const toId   = to_id
    switch (type) {
      case 'self_borrow': addDebt(fromId, toId, amount); break
      case 'lend':        addDebt(fromId, toId, amount); break
      case 'borrow':      addDebt(fromId, toId, amount); break
      case 'transfer':    addDebt(fromId, toId, amount); break
      case 'repay_out': {
        const directKey = toId + '|' + fromId
        if (pairDebt[directKey] !== undefined) {
          pairDebt[directKey] = Math.max(0, pairDebt[directKey] - amount)
        } else {
          Object.keys(pairDebt).forEach(key => {
            const [cred] = key.split('|')
            if (cred === toId) pairDebt[key] = Math.max(0, pairDebt[key] - amount)
          })
        }
        break
      }
      case 'repay_in': {
        const keyA = toId   + '|' + fromId
        const keyB = fromId + '|' + toId
        if (toId !== ME && pairDebt[keyA] !== undefined) {
          pairDebt[keyA] = Math.max(0, pairDebt[keyA] - amount)
        } else if (toId !== ME && pairDebt[keyB] !== undefined) {
          pairDebt[keyB] = Math.max(0, pairDebt[keyB] - amount)
        } else {
          Object.keys(pairDebt).forEach(key => {
            const [, deb] = key.split('|')
            if (deb === fromId) pairDebt[key] = Math.max(0, pairDebt[key] - amount)
          })
        }
        break
      }
    }
  })

  const entityMap = {}
  entities.forEach(e => { entityMap[e.id] = e })

  const steps = []

  Object.entries(pairDebt).forEach(([key, amount]) => {
    if (amount < 0.01) return
    const [creditorId, debtorId] = key.split('|')
    const creditor = entityMap[creditorId]
    const debtor   = entityMap[debtorId]
    if (!creditor || !debtor) return

    const isPerson = creditor.category === 'person' || debtor.category === 'person'
    steps.push({
      type: 'pay',
      amount,
      creditorId,
      creditorName: creditor.name,
      debtorId,
      debtorName: debtor.name,
      priority: isPerson ? 1 : 2,
      sub: isPerson
        ? 'Dette personnelle — à régler en priorité'
        : 'Rééquilibrage interne entre comptes',
    })
  })

  // Créances à encaisser
  Object.entries(pairDebt).forEach(([key, amount]) => {
    if (amount < 0.01) return
    const [cred, deb] = key.split('|')
    const credEnt = entityMap[cred]
    const debEnt  = entityMap[deb]
    if (!credEnt || !debEnt) return
    if (debEnt.category !== 'person') return
    if (steps.some(s => s.type === 'pay' && s.creditorId === cred && s.debtorId === deb)) return
    steps.push({
      type: 'recv', amount, creditorId: cred, creditorName: credEnt.name,
      debtorId: deb, debtorName: debEnt.name, priority: 3,
      sub: debEnt.name + ' doit rembourser — à encaisser',
    })
  })

  // Proches sans paire détaillée (lend fromId=ME)
  entities.filter(e => e.category === 'person').forEach(e => {
    const b = bal[e.id]
    if (!b || b.theyOwe < 0.01) return
    if (steps.some(s => s.debtorId === e.id)) return
    steps.push({
      type: 'recv', amount: b.theyOwe, creditorId: null, creditorName: null,
      debtorId: e.id, debtorName: e.name, priority: 3, sub: e.name + ' doit rembourser',
    })
  })

  steps.sort((a, b) => a.priority - b.priority || b.amount - a.amount)
  return steps
}

/**
 * Construit la liste des dettes impliquant scopeEntityId.
 */
export function buildDebtList(operations, entities, bal, scopeEntityId) {
  const steps = buildPlan(operations, entities, bal).filter(s => s.type === 'pay')
  const debts = []
  for (const s of steps) {
    if (!s.creditorId || !s.debtorId || s.amount <= 0.01) continue
    if (scopeEntityId) {
      const involved = s.creditorId === scopeEntityId || s.debtorId === scopeEntityId
      if (!involved) continue
    }
    debts.push({
      creditorId: s.creditorId,
      debtorId:   s.debtorId,
      label: `${s.debtorName} → ${s.creditorName}`,
      amount: s.amount,
    })
  }
  return debts
}

/**
 * Simule la répartition d'un montant reçu sur les dettes actives.
 */
export function simulateAmount(amount, operations, entities, bal) {
  let remaining = amount
  const alloc = []
  const steps = buildPlan(operations, entities, bal).filter(s => s.type === 'pay')

  for (const s of steps) {
    if (remaining <= 0.01) break
    const pay = Math.min(remaining, s.amount)
    alloc.push({
      creditorName: s.creditorName,
      creditorId:   s.creditorId,
      debtorId:     s.debtorId,
      debtorName:   s.debtorName,
      pay,
    })
    remaining -= pay
  }

  return { alloc, remainder: Math.max(0, remaining) }
}
