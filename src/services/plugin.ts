
export type PluginManifest = { id: string; name: string; module: () => Promise<{ default: React.FC }> }

const manifests: PluginManifest[] = [
  { id: 'sample', name: 'Sample Plugin', module: () => import('@/plugins/sample-plugin/module') }
]

export async function loadPlugins(){
  const comps = [] as { id: string; name: string; Component: React.FC }[]
  for (const m of manifests){
    const mod = await m.module()
    comps.push({ id: m.id, name: m.name, Component: mod.default })
  }
  return comps
}
