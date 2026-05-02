import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { advanceRecurrence, nextOccurrence } from '../logic/incomes'

const MAX_UNDO = 20

function snapshot(state) {
  return JSON.parse(JSON.stringify(state))
}

export function useData(userId) {
  const [entities,   setEntities]   = useState([])
  const [operations, setOperations] = useState([])
  const [incomes,    setIncomes]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [undoStack,  setUndoStack]  = useState([])
  const [redoStack,  setRedoStack]  = useState([])

  // ── Chargement initial ──────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    setLoading(true)
    Promise.all([
      supabase.from('entities').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('operations').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('future_incomes').select('*').eq('user_id', userId).order('date'),
    ]).then(([e, o, i]) => {
      if (e.error || o.error || i.error) {
        setError(e.error || o.error || i.error)
      } else {
        setEntities(e.data)
        setOperations(o.data)
        setIncomes(i.data)
      }
      setLoading(false)
    })
  }, [userId])

  // ── Undo / Redo ─────────────────────────────────────────────
  function pushUndo(state) {
    setUndoStack(prev => [...prev.slice(-MAX_UNDO + 1), snapshot(state)])
    setRedoStack([])
  }

  function undo() {
    setUndoStack(prev => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      setRedoStack(r => [...r, snapshot({ entities, operations, incomes })])
      setEntities(last.entities)
      setOperations(last.operations)
      setIncomes(last.incomes)
      return prev.slice(0, -1)
    })
  }

  function redo() {
    setRedoStack(prev => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      setUndoStack(u => [...u, snapshot({ entities, operations, incomes })])
      setEntities(last.entities)
      setOperations(last.operations)
      setIncomes(last.incomes)
      return prev.slice(0, -1)
    })
  }

  // ── Entités ─────────────────────────────────────────────────
  async function addEntity(fields) {
    const row = { ...fields, user_id: userId }
    const { data, error } = await supabase.from('entities').insert(row).select().single()
    if (error) throw error
    pushUndo({ entities, operations, incomes })
    setEntities(prev => [...prev, data])
    return data
  }

  async function updateEntity(id, fields) {
    const { data, error } = await supabase.from('entities').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    pushUndo({ entities, operations, incomes })
    setEntities(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  async function deleteEntity(id) {
    const { error } = await supabase.from('entities').delete().eq('id', id)
    if (error) throw error
    pushUndo({ entities, operations, incomes })
    setEntities(prev => prev.filter(e => e.id !== id))
  }

  // ── Opérations ──────────────────────────────────────────────
  async function addOperation(fields) {
    const row = { ...fields, user_id: userId }
    const { data, error } = await supabase.from('operations').insert(row).select().single()
    if (error) throw error
    pushUndo({ entities, operations, incomes })
    setOperations(prev => [data, ...prev])
    return data
  }

  async function deleteOperation(id) {
    const { error } = await supabase.from('operations').delete().eq('id', id)
    if (error) throw error
    pushUndo({ entities, operations, incomes })
    setOperations(prev => prev.filter(o => o.id !== id))
  }

  // ── Revenus futurs ──────────────────────────────────────────
  async function addIncome(fields) {
    const row = { ...fields, user_id: userId }
    const { data, error } = await supabase.from('future_incomes').insert(row).select().single()
    if (error) throw error
    pushUndo({ entities, operations, incomes })
    setIncomes(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
    return data
  }

  async function updateIncome(id, fields) {
    const { data, error } = await supabase.from('future_incomes').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    pushUndo({ entities, operations, incomes })
    setIncomes(prev => prev.map(i => i.id === id ? data : i).sort((a, b) => a.date.localeCompare(b.date)))
    return data
  }

  async function deleteIncome(id) {
    const { error } = await supabase.from('future_incomes').delete().eq('id', id)
    if (error) throw error
    pushUndo({ entities, operations, incomes })
    setIncomes(prev => prev.filter(i => i.id !== id))
  }

  // ── Encaissement ────────────────────────────────────────────
  async function executeCashIn({ incId, amount, destId, alloc }) {
    const inc = incomes.find(i => i.id === incId)
    if (!inc) return

    pushUndo({ entities, operations, incomes })

    const today = new Date().toISOString().split('T')[0]
    const newOps = []

    // 1. Créditer le solde réel du compte destinataire
    let updatedEntities = entities
    if (destId) {
      const entity = entities.find(e => e.id === destId)
      if (entity) {
        const newBal = (entity.real_balance || 0) + amount
        const { data: updatedEnt } = await supabase
          .from('entities')
          .update({ real_balance: newBal, updated_at: new Date().toISOString() })
          .eq('id', destId)
          .select()
          .single()
        updatedEntities = entities.map(e => e.id === destId ? updatedEnt : e)
      }
    }

    // 2. Opération income_received
    const { data: op1 } = await supabase.from('operations').insert({
      user_id: userId,
      date:    today,
      amount,
      from_id: '__ME__',
      to_id:   destId || '__ME__',
      type:    'income_received',
      comment: `Encaissement : ${inc.label || 'Revenu'} (+${amount.toFixed(2)}€)`,
    }).select().single()
    newOps.push(op1)

    // 3. Remboursements depuis la répartition
    for (const [key, val] of Object.entries(alloc)) {
      if (val <= 0) continue
      const [creditorId, debtorId] = key.split('|')
      const { data: opR } = await supabase.from('operations').insert({
        user_id: userId,
        date:    today,
        amount:  val,
        from_id: debtorId || '__ME__',
        to_id:   creditorId,
        type:    'repay_out',
        comment: `Remboursement depuis encaissement "${inc.label || 'Revenu'}"`,
      }).select().single()
      newOps.push(opR)
    }

    // 4. Gérer la récurrence
    const freq = inc.freq || 'once'
    if (freq === 'once') {
      await supabase.from('future_incomes').delete().eq('id', incId)
      setIncomes(prev => prev.filter(i => i.id !== incId))
    } else {
      const advanced = advanceRecurrence(inc)
      const nextDate = nextOccurrence(advanced)
      if (!nextDate) {
        await supabase.from('future_incomes').delete().eq('id', incId)
        setIncomes(prev => prev.filter(i => i.id !== incId))
      } else {
        const { data: updatedInc } = await supabase
          .from('future_incomes')
          .update({ date: advanced.date, updated_at: new Date().toISOString() })
          .eq('id', incId)
          .select()
          .single()
        setIncomes(prev => prev.map(i => i.id === incId ? updatedInc : i))
      }
    }

    setEntities(updatedEntities)
    setOperations(prev => [...newOps, ...prev])
  }

  return {
    entities, operations, incomes,
    loading, error,
    addEntity, updateEntity, deleteEntity,
    addOperation, deleteOperation,
    addIncome, updateIncome, deleteIncome,
    executeCashIn,
    undo, redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  }
}
