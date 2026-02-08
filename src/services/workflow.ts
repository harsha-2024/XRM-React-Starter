
import { logEvent } from './audit'

export type WorkflowAction = { type: 'log'|'updateField'; params: any }
export type WorkflowTrigger = { entity: string; on: 'create'|'update'|'delete'; actions: WorkflowAction[] }

const workflows: WorkflowTrigger[] = [
  { entity: 'opportunity', on: 'create', actions: [ { type: 'log', params: { message: 'New opportunity created' } } ] },
  { entity: 'case', on: 'update', actions: [ { type: 'log', params: { message: 'Case updated' } } ] },
]

export function fire(entity: string, on: 'create'|'update'|'delete', payload?: any){
  workflows.filter(w=>w.entity===entity && w.on===on).forEach(w=>{
    w.actions.forEach(a=>{
      switch(a.type){
        case 'log': logEvent('workflow', a.params.message); break
        case 'updateField': logEvent('workflow', `Update field ${a.params?.field}`); break
      }
    })
  })
}
